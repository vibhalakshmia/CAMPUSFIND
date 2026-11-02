/**
 * CampusFind - College Lost & Found System
 * Form Handling Module (Vanilla JS)
 * 
 * Handles lost/found item submissions, client-side validation,
 * date checks, canvas image optimization, and storage integration.
 */

let selectedImageFile = null;
let imagePreviewObjectUrl = null;

document.addEventListener('DOMContentLoaded', () => {
  initFormSelects();
  initImageUpload();
  initReportForm();
});

/**
 * Populate Category and Campus Location selects dynamically
 */
function initFormSelects() {
  const categorySelect = document.getElementById('itemCategory');
  if (categorySelect && typeof ITEM_CATEGORIES !== 'undefined') {
    ITEM_CATEGORIES.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      categorySelect.appendChild(opt);
    });
  }

  const locationSelect = document.getElementById('locationArea');
  if (locationSelect && typeof CAMPUS_LOCATIONS !== 'undefined') {
    CAMPUS_LOCATIONS.forEach(loc => {
      const opt = document.createElement('option');
      opt.value = loc;
      opt.textContent = loc;
      locationSelect.appendChild(opt);
    });
  }

  // Pre-fill today's date and set max boundary
  const dateInput = document.getElementById('itemDate');
  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
    dateInput.max = today; // Prevent future dates
  }

  // Pre-fill user contact info if user is signed in
  const currentUser = (typeof FirebaseAuth !== 'undefined' && typeof FirebaseAuth.getCurrentUser === 'function')
    ? FirebaseAuth.getCurrentUser()
    : ((typeof DemoAuth !== 'undefined') ? DemoAuth.getCurrentUser() : null);
  if (currentUser) {
    const nameInput = document.getElementById('contactName');
    const emailInput = document.getElementById('contactEmail');
    if (nameInput) nameInput.value = currentUser.name || '';
    if (emailInput) emailInput.value = currentUser.email || '';
  }
}

// Re-prefill contact fields if auth state changes
window.addEventListener('campus-auth-changed', () => {
  const user = (typeof FirebaseAuth !== 'undefined' && typeof FirebaseAuth.getCurrentUser === 'function')
    ? FirebaseAuth.getCurrentUser()
    : null;
  if (user) {
    const nameInput = document.getElementById('contactName');
    const emailInput = document.getElementById('contactEmail');
    if (nameInput && (!nameInput.value || nameInput.value === 'Demo Student')) {
      nameInput.value = user.name || '';
    }
    if (emailInput && (!emailInput.value || emailInput.value === 'demo.student@campus.edu')) {
      emailInput.value = user.email || '';
    }
  }
});

/**
 * Handle Image File Upload, Drag & Drop, and Live Preview
 */
function initImageUpload() {
  const fileInput = document.getElementById('itemPhoto');
  const uploadBox = document.getElementById('fileUploadBox');
  const previewContainer = document.getElementById('previewContainer');
  const previewImg = document.getElementById('previewImg');
  const removeBtn = document.getElementById('removePreviewBtn');

  if (!fileInput) return;

  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    await processSelectedFile(file);
  });

  // Drag and drop event listeners
  if (uploadBox) {
    ['dragenter', 'dragover'].forEach(eventName => {
      uploadBox.addEventListener(eventName, (e) => {
        e.preventDefault();
        uploadBox.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      uploadBox.addEventListener(eventName, (e) => {
        e.preventDefault();
        uploadBox.classList.remove('dragover');
      });
    });

    uploadBox.addEventListener('drop', async (e) => {
      const dt = e.dataTransfer;
      const file = dt && dt.files ? dt.files[0] : null;
      if (file) {
        await processSelectedFile(file);
      }
    });
  }

  // Remove Photo Button
  if (removeBtn) {
    removeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      clearUploadedPhoto();
      showToast('Photo removed.', 'info');
    });
  }

  async function processSelectedFile(file) {
    if (!file) return;

    // Validate MIME types (JPEG, PNG, WebP)
    const validMimes = ['image/jpeg', 'image/png', 'image/webp'];
    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    const fileExt = '.' + (file.name.split('.').pop() || '').toLowerCase();

    if (!validMimes.includes(file.type) && !validExtensions.includes(fileExt)) {
      showToast('Unsupported Format: Please select a valid JPEG, PNG, or WebP photo.', 'danger');
      clearUploadedPhoto();
      return;
    }

    // Validate maximum file size (5MB limit)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      showToast('File Too Large: Selected photo exceeds 5MB limit. Please choose a smaller photo.', 'danger');
      clearUploadedPhoto();
      return;
    }

    try {
      selectedImageFile = file;

      // Revoke any previous object URL to prevent memory leaks
      if (imagePreviewObjectUrl) {
        URL.revokeObjectURL(imagePreviewObjectUrl);
      }

      // Generate instant local blob preview URL
      imagePreviewObjectUrl = URL.createObjectURL(file);

      if (previewImg && previewContainer) {
        previewImg.src = imagePreviewObjectUrl;
        previewContainer.style.display = 'inline-block';
        if (uploadBox) {
          const uploadContent = uploadBox.querySelector('.upload-box-content');
          if (uploadContent) uploadContent.style.display = 'none';
        }
      }
      showToast(`Photograph attached: "${file.name}".`, 'success');
    } catch (err) {
      console.error("Image preview error:", err);
      showToast('Could not preview this image. Please try another file.', 'danger');
    }
  }

  function clearUploadedPhoto() {
    selectedImageFile = null;
    if (imagePreviewObjectUrl) {
      URL.revokeObjectURL(imagePreviewObjectUrl);
      imagePreviewObjectUrl = null;
    }
    if (fileInput) fileInput.value = '';
    if (previewContainer) previewContainer.style.display = 'none';
    if (previewImg) previewImg.src = '#';
    if (uploadBox) {
      const uploadContent = uploadBox.querySelector('.upload-box-content');
      if (uploadContent) uploadContent.style.display = 'block';
    }
  }

  // Expose clear function for submit cleanup
  window.clearUploadedPhoto = clearUploadedPhoto;
}

