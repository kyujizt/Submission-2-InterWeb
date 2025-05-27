importScripts("https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js");
/**
 * Service Worker configuration for the Story App.
 * @module ServiceWorker
 * @version 1.0
 */

const { precaching, routing, strategies } = workbox;

// ================= CACHE NAMES =================
const CACHE_NAME = "story-app-v1";

// ================= PRECACHE ====================
// Precache file penting (dapat ditambah jika perlu)
precaching.precacheAndRoute([
  { url: "/", revision: null },
  { url: "/index.html", revision: null },
  { url: "/favicon.png", revision: null },
  { url: "/images/logo.png", revision: null },
]);

// ================= RUNTIME CACHING =============
routing.registerRoute(
  ({ request }) => request.destination === "image",
  new strategies.CacheFirst({
    cacheName: "story-app-images",
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 hari
      }),
    ],
  })
);

routing.registerRoute(
  ({ request }) => request.destination === "script" || request.destination === "style",
  new strategies.StaleWhileRevalidate({
    cacheName: "story-app-static",
  })
);

// ✅ 🔥 **Tambahkan caching untuk API stories**
routing.registerRoute(
  ({ url }) => url.href.includes("/v1/stories"),
  new strategies.StaleWhileRevalidate({
    cacheName: "story-app-api",
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 50, // Maksimal 50 respons API disimpan
        maxAgeSeconds: 7 * 24 * 60 * 60, // Simpan selama 7 hari
      }),
    ],
  })
);

// ✅ 🔥 **Tambahkan fallback jika semua gagal**
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches
      .match(event.request)
      .then((response) => {
        return (
          response ||
          fetch(event.request).then((networkResponse) => {
            return caches.open("story-cache").then((cache) => {
              cache.put(event.request, networkResponse.clone());
              return networkResponse;
            });
          })
        );
      })
      .catch(() => {
        return caches.match("/fallback.json"); // 🔥 Gunakan fallback jika semua gagal
      })
  );
});

// ================= PUSH NOTIFICATION ============
self.addEventListener("push", (event) => {
  let notificationData = {
    title: "Story App Notification",
    options: {
      body: "Ada story baru telah ditambahkan!",
      icon: "/favicon.png",
      badge: "/favicon.png",
      image: "/images/logo.png",
      vibrate: [200, 100, 200],
      tag: "story-notification",
      renotify: true,
      silent: false,
      requireInteraction: true,
      data: {
        url: "/",
        dateOfArrival: Date.now(),
        primaryKey: Math.random().toString() // Unique ID for each notification
      }
    },
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
            location: payload.options?.data?.location
          },
          timestamp: now.getTime(), // Add timestamp for sorting
          // Add actions if we have a story ID
          ...(payload.options?.data?.storyId && {
            actions: [
              {
                action: 'view-story',
                title: 'Lihat Story'
              }
            ]
          })
        }
      };
    } catch (error) {
      console.error('Error parsing notification data:', error);
      // Still show notification with default data if parsing fails
    }
  }

  const showNotification = self.registration.showNotification(
    notificationData.title,
    notificationData.options
  );

  event.waitUntil(showNotification);
});

// =============== HANDLE NOTIF CLICK ============
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  // Handle notification action clicks
  let url = '/';
  if (event.action === 'view-story' && event.notification.data.storyId) {
    url = `/story/${event.notification.data.storyId}`;
  } else {
    url = event.notification.data.url || '/';
  }

  // Focus or open window
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Custom message handler for simulating notifications
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, url } = event.data;
    
    self.registration.showNotification(title, {
      body: body,
      icon: "/favicon.png",
      badge: "/favicon.png",
      data: {
        url: url || '/'
      }
    });
  }
});
