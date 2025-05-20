import L from "leaflet";
import { saveStory } from "../../utils/indexDB";

const HomeView = {
  addSkipToContent() {
    // Periksa apakah elemen Skip to Content sudah ada untuk mencegah duplikasi
    if (!document.querySelector(".skip-to-content")) {
      const skipLink = document.createElement("a");
      skipLink.href = "#story-list";
      skipLink.className = "skip-to-content";
      skipLink.textContent = "Skip to Content";
      document.body.prepend(skipLink);
    }
  },

  showStories(stories) {
    const storyContainer = document.querySelector("#story-list");
    if (!storyContainer) {
      console.error("❌ Elemen #story-list tidak ditemukan.");
      return;
    }

    if (!stories || stories.length === 0) {
      storyContainer.innerHTML = "<p class='no-stories'>Tidak ada cerita yang tersedia.</p>";
      return;
    }

    storyContainer.innerHTML = stories
      .map((story) => {
        const imageUrl = story.imageUrl || "/src/public/images/placeholder.jpg";

        // Format waktu pembuatan cerita (`createdAt`)
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

        // Tambahkan koordinat ke deskripsi hanya jika koordinat valid
        const coordinates = story.location?.lat && story.location?.lng ? `<p class="story-coordinates"><strong>Koordinat:</strong> (${story.location.lat}, ${story.location.lng})</p>` : "";
        return `
  <div class="story-item" data-id="${story.id}">
    <h3 class="story-title">${story.title || "Judul tidak tersedia"}</h3>
    <img src="${imageUrl}" alt="${story.title}" class="story-image" />
    <p class="story-description">${story.description || "Deskripsi tidak tersedia"}</p>
    ${coordinates}
    <p class="story-date"><strong>Dibuat pada:</strong> ${formattedDate}</p>
    ${story.location?.lat && story.location?.lng ? `<div id="story-map-${story.id}" class="story-map" style="height: 200px; margin-top: 1rem;"></div>` : "<p class='story-no-location'></p>"}

    <!-- Tambahkan tombol di sini -->
    <div class="story-actions">
      <button class="save-btn" data-id="${story.id}">💾 Simpan Offline</button>
      <button class="delete-btn" data-id="${story.id}">🗑 Hapus</button>
    </div>
  </div>
`;
      })
      .join("");

    // Tambahkan peta mini untuk cerita yang memiliki lokasi valid
    stories.forEach((story) => {
      if (story.location?.lat && story.location?.lng) {
        this.showStoryMiniMap(`story-map-${story.id}`, [story.location.lat, story.location.lng]);
      }
    });
  },

  showError(message) {
    const storyContainer = document.querySelector("#story-list");
    if (!storyContainer) {
      console.error("❌ Elemen #story-list tidak ditemukan.");
      return;
    }
    storyContainer.innerHTML = `<p class="error-message">${message}</p>`;
  },

  showStoryDetail(story) {
    // Membuat elemen halaman penuh untuk detail cerita
    const detailPage = document.createElement("div");
    detailPage.classList.add("story-detail-page");

    // Format waktu pembuatan cerita (`createdAt`)
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

    // Tambahkan koordinat hanya jika lokasi valid
    const coordinates = story.location?.lat && story.location?.lng ? `<p class="detail-coordinates"><strong>Koordinat:</strong> (${story.location.lat}, ${story.location.lng})</p>` : "";

    detailPage.innerHTML = `
      <button class="close-page">&times;</button>
      <div class="story-detail-wrapper">
        <div class="story-detail-image">
          <img src="${story.imageUrl}" alt="${story.title}" class="detail-image" />
        </div>
        <div class="story-detail-info">
          <h3 class="detail-title">${story.title}</h3>
          <p class="detail-description">${story.description}</p>
          ${coordinates}
          <p class="detail-date"><strong>Dibuat pada:</strong> ${formattedDate}</p>
          ${story.location?.lat && story.location?.lng ? `<div id="map-fullscreen" class="detail-map"></div>` : "<p class='detail-no-location'>Lokasi tidak tersedia</p>"}
        </div>
      </div>
    `;

    // Menambahkan halaman detail ke DOM
    document.body.appendChild(detailPage);

    // Tombol untuk menutup halaman penuh
    const closeButton = detailPage.querySelector(".close-page");
    closeButton.addEventListener("click", () => {
      // Hapus elemen halaman detail dari DOM tanpa memaksakan scroll ke beranda
      detailPage.remove();
      console.log("✅ Halaman detail ditutup.");
    });

    // Validasi lokasi sebelum memuat peta
    if (story.location?.lat && story.location?.lng) {
      const mapContainer = document.querySelector("#map-fullscreen");
      if (!mapContainer) {
        console.error("❌ Elemen #map-fullscreen tidak ditemukan.");
        return;
      }

      mapContainer.style.height = "400px";
      mapContainer.style.width = "100%";

      const map = L.map("map-fullscreen").setView([story.location.lat, story.location.lng], 13);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);

      L.marker([story.location.lat, story.location.lng]).addTo(map).bindPopup(`<strong>${story.title}</strong>`).openPopup();

      setTimeout(() => {
        map.invalidateSize();
      }, 300);
    }
  },

  _setupStoryClickEvent(stories, onDetailClick) {
    const storyItems = document.querySelectorAll(".story-item");
    storyItems.forEach((item) => {
      item.addEventListener("click", () => {
        const storyId = item.getAttribute("data-id");
        console.log(`📌 Klik pada cerita dengan ID: ${storyId}`);
        if (onDetailClick) {
          onDetailClick(storyId);
        }
      });
    });
  },

  showStoryMiniMap(mapId, coords) {
    const map = L.map(mapId).setView(coords, 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    L.marker(coords).addTo(map);
  },

  initializeSaveOfflineButtons(stories) {
    const saveButtons = document.querySelectorAll('.save-btn');
    saveButtons.forEach((button) => {
      button.addEventListener('click', async (e) => {
        e.stopPropagation(); // Prevent story detail from opening
        const storyId = button.dataset.id;
        const story = stories.find((s) => s.id === storyId);
        
        if (story) {
          try {
            await saveStory(story);
            // Update button state to show success
            button.textContent = '✅ Tersimpan';
            button.disabled = true;
            button.classList.add('saved');
            
            setTimeout(() => {
              button.textContent = '💾 Simpan Offline';
              button.disabled = false;
              button.classList.remove('saved');
            }, 2000);
          } catch (error) {
            console.error('❌ Gagal menyimpan cerita offline:', error);
            button.textContent = '❌ Gagal';
            setTimeout(() => {
              button.textContent = '💾 Simpan Offline';
            }, 2000);
          }
        }
      });
    });
  },
};

export default HomeView;
