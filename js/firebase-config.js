/**
 * CampusFind - College Lost & Found System
 * Firebase Modular SDK Configuration & Service Initialization
 * 
 * Powered by Firebase Modular SDK v10 (ES Modules)
 * Connected Project: campusfind-9e0e8
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// Official Firebase Web App Configuration
const firebaseConfig = {
  apiKey: "AIzaSyAuWBGGIqiGpDv0y2w7ksoxboZQ79SYT7k",
  authDomain: "campusfind-9e0e8.firebaseapp.com",
  projectId: "campusfind-9e0e8",
  storageBucket: "campusfind-9e0e8.firebasestorage.app",
  messagingSenderId: "654873585968",
  appId: "1:654873585968:web:cb33ee0ede67d87c3540f5",
  measurementId: "G-WTTX74J68X"
};

// Initialize Core Firebase Services
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Export instances and modular functions for application-wide use
export {
  app,
  auth,
  db,
  storage,
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp
};
