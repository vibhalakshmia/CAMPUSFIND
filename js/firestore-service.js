/**
 * CampusFind - College Lost & Found System
 * Cloud Firestore Data Service Module (Vanilla JS / Firebase Modular SDK)
 * 
 * Manages persistent storage of lost and found reports using separate
 * Cloud Firestore collections:
 * - 'lost_items'
 * - 'found_items'
 */

import {
  db,
  auth,
  onAuthStateChanged,
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp
} from "./firebase-config.js";
import { IMAGE_CONFIG } from "./image-config.js";

const COLLECTIONS = {
  LOST: 'lost_items',
  FOUND: 'found_items'
};

const FirestoreService = {
  collections: COLLECTIONS,

  /**
   * Helper to safely retrieve current authenticated Firebase user,
   * awaiting auth state resolution if still initializing asynchronously,
   * and refreshing the ID token for immediate Firestore authentication.
   * @returns {Promise<Object|null>}
   */
  async getCurrentAuthUser() {
    let user = auth.currentUser;
    if (!user && typeof auth.authStateReady === 'function') {
      try {
        await auth.authStateReady();
        user = auth.currentUser;
      } catch (e) {
        console.warn("authStateReady exception:", e);
      }
    }

    if (!user) {
      user = await new Promise((resolve) => {
        let resolved = false;
        const timeoutId = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            resolve(auth.currentUser);
          }
        }, 1500);

        const unsubscribe = onAuthStateChanged(auth, (authUser) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeoutId);
            unsubscribe();
            resolve(authUser);
          }
        });
      });
    }

    if (user) {
      try {
        // Ensure auth token is freshly validated with Firebase backend
        await user.getIdToken();
      } catch (tokenErr) {
        console.warn("Token validation note:", tokenErr);
      }
    }

    return user;
  },

  /**
   * Upload an item photo to external free image hosting (Cloudinary unsigned upload)
   * @param {File} file - Browser File object
   * @param {string} userId - Authenticated user Firebase UID
   * @returns {Promise<{ downloadUrl: string, storagePath: string, publicId: string }>}
   */
  async uploadItemImage(file, userId) {
    if (!file) return null;
    if (!userId) {
      throw new Error("Authentication Required: Must be signed in with your campus account to upload photos.");
    }

    // Client-side MIME type verification (JPEG, PNG, WebP)
    const validMimes = IMAGE_CONFIG.allowedMimeTypes;
    const validExtensions = IMAGE_CONFIG.allowedExtensions;
    const fileExt = '.' + (file.name.split('.').pop() || '').toLowerCase();

    if (!validMimes.includes(file.type) && !validExtensions.includes(fileExt)) {
      throw new Error("Unsupported Image Format: Only JPG, PNG, and WebP files are accepted.");
    }

    // Client-side file size verification (max 5MB)
    if (file.size > IMAGE_CONFIG.maxFileSizeBytes) {
      throw new Error("File Too Large: Uploaded photo must be smaller than 5MB.");
    }

    // Verify external image hosting configuration
    if (typeof IMAGE_CONFIG.isConfigured === 'function' && !IMAGE_CONFIG.isConfigured()) {
      throw new Error(
        "Image Hosting Configuration Required: Enter your registered Cloudinary cloudName in js/image-config.js. Alternatively, click 'Remove photo' on the form to submit this report immediately without an image."
      );
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', (IMAGE_CONFIG.uploadPreset || 'campusfind_reports').trim());
    formData.append('folder', `campusfind_reports/${userId}`);

    // Optionally include public API key if provided by user
    if (IMAGE_CONFIG.apiKey && IMAGE_CONFIG.apiKey.trim()) {
      formData.append('api_key', IMAGE_CONFIG.apiKey.trim());
    }

    try {
      const response = await fetch(IMAGE_CONFIG.uploadEndpoint, {
        method: 'POST',
        body: formData
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const rawMsg = (data && data.error && data.error.message) ? data.error.message.trim() : '';

        let userFriendlyMsg;
        if (rawMsg.toLowerCase().includes("unknown api key") || response.status === 401) {
          userFriendlyMsg = `Cloudinary Account Error: The cloudName '${IMAGE_CONFIG.cloudName}' was not recognized or is not configured for unsigned uploads. Please verify your Cloud Name and Unsigned Preset in js/image-config.js, or click 'Remove photo' to submit without an image.`;
        } else if (rawMsg.toLowerCase().includes("upload preset not found") || rawMsg.toLowerCase().includes("preset")) {
          userFriendlyMsg = `Cloudinary Preset Error: The upload preset '${IMAGE_CONFIG.uploadPreset}' was not found on your Cloudinary account. Please ensure the preset exists and its Signing Mode is set to 'Unsigned' in your Cloudinary Console.`;
        } else if (rawMsg.toLowerCase().includes("file size") || rawMsg.toLowerCase().includes("too large")) {
          userFriendlyMsg = "File Too Large: Uploaded photo must be smaller than 5MB.";
        } else if (rawMsg) {
          userFriendlyMsg = `External Image Upload Failed: ${rawMsg}`;
        } else {
          userFriendlyMsg = `External Image Upload Failed (HTTP ${response.status}). Check network connection or remove photo to submit.`;
        }

        throw new Error(userFriendlyMsg);
      }

      if (!data || !data.secure_url) {
        throw new Error("External image host did not return a valid secure URL.");
      }

      return {
        downloadUrl: data.secure_url,
        storagePath: data.public_id || '',
        publicId: data.public_id || ''
      };
    } catch (error) {
      console.error("External image upload error:", error);
      throw new Error(error.message || "Failed to upload image to external host.");
    }
  },

  /**
   * Save a newly reported lost item to 'lost_items' collection
   * @param {Object} itemData - Item attributes matching existing form
   * @returns {Promise<Object>} { success: boolean, id?: string, item?: Object, message?: string }
   */
  async addLostItem(itemData) {
    const user = await this.getCurrentAuthUser();
    if (!user || !user.uid) {
      return { 
        success: false, 
        message: "Authentication Required: Please sign in with your campus account to file a lost item report." 
      };
    }

    try {
      let imageUrl = null;
      let storagePath = null;

      // Handle Cloud Storage photo upload if a File was selected
      if (itemData.imageFile instanceof File) {
        try {
          const uploadRes = await this.uploadItemImage(itemData.imageFile, user.uid);
          if (uploadRes) {
            imageUrl = uploadRes.downloadUrl;
            storagePath = uploadRes.storagePath;
          }
        } catch (uploadError) {
          return {
            success: false,
            message: uploadError.message || "Failed to upload item photo."
          };
        }
      } else if (typeof itemData.image === 'string' && !itemData.image.startsWith('data:image/')) {
        imageUrl = itemData.image;
        storagePath = itemData.imagePath || null;
      }

      // If no photo was uploaded, use fallback SVG placeholder
      if (!imageUrl) {
        imageUrl = itemData.imagePlaceholder || (typeof itemData.image === 'string' ? itemData.image : null);
      }

      const docPayload = {
        title: (itemData.title || '').trim(),
        category: itemData.category,
        type: 'lost',
        status: 'active',
        location: itemData.location || '',
        locationArea: itemData.locationArea || '',
        date: itemData.date,
        description: (itemData.description || '').trim(),
        contactName: itemData.contactName || user.displayName || 'Campus Student',
        contactEmail: itemData.contactEmail || user.email,
        contactPhone: itemData.contactPhone || 'Not provided',
        custodyInfo: (itemData.custodyInfo || 'Reported Missing by Owner').trim(),
        image: imageUrl,
        imagePath: storagePath,
        imagePublicId: storagePath,
        reportedByUid: user.uid,
        reportedBy: user.email,
        reportedByName: user.displayName || itemData.contactName || 'Campus Student',
        createdAt: new Date().toISOString(),
        timestamp: serverTimestamp(),
        isDemo: false
      };

      const docRef = await addDoc(collection(db, COLLECTIONS.LOST), docPayload);
      const createdItem = { id: docRef.id, ...docPayload };

      // Also mirror into local cache for immediate UI availability
      if (typeof StorageService !== 'undefined' && typeof StorageService.addItem === 'function') {
        try {
          StorageService.addItem({ ...createdItem, id: docRef.id });
        } catch (cacheErr) {
          console.warn("Local cache update note:", cacheErr);
        }
      }

      return { success: true, id: docRef.id, item: createdItem };
    } catch (error) {
      console.error("Firestore addLostItem error:", error);
      return { 
        success: false, 
        message: this.formatFirestoreError(error, "save lost item report") 
      };
    }
  },

  /**
   * Save a newly reported found item to 'found_items' collection
   * @param {Object} itemData - Item attributes matching existing form
   * @returns {Promise<Object>} { success: boolean, id?: string, item?: Object, message?: string }
   */
  async addFoundItem(itemData) {
    const user = await this.getCurrentAuthUser();
    if (!user || !user.uid) {
      return { 
        success: false, 
        message: "Authentication Required: Please sign in with your campus account to file a found item report." 
      };
    }

    try {
      let imageUrl = null;
      let storagePath = null;

      // Handle photo upload if a File was selected
      if (itemData.imageFile instanceof File) {
        try {
          const uploadRes = await this.uploadItemImage(itemData.imageFile, user.uid);
          if (uploadRes) {
            imageUrl = uploadRes.downloadUrl;
            storagePath = uploadRes.storagePath;
          }
        } catch (uploadError) {
          return {
            success: false,
            message: uploadError.message || "Failed to upload item photo."
          };
        }
      } else if (typeof itemData.image === 'string' && !itemData.image.startsWith('data:image/')) {
        imageUrl = itemData.image;
        storagePath = itemData.imagePath || null;
      }

      // If no photo was uploaded, use fallback SVG placeholder
      if (!imageUrl) {
        imageUrl = itemData.imagePlaceholder || (typeof itemData.image === 'string' ? itemData.image : null);
      }

      const docPayload = {
        title: (itemData.title || '').trim(),
        category: itemData.category,
        type: 'found',
        status: 'active',
        location: itemData.location || '',
        locationArea: itemData.locationArea || '',
        date: itemData.date,
        description: (itemData.description || '').trim(),
        custodyInfo: (itemData.custodyInfo || 'Handed to Campus Security').trim(),
        contactName: itemData.contactName || user.displayName || 'Campus Community Member',
        contactEmail: itemData.contactEmail || user.email,
        contactPhone: itemData.contactPhone || 'Not provided',
        image: imageUrl,
        imagePath: storagePath,
        imagePublicId: storagePath,
        reportedByUid: user.uid,
        reportedBy: user.email,
        reportedByName: user.displayName || itemData.contactName || 'Campus Community Member',
        createdAt: new Date().toISOString(),
        timestamp: serverTimestamp(),
        isDemo: false
      };

      const docRef = await addDoc(collection(db, COLLECTIONS.FOUND), docPayload);
      const createdItem = { id: docRef.id, ...docPayload };

      // Also mirror into local cache for immediate UI availability
      if (typeof StorageService !== 'undefined' && typeof StorageService.addItem === 'function') {
        try {
          StorageService.addItem({ ...createdItem, id: docRef.id });
        } catch (cacheErr) {
          console.warn("Local cache update note:", cacheErr);
        }
      }

      return { success: true, id: docRef.id, item: createdItem };
    } catch (error) {
      console.error("Firestore addFoundItem error:", error);
      return { 
        success: false, 
        message: this.formatFirestoreError(error, "save found item report") 
      };
    }
  },

  /**
   * Retrieve all reports from 'lost_items' collection
   * @returns {Promise<Array>}
   */
  async getLostItems() {
    try {
      const querySnapshot = await getDocs(collection(db, COLLECTIONS.LOST));
      const items = [];
      querySnapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, collectionName: COLLECTIONS.LOST, ...docSnap.data() });
      });
      return items;
    } catch (error) {
      console.warn("Firestore getLostItems note:", error.message);
      return [];
    }
  },

  /**
   * Retrieve all reports from 'found_items' collection
   * @returns {Promise<Array>}
   */
  async getFoundItems() {
    try {
      const querySnapshot = await getDocs(collection(db, COLLECTIONS.FOUND));
      const items = [];
      querySnapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, collectionName: COLLECTIONS.FOUND, ...docSnap.data() });
      });
      return items;
    } catch (error) {
      console.warn("Firestore getFoundItems note:", error.message);
      return [];
    }
  },

  /**
   * Retrieve all reports across both collections
   * @returns {Promise<Array>}
   */
  async getAllReports() {
    try {
      // Ensure auth state resolution so auth token is attached if user is logged in
      await this.getCurrentAuthUser();

      const [lost, found] = await Promise.all([
        this.getLostItems(),
        this.getFoundItems()
      ]);
      const combined = [...lost, ...found];
      
      // Sort newest to oldest
      combined.sort((a, b) => {
        const timeA = new Date(a.date || a.createdAt || 0).getTime();
        const timeB = new Date(b.date || b.createdAt || 0).getTime();
        return timeB - timeA;
      });

      return combined;
    } catch (error) {
      console.error("Firestore getAllReports error:", error);
      return [];
    }
  },

  /**
   * Retrieve reports submitted by a specific user UID
   * @param {string} [uid] 
   * @returns {Promise<Array>}
   */
  async getUserReports(uid) {
    let targetUid = uid;
    if (!targetUid) {
      const user = await this.getCurrentAuthUser();
      targetUid = user ? user.uid : null;
    }
    if (!targetUid) return [];

    try {
      const qLost = query(collection(db, COLLECTIONS.LOST), where("reportedByUid", "==", targetUid));
      const qFound = query(collection(db, COLLECTIONS.FOUND), where("reportedByUid", "==", targetUid));

      const [snapLost, snapFound] = await Promise.all([
        getDocs(qLost),
        getDocs(qFound)
      ]);

      const userItems = [];
      snapLost.forEach(docSnap => {
        userItems.push({ id: docSnap.id, collectionName: COLLECTIONS.LOST, ...docSnap.data() });
      });
      snapFound.forEach(docSnap => {
        userItems.push({ id: docSnap.id, collectionName: COLLECTIONS.FOUND, ...docSnap.data() });
      });

      userItems.sort((a, b) => {
        const timeA = new Date(a.date || a.createdAt || 0).getTime();
        const timeB = new Date(b.date || b.createdAt || 0).getTime();
        return timeB - timeA;
      });

      return userItems;
    } catch (error) {
      console.error("Firestore getUserReports error:", error);
      return [];
    }
  },

  /**
   * Update report status (e.g. 'active' -> 'claimed') in Firestore
   * @param {string} collectionName - 'lost_items' or 'found_items'
   * @param {string} itemId - Firestore document ID
   * @param {string} newStatus - 'active' | 'claimed'
   */
  async updateItemStatus(collectionName, itemId, newStatus) {
    const user = await this.getCurrentAuthUser();
    if (!user || !user.uid) {
      return { success: false, message: "Authentication Required: You must be signed in to update item status." };
    }

    const cleanItemId = (itemId || '').trim();
    if (!cleanItemId) {
      return { success: false, message: "Invalid report ID provided." };
    }

    try {
      let targetCollection = collectionName;
      if (targetCollection !== COLLECTIONS.LOST && targetCollection !== COLLECTIONS.FOUND) {
        targetCollection = await this.detectCollectionForItem(cleanItemId);
      }
      if (!targetCollection) {
        return { success: false, message: "Document collection could not be resolved." };
      }

      // Pre-flight check: verify document exists and is owned by current user
      const itemRef = doc(db, targetCollection, cleanItemId);
      const docSnap = await getDoc(itemRef);
      if (!docSnap.exists()) {
        return { success: false, message: "Report not found in the database." };
      }

      const reportData = docSnap.data();
      if (!reportData.reportedByUid || reportData.reportedByUid !== user.uid) {
        return { 
          success: false, 
          message: "Permission Denied: Only the verified owner of this report can update its status." 
        };
      }

      await updateDoc(itemRef, {
        status: newStatus,
        updatedAt: new Date().toISOString(),
        updatedTimestamp: serverTimestamp()
      });

      // Synchronize with local storage cache if available
      if (typeof StorageService !== 'undefined' && typeof StorageService.updateItemStatus === 'function') {
        try {
          StorageService.updateItemStatus(cleanItemId, newStatus);
        } catch (e) {}
      }

      return { success: true };
    } catch (error) {
      console.error("Firestore updateItemStatus error:", error);
      return { success: false, message: this.formatFirestoreError(error, "update report status") };
    }
  },

  /**
   * Delete report from Firestore with strict owner validation
   * @param {string} collectionName - 'lost_items' or 'found_items'
   * @param {string} itemId - Firestore document ID
   */
  async deleteItem(collectionName, itemId) {
    const user = await this.getCurrentAuthUser();
    if (!user || !user.uid) {
      return { success: false, message: "Authentication Required: You must be signed in to delete reports." };
    }

    const cleanItemId = (itemId || '').trim();
    if (!cleanItemId) {
      return { success: false, message: "Invalid report ID provided." };
    }

    try {
      let targetCollection = collectionName;
      if (targetCollection !== COLLECTIONS.LOST && targetCollection !== COLLECTIONS.FOUND) {
        targetCollection = await this.detectCollectionForItem(cleanItemId);
      }
      if (!targetCollection) {
        return { success: false, message: "Document collection could not be resolved." };
      }

      // Pre-flight check: verify document exists and is owned by current user
      const itemRef = doc(db, targetCollection, cleanItemId);
      const docSnap = await getDoc(itemRef);
      if (!docSnap.exists()) {
        return { success: false, message: "Report not found in the database." };
      }

      const reportData = docSnap.data();
      if (!reportData.reportedByUid || reportData.reportedByUid !== user.uid) {
        return { 
          success: false, 
          message: "Permission Denied: Only the verified owner of this report can delete it." 
        };
      }

      // Delete document from Firestore
      await deleteDoc(itemRef);

      // Synchronize with local storage cache if available
      if (typeof StorageService !== 'undefined' && typeof StorageService.deleteItem === 'function') {
        try {
          StorageService.deleteItem(cleanItemId);
        } catch (e) {}
      }

      return { success: true };
    } catch (error) {
      console.error("Firestore deleteItem error:", error);
      return { success: false, message: this.formatFirestoreError(error, "delete report") };
    }
  },

  /**
   * Detect which collection an item belongs to if not explicitly passed
   */
  async detectCollectionForItem(itemId) {
    const cleanId = (itemId || '').trim();
    if (!cleanId) return null;
    try {
      const lostDoc = await getDoc(doc(db, COLLECTIONS.LOST, cleanId));
      if (lostDoc.exists()) return COLLECTIONS.LOST;
      const foundDoc = await getDoc(doc(db, COLLECTIONS.FOUND, cleanId));
      if (foundDoc.exists()) return COLLECTIONS.FOUND;
      return null;
    } catch (e) {
      return null;
    }
  },

  /**
   * Helper to format readable Firestore errors
   */
  formatFirestoreError(error, actionName) {
    if (!error) return `Failed to ${actionName}.`;
    if (error.code === 'permission-denied') {
      return `Permission Denied: You do not have authorization to ${actionName}. Please check that you are signed in with the reporting account and your Firestore rules are published.`;
    }
    if (error.code === 'unavailable') {
      return `Service Unavailable: Unable to connect to Cloud Firestore servers. Please check your internet connection.`;
    }
    return error.message || `Unable to ${actionName}.`;
  },

  /**
   * Helper to format readable image upload errors
   */
  formatStorageError(error) {
    if (!error) return "Image upload failed.";
    return error.message || "Failed to upload image to host.";
  }
};

// Expose on global window object
window.FirestoreService = FirestoreService;

export { FirestoreService };
