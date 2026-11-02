/**
 * CampusFind - College Lost & Found System
 * Firebase Authentication & Session Management Module
 * 
 * Powered by Firebase Authentication SDK v10 (ES Modules)
 * Connected Project: campusfind-9e0e8
 * 
 * SECURITY COMPLIANCE:
 * - Real token-based authentication via Firebase Auth
 * - No passwords stored in localStorage, Firestore, or custom browser stores
 * - Client credentials and sessions are securely managed by Google Firebase
 */

import {
  auth,
  db,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  doc,
  setDoc,
  serverTimestamp
} from "./firebase-config.js";

// Clean up any legacy prototype demo credential stores from localStorage
try {
  localStorage.removeItem('campusfind_demo_users_v2');
  localStorage.removeItem('campusfind_demo_users');
  localStorage.removeItem('campusfind_users_v1');
  localStorage.removeItem('campusfind_auth_user_v1');
} catch (e) {
  // Ignore in restricted environments
}

/**
 * Campus Authentication Service wrapper
 */
const FirebaseAuthService = {
  authInstance: auth,
  dbInstance: db,
  currentUser: null,
  authInitialized: false,
  _listeners: [],

  /**
   * Initialize Auth state observer
   */
  init() {
    onAuthStateChanged(auth, (user) => {
      this.currentUser = user;
      this.authInitialized = true;

      // Keep light active profile in sessionStorage for synchronous reads
      if (user) {
        const sessionProfile = {
          uid: user.uid,
          name: user.displayName || user.email.split('@')[0],
          email: user.email,
          role: "Student",
          lastLogin: new Date().toLocaleTimeString()
        };
        try {
          sessionStorage.setItem('campusfind_active_user', JSON.stringify(sessionProfile));
        } catch (e) {}
      } else {
        try {
          sessionStorage.removeItem('campusfind_active_user');
          sessionStorage.removeItem('campusfind_demo_active_user');
        } catch (e) {}
      }

      // Notify registered listeners
      this._listeners.forEach((callback) => {
        try {
          callback(user);
        } catch (err) {
          console.error("Auth listener callback error:", err);
        }
      });

      // Dispatch global window event for components that listen to auth changes
      window.dispatchEvent(new CustomEvent('campus-auth-changed', { detail: user }));
    });
  },

  /**
   * Subscribe to auth state changes
   * @param {Function} callback - Receives (user | null)
   */
  onAuthChanged(callback) {
    if (typeof callback === 'function') {
      this._listeners.push(callback);
      if (this.authInitialized) {
        callback(this.currentUser);
      }
    }
  },

  /**
   * Get current authenticated user profile
   * @returns {Object|null}
   */
  getCurrentUser() {
    if (this.currentUser) {
      return {
        uid: this.currentUser.uid,
        name: this.currentUser.displayName || this.currentUser.email.split('@')[0],
        email: this.currentUser.email,
        role: "Student"
      };
    }
    // Fallback to active sessionStorage profile if available
    try {
      const stored = sessionStorage.getItem('campusfind_active_user') || 
                     sessionStorage.getItem('campusfind_demo_active_user');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  },

  /**
   * Check if user is currently signed in
   * @returns {boolean}
   */
  isLoggedIn() {
    return this.getCurrentUser() !== null;
  },

  /**
   * Sign in with Email and Password using Firebase Auth
   * @param {string} email 
   * @param {string} password 
   * @returns {Promise<Object>} { success: boolean, user?: Object, message?: string }
   */
  async login(email, password) {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPassword = (password || '').trim();

    if (!cleanEmail || !cleanPassword) {
      return { success: false, message: "Please enter both your college email and password." };
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
      const user = userCredential.user;

      const profile = {
        uid: user.uid,
        name: user.displayName || user.email.split('@')[0],
        email: user.email,
        role: "Student"
      };

      return { success: true, user: profile };
    } catch (error) {
      console.warn("Firebase Auth Login Error:", error.code, error.message);
      return { success: false, message: this.getReadableErrorMessage(error) };
    }
  },

  /**
   * Register a new user with Firebase Authentication
   * @param {Object} userData - { name, studentId, email, phone, password }
   * @returns {Promise<Object>} { success: boolean, user?: Object, message?: string }
   */
  async register(userData) {
    const cleanName = (userData.name || '').trim();
    const cleanStudentId = (userData.studentId || '').trim();
    const cleanEmail = (userData.email || '').trim().toLowerCase();
    const cleanPhone = (userData.phone || '').trim();
    const cleanPassword = (userData.password || '').trim();

    if (!cleanName) return { success: false, message: "Full Name is required." };
    if (!cleanStudentId) return { success: false, message: "College ID or Roll Number is required." };
    if (!cleanEmail) return { success: false, message: "College email is required." };
    if (!cleanPassword || cleanPassword.length < 6) {
      return { success: false, message: "Password must be at least 6 characters long." };
    }

    try {
      // 1. Create user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPassword);
      const user = userCredential.user;

      // 2. Set display name in Firebase Auth profile
      await updateProfile(user, { displayName: cleanName });

      // 3. Save student metadata into Cloud Firestore (/users/{uid})
      // NOTE: Passwords are NEVER written to Firestore or any client database
      try {
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          name: cleanName,
          studentId: cleanStudentId,
          email: cleanEmail,
          phone: cleanPhone,
          role: "Student",
          createdAt: serverTimestamp()
        });
      } catch (firestoreError) {
        console.warn("Notice: Firestore profile document creation status:", firestoreError.message);
        // Authentication succeeded even if Firestore rules require approval
      }

      const profile = {
        uid: user.uid,
        name: cleanName,
        email: cleanEmail,
        studentId: cleanStudentId,
        role: "Student"
      };

      return { success: true, user: profile };
    } catch (error) {
      console.warn("Firebase Auth Registration Error:", error.code, error.message);
      return { success: false, message: this.getReadableErrorMessage(error) };
    }
  },

  /**
   * Sign out current user
   */
  async logout() {
    try {
      await signOut(auth);
      try {
        sessionStorage.removeItem('campusfind_active_user');
        sessionStorage.removeItem('campusfind_demo_active_user');
      } catch (e) {}
      return { success: true };
    } catch (error) {
      console.error("Sign out error:", error);
      return { success: false, message: error.message };
    }
  },

  /**
   * Translate Firebase Auth error codes to user-friendly messages
   * @param {Object} error 
   * @returns {string}
   */
  getReadableErrorMessage(error) {
    if (!error) return "An unexpected authentication error occurred. Please try again.";

    switch (error.code) {
      case 'auth/user-not-found':
        return "No account found with this email. Please check your email or register.";
      case 'auth/wrong-password':
        return "Incorrect email or password. Please try again.";
      case 'auth/invalid-credential':
        return "Incorrect email or password. Please verify your credentials or register if you do not have an account.";
      case 'auth/email-already-in-use':
        return "An account with this email address already exists. Please sign in instead.";
      case 'auth/weak-password':
        return "Password is too weak. Please choose a password with at least 6 characters.";
      case 'auth/invalid-email':
        return "Please enter a valid email address (e.g. name@campus.edu).";
      case 'auth/user-disabled':
        return "This campus account has been disabled. Please contact the administrator.";
      case 'auth/too-many-requests':
        return "Access temporarily restricted due to many failed login attempts. Please try again later or reset your password.";
      case 'auth/network-request-failed':
        return "Network connection issue: Unable to reach Firebase Authentication servers. Please check your internet connection.";
      case 'auth/operation-not-allowed':
        return "Email/Password sign-in is not enabled in Firebase Console. Please enable Email/Password provider in the Firebase Authentication settings.";
      default:
        return error.message || "Authentication failed. Please verify your details.";
    }
  }
};

