import { getVapidPublicKey, sendSubscription, removeSubscription } from "../data/api.js";
import CONFIG from '../config';

const SERVICE_WORKER_PATH = "/sw.js";

let serviceWorkerRegistration = null;

export async function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.register(SERVICE_WORKER_PATH);
      console.log("Service Worker registered:", registration);
      return registration;
    } catch (error) {
      console.error("Gagal mendaftarkan Service Worker:", error);
      return null;
    }
  }
  return null;
}

export async function requestNotificationPermission() {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("❌ Izin notifikasi tidak diberikan.");
  }
  console.log("✅ Izin notifikasi diberikan.");
}

export async function subscribeUserToPush() {
  if (!serviceWorkerRegistration) {
    serviceWorkerRegistration = await registerServiceWorker();
  }
  const registration = await navigator.serviceWorker.ready;
  try {
    const vapidPublicKey = await getVapidPublicKey();
    const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedVapidKey,
    });

    console.log("✅ Pengguna berhasil subscribe push:", subscription);
    await sendSubscription(subscription);
    console.log("✅ Subscription berhasil dikirim ke server");
    return subscription;
  } catch (error) {
    console.error("❌ Gagal melakukan subscribe push:", error.message);
    throw error;
  }
}

export async function unsubscribeUserFromPush() {
  if (!serviceWorkerRegistration) {
    serviceWorkerRegistration = await registerServiceWorker();
  }
  const subscription = await serviceWorkerRegistration.pushManager.getSubscription();
  if (subscription) {
    await subscription.unsubscribe();
    console.log("✅ Pengguna berhasil unsubscribe dari push");

    // Hapus subscription dari server
    await removeSubscription(subscription);
    console.log("✅ Subscription berhasil dihapus dari server");
  }
}

export async function isUserSubscribed() {
  if (!serviceWorkerRegistration) {
    serviceWorkerRegistration = await registerServiceWorker();
  }
  const subscription = await serviceWorkerRegistration.pushManager.getSubscription();
  return subscription !== null;
}

// Helper: Convert base64 URL string ke Uint8Array
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

async function subscribePushMessage() {
  const token = localStorage.getItem('token');
  if (!token) {
    console.log('User not logged in, cannot subscribe to push notification');
    return;
  }

  if (!(await isSubscribedToPushNotification())) {
    const pushSubscription = await subscribePushNotification();
    await sendPushSubscription(pushSubscription, token);
  }
}

async function isSubscribedToPushNotification() {
  if (!('Notification' in window)) {
    console.error('Browser tidak mendukung notifikasi');
    return false;
  }

  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) {
    console.error('Service worker belum teregistrasi');
    return false;
  }

  const existingSubscription = await registration.pushManager.getSubscription();
  return !!existingSubscription;
}

async function subscribePushNotification() {
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      throw new Error('Service worker belum teregistrasi');
    }

    // Gunakan VAPID key langsung dari konfigurasi
    const subscribeOptions = {
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(CONFIG.PUSH_MSG_VAPID_PUBLIC_KEY),
    };

    console.log('🔔 Mencoba melakukan subscribe push notification...');
    const pushSubscription = await registration.pushManager.subscribe(subscribeOptions);
    console.log('✅ Berhasil melakukan subscribe push notification');
    
    return pushSubscription;
  } catch (error) {
    console.error('❌ Gagal melakukan subscribe push:', error);
    throw error;
  }
}

async function sendPushSubscription(pushSubscription, token) {
  const response = await fetch(CONFIG.PUSH_MSG_SUBSCRIBE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(pushSubscription),
  });

  return response.json();
}

async function unsubscribePushMessage() {
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) {
    return;
  }

  const existingSubscription = await registration.pushManager.getSubscription();
  if (existingSubscription) {
    // Unsubscribe dari push server
    const token = localStorage.getItem('token');
    if (token) {
      await fetch(CONFIG.PUSH_MSG_UNSUBSCRIBE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ endpoint: existingSubscription.endpoint }),
      });
    }
    
    // Unsubscribe dari browser
    await existingSubscription.unsubscribe();
  }
}

// Update UI tombol notif sesuai status subscription
function updateNotifButton(isSubscribed, btn) {
  if (isSubscribed) {
    btn.textContent = "Nonaktifkan Notifikasi";
    btn.disabled = false;
  } else {
    btn.textContent = "Aktifkan Notifikasi";
    btn.disabled = false;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const notifBtn = document.getElementById("notif-btn");
  if (!notifBtn) return;

  try {
    await registerServiceWorker();
    const subscribed = await isUserSubscribed();
    updateNotifButton(subscribed, notifBtn);
  } catch (error) {
    console.error("Gagal cek status subscription:", error);
    updateNotifButton(false, notifBtn);
  }

  notifBtn.addEventListener("click", async () => {
    notifBtn.disabled = true;
    notifBtn.textContent = "Memproses...";

    try {
      const subscribed = await isUserSubscribed();

      if (!subscribed) {
        // Subscribe user
        await requestNotificationPermission();
        await subscribeUserToPush();
        updateNotifButton(true, notifBtn);
      } else {
        // Unsubscribe user
        await unsubscribeUserFromPush();
        updateNotifButton(false, notifBtn);
      }
    } catch (error) {
      alert("Gagal mengubah status notifikasi: " + error.message);
    } finally {
      notifBtn.disabled = false;
    }
  });
});

export {
  subscribePushMessage,
  unsubscribePushMessage,
  isSubscribedToPushNotification,
};
