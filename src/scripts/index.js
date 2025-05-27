import "../styles/styles.css";
import App from "./pages/app";
import "./components/nav-bar";
import { 
  requestNotificationPermission, 
  subscribePushMessage, 
  unsubscribePushMessage,
  isSubscribedToPushNotification,
  registerServiceWorker
} from "./utils/push-helper";
import { saveStory, getStories, deleteStory } from "./utils/indexDB";

// Make functions available in console
window.saveStory = saveStory;
window.getStories = getStories;
window.deleteStory = deleteStory;

async function setupPushNotification() {
  try {
    const registration = await registerServiceWorker();
    if (!registration) {
      throw new Error('Service Worker registration failed');
    }

    // Setup notification button
    const notifBtn = document.getElementById("notif-btn");
    if (notifBtn) {
      // Initial button state
      const isSubscribed = await isSubscribedToPushNotification();
      notifBtn.textContent = isSubscribed ? "Nonaktifkan Notifikasi" : "Aktifkan Notifikasi";
      notifBtn.disabled = false;

      // Button click handler
      notifBtn.addEventListener("click", async () => {
        try {
          notifBtn.disabled = true;
          const currentStatus = await isSubscribedToPushNotification();
          
          if (currentStatus) {
            await unsubscribePushMessage();
            notifBtn.textContent = "Aktifkan Notifikasi";
            console.log("✅ Notifikasi dinonaktifkan");
          } else {
            const permission = await requestNotificationPermission();
            if (permission) {
              await subscribePushMessage();
              notifBtn.textContent = "Nonaktifkan Notifikasi";
              console.log("✅ Notifikasi diaktifkan");
            } else {
              console.log("❌ Izin notifikasi ditolak");
            }
          }
        } catch (error) {
          console.error("❌ Error toggle notification:", error);
          alert("Gagal mengubah status notifikasi: " + error.message);
        } finally {
          notifBtn.disabled = false;
        }
      });
    }
  } catch (error) {
    console.error("❌ Error push notification setup:", error.message);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const app = new App({
    content: document.querySelector("#main-content"),
    drawerButton: document.querySelector("#drawer-button"),
    navigationDrawer: document.querySelector("#navigation-drawer"),
  });

  await app.renderPage();

  window.addEventListener("hashchange", async () => {
    console.log("🔁 Hash changed");
    await app.renderPage();
  });

  // Initialize push notifications
  await setupPushNotification();
});