// Start observing Auth state
FirebaseAuthService.init();

// Expose on global window object for standard script access and backward compatibility
window.FirebaseAuth = FirebaseAuthService;
window.CampusAuth = FirebaseAuthService;
window.DemoAuth = FirebaseAuthService; // Backwards compatibility for existing scripts

/* --------------------------------------------------------------------------
   DOM Event Handlers for Login and Registration Pages
   -------------------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  initLoginForm();
  initRegisterForm();
  initDemoCredentialsButton();
});

/**
 * Handle Login Form Submission
 */
function initLoginForm() {
  const loginForm = document.getElementById('loginForm');
  if (!loginForm) return;

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    const alertBox = document.getElementById('authAlert');

    if (alertBox) {
      alertBox.style.display = 'none';
      alertBox.textContent = '';
    }

    const email = emailInput ? emailInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value : '';

    if (!email) {
      showAuthError("Please enter your college email address.");
      if (emailInput) emailInput.focus();
      return;
    }

    if (!isValidEmail(email)) {
      showAuthError("Please enter a valid email format (e.g. student@campus.edu).");
      if (emailInput) emailInput.focus();
      return;
    }

    if (!password) {
      showAuthError("Please enter your password.");
      if (passwordInput) passwordInput.focus();
      return;
    }

    // Set loading UI state
    const originalBtnText = submitBtn ? submitBtn.innerHTML : 'Sign In';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span class="loading-spinner loading-spinner-sm loading-spinner-light" style="margin-right: 6px;"></span> Signing in...`;
    }

    try {
      const result = await FirebaseAuthService.login(email, password);

      if (result.success) {
        if (typeof showToast === 'function') {
          showToast(`Signed in successfully as ${result.user.name}!`, "success");
        }

        // Check for redirect query parameter
        const urlParams = new URLSearchParams(window.location.search);
        const redirectUrl = urlParams.get('redirect') || 'dashboard.html';

        setTimeout(() => {
          window.location.href = redirectUrl;
        }, 600);
      } else {
        showAuthError(result.message);
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnText;
        }
      }
    } catch (err) {
      showAuthError("Authentication service error. Please try again.");
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
      }
    }
  });
}

/**
 * Handle Register Form Submission
 */
function initRegisterForm() {
  const registerForm = document.getElementById('registerForm');
  if (!registerForm) return;

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nameInput = document.getElementById('regName');
    const idInput = document.getElementById('regStudentId');
    const emailInput = document.getElementById('regEmail');
    const phoneInput = document.getElementById('regPhone');
    const passInput = document.getElementById('regPassword');
    const confirmPassInput = document.getElementById('regConfirmPassword');
    const submitBtn = registerForm.querySelector('button[type="submit"]');
    const alertBox = document.getElementById('authAlert');

    if (alertBox) {
      alertBox.style.display = 'none';
      alertBox.textContent = '';
    }

    const name = nameInput ? nameInput.value.trim() : '';
    const studentId = idInput ? idInput.value.trim() : '';
    const email = emailInput ? emailInput.value.trim() : '';
    const phone = phoneInput ? phoneInput.value.trim() : '';
    const password = passInput ? passInput.value : '';
    const confirmPassword = confirmPassInput ? confirmPassInput.value : '';

    if (!name) {
      showAuthError("Full Name is required.");
      if (nameInput) nameInput.focus();
      return;
    }

    if (!studentId) {
      showAuthError("College ID or Roll Number is required.");
      if (idInput) idInput.focus();
      return;
    }

    if (!email) {
      showAuthError("College email address is required.");
      if (emailInput) emailInput.focus();
      return;
    }

    if (!isValidEmail(email)) {
      showAuthError("Please provide a valid college email address (e.g. yourname@campus.edu).");
      if (emailInput) emailInput.focus();
      return;
    }

    if (!password) {
      showAuthError("Password is required.");
      if (passInput) passInput.focus();
      return;
    }

    if (password.length < 6) {
      showAuthError("Password must be at least 6 characters long.");
      if (passInput) passInput.focus();
      return;
    }

    if (password !== confirmPassword) {
      showAuthError("Passwords do not match. Please re-enter.");
      if (confirmPassInput) confirmPassInput.focus();
      return;
    }

    // Set loading UI state
    const originalBtnText = submitBtn ? submitBtn.innerHTML : 'Complete Registration';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span class="loading-spinner loading-spinner-sm loading-spinner-light" style="margin-right: 6px;"></span> Creating account...`;
    }

    try {
      const result = await FirebaseAuthService.register({
        name,
        studentId,
        email,
        phone,
        password
      });

      if (result.success) {
        if (typeof showToast === 'function') {
          showToast(`Account created successfully! Welcome, ${result.user.name}.`, "success");
        }
        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 800);
      } else {
        showAuthError(result.message);
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnText;
        }
      }
    } catch (err) {
      showAuthError("Registration service error. Please try again.");
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
      }
    }
  });
}

/**
 * Demo Credentials Auto-Fill Button Handler
 */
function initDemoCredentialsButton() {
  const autofillBtn = document.getElementById('autofillDemoBtn');
  if (!autofillBtn) return;

  autofillBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const emailInput = document.getElementById('loginEmail');
    const passInput = document.getElementById('loginPassword');

    if (emailInput && passInput) {
      emailInput.value = 'demo.student@campus.edu';
      passInput.value = 'demo123';
      if (typeof showToast === 'function') {
        showToast("Demo credentials filled. If you haven't registered this account in Firebase yet, click 'Register' below.", "info");
      }
    }
  });
}

function showAuthError(message) {
  const alertBox = document.getElementById('authAlert');
  if (alertBox) {
    alertBox.textContent = message;
    alertBox.style.display = 'block';
    alertBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } else if (typeof showToast === 'function') {
    showToast(message, 'danger');
  } else {
    alert(message);
  }
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export { FirebaseAuthService };
