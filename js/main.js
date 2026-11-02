/**
 * CampusFind - College Lost & Found System
 * Global Main Script (Vanilla JS)
 * 
 * Handles navigation, mobile menu, toast alerts, modal dialogs,
 * and auth status badges across all pages.
 */

document.addEventListener('DOMContentLoaded', () => {
  initMobileNav();
  initAuthBadge();
  initModalContainer();
});

// Re-render auth badges dynamically when Firebase Auth state changes
window.addEventListener('campus-auth-changed', () => {
  initAuthBadge();
});

/**
 * Mobile navigation toggle
 */
function initMobileNav() {
  const toggleBtn = document.querySelector('.mobile-toggle');
  const navMenu = document.querySelector('.nav-menu');

  if (toggleBtn && navMenu) {
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      navMenu.classList.toggle('active');
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
      if (!navMenu.contains(e.target) && !toggleBtn.contains(e.target)) {
        navMenu.classList.remove('active');
      }
    });
  }
}

/**
 * Update navigation bar based on simulated login status
 */
function initAuthBadge() {
  const user = getActiveDemoUser();
  const navActions = document.querySelector('.nav-actions');
  const mobileNavActions = document.querySelector('.mobile-nav-actions');

  if (navActions) {
    if (user) {
      navActions.innerHTML = `
        <div class="nav-user-badge" style="display: inline-flex;" title="Logged in as ${user.name} (${user.email})">
          <span class="avatar">${user.name.charAt(0).toUpperCase()}</span>
          <span>${user.name}</span>
        </div>
        <button id="logoutBtn" class="btn btn-secondary btn-sm" title="Sign out of demo session">
          Sign Out
        </button>
      `;

      const logoutBtn = document.getElementById('logoutBtn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
          handleLogoutAction();
        });
      }
    } else {
      navActions.innerHTML = `
        <a href="login.html" class="btn btn-secondary btn-sm">Login</a>
        <a href="register.html" class="btn btn-primary btn-sm">Register</a>
      `;
    }
  }

  if (mobileNavActions) {
    if (user) {
      mobileNavActions.innerHTML = `
        <div class="nav-user-badge" style="display: inline-flex; justify-content: center; width: 100%;">
          <span class="avatar">${user.name.charAt(0).toUpperCase()}</span>
          <span>${user.name} (${user.role || 'Student'})</span>
        </div>
        <button id="mobileLogoutBtn" class="btn btn-secondary btn-sm" title="Sign out of demo session" style="width: 100%;">
          Sign Out
        </button>
      `;

      const mobileLogoutBtn = document.getElementById('mobileLogoutBtn');
      if (mobileLogoutBtn) {
        mobileLogoutBtn.addEventListener('click', () => {
          handleLogoutAction();
        });
      }
    } else {
      mobileNavActions.innerHTML = `
        <a href="login.html" class="btn btn-secondary btn-sm">Login</a>
        <a href="register.html" class="btn btn-primary btn-sm">Register</a>
      `;
    }
  }
}

function getActiveDemoUser() {
  if (typeof FirebaseAuth !== 'undefined' && typeof FirebaseAuth.getCurrentUser === 'function') {
    const user = FirebaseAuth.getCurrentUser();
    if (user) return user;
  }
  if (typeof CampusAuth !== 'undefined' && typeof CampusAuth.getCurrentUser === 'function') {
    const user = CampusAuth.getCurrentUser();
    if (user) return user;
  }
  if (typeof DemoAuth !== 'undefined' && typeof DemoAuth.getCurrentUser === 'function') {
    return DemoAuth.getCurrentUser();
  }
  try {
    const userJson = sessionStorage.getItem('campusfind_active_user') ||
                     sessionStorage.getItem('campusfind_demo_active_user');
    return userJson ? JSON.parse(userJson) : null;
  } catch (e) {
    return null;
  }
}

async function handleLogoutAction() {
  if (typeof FirebaseAuth !== 'undefined' && typeof FirebaseAuth.logout === 'function') {
    await FirebaseAuth.logout();
  } else if (typeof CampusAuth !== 'undefined' && typeof CampusAuth.logout === 'function') {
    await CampusAuth.logout();
  } else if (typeof DemoAuth !== 'undefined' && typeof DemoAuth.logout === 'function') {
    await DemoAuth.logout();
  } else {
    try {
      sessionStorage.removeItem('campusfind_active_user');
      sessionStorage.removeItem('campusfind_demo_active_user');
    } catch (e) {}
  }
  showToast("You have been signed out.", "info");
  setTimeout(() => {
    window.location.href = 'index.html';
  }, 600);
}

/**
 * Toast Notification System
 * @param {string} message - Message text
 * @param {string} type - 'success' | 'danger' | 'warning' | 'info'
 */