/**
 * Safely retrieve FirestoreService, awaiting async ES module CDN initialization if needed
 * @returns {Promise<Object|null>}
 */
async function getFirestoreService() {
  if (typeof window.FirestoreService !== 'undefined') return window.FirestoreService;
  if (typeof FirestoreService !== 'undefined') return FirestoreService;

  // Poll for up to 3 seconds in case network connection to gstatic modules is completing
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 100));
    if (typeof window.FirestoreService !== 'undefined') return window.FirestoreService;
    if (typeof FirestoreService !== 'undefined') return FirestoreService;
  }
  return null;
}

/**
 * Handle form submission with comprehensive field and date validation
 */
function initReportForm() {
  const form = document.getElementById('reportItemForm');
  if (!form) return;

  const formType = form.dataset.reportType || 'lost'; // 'lost' or 'found'

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Check user authentication
    const isAuth = (typeof FirebaseAuth !== 'undefined' && FirebaseAuth.isLoggedIn()) ||
                   (typeof CampusAuth !== 'undefined' && CampusAuth.isLoggedIn());
    if (!isAuth) {
      showToast('Authentication Required: Please sign in with your campus account before filing a report.', 'warning');
      setTimeout(() => {
        const page = window.location.pathname.split('/').pop() || (formType === 'lost' ? 'report-lost.html' : 'report-found.html');
        window.location.href = `login.html?redirect=${encodeURIComponent(page)}`;
      }, 1200);
      return;
    }

    const titleInput = document.getElementById('itemTitle');
    const categorySelect = document.getElementById('itemCategory');
    const locationAreaSelect = document.getElementById('locationArea');
    const locationDetailsInput = document.getElementById('locationDetails');
    const dateInput = document.getElementById('itemDate');
    const descriptionInput = document.getElementById('itemDescription');
    const custodyInput = document.getElementById('custodyInfo');
    const contactNameInput = document.getElementById('contactName');
    const contactEmailInput = document.getElementById('contactEmail');
    const contactPhoneInput = document.getElementById('contactPhone');
    const submitBtn = form.querySelector('button[type="submit"]');

    const title = titleInput ? titleInput.value.trim() : '';
    const category = categorySelect ? categorySelect.value : '';
    const locationArea = locationAreaSelect ? locationAreaSelect.value : '';
    const locationDetails = locationDetailsInput ? locationDetailsInput.value.trim() : '';
    const date = dateInput ? dateInput.value : '';
    const description = descriptionInput ? descriptionInput.value.trim() : '';
    const custodyInfo = custodyInput ? custodyInput.value.trim() : '';
    const contactName = contactNameInput ? contactNameInput.value.trim() : '';
    const contactEmail = contactEmailInput ? contactEmailInput.value.trim() : '';
    const contactPhone = contactPhoneInput ? contactPhoneInput.value.trim() : '';

    // 1. Required Field Validation
    if (!title) {
      showToast('Please enter the item title or name.', 'danger');
      if (titleInput) titleInput.focus();
      return;
    }

    if (!category) {
      showToast('Please select a category for this item.', 'danger');
      if (categorySelect) categorySelect.focus();
      return;
    }

    // 2. Strict Date Validation
    if (!date) {
      showToast('Please enter the date when the item was ' + (formType === 'lost' ? 'lost.' : 'found.'), 'danger');
      if (dateInput) dateInput.focus();
      return;
    }

    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (isNaN(selectedDate.getTime())) {
      showToast('Please enter a valid calendar date.', 'danger');
      if (dateInput) dateInput.focus();
      return;
    }

    if (selectedDate > today) {
      showToast('Invalid Date: Date cannot be in the future. Please select today or an earlier date.', 'danger');
      if (dateInput) dateInput.focus();
      return;
    }

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    if (selectedDate < oneYearAgo) {
      showToast('Invalid Date: Date cannot be older than 12 months.', 'danger');
      if (dateInput) dateInput.focus();
      return;
    }

    // 3. Location Validation
    if (!locationArea) {
      showToast('Please select the campus building or area.', 'danger');
      if (locationAreaSelect) locationAreaSelect.focus();
      return;
    }

    // 4. Custody Drop-off Location Validation (for Found items)
    if (formType === 'found' && !custodyInfo) {
      showToast('Please specify the current custody or drop-off location (e.g. Library Desk or Security Window 1).', 'danger');
      if (custodyInput) custodyInput.focus();
      return;
    }

    // 5. Description Validation
    if (!description || description.length < 10) {
      showToast('Please provide a descriptive explanation (at least 10 characters).', 'danger');
      if (descriptionInput) descriptionInput.focus();
      return;
    }

    // 6. Contact Email Validation
    if (!contactEmail) {
      showToast('Please enter a contact email address.', 'danger');
      if (contactEmailInput) contactEmailInput.focus();
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contactEmail)) {
      showToast('Please provide a valid email format (e.g. name@campus.edu).', 'danger');
      if (contactEmailInput) contactEmailInput.focus();
      return;
    }

    // Combine location details
    const fullLocation = locationDetails ? `${locationArea} - ${locationDetails}` : locationArea;

    // Generate fallback category SVG placeholder
    const fallbackImagePlaceholder = createItemSvg(
      title, 
      category, 
      formType === 'lost' ? ['#991b1b', '#ef4444'] : ['#065f46', '#10b981'], 
      formType === 'lost' ? 'LOST' : 'FOUND'
    );

    const newItemData = {
      title,
      category,
      type: formType,
      status: 'active', // Standard initial status: Active
      location: fullLocation,
      locationArea,
      date,
      description,
      contactName: contactName || 'Campus Community Member',
      contactEmail,
      contactPhone: contactPhone || 'Not provided',
      custodyInfo: custodyInfo || (formType === 'found' ? 'Handed to Campus Security' : 'Reported Missing by Owner'),
      imageFile: selectedImageFile, // Browser File object for external image host
      imagePlaceholder: fallbackImagePlaceholder // Fallback SVG if no image uploaded
    };

    // Show button loading state
    const originalBtnText = submitBtn ? submitBtn.innerHTML : 'Submit Report';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = selectedImageFile 
        ? `<span class="loading-spinner loading-spinner-sm loading-spinner-light" style="margin-right: 6px;"></span> Uploading photo and saving report...` 
        : `<span class="loading-spinner loading-spinner-sm loading-spinner-light" style="margin-right: 6px;"></span> Saving report to Cloud Firestore...`;
    }

    try {
      let result;
      const firestore = await getFirestoreService();

      if (firestore) {
        if (formType === 'lost') {
          result = await firestore.addLostItem(newItemData);
        } else {
          result = await firestore.addFoundItem(newItemData);
        }
      } else {
        const isFileProtocol = window.location.protocol === 'file:';
        const detailMsg = isFileProtocol
          ? "ES Modules cannot load over file:// protocol due to browser security restrictions. Please run this site via local server (http://127.0.0.1:8000)."
          : "FirestoreService module could not be initialized. Please check your internet connection and refresh the page.";
        result = { 
          success: false, 
          message: `Database Service Unavailable: ${detailMsg}` 
        };
      }

      if (!result.success) {
        showToast(result.message || 'Error saving report.', 'danger');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnText;
        }
        return;
      }

      // Reset uploaded image state and memory
      if (typeof window.clearUploadedPhoto === 'function') {
        window.clearUploadedPhoto();
      }

      // Display success container
      const successBox = document.getElementById('formSuccessAlert');
      if (successBox) {
        successBox.style.display = 'block';
        form.style.display = 'none';
        successBox.scrollIntoView({ behavior: 'smooth' });
      } else {
        showToast(`Item "${title}" successfully reported to Cloud Firestore!`, 'success');
        form.reset();
        setTimeout(() => {
          window.location.href = 'search.html';
        }, 1500);
      }
    } catch (err) {
      console.error("Form submit error:", err);
      showToast("An unexpected error occurred while saving to Firestore.", "danger");
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
      }
    }
  });
}
