/**
 * CampusFind - College Lost & Found System
 * Dashboard Management Module (Vanilla JS / Cloud Firestore Integration)
 * 
 * Computes live statistics from Cloud Firestore, renders student reports,
 * enforces authentication protection for management actions,
 * and allows updating item statuses or deleting reports with owner-verification.
 */

let activeTab = 'all'; // 'all', 'active', 'lost', 'found', 'claimed'
let showAllCampusReports = true;
let dashboardActiveItems = [];

document.addEventListener('DOMContentLoaded', async () => {
  initDashboardTabs();
  initScopeToggle();
  await refreshDashboard();
});

// React to Firebase Authentication changes in real-time
window.addEventListener('campus-auth-changed', async () => {
  await refreshDashboard();
});

/**
 * Check if a campus user is currently authenticated
 */
function isUserAuthenticated() {
  if (typeof FirebaseAuth !== 'undefined' && typeof FirebaseAuth.isLoggedIn === 'function') {
    return FirebaseAuth.isLoggedIn();
  }
  if (typeof CampusAuth !== 'undefined' && typeof CampusAuth.isLoggedIn === 'function') {
    return CampusAuth.isLoggedIn();
  }
  try {
    const session = sessionStorage.getItem('campusfind_active_user');
    return session !== null;
  } catch (e) {
    return false;
  }
}

/**
 * Get active authenticated user profile
 */
function getAuthenticatedUser() {
  if (typeof FirebaseAuth !== 'undefined' && typeof FirebaseAuth.getCurrentUser === 'function') {
    return FirebaseAuth.getCurrentUser();
  }
  if (typeof CampusAuth !== 'undefined' && typeof CampusAuth.getCurrentUser === 'function') {
    return CampusAuth.getCurrentUser();
  }
  try {
    const session = sessionStorage.getItem('campusfind_active_user');
    return session ? JSON.parse(session) : null;
  } catch (e) {
    return null;
  }
}

/**
 * Refresh full dashboard state (Auth banners, Firestore reports, metrics & table)
 */
