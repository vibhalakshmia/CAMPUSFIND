/**
 * CampusFind - College Lost & Found System
 * Local Storage & State Management Layer (Vanilla JS)
 * 
 * IMPORTANT ARCHITECTURE NOTE:
 * - This service manages non-sensitive lost and found report records.
 * - Records are persisted in browser localStorage for demonstration purposes.
 * - This is NOT cloud storage. Cloud Firestore will replace this in Milestone 2.
 * - Sensitive credentials / passwords are NEVER stored in localStorage.
 */

const STORAGE_KEYS = {
  ITEMS: 'campusfind_items_v2'
};

// Security cleanup: Ensure no legacy authentication or password data lingers in localStorage
try {
  localStorage.removeItem('campusfind_users_v1');
  localStorage.removeItem('campusfind_auth_user_v1');
} catch (e) {
  // Ignore storage access errors in restricted iframe environments
}

const StorageService = {
  /**
   * Initialize items from mock data if localStorage is empty or corrupted
   */
  init() {
    try {
      const existing = localStorage.getItem(STORAGE_KEYS.ITEMS);
      if (!existing) {
        localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(INITIAL_SAMPLE_ITEMS));
      } else {
        // Validate JSON integrity
        const parsed = JSON.parse(existing);
        if (!Array.isArray(parsed) || parsed.length === 0) {
          localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(INITIAL_SAMPLE_ITEMS));
        }
      }
    } catch (e) {
      console.warn("Storage access issue or quota exceeded during init:", e);
    }
  },

  /**
   * Get all items from localStorage with fallback to default demo data
   * @returns {Array} List of lost/found item objects
   */
  getItems() {
    this.init();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ITEMS);
      if (!data) return INITIAL_SAMPLE_ITEMS;
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : INITIAL_SAMPLE_ITEMS;
    } catch (e) {
      console.error("Error reading items from localStorage:", e);
      return INITIAL_SAMPLE_ITEMS;
    }
  },

  /**
   * Save items array to localStorage with quota-exceeded error handling
   * @param {Array} items
   * @returns {Object} { success: boolean, quotaFallback?: boolean, error?: string }
   */
  saveItems(items) {
    try {
      localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(items));
      return { success: true };
    } catch (e) {
      console.warn("localStorage quota exceeded or write failed:", e);

      // If quota exceeded, attempt fallback by replacing newly added heavy data URLs with SVG placeholders
      if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.code === 22) {
        try {
          const lightweightItems = items.map(item => {
            // If image is a heavy base64 data URL > 100KB, fall back to lightweight SVG
            if (item.image && item.image.startsWith('data:image/') && item.image.length > 50000) {
              return {
                ...item,
                image: createItemSvg(
                  item.title,
                  item.category || 'General',
                  item.type === 'lost' ? ['#991b1b', '#ef4444'] : ['#065f46', '#10b981'],
                  item.type === 'lost' ? 'LOST' : 'FOUND'
                )
              };
            }
            return item;
          });
          localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(lightweightItems));
          return { success: true, quotaFallback: true };
        } catch (innerError) {
          console.error("Critical: Storage completely full even after fallback:", innerError);
          return { success: false, error: 'Storage full. Please reset demo data from the Dashboard.' };
        }
      }
      return { success: false, error: e.message || 'Failed to save to local storage.' };
    }
  },

  /**
   * Add a new item report to the shared storage
   * @param {Object} itemData
   * @returns {Object} { success: boolean, item?: Object, message?: string }
   */
  addItem(itemData) {
    const items = this.getItems();
    const currentUser = (typeof FirebaseAuth !== 'undefined' && typeof FirebaseAuth.getCurrentUser === 'function')
      ? FirebaseAuth.getCurrentUser()
      : ((typeof DemoAuth !== 'undefined') ? DemoAuth.getCurrentUser() : null);

    const newItem = {
      id: "item-" + Date.now(),
      status: "active", // Initial status for all new submissions
      reportedBy: currentUser ? currentUser.email : "guest@campus.edu",
      reportedByUid: currentUser ? (currentUser.uid || "") : "",
      reportedByName: currentUser ? currentUser.name : "Campus Community Member",
      createdAt: new Date().toISOString(),
      isDemo: false,
      ...itemData
    };

    items.unshift(newItem);
    const saveResult = this.saveItems(items);

    if (!saveResult.success) {
      return { success: false, message: saveResult.error };
    }

    return { 
      success: true, 
      item: newItem, 
      quotaFallback: saveResult.quotaFallback 
    };
  },

  /**
   * Update the status of an existing item (e.g. active -> claimed)
   * @param {string} id - Item ID
   * @param {string} newStatus - 'active' | 'claimed' | 'under_verification'
   * @returns {Object|null}
   */
  updateItemStatus(id, newStatus) {
    const items = this.getItems();
    const index = items.findIndex(item => item.id === id);
    if (index !== -1) {
      items[index].status = newStatus;
      items[index].updatedAt = new Date().toISOString();
      this.saveItems(items);
      return items[index];
    }
    return null;
  },

  /**
   * Delete an item by ID
   * @param {string} id
   * @returns {boolean}
   */
  deleteItem(id) {
    const items = this.getItems();
    const filtered = items.filter(item => item.id !== id);
    this.saveItems(filtered);
    return true;
  },

  /**
   * Reset data back to default demo items
   */
  resetToDefault() {
    try {
      localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(INITIAL_SAMPLE_ITEMS));
      return INITIAL_SAMPLE_ITEMS;
    } catch (e) {
      console.error("Failed to reset storage:", e);
      return INITIAL_SAMPLE_ITEMS;
    }
  },

  /**
   * Compute live summary metrics for dashboard and hero counters
   */
  getStats() {
    const items = this.getItems();
    return {
      total: items.length,
      lost: items.filter(i => i.type === 'lost').length,
      found: items.filter(i => i.type === 'found').length,
      active: items.filter(i => i.status === 'active' || i.status === 'open').length,
      resolved: items.filter(i => i.status === 'claimed').length,
      underVerification: items.filter(i => i.status === 'under_verification').length
    };
  }
};

// Initialize storage on load
StorageService.init();
