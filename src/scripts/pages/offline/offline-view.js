import L from "leaflet";

const OfflineView = {
  setupSkipToContent() {
    const mainContent = document.querySelector("#main-content");
    const skipLink = document.querySelector("#skip-link");

    if (skipLink) {
      skipLink.addEventListener("click", (event) => {
        event.preventDefault();
        skipLink.blur();
        mainContent.focus();
        mainContent.scrollIntoView({ behavior: "smooth" });
      });
    }
  },

  showOfflineStories(stories) {
    const storyContainer = document.querySelector("#offline-story-list");
    if (!storyContainer) {
      console.error("❌ Elemen #offline-story-list tidak ditemukan.");
      return;
    }

    if (!stories || stories.length === 0) {
      storyContainer.innerHTML = "<p class='no-stories'>Tidak ada cerita offline yang tersedia.</p>";
      return;
    }

    storyContainer.innerHTML = stories
      .map((story) => {
        const imageUrl = story.imageUrl || "/src/public/images/placeholder.jpg";
        const formattedDate = story.createdAt
          ? new Date(story.createdAt).toLocaleDateString("id-ID", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "Tanggal tidak tersedia";

        const coordinates = story.location?.lat && story.location?.lng 
          ? `<p class="story-coordinates"><strong>Koordinat:</strong> (${story.location.lat}, ${story.location.lng})</p>` 
          : "";

        return `
          <div class="story-item" data-id="${story.id}">
            <h3 class="story-title">${story.title || "Judul tidak tersedia"}</h3>
            <img src="${imageUrl}" alt="${story.title}" class="story-image" />
            <p class="story-description">${story.description || "Deskripsi tidak tersedia"}</p>
            ${coordinates}
            <p class="story-date"><strong>Dibuat pada:</strong> ${formattedDate}</p>
            ${story.location?.lat && story.location?.lng 
              ? `<div id="offline-story-map-${story.id}" class="story-map" style="height: 200px; margin-top: 1rem;"></div>` 
              : "<p class='story-no-location'></p>"}
            <div class="story-actions">
              <button class="delete-offline-btn" data-id="${story.id}">🗑 Hapus dari Offline</button>
            </div>
          </div>
        `;
      })
      .join("");

    // Initialize maps for stories with locations
    stories.forEach((story) => {
      if (story.location?.lat && story.location?.lng) {
        this.showStoryMiniMap(`offline-story-map-${story.id}`, [story.location.lat, story.location.lng]);
      }
    });
  },

  showStoryMiniMap(mapId, coords) {
    const map = L.map(mapId).setView(coords, 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    L.marker(coords).addTo(map);
  },

  showError(message) {
    const storyContainer = document.querySelector("#offline-story-list");
    if (!storyContainer) {
      console.error("❌ Elemen #offline-story-list tidak ditemukan.");
      return;
    }
    storyContainer.innerHTML = `<p class="error-message">${message}</p>`;
  },
};

export default OfflineView;
