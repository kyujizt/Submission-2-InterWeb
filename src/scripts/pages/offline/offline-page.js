import OfflineView from './offline-view';
import { getStories, deleteStory } from '../../utils/indexDB';

export default class OfflinePage {
  constructor() {
    console.log('📱 OfflinePage initialized');
  }
  async render() {
    return `
      <div class="skip-container">
        <a href="#main-content" class="skip-to-content" tabindex="0">
          Skip ke Konten Utama
        </a>
      </div>
      
      <main id="main-content" tabindex="-1">
        <div class="content">
          <h2 class="content__heading">Cerita Tersimpan Offline</h2>
          <div id="offline-story-list" class="stories-grid"></div>
        </div>
      </main>
    `;
  }

  async afterRender() {
    try {
      console.log('🔄 Loading offline stories...');
      const stories = await getStories();
      OfflineView.showOfflineStories(stories);
      
      // Setup skip to content
      OfflineView.setupSkipToContent();
      
      // Setup delete buttons
      this._initializeDeleteButtons();
      console.log('✅ Offline stories loaded successfully');
    } catch (error) {
      console.error('❌ Error loading offline stories:', error);
      OfflineView.showError('Gagal memuat cerita offline');
    }
  }

  _initializeDeleteButtons() {
    const deleteButtons = document.querySelectorAll('.delete-offline-btn');
    deleteButtons.forEach((button) => {
      button.addEventListener('click', async (e) => {
        e.stopPropagation();
        const storyId = button.dataset.id;
        
        try {
          console.log(`🗑 Deleting story with ID: ${storyId}`);
          await deleteStory(storyId);
          
          // Refresh the stories list
          const stories = await getStories();
          OfflineView.showOfflineStories(stories);
          console.log('✅ Story deleted and list refreshed');
        } catch (error) {
          console.error('❌ Error deleting story:', error);
          OfflineView.showError('Gagal menghapus cerita');
        }
      });
    });
  }
}
