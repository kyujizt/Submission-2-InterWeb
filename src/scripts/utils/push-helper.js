import CONFIG from '../config';

const SERVICE_WORKER_PATHS = [
  "/sw.js",
  "/public/sw.js",
  "/src/public/sw.js"
];

let serviceWorkerRegistration = null;

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Worker tidak didukung di browser ini');
    return null;
  }

  try {
    // Try registering service worker with correct path
    let registration;
    for (const path of ['/sw.js', '/src/public/sw.js']) {
      try {
        registration = await navigator.serviceWorker.register(path);
        console.log(`✅ Service Worker berhasil didaftarkan dengan path: ${path}`);
        break;
      } catch (error) {
        console.warn(`⚠️ Gagal mendaftarkan Service Worker dengan path ${path}:`, error);
      }
    }

    if (!registration) {
      throw new Error('Gagal mendaftarkan Service Worker dengan semua path yang tersedia');
    }

    return registration;
  } catch (error) {
    console.error('❌ Gagal mendaftarkan Service Worker:', error);
    return null;
  }
}

export async function requestNotificationPermission() {
  try {
    if (!("Notification" in window)) {
      throw new Error("Browser tidak mendukung notifikasi");
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.log("❌ Izin notifikasi ditolak");
      return false;
    }
    console.log("✅ Izin notifikasi diberikan");
    return true;
  } catch (error) {
    console.error("❌ Error saat meminta izin notifikasi:", error);
    return false;
  }
}

export async function subscribePushMessage() {
  try {
    // Check browser support
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Worker tidak didukung di browser ini');
    }
    if (!('PushManager' in window)) {
      throw new Error('Push API tidak didukung di browser ini');
    }

    // Check authentication
    const token = localStorage.getItem('authToken');
    if (!token) {
      throw new Error('Silakan login terlebih dahulu');
    }

    // Get service worker registration
    let registration = await navigator.serviceWorker.ready;
    if (!registration) {
      registration = await registerServiceWorker();
    }
    if (!registration) {
      throw new Error('Service Worker tidak terdaftar');
    }

    // Check if already subscribed
    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      console.log('Menggunakan subscription yang sudah ada');
      return existingSubscription;
    }

    // Use hardcoded VAPID key from Dicoding
    const publicKey = CONFIG.PUSH_MSG_VAPID_KEY;
    if (!publicKey) {
      throw new Error('VAPID public key tidak ditemukan');
    }

    // Subscribe to push service
    console.log('Membuat subscription baru...');
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey)
    });

    if (!subscription) {
      throw new Error('Gagal membuat subscription');
    }

    // Extract subscription details
    const subscriptionJson = subscription.toJSON();
    
    // Send subscription to Dicoding API
    const subscribeResponse = await fetch(CONFIG.PUSH_MSG_SUBSCRIBE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        endpoint: subscriptionJson.endpoint,
        keys: {
          p256dh: subscriptionJson.keys.p256dh,
          auth: subscriptionJson.keys.auth
        }
      })
    });

    if (!subscribeResponse.ok) {
      const errorData = await subscribeResponse.json();
      throw new Error(`Gagal mengirim subscription ke server: ${errorData.message || subscribeResponse.status}`);
    }

    console.log('✅ Berhasil subscribe push notification');
    return subscription;
  } catch (error) {
    console.error('❌ Gagal subscribe push notification:', error);
    throw error;
  }
}

export async function unsubscribePushMessage() {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Silakan login terlebih dahulu');
      }      // Unsubscribe dari Dicoding API
      await fetch(CONFIG.PUSH_MSG_UNSUBSCRIBE_URL, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint
        })
      });

      // Unsubscribe dari browser
      await subscription.unsubscribe();
      console.log('✅ Berhasil unsubscribe dari push notification');
    }
  } catch (error) {
    console.error('❌ Gagal unsubscribe push notification:', error);
    throw error;
  }
}

export async function isSubscribedToPushNotification() {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch (error) {
    console.error('❌ Error checking subscription:', error);
    return false;
  }
}

// Fungsi untuk simulasi push notification lokal
export async function simulatePushNotification(title, body, url = '/') {
  if (!('serviceWorker' in navigator)) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    if (!registration.active) {
      throw new Error('Service worker tidak aktif');
    }

    registration.active.postMessage({
      type: 'SHOW_NOTIFICATION',
      title,
      body,
      url
    });
    return true;
  } catch (error) {
    console.error('❌ Error showing notification:', error);
    return false;
  }
}
