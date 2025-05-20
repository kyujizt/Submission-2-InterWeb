importScripts("https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js");

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
  ({ url }) => url.pathname.startsWith("/v1/stories"), // 🔍 Pastikan path sesuai dengan API yang digunakan
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
    title: "Notification",
    options: {
      body: "This is a push notification",
      icon: "/favicon.png",
      image: "/favicon.png",
      badge: "/favicon.png",
    },
  };

  if (event.data) {
    notificationData = JSON.parse(event.data.text());
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
  const url = event.notification?.data?.url || "/";

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
