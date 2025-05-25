import OfflineView from './offline-view';
import { getStories, deleteStory } from '../../utils/indexDB';

export default class OfflinePage {
  constructor() {
    console.log('📱 OfflinePage initialized');
    this.stories = [];
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
      await this._loadStories();
      
      // Setup skip to content
      OfflineView.setupSkipToContent();
      
      console.log('✅ Offline stories loaded successfully');
    } catch (error) {
      console.error('❌ Error loading offline stories:', error);
      OfflineView.showError('Gagal memuat cerita offline');
    }
  }

  async _loadStories() {
    this.stories = await getStories();
    OfflineView.showOfflineStories(this.stories);
    this._initializeDeleteButtons();
  }

  _initializeDeleteButtons() {
    const deleteButtons = document.querySelectorAll('.delete-offline-btn');
    deleteButtons.forEach((button) => {
      button.addEventListener('click', async (e) => {
        e.stopPropagation();
        const storyId = button.dataset.id;
        
        try {
          console.log(`🗑 Deleting story with ID: ${storyId}`);
          const success = await deleteStory(storyId);
          
          if (success) {
            // Update the stories list without refreshing the page
            this.stories = this.stories.filter(story => story.id !== storyId);
            OfflineView.showOfflineStories(this.stories);
            this._initializeDeleteButtons(); // Re-initialize delete buttons
            console.log('✅ Story deleted and list refreshed');
          } else {
            throw new Error('Failed to delete story');
          }
        } catch (error) {
          console.error('❌ Error deleting story:', error);
          OfflineView.showError('Gagal menghapus cerita');
        }
      });
    });
  }
}
