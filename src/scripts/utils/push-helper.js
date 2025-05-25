// VAPID public key from the documentation
const VAPID_PUBLIC_KEY = 'BCCs2eonMI-6H2ctvFaWg-UYdDv387Vno_bzUzALpB442r2lCnsHmtrx8biyPi_E-1fSGABK_Qs_GlvPoJJqxbk';

// Try multiple possible paths for the service worker
const SERVICE_WORKER_PATHS = [
  "/sw.js",
  "/public/sw.js",
  "/src/public/sw.js"
];

let serviceWorkerRegistration = null;

export async function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    // First check if there's already a registered service worker
    try {
      const existingReg = await navigator.serviceWorker.ready;
      if (existingReg) {
        console.log("Using existing service worker registration:", existingReg);
        serviceWorkerRegistration = existingReg;
        return existingReg;
      }
    } catch (err) {
      console.log("No existing service worker found, will register new one");
    }

    // Try each path until one works
    for (const path of SERVICE_WORKER_PATHS) {
      try {
        console.log(`Attempting to register service worker at: ${path}`);
        const registration = await navigator.serviceWorker.register(path);
        console.log("✅ Service Worker registered:", registration);
        serviceWorkerRegistration = registration;
        return registration;
      } catch (error) {
        console.warn(`Failed to register service worker at ${path}:`, error);
        // Continue to the next path
      }
    }
    
    console.error("❌ All service worker registration attempts failed");
    return null;
  }
  console.warn("Service Worker not supported in this browser");
  return null;
}

// Convert base64 VAPID key to Uint8Array
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

// Check if push notifications are supported
export const isPushNotificationSupported = () => {
  return 'serviceWorker' in navigator && 'PushManager' in window;
};

// Request notification permission
export async function requestNotificationPermission() {
  if (!isPushNotificationSupported()) {
    console.warn('Push notifications not supported in this browser');
    return false;
  }
  
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.log("❌ Izin notifikasi tidak diberikan.");
      return false;
    }
    console.log("✅ Izin notifikasi diberikan.");
    return true;
  } catch (error) {
    console.error("Error requesting notification permission:", error);
    return false;
  }
}

// Subscribe to push notifications
export async function subscribeUserToPush() {
  if (!serviceWorkerRegistration) {
    serviceWorkerRegistration = await registerServiceWorker();
  }
  
  if (!serviceWorkerRegistration) {
    throw new Error("Tidak dapat mendaftarkan Service Worker");
  }
  
  if (!isPushNotificationSupported()) {
    throw new Error("Push notifications not supported in this browser");
  }
  
  try {
    const convertedVapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);

    const subscription = await serviceWorkerRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedVapidKey,
    });

    // Store subscription in localStorage for demo purposes
    localStorage.setItem('pushSubscription', JSON.stringify(subscription));
    
    console.log("✅ Pengguna berhasil subscribe push:", subscription);
    
    // Simulate a welcome notification
    simulatePushNotification(
      'Notifikasi Diaktifkan',
      'Anda akan menerima notifikasi saat membuat cerita baru'
    );
    
    return subscription;
  } catch (error) {
    console.error("❌ Gagal melakukan subscribe push:", error.message);
    throw error;
  }
}

// Unsubscribe from push notifications
export async function unsubscribeUserFromPush() {
  try {
    // Try to get existing registration
    if (!serviceWorkerRegistration) {
      try {
        serviceWorkerRegistration = await navigator.serviceWorker.ready;
      } catch (err) {
        console.warn("No active service worker found for unsubscribe");
      }
    }
    
    let unsubscribed = false;
    
    // If we have a registration, try to unsubscribe
    if (serviceWorkerRegistration) {
      try {
        const subscription = await serviceWorkerRegistration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
          unsubscribed = true;
          console.log("✅ Pengguna berhasil unsubscribe dari push");
        }
      } catch (subError) {
        console.warn("Error unsubscribing from push manager:", subError);
      }
    }
    
    // Always remove from localStorage
    localStorage.removeItem('pushSubscription');
    console.log("✅ Subscription berhasil dihapus dari localStorage");
    
    // Simulate an unsubscribe notification
    simulatePushNotification(
      'Notifikasi Dinonaktifkan',
      'Anda telah menonaktifkan notifikasi Story App'
    );
    
    return true;
  } catch (error) {
    console.error("❌ Gagal melakukan unsubscribe push:", error.message);
    
    // Even if there's an error, try to clean up localStorage
    localStorage.removeItem('pushSubscription');
    
    throw error;
  }
}

