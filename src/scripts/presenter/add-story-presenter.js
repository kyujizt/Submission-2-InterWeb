import { addStory, sendSubscription, getVapidPublicKey, sendPushNotification, removeSubscription } from "../data/api";

import AddStoryView from "../pages/add-story/add-story-view";

export default class AddStoryPresenter {
  constructor() {
    this.selectedLatLng = { lat: -6.2, lng: 106.8 };
    this.cameraImageBlob = null;
    this.cameraStream = null;
    this.registration = null;
    this.isSubscribed = false;
  }

  async init() {
    AddStoryView.updateLocationDisplay(this.selectedLatLng);

    const { marker } = AddStoryView.initMap(this.selectedLatLng, (newLocation) => {
      this.selectedLatLng = newLocation;
      AddStoryView.updateLocationDisplay(this.selectedLatLng);
    });

    AddStoryView.setupCamera(
      (stream) => {
        this.cameraStream = stream;
      },
      (imageBlob) => {
        this.cameraImageBlob = imageBlob;
      },
      () => this._stopCamera()
    );

    AddStoryView.setupForm((description, file) => this._handleSubmit(description, file));
    AddStoryView.bindHashChange(() => this._stopCamera());

    await this._setupPushNotifications();
    AddStoryView.setupPushNotificationButton(() => this._handleNotifToggle());
  }
  async _handleSubmit(description, file) {
    const imageFile = file || this.cameraImageBlob;
    if (!imageFile) {
      AddStoryView.showAlert("Silakan unggah gambar atau ambil gambar dari kamera!");
      return;
    }

    try {
      AddStoryView.showLoading();

      // Upload story
      const result = await addStory({ description, imageFile, location: this.selectedLatLng });
      
      if (result?.error) {
        throw new Error(result.error);
      }

      // Kirim push notification
      try {
        const notifPayload = {
          title: "Story Baru Ditambahkan!",
          body: description.substring(0, 100) + (description.length > 100 ? "..." : ""),
          location: this.selectedLatLng,
          storyId: result.id,
          description
        };

        await sendPushNotification(notifPayload);
        console.log("✅ Push notification berhasil dikirim");
      } catch (notifError) {
        console.warn("⚠️ Gagal mengirim push notification:", notifError);
        // Lanjutkan proses meskipun notifikasi gagal
      }

      AddStoryView.showAlert("Cerita berhasil ditambahkan!");
      this._stopCamera();
      AddStoryView.goToHomePage();
    } catch (error) {
      AddStoryView.showAlert(error.message || "Gagal menambahkan cerita. Coba lagi.");
      console.error("❌ Error:", error);
    } finally {
      AddStoryView.hideLoading();
    }
  }

  _stopCamera() {
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach((track) => track.stop());
      this.cameraStream = null;
    }
    AddStoryView.hideCamera();
  }

  async _setupPushNotifications() {
    if (!("serviceWorker" in navigator)) {
      console.warn("Service Worker tidak didukung di browser ini.");
      return;
    }

    try {
      this.registration = await navigator.serviceWorker.register("/src/public/sw.js");
      console.log("✅ Service Worker terdaftar:", this.registration.scope);

      const subscription = await this.registration.pushManager.getSubscription();
      this.isSubscribed = !!subscription;
      AddStoryView.updateNotifButton(this.isSubscribed);
    } catch (error) {
      console.error("❌ Gagal setup notifikasi:", error);
    }
  }

  async _handleNotifToggle() {
    const btn = document.getElementById("notif-btn");
    btn.disabled = true;

    try {
      if (!this.registration) {
        this.registration = await navigator.serviceWorker.ready;
      }

      const subscription = await this.registration.pushManager.getSubscription();

      if (this.isSubscribed) {
        console.log("🔕 Proses Unsubscribe dimulai...");
        if (subscription) {
          await subscription.unsubscribe();
          console.log("✅ Berhasil unsubscribe dari push notification.");

          // 🔥 Hapus subscription dari server
          await removeSubscription(subscription);
        }
        this.isSubscribed = false;
      } else {
        console.log("🔔 Proses Subscribe dimulai...");
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          AddStoryView.showAlert("Izin notifikasi ditolak.");
          return;
        }

        const vapidPublicKey = await getVapidPublicKey();
        const convertedKey = this._urlBase64ToUint8Array(vapidPublicKey);

        const newSubscription = await this.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey,
        });

        await sendSubscription(newSubscription);
        console.log("✅ Subscription berhasil.");
        this.isSubscribed = true;
      }

      // 🔥 Pastikan tombol diperbarui dengan status terbaru
      AddStoryView.updateNotifButton(this.isSubscribed);
    } catch (error) {
      console.error("❌ Gagal toggle notifikasi:", error);
    } finally {
      btn.disabled = false;
    }
  }

  _urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}