async function refreshDashboard() {
  const isAuth = isUserAuthenticated();
  const currentUser = getAuthenticatedUser();

  // Guard Banner display
  const guardBanner = document.getElementById('dashboardAuthGuard');
  if (guardBanner) {
    guardBanner.style.display = isAuth ? 'none' : 'flex';
  }

  const tbody = document.getElementById('dashboardTableBody');
  if (tbody && dashboardActiveItems.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 2.5rem 1rem; color: #64748b;">
          <div class="loading-spinner" style="margin-bottom: 0.75rem;"></div>
          <p style="margin: 0;">Loading campus reports from Firestore...</p>
        </td>
      </tr>
    `;
  }

  let items = [];
  let loadedFromFirestore = false;

  const firestore = (typeof window.FirestoreService !== 'undefined')
    ? window.FirestoreService
    : ((typeof FirestoreService !== 'undefined') ? FirestoreService : null);

  if (firestore) {
    try {
      if (!showAllCampusReports && currentUser && currentUser.uid) {
        items = await firestore.getUserReports(currentUser.uid);
        loadedFromFirestore = true;
      } else {
        items = await firestore.getAllReports();
        loadedFromFirestore = true;
      }
    } catch (err) {
      console.warn("Could not load reports from Firestore for dashboard:", err);
      loadedFromFirestore = false;
    }
  }

  // Only fallback to local demo items if FirestoreService was unavailable or connection threw an error
  if (!loadedFromFirestore) {
    const localItems = (typeof StorageService !== 'undefined' ? StorageService.getItems() : []);
    if (!showAllCampusReports && currentUser && currentUser.uid) {
      items = localItems.filter(item => 
        item.reportedByUid && String(item.reportedByUid).trim() === String(currentUser.uid).trim()
      );
    } else if (showAllCampusReports) {
      items = localItems;
    }
  }

  dashboardActiveItems = items || [];
  window.dashboardActiveItems = dashboardActiveItems;

  updateDashboardMetrics(dashboardActiveItems);
  renderDashboardTable();
}

/**
 * Compute and display stats in top metric cards
 * @param {Array} items - Active items list
 */
function updateDashboardMetrics(items) {
  const itemList = items || dashboardActiveItems || [];

  const total = itemList.length;
  const active = itemList.filter(i => i.status === 'active' || i.status === 'open').length;
  const lost = itemList.filter(i => i.type === 'lost').length;
  const found = itemList.filter(i => i.type === 'found').length;
  const claimed = itemList.filter(i => i.status === 'claimed').length;

  const totalEl = document.getElementById('statTotal');
  const activeEl = document.getElementById('statActive');
  const lostEl = document.getElementById('statLost');
  const foundEl = document.getElementById('statFound');
  const claimedEl = document.getElementById('statClaimed');

  if (totalEl) totalEl.textContent = total;
  if (activeEl) activeEl.textContent = active;
  if (lostEl) lostEl.textContent = lost;
  if (foundEl) foundEl.textContent = found;
  if (claimedEl) claimedEl.textContent = claimed;
}

/**
 * Legacy wrapper for initDashboardMetrics
 */
function initDashboardMetrics() {
  updateDashboardMetrics(dashboardActiveItems);
}

/**
 * Set up Tab navigation
 */
function initDashboardTabs() {
  const tabs = document.querySelectorAll('.dashboard-tabs .tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeTab = tab.dataset.tab || 'all';
      renderDashboardTable();
    });
  });
}

/**
 * Toggle between "My Reports" and "All Campus Reports"
 */
function initScopeToggle() {
  const scopeCheckbox = document.getElementById('scopeFilterCheckbox');
  if (scopeCheckbox) {
    scopeCheckbox.addEventListener('change', async (e) => {
      if (e.target.checked && !isUserAuthenticated()) {
        showToast("Please sign in with your campus account to view your submitted reports.", "warning");
        e.target.checked = false;
        setTimeout(() => {
          window.location.href = 'login.html?redirect=dashboard.html';
        }, 1200);
        return;
      }
      showAllCampusReports = !e.target.checked;
      await refreshDashboard();
    });
  }
}

/**
 * Render reports into dashboard table
 */
function renderDashboardTable() {
  const tbody = document.getElementById('dashboardTableBody');
  if (!tbody) return;

  const currentUser = getAuthenticatedUser();
  const userUid = currentUser && currentUser.uid ? String(currentUser.uid).trim() : '';
  const isAuth = isUserAuthenticated() && Boolean(userUid);

  // Filter based on user scope and active tab
  let items = dashboardActiveItems;
  if (!showAllCampusReports && currentUser && userUid) {
    items = items.filter(item => 
      item.reportedByUid && String(item.reportedByUid).trim() === userUid
    );
  }

  if (activeTab === 'active') {
    items = items.filter(item => item.status === 'active' || item.status === 'open');
  } else if (activeTab === 'lost') {
    items = items.filter(item => item.type === 'lost');
  } else if (activeTab === 'found') {
    items = items.filter(item => item.type === 'found');
  } else if (activeTab === 'claimed') {
    items = items.filter(item => item.status === 'claimed');
  }

  if (items.length === 0) {
    let emptyMessage = "No reports found in this category.";
    if (activeTab === 'active') emptyMessage = "No active reports currently open.";
    if (activeTab === 'claimed') emptyMessage = "No resolved or claimed items yet.";
    if (!showAllCampusReports) emptyMessage = currentUser ? `No reports submitted under UID ${userUid}.` : "Please sign in to view your reports.";

    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 3rem 1rem;">
          <div style="width: 48px; height: 48px; border-radius: 50%; background: #f1f5f9; display: flex; align-items: center; justify-content: center; margin: 0 auto 0.75rem auto; color: #64748b;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          </div>
          <h4 style="font-size: 1.1rem; color: #1e293b; margin-bottom: 0.25rem;">${emptyMessage}</h4>
          <p style="font-size: 0.85rem; color: #64748b;">Submit a lost or found report to see it appear here.</p>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = items.map(item => {
    const isClaimed = item.status === 'claimed';
    let statusClass = 'status-lost';
    let statusLabel = 'Active (Lost)';

    if (item.type === 'found') {
      statusClass = 'status-found';
      statusLabel = 'Active (Found)';
    }
    if (isClaimed) {
      statusClass = 'status-claimed';
      statusLabel = 'Resolved / Claimed';
    } else if (item.status === 'under_verification') {
      statusClass = 'status-review';
      statusLabel = 'Under Verification';
    }

    // Strict UI safeguard: Only allow edit/delete if signed-in user's UID matches report's reportedByUid
    const isOwner = Boolean(
      userUid && 
      item.reportedByUid && 
      String(item.reportedByUid).trim() === userUid
    );

    let actionButtonsHtml = '';
    if (isOwner) {
      actionButtonsHtml = `
        <button class="btn btn-secondary btn-sm" onclick="openItemModal('${item.id}')" title="View details">
          View
        </button>
        <button class="btn ${isClaimed ? 'btn-secondary' : 'btn-success'} btn-sm" onclick="toggleItemStatus('${item.id}')" title="${isClaimed ? 'Reopen as Active' : 'Mark as Resolved / Claimed'}">
          ${isClaimed ? 'Reopen' : 'Resolve'}
        </button>
        <button class="btn btn-outline-danger btn-sm" onclick="deleteReport('${item.id}')" title="Delete report">
          Delete
        </button>
      `;
    } else {
      actionButtonsHtml = `
        <button class="btn btn-secondary btn-sm" onclick="openItemModal('${item.id}')" title="View details">
          View
        </button>
        <button class="btn btn-secondary btn-sm" disabled style="opacity: 0.55; cursor: not-allowed;" title="Only the student who reported this item can modify or resolve its status">
          Owner only
        </button>
      `;
    }

    return `
      <tr>
        <td>
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <img src="${item.image || 'assets/images/placeholder.svg'}" alt="${item.title}" style="width: 44px; height: 44px; border-radius: 6px; object-fit: cover; border: 1px solid #e2e8f0; flex-shrink: 0;">
            <div>
              <strong style="color: #0f172a; display: block; font-size: 0.95rem;">${item.title}</strong>
              <span style="font-size: 0.75rem; color: #2563eb; font-weight: 600;">${item.category}</span>
            </div>
          </div>
        </td>
        <td>
          <span class="badge-pill" style="background: ${item.type === 'lost' ? '#fee2e2' : '#dcfce7'}; color: ${item.type === 'lost' ? '#b91c1c' : '#15803d'};">
            ${item.type.toUpperCase()}
          </span>
        </td>
        <td>${item.locationArea || item.location}</td>
        <td>${item.date}</td>
        <td>
          <span class="badge-pill ${statusClass}">
            ${statusLabel}
          </span>
        </td>
        <td>
          <div style="display: flex; gap: 0.4rem; align-items: center;">
            ${actionButtonsHtml}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Toggle between Claimed and Active status in Cloud Firestore
 * @param {string} itemId - Item document ID
 */
async function toggleItemStatus(itemId) {
  if (!isUserAuthenticated()) {
    showToast("Authentication Required: You must be signed in with your campus account to resolve reports.", "warning");
    setTimeout(() => {
      window.location.href = "login.html?redirect=dashboard.html";
    }, 1200);
    return;
  }

  const currentUser = getAuthenticatedUser();
  const userUid = currentUser && currentUser.uid ? String(currentUser.uid).trim() : '';
  const item = dashboardActiveItems.find(i => i.id === itemId);
  if (!item) return;

  // Strict UID-only ownership verification: signed-in user's UID MUST match report's reportedByUid
  const isOwner = Boolean(
    userUid && 
    item.reportedByUid && 
    String(item.reportedByUid).trim() === userUid
  );

  if (!isOwner) {
    showToast("Permission Denied: Only the student who submitted this report can modify it.", "danger");
    return;
  }

  const newStatus = (item.status === 'claimed') ? 'active' : 'claimed';

  if (item.status === 'claimed') {
    const confirmReopen = confirm(`Reopen Report:\nDo you want to reactivate "${item.title}" back to Active status?`);
    if (!confirmReopen) return;
  } else {
    const confirmResolve = confirm(
      `Confirm Return / Resolution:\nAre you sure you want to mark "${item.title}" as resolved?\n\nPlease confirm that the belonging has been verified and returned to its rightful owner.`
    );
    if (!confirmResolve) return;
  }

  const targetCollection = item.collectionName || 
    (item.type === 'lost' ? 'lost_items' : (item.type === 'found' ? 'found_items' : null));

  const firestore = (typeof window.FirestoreService !== 'undefined')
    ? window.FirestoreService
    : ((typeof FirestoreService !== 'undefined') ? FirestoreService : null);

  if (firestore && item.isDemo !== true) {
    showToast(`Saving status update to Firestore...`, 'info');
    const result = await firestore.updateItemStatus(targetCollection, itemId, newStatus);
    if (!result.success) {
      showToast(result.message || "Failed to update status in Firestore.", "danger");
      return;
    }
  } else if (typeof StorageService !== 'undefined') {
    StorageService.updateItemStatus(itemId, newStatus);
  }

  item.status = newStatus;
  showToast(`"${item.title}" marked as ${newStatus === 'claimed' ? 'Resolved / Claimed' : 'Active'}.`, 'success');
  updateDashboardMetrics(dashboardActiveItems);
  renderDashboardTable();
}

/**
 * Delete a report from Cloud Firestore with strict owner verification
 * @param {string} itemId - Item document ID
 */
async function deleteReport(itemId) {
  if (!isUserAuthenticated()) {
    showToast("Authentication Required: You must be signed in with your campus account to delete reports.", "warning");
    setTimeout(() => {
      window.location.href = "login.html?redirect=dashboard.html";
    }, 1200);
    return;
  }

  const currentUser = getAuthenticatedUser();
  const userUid = currentUser && currentUser.uid ? String(currentUser.uid).trim() : '';
  const item = dashboardActiveItems.find(i => i.id === itemId);
  if (!item) return;

  // Strict UID-only ownership verification: signed-in user's UID MUST match report's reportedByUid
  const isOwner = Boolean(
    userUid && 
    item.reportedByUid && 
    String(item.reportedByUid).trim() === userUid
  );

  if (!isOwner) {
    showToast("Permission Denied: Only the student who submitted this report can delete it.", "danger");
    return;
  }

  const title = item.title || 'this item';
  if (!confirm(`Delete Report:\nAre you sure you want to permanently remove "${title}" from the database? This cannot be undone.`)) {
    return;
  }

  const targetCollection = item.collectionName || 
    (item.type === 'lost' ? 'lost_items' : (item.type === 'found' ? 'found_items' : null));

  const firestore = (typeof window.FirestoreService !== 'undefined')
    ? window.FirestoreService
    : ((typeof FirestoreService !== 'undefined') ? FirestoreService : null);

  if (firestore && item.isDemo !== true) {
    showToast(`Deleting "${title}" from Firestore...`, 'info');
    const result = await firestore.deleteItem(targetCollection, itemId);
    if (!result.success) {
      showToast(result.message || "Failed to delete report from Firestore.", "danger");
      return;
    }
  } else if (typeof StorageService !== 'undefined') {
    StorageService.deleteItem(itemId);
  }

  dashboardActiveItems = dashboardActiveItems.filter(i => i.id !== itemId);
  window.dashboardActiveItems = dashboardActiveItems;
  showToast(`"${title}" deleted successfully.`, 'warning');
  updateDashboardMetrics(dashboardActiveItems);
  renderDashboardTable();
}

/**
 * Reset all demo data to default sample state
 */
function resetDemoStorage() {
  if (!isUserAuthenticated()) {
    showToast("Authentication Required: Please sign in to reset records.", "warning");
    setTimeout(() => {
      window.location.href = "login.html?redirect=dashboard.html";
    }, 1200);
    return;
  }

  if (confirm("Reset Demo Data:\nReset all sample records back to the default items?")) {
    if (typeof StorageService !== 'undefined') {
      StorageService.resetToDefault();
    }
    showToast("Data reset to default sample campus items.", "info");
    refreshDashboard();
  }
}