function showToast(message, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let iconSvg = '';
  if (type === 'success') {
    iconSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
  } else if (type === 'danger') {
    iconSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
  } else if (type === 'warning') {
    iconSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
  } else {
    iconSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
  }

  toast.innerHTML = `<span style="display: inline-flex; align-items: center;">${iconSvg}</span> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

/**
 * Reusable Card HTML generator
 * @param {Object} item - Item data object
 * @returns {string} HTML string
 */
function renderItemCard(item) {
  let statusBadgeClass = 'status-lost';
  let statusText = 'Active (Lost)';

  if (item.type === 'found') {
    statusBadgeClass = 'status-found';
    statusText = 'Active (Found)';
  }
  if (item.status === 'claimed') {
    statusBadgeClass = 'status-claimed';
    statusText = 'Resolved / Claimed';
  } else if (item.status === 'under_verification') {
    statusBadgeClass = 'status-review';
    statusText = 'Under Verification';
  }

  return `
    <article class="item-card" data-id="${item.id}">
      <div class="item-card-media">
        <span class="status-badge ${statusBadgeClass}">
          ${statusText}
        </span>
        <span class="type-tag">${item.type.toUpperCase()}</span>
        <img src="${item.image || 'assets/images/placeholder.svg'}" alt="${item.title}" loading="lazy">
      </div>
      <div class="item-card-body">
        <div class="item-category">${item.category}</div>
        <h3 class="item-title" title="${item.title}">${item.title}</h3>
        <p class="item-desc">${item.description}</p>
        <div class="item-meta">
          <div class="meta-row">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
              <circle cx="12" cy="9" r="2.5"/>
            </svg>
            <span>${item.location}</span>
          </div>
          <div class="meta-row">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span>Reported on: ${item.date}</span>
          </div>
        </div>
      </div>
      <div class="item-card-footer">
        <button class="btn btn-secondary btn-sm btn-block view-details-btn" onclick="openItemModal('${item.id}')">
          View Details
        </button>
      </div>
    </article>
  `;
}

/**
 * Initialize reusable Modal DOM element
 */
function initModalContainer() {
  if (document.getElementById('itemModalOverlay')) return;

  const modalHtml = `
    <div id="itemModalOverlay" class="modal-overlay" onclick="closeItemModal(event)">
      <div class="modal-content" onclick="event.stopPropagation()">
        <div class="modal-header">
          <h3 id="modalTitle" class="modal-title">Item Details</h3>
          <button class="modal-close" onclick="closeItemModal()">&times;</button>
        </div>
        <div id="modalBody" class="modal-body">
          <!-- Dynamic details filled here -->
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="closeItemModal()">Close</button>
          <button id="modalClaimBtn" class="btn btn-primary" onclick="handleClaimAction()">Contact / Claim</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

let currentModalItem = null;

/**
 * Open Item Detail Modal
 */
function openItemModal(itemId) {
  let item = null;

  // 1. Check in Search active items (from Search directory)
  if (Array.isArray(window.currentActiveItems)) {
    item = window.currentActiveItems.find(i => i.id === itemId);
  }

  // 2. Check in Dashboard active items (from User Dashboard)
  if (!item && Array.isArray(window.dashboardActiveItems)) {
    item = window.dashboardActiveItems.find(i => i.id === itemId);
  }

  // 3. Fallback to StorageService items
  if (!item && typeof StorageService !== 'undefined' && typeof StorageService.getItems === 'function') {
    const localItems = StorageService.getItems();
    item = localItems.find(i => i.id === itemId);
  }

  if (!item) {
    console.warn("Item details not found for ID:", itemId);
    return;
  }

  currentModalItem = item;

  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');
  const overlay = document.getElementById('itemModalOverlay');

  let statusClass = item.status === 'claimed' ? 'status-claimed' : (item.type === 'found' ? 'status-found' : 'status-lost');
  let statusText = item.status === 'claimed' ? 'Claimed / Returned' : (item.status === 'under_verification' ? 'Under Verification' : (item.type === 'found' ? 'Found' : 'Lost'));

  modalTitle.textContent = item.title;
  modalBody.innerHTML = `
    <div style="margin-bottom: 1.25rem; text-align: center; background: #f1f5f9; border-radius: 8px; overflow: hidden; max-height: 240px; display: flex; align-items: center; justify-content: center;">
      <img src="${item.image || 'assets/images/placeholder.svg'}" alt="${item.title}" style="max-height: 220px; object-fit: contain;">
    </div>
    
    <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem; align-items: center;">
      <span class="badge-pill ${statusClass}">${statusText}</span>
      <span class="badge-pill" style="background: #e2e8f0; color: #334155;">${item.category}</span>
      <span style="margin-left: auto; font-size: 0.85rem; color: #64748b;">Reported: ${item.date}</span>
    </div>

    <div style="margin-bottom: 1.25rem;">
      <h4 style="font-size: 0.95rem; font-weight: 700; color: #0f172a; margin-bottom: 0.35rem;">Description:</h4>
      <p style="font-size: 0.9rem; color: #475569; line-height: 1.6;">${item.description}</p>
    </div>

    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem; font-size: 0.875rem;">
      <div style="margin-bottom: 0.5rem;">
        <strong>Location:</strong> ${item.location}
      </div>
      <div style="margin-bottom: 0.5rem;">
        <strong>Current Custody / Storage:</strong> ${item.custodyInfo || 'Campus Helpdesk'}
      </div>
      <div style="margin-bottom: 0.5rem;">
        <strong>Reported By:</strong> ${item.contactName || 'Campus Community'} (${item.contactEmail || 'N/A'})
      </div>
      <div>
        <strong>Phone Contact:</strong> ${item.contactPhone || 'Available upon security verification'}
      </div>
    </div>

    <div class="alert alert-info" style="margin-top: 1.25rem; margin-bottom: 0;">
      <div>
        <strong>Claiming Guidance:</strong> Present your college student ID card and verify item ownership (passcode, serial number, distinctive marks) at the security helpdesk.
      </div>
    </div>
  `;

  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeItemModal(event) {
  if (event && event.target && event.target.id !== 'itemModalOverlay' && !event.target.classList.contains('modal-close') && event.target.tagName !== 'BUTTON') {
    return;
  }
  const overlay = document.getElementById('itemModalOverlay');
  if (overlay) {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }
}

function handleClaimAction() {
  if (!currentModalItem) return;
  closeItemModal();
  showToast(`Inquiry initiated for "${currentModalItem.title}". Visit the campus security desk or contact ${currentModalItem.contactEmail || 'security@campus.edu'}.`, "success");
}
