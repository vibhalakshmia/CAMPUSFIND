/**
 * CampusFind - College Lost & Found System
 * Search & Filtering Module (Vanilla JS / Cloud Firestore Integration)
 * 
 * Loads real-time reports from Cloud Firestore (lost_items & found_items)
 * when authenticated, and supports sample demo data for empty-state demonstration.
 */

let currentSearchItems = [];

document.addEventListener('DOMContentLoaded', () => {
  initSearchSelects();
  initSearchEvents();
  applyFiltersFromUrl();
  loadSearchData();
});

// Refresh search data when authentication state changes
window.addEventListener('campus-auth-changed', () => {
  loadSearchData();
});

/**
 * Populate Category and Location filter dropdowns
 */
function initSearchSelects() {
  const categorySelect = document.getElementById('filterCategory');
  if (categorySelect && typeof ITEM_CATEGORIES !== 'undefined') {
    ITEM_CATEGORIES.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      categorySelect.appendChild(opt);
    });
  }

  const locationSelect = document.getElementById('filterLocation');
  if (locationSelect && typeof CAMPUS_LOCATIONS !== 'undefined') {
    CAMPUS_LOCATIONS.forEach(loc => {
      const opt = document.createElement('option');
      opt.value = loc;
      opt.textContent = loc;
      locationSelect.appendChild(opt);
    });
  }
}

/**
 * Load live reports from Cloud Firestore, falling back to distinguished sample items
 */
async function loadSearchData() {
  const isAuth = (typeof FirebaseAuth !== 'undefined' && FirebaseAuth.isLoggedIn()) ||
                 (typeof CampusAuth !== 'undefined' && CampusAuth.isLoggedIn());

  const noticeBanner = document.getElementById('searchSourceNotice');
  const countSpan = document.getElementById('resultsCount');
  const grid = document.getElementById('itemsGrid');

  if (countSpan && currentSearchItems.length === 0) {
    countSpan.textContent = 'Loading campus reports...';
  }

  let realReports = [];
  let fetchFailed = false;

  const firestore = (typeof window.FirestoreService !== 'undefined')
    ? window.FirestoreService
    : ((typeof FirestoreService !== 'undefined') ? FirestoreService : null);

  if (firestore) {
    try {
      realReports = await firestore.getAllReports();
    } catch (err) {
      console.warn("Could not fetch reports from Firestore:", err);
      fetchFailed = true;
    }
  }

  if (realReports && realReports.length > 0) {
    currentSearchItems = realReports.map(item => ({
      ...item,
      isRealFirestoreReport: true,
      isDemo: false
    }));

    if (noticeBanner) {
      noticeBanner.style.display = 'flex';
      noticeBanner.className = 'alert alert-info';
      noticeBanner.innerHTML = `
        <div>
          <strong>Cloud Firestore Synchronized:</strong> Showing ${realReports.length} active campus report(s) retrieved from database.
        </div>
      `;
    }
  } else {
    // Empty database or unauthenticated guest fallback
    const sampleItems = (typeof StorageService !== 'undefined' ? StorageService.getItems() : []).map(item => ({
      ...item,
      isDemo: item.isDemo !== false,
      isRealFirestoreReport: false
    }));

    currentSearchItems = sampleItems;

    if (noticeBanner) {
      noticeBanner.style.display = 'flex';
      if (isAuth) {
        noticeBanner.className = 'alert alert-secondary';
        noticeBanner.innerHTML = `
          <div>
            <strong>Cloud Firestore Active:</strong> No live reports currently open in the database. Displaying sample campus records for demonstration.
          </div>
        `;
      } else {
        noticeBanner.className = 'alert alert-warning';
        noticeBanner.innerHTML = `
          <div>
            <strong>Guest Mode:</strong> Showing sample records. 
            <a href="login.html?redirect=search.html" style="font-weight: 700; text-decoration: underline;">Sign In with Firebase</a> 
            to search and view live reports submitted by students across campus.
          </div>
        `;
      }
    }
  }

  window.currentActiveItems = currentSearchItems;
  executeFilter();
}

/**
 * Attach live search and filter events
 */
