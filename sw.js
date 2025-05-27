importScripts("https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js");
/**
 * Service Worker configuration for the Story App.
 * @module ServiceWorker
 * @version 1.0
 */

const { precaching, routing, strategies } = workbox;

// ================= CACHE NAMES =================
const CACHE_NAME = 'StoryApp-V1';
const urlsToCache = [
  '/',
  '/index.html',
  '/app.js',
  '/styles.css',
  '/favicon.png',
  '/manifest.json',
  '/images/logo.png',
  '/images/icons/icon-192x192.png',
  '/fallback.json'
];

// Cache static assets on install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('✅ Opened cache');
      return cache.addAll(urlsToCache);
    })
  );
});

// Clean up old caches on activate
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      );
    })
  );
});

// Network first, falling back to cache strategy
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Cache new responses for next time
        if (event.request.method === 'GET') {
          const clonedResponse = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clonedResponse);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cacheResponse) => {
          if (cacheResponse) {
            return cacheResponse;
          }
          // If no cache found, return fallback
          if (event.request.url.includes('/api/')) {
            return caches.match('/fallback.json');
          }
          return new Response('Network error happened', {
            status: 408,
            headers: { 'Content-Type': 'text/plain' },
          });
        });
      })
  );
});

// Push notification handler
self.addEventListener('push', (event) => {
  let notificationData = {
    title: 'Story App Notification',
    options: {
      body: 'Ada story baru telah ditambahkan!',
      icon: '/favicon.png',
      badge: '/favicon.png',
      vibrate: [200, 100, 200],
      tag: 'story-notification',
      renotify: true,
      data: {
        url: '/',
        dateOfArrival: Date.now(),
        primaryKey: Math.random().toString()
      }
    }
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      const now = new Date();
      
      notificationData = {
        title: payload.title || notificationData.title,
        options: {
          ...notificationData.options,
          body: payload.message || payload.body || notificationData.options.body,
          data: {
            url: payload.url || payload.options?.data?.url || '/',
            dateOfArrival: now.toISOString(),
            storyId: payload.options?.data?.storyId,
            description: payload.options?.data?.description,
            location: payload.options?.data?.location || {}
          },
          timestamp: now.getTime(),
          actions: [
            {
              action: 'view-story',
              title: 'Lihat Story'
            },
            {
              action: 'close',
              title: 'Tutup'
            }
          ]
        }
      };
    } catch (error) {
      console.error('Error parsing notification data:', error);
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData.options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  let url = '/';
  if (event.action === 'view-story' && event.notification.data.storyId) {
    url = `/story/${event.notification.data.storyId}`;
  } else if (event.action === 'close') {
    return;
  } else {
    url = event.notification.data.url || '/';
  }

  // Open or focus window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url === url && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// Custom message handler for local notifications
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, url } = event.data;
    
    self.registration.showNotification(title, {
      body,
      icon: '/favicon.png',
      badge: '/favicon.png',
      data: {
        url: url || '/'
      },
      actions: [
        {
          action: 'view',
          title: 'Lihat'
        },
        {
          action: 'close',
          title: 'Tutup'
        }
      ]
    });
  }
});