// Check if user is subscribed to push notifications
export async function isUserSubscribed() {
  try {
    // Try to get existing registration
    if (!serviceWorkerRegistration) {
      try {
        serviceWorkerRegistration = await navigator.serviceWorker.ready;
      } catch (err) {
        console.warn("No active service worker found when checking subscription");
      }
    }
    
    // If we have a registration, check for subscription
    if (serviceWorkerRegistration) {
      const subscription = await serviceWorkerRegistration.pushManager.getSubscription();
      return subscription !== null;
    }
    
    // Fallback to localStorage
    const storedSubscription = localStorage.getItem('pushSubscription');
    return storedSubscription !== null;
  } catch (error) {
    console.error("Error checking push subscription status:", error);
    
    // Fallback to localStorage
    const storedSubscription = localStorage.getItem('pushSubscription');
    return storedSubscription !== null;
  }
}

// Simulate a push notification (for demo without backend)
// Simulate a push notification (for demo without backend)
export async function simulatePushNotification(title, body, url = '/') {
  try {
    // Check if user is subscribed first - don't show notifications if unsubscribed
    // Exception: allow notifications with title 'Notifikasi Dinonaktifkan' to show even when unsubscribed
    if (title !== 'Notifikasi Dinonaktifkan') {
      const isSubscribed = await isUserSubscribed();
      if (!isSubscribed) {
        console.log('Notifikasi tidak ditampilkan karena pengguna tidak berlangganan');
        return;
      }
    }
    
    // Try to use service worker if available
    try {
      const registration = await navigator.serviceWorker.ready;
      
      if (registration && registration.active) {
        // Send message to service worker to show notification
        registration.active.postMessage({
          type: 'SHOW_NOTIFICATION',
          title,
          body,
          url
        });
        
        console.log('Notification simulation sent to service worker');
        return;
      }
    } catch (swError) {
      console.warn("Could not use service worker for notification:", swError);
    }
    
    // Fallback to regular Notification API if service worker not available
    if (Notification.permission === 'granted') {
      // Double-check subscription status for regular notifications too
      if (title !== 'Notifikasi Dinonaktifkan') {
        const isSubscribed = await isUserSubscribed();
        if (!isSubscribed) {
          console.log('Notifikasi tidak ditampilkan karena pengguna tidak berlangganan');
          return;
        }
      }
      
      const notification = new Notification(title, {
        body,
        icon: '/favicon.png'
      });
      
      notification.onclick = function() {
        window.focus();
        window.location.href = url;
        notification.close();
      };
      
      console.log('Notification shown using Notification API');
    } else {
      // Last resort: log to console only
      console.log(`${title}: ${body}`);
      
      // Only show alert for subscription status changes
      if (title === 'Notifikasi Diaktifkan' || title === 'Notifikasi Dinonaktifkan') {
        alert(`${title}: ${body}`);
      }
    }
  } catch (error) {
    console.error('Error simulating push notification:', error);
    
    // Only show alert for subscription status changes
    if (title === 'Notifikasi Diaktifkan' || title === 'Notifikasi Dinonaktifkan') {
      alert(`${title}: ${body}`);
    }
  }
}


// Update UI tombol notif sesuai status subscription
export function updateNotifButton(isSubscribed, btn) {
  if (!btn) {
    btn = document.getElementById("notif-btn");
    if (!btn) return;
  }
  
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
        const permissionGranted = await requestNotificationPermission();
        if (permissionGranted) {
          await subscribeUserToPush();
          updateNotifButton(true, notifBtn);
        } else {
          alert("Anda perlu memberikan izin notifikasi untuk mengaktifkan fitur ini.");
          updateNotifButton(false, notifBtn);
        }
      } else {
        // Unsubscribe user
        await unsubscribeUserFromPush();
        updateNotifButton(false, notifBtn);
      }
    } catch (error) {
      console.error("Error toggling notification:", error);
      alert("Gagal mengubah status notifikasi: " + error.message);
    } finally {
      notifBtn.disabled = false;
    }
  });
});

// For backward compatibility with existing code
export const isSubscribedToPushNotification = isUserSubscribed;
export const subscribePushNotification = subscribeUserToPush;
export const unsubscribePushNotification = unsubscribeUserFromPush;
export const subscribePushMessage = subscribeUserToPush;
export const unsubscribePushMessage = unsubscribeUserFromPush;