function initSearchEvents() {
  const searchInput = document.getElementById('searchQuery');
  const typeFilter = document.getElementById('filterType');
  const categoryFilter = document.getElementById('filterCategory');
  const locationFilter = document.getElementById('filterLocation');
  const statusFilter = document.getElementById('filterStatus');
  const sortFilter = document.getElementById('filterSort');
  const resetBtn = document.getElementById('resetFiltersBtn');

  const filterInputs = [searchInput, typeFilter, categoryFilter, locationFilter, statusFilter, sortFilter];

  filterInputs.forEach(input => {
    if (input) {
      input.addEventListener('input', () => executeFilter());
      input.addEventListener('change', () => executeFilter());
    }
  });

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      if (typeFilter) typeFilter.value = 'all';
      if (categoryFilter) categoryFilter.value = 'all';
      if (locationFilter) locationFilter.value = 'all';
      if (statusFilter) statusFilter.value = 'all';
      if (sortFilter) sortFilter.value = 'newest';
      executeFilter();
      showToast('Filters have been reset.', 'info');
    });
  }
}

/**
 * Parse URL params to allow searches from the Home page hero search bar
 */
function applyFiltersFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const q = params.get('q');
  const type = params.get('type');
  const category = params.get('category');

  if (q) {
    const searchInput = document.getElementById('searchQuery');
    if (searchInput) searchInput.value = q;
  }

  if (type) {
    const typeFilter = document.getElementById('filterType');
    if (typeFilter) typeFilter.value = type;
  }

  if (category) {
    const catFilter = document.getElementById('filterCategory');
    if (catFilter) catFilter.value = category;
  }
}

/**
 * Execute filter logic and render matching items
 */
function executeFilter() {
  const query = (document.getElementById('searchQuery')?.value || '').toLowerCase().trim();
  const type = document.getElementById('filterType')?.value || 'all';
  const category = document.getElementById('filterCategory')?.value || 'all';
  const location = document.getElementById('filterLocation')?.value || 'all';
  const status = document.getElementById('filterStatus')?.value || 'all';
  const sort = document.getElementById('filterSort')?.value || 'newest';

  const itemsToFilter = currentSearchItems.length > 0 ? currentSearchItems : (typeof StorageService !== 'undefined' ? StorageService.getItems() : []);

  const filtered = itemsToFilter.filter(item => {
    // Search text match (title, description, location)
    if (query) {
      const matchText = (
        (item.title || '') + ' ' + 
        (item.description || '') + ' ' + 
        (item.location || '') + ' ' + 
        (item.category || '')
      ).toLowerCase();
      if (!matchText.includes(query)) return false;
    }

    // Report Type (lost / found)
    if (type !== 'all' && item.type !== type) return false;

    // Category
    if (category !== 'all' && item.category !== category) return false;

    // Location
    if (location !== 'all') {
      const targetLoc = location.toLowerCase();
      const itemArea = (item.locationArea || '').toLowerCase();
      const itemFullLoc = (item.location || '').toLowerCase();
      const isMatch = itemArea === targetLoc ||
                      itemArea.includes(targetLoc) ||
                      targetLoc.includes(itemArea) ||
                      itemFullLoc.includes(targetLoc);
      if (!isMatch) return false;
    }

    // Status
    if (status !== 'all') {
      if (status === 'active' || status === 'open') {
        if (item.status !== 'active' && item.status !== 'open') return false;
      } else if (item.status !== status) {
        return false;
      }
    }

    return true;
  });

  // Sorting
  filtered.sort((a, b) => {
    const dateA = new Date(a.date || a.createdAt || 0);
    const dateB = new Date(b.date || b.createdAt || 0);
    return sort === 'oldest' ? dateA - dateB : dateB - dateA;
  });

  renderSearchResults(filtered, itemsToFilter.length);
}

/**
 * Render items into the results grid
 */
function renderSearchResults(items, totalCount) {
  const grid = document.getElementById('itemsGrid');
  const countSpan = document.getElementById('resultsCount');

  if (countSpan) {
    countSpan.textContent = `Showing ${items.length} of ${totalCount} items`;
  }

  if (!grid) return;

  if (items.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </div>
        <h3 class="empty-title">No matching items found</h3>
        <p class="empty-text">Try broadening your search keywords or resetting filters to view all reported campus items.</p>
        <button class="btn btn-secondary" onclick="document.getElementById('resetFiltersBtn').click()">
          Reset All Filters
        </button>
      </div>
    `;
    return;
  }

  grid.innerHTML = items.map(item => renderItemCard(item)).join('');
}
