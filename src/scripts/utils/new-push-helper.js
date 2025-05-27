import CONFIG from '../config';

const SERVICE_WORKER_PATHS = [
  "/sw.js",
  "/public/sw.js",
  "/src/public/sw.js"
];

let serviceWorkerRegistration = null;

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    console.warn("Service Worker tidak didukung di browser ini");
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register("/src/public/sw.js");
    console.log("✅ Service Worker berhasil didaftarkan");
    return registration;
  } catch (error) {
    console.error("❌ Gagal mendaftarkan Service Worker:", error);
    return null;
  }
}

export async function requestNotificationPermission() {
  try {
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
    const registration = await navigator.serviceWorker.ready;
    
    // Dapatkan VAPID key dari Dicoding API
    const response = await fetch('https://story-api.dicoding.dev/v1/push-notif/key-public');
    if (!response.ok) {
      throw new Error(`Failed to get VAPID key: ${response.status}`);
    }
    const { publicKey } = await response.json();

    // Subscribe ke push notification
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey)
    });

    // Kirim subscription ke Dicoding API
    const token = localStorage.getItem('token');
    const subscribeResponse = await fetch('https://story-api.dicoding.dev/v1/push-notif/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(subscription)
    });

    if (!subscribeResponse.ok) {
      throw new Error('Gagal mengirim subscription ke server');
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
    
    if (subscription) {
      // Unsubscribe dari Dicoding API
      const token = localStorage.getItem('token');
      await fetch('https://story-api.dicoding.dev/v1/push-notif/unsubscribe', {
        method: 'POST',
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

// Alias untuk kompatibilitas
export const subscribePushNotification = subscribePushMessage;
export const unsubscribePushNotification = unsubscribePushMessage;
