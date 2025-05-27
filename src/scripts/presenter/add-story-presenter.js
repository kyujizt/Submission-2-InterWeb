import { addStory } from "../data/api";
import AddStoryView from "../pages/add-story/add-story-view";
import {
  registerServiceWorker,
  subscribePushMessage,
  unsubscribePushMessage,
  isSubscribedToPushNotification,
  requestNotificationPermission
} from "../utils/push-helper";

export default class AddStoryPresenter {
  constructor() {
    this.selectedLatLng = { lat: -6.2, lng: 106.8 };
    this.cameraImageBlob = null;
    this.cameraStream = null;
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

      AddStoryView.showAlert("Story berhasil ditambahkan!");
      this._stopCamera();
      AddStoryView.goToHomePage();
    } catch (error) {
      AddStoryView.showAlert(error.message || "Gagal menambahkan story. Coba lagi.");
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
    try {
      await registerServiceWorker();
      const isSubscribed = await isSubscribedToPushNotification();
      AddStoryView.updateNotifButton(isSubscribed);
      
      const notifBtn = document.getElementById("notif-btn");
      if (notifBtn) {
        notifBtn.addEventListener("click", async () => {
          notifBtn.disabled = true;
          try {
            const currentStatus = await isSubscribedToPushNotification();
            if (currentStatus) {
              await unsubscribePushMessage();
              AddStoryView.updateNotifButton(false);
            } else {
              const permission = await requestNotificationPermission();
              if (permission) {
                await subscribePushMessage();
                AddStoryView.updateNotifButton(true);
              }
            }
          } catch (error) {
            console.error("❌ Error toggle notification:", error);
            AddStoryView.showAlert("Gagal mengubah status notifikasi");
          } finally {
            notifBtn.disabled = false;
          }
        });
      }
    } catch (error) {
      console.error("❌ Error setup notification:", error);
    }
  }
}
