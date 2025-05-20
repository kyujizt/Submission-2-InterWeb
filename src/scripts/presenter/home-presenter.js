import { getData, getDataById } from "../data/api";
import { saveStory, getStories, deleteStory } from "../utils/indexDB";

export default class HomePresenter {
  constructor({ view }) {
    this.view = view;
  }
  async init() {
    try {
      console.log("🔄 Memulai pengambilan cerita...");
      const stories = await this.getStories(); // 🔥 Menangani online dan offline

      if (!stories || stories.length === 0) {
        this.view.showError("Tidak ada cerita yang tersedia.");
        return;
      }

      this.view.showStories(stories); // 🔥 Render UI
      this.view.initializeSaveOfflineButtons(stories); // Initialize offline save buttons
      this._setupStoryClickEvent(stories); // ⬅️ Agar klik ke detail tetap aktif
      console.log("✅ Cerita berhasil dimuat.");
    } catch (error) {
      console.error("❌ Error saat memuat cerita:", error.message);
      this.view.showError("Gagal memuat cerita. Silakan coba lagi nanti.");
    }
  }

  async fetchAndShowDetail(storyId) {
    try {
      console.log(`🔄 Mengambil detail cerita dengan ID: ${storyId}`);
      const story = await getDataById(storyId);

      if (!story.location || typeof story.location.lat !== "number" || typeof story.location.lng !== "number") {
        console.warn(`⚠️ Cerita dengan ID ${storyId} tidak memiliki lokasi valid.`);
      }

      story.createdAt = story.createdAt || new Date().toISOString();
      this.view.showStoryDetail(story);
      console.log("✅ Detail cerita berhasil dimuat.");
    } catch (error) {
      console.error("❌ Error saat memuat detail cerita:", error.message);
      this.view.showError("Gagal memuat detail cerita.");
    }
  }
  async getStories() {
    try {
      console.log("📡 Mengambil daftar cerita...");
      const stories = await getData();
      
      // Save stories to IndexedDB for offline access
      stories.forEach(async (story) => {
        try {
          await saveStory(story);
        } catch (error) {
          console.warn(`⚠️ Gagal menyimpan cerita ${story.id} ke IndexedDB:`, error);
        }
      });

      if (!stories.length) {
        console.warn("❌ Tidak ada cerita yang tersedia.");
        return [];
      }

      // 🔥 Simpan ke IndexedDB
      stories.forEach((story) => saveStory(story));

      return stories.map((story) => ({
        ...story,
        createdAt: story.createdAt || new Date().toISOString(),
      }));
    } catch (error) {
      console.warn("⚠️ Gagal API, mencoba dari IndexedDB...");
      try {
        const offlineStories = await getStories();
        if (!offlineStories.length) {
          console.error("❌ Tidak ada data tersimpan di IndexedDB.");
          this.view.showError("Tidak ada data offline yang tersedia.");
          return [];
        }
        console.log("✅ Data offline berhasil dimuat.");
        return offlineStories;
      } catch (dbError) {
        console.error("❌ Gagal mengambil data offline:", dbError);
        this.view.showError("Terjadi kesalahan saat mengambil data offline.");
        return [];
      }
    }
  }

  _setupStoryButtonHandlers() {
    const saveButtons = document.querySelectorAll(".save-btn");
    const deleteButtons = document.querySelectorAll(".delete-btn");

    saveButtons.forEach((button) => {
      button.addEventListener("click", async (event) => {
        event.stopPropagation();
        const storyId = button.getAttribute("data-id");
        try {
          const story = await getDataById(storyId);
          await saveStory(story);
          alert("✅ Cerita disimpan offline.");
        } catch (error) {
          console.error("❌ Gagal menyimpan cerita:", error);
          alert("Gagal menyimpan cerita.");
        }
      });
    });

    deleteButtons.forEach((button) => {
      button.addEventListener("click", async (event) => {
        event.stopPropagation();
        const storyId = button.getAttribute("data-id");
        try {
          const { deleteStory } = await import("../utils/indexDB.js");
          await deleteStory(storyId);
          alert("🗑 Cerita dihapus dari offline.");
        } catch (error) {
          console.error("❌ Gagal menghapus cerita:", error);
          alert("Gagal menghapus cerita.");
        }
      });
    });
  }

  _setupStoryClickEvent(stories) {
    this.view._setupStoryClickEvent(stories, (id) => this.fetchAndShowDetail(id));
  }
}
