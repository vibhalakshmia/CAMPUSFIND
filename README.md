# CampusFind — Cloud-Based Lost and Found System
**A Modern Web Platform for College Campuses**

---

## Project Overview
**CampusFind** is a college project designed to help students, faculty, and campus security report, locate, and reclaim lost or found personal belongings across academic blocks, libraries, cafeterias, hostels, and sports complexes.

- **Technology Stack:** HTML5, CSS3, Vanilla JavaScript (ES6+ Modules), Firebase Modular SDK v10, Cloudinary REST API
- **Firebase Project ID:** `campusfind-9e0e8`
- **Database:** Cloud Firestore (`lost_items` and `found_items` collections)
- **Authentication:** Firebase Authentication (Email/Password)
- **Image Hosting:** Cloudinary Unsigned Uploads (Free tier compatible, zero billing required)

---

## Project Folder Structure

```text
lost-and-found/
├── index.html              # Modern, responsive Home Page with Hero & Stats
├── report-lost.html        # Form to report a lost belonging with photo upload
├── report-found.html       # Form to report a found belonging with custody info
├── search.html             # Interactive in-browser search directory with multi-criteria filters
├── dashboard.html          # Student & staff dashboard with auth guard & status toggles
├── login.html              # College login portal connected to Firebase Authentication
├── register.html           # Student registration using Firebase createUserWithEmailAndPassword
├── firestore.rules         # Production Firestore Security Rules
│
├── css/
│   ├── style.css           # Core styling, typography, buttons, cards, modals & spinners
│   └── responsive.css      # Mobile, tablet, and desktop media queries
│
├── js/
│   ├── firebase-config.js  # Shared Firebase Modular SDK initialization & exports
│   ├── image-config.js     # External image hosting configuration (Cloudinary unsigned uploads)
│   ├── firestore-service.js# Firestore CRUD & Cloudinary photo upload service
│   ├── auth.js             # Firebase Auth integration (login, register, session observer)
│   ├── mock-data.js        # Default sample campus items (calculators, IDs, keys)
│   ├── storage.js          # Shared data layer managing reports & reporter IDs
│   ├── main.js             # Global navigation, mobile menu, modals, toasts & auth badge
│   ├── forms.js            # Image previews, drop-down logic & report validation
│   ├── search.js           # Multi-filter search engine and sorting logic
│   └── dashboard.js        # Statistics calculation, auth guard & report management
│
└── assets/
    └── images/
        └── placeholder.svg # Fallback SVG image for listings
```

---

## How to Run the Website Locally

You can open and test this website using any of the following methods:

### Method 1: Python Local Server (Recommended)
A local server runs at:
```text
http://127.0.0.1:8000
```
To start or restart the server, open PowerShell inside this project folder and run:
```powershell
python -m http.server 8000
```

### Method 2: Direct File Explorer (Zero Setup)
1. Open Windows File Explorer and navigate to:
   `c:\Users\Vibhalakshmi.A\Desktop\lost and found`
2. Open **`index.html`** in your browser.

---

## Core System Architecture & Features

| Feature | Description | Status |
| :--- | :--- | :--- |
| **Responsive Home Page** | University branding, hero banner, live statistics banner, and "How it works" guide. | Active |
| **Navigation Bar** | Sticky header with links to all pages and mobile menu. | Active |
| **Report Lost Form** | Name, category, campus building, date, description, and live photo upload. | Active |
| **Report Found Form** | Same fields plus current custody/drop-off location (e.g. Library Desk, Security). | Active |
| **Search Directory** | In-browser filtering by keyword, category, campus area, status, and sort order. | Active |
| **Image Hosting** | Free-tier external upload via Cloudinary unsigned presets (no Firebase Blaze required). | Active |
| **Login & Register** | Real-time Firebase Authentication with validation and secure error messages. | Active |
| **Protected Dashboard** | Live counters, "My Reports" filter, report deletion, and status resolve toggles. | Active |
| **Cloud Persistence** | Reports are stored in Cloud Firestore and sync across sessions and devices. | Active |

---

## Firebase Integration Details

### 1. Firebase Authentication
- **User Registration:** Connects `createUserWithEmailAndPassword` to register students into Firebase Authentication. Student names are saved to their auth profile via `updateProfile`.
- **User Sign-In:** Connects `signInWithEmailAndPassword`. Incorrect credentials and unregistered accounts display clean, friendly error messages.
- **Session & Navigation:** `onAuthStateChanged` observes the live login status. When signed in, user name, student avatar, and a working **Sign Out** button display across all pages.
- **Zero Passwords Stored Locally:** Passwords are never placed into `localStorage`, session storage, or client databases.

### 2. Protected Dashboard & Auth Guards
- **Guest Access Guard:** Unauthenticated guests can view public reports, but cannot perform protected actions (resolving statuses, reopening reports, or deleting submissions). Attempting to do so prompts for sign-in and redirects to `login.html?redirect=dashboard.html`.
- **Ownership Verification:** Reports can only be edited or deleted by their verified owner (`reportedByUid`). Non-owners see an "Owner only" badge and cannot modify other users' reports.

### 3. Cloud Firestore Security Rules
Configured in `firestore.rules`:
- Public writes are strictly prohibited.
- Only authenticated users can file reports.
- Students can only edit or resolve reports matching their authenticated UID (`reportedByUid`).
- User profile documents (`/users/{uid}`) can only be written by their respective owners and cannot contain passwords.

---

## Image Hosting Setup (Cloudinary Unsigned Uploads)

To keep Firebase on the free Spark plan without needing a paid Blaze plan or credit card, image uploads use Cloudinary's Unsigned Uploads REST endpoint.

### Setup Instructions:
1. Create a free account at [Cloudinary](https://cloudinary.com).
2. Go to **Settings** > **Upload** > **Upload presets**.
3. Click **Add upload preset**:
   - Set **Signing Mode** to **Unsigned**.
   - Preset Name: `campusfind_reports` (or any name you choose).
   - Folder: `campusfind_reports`.
4. Open `js/image-config.js` in your editor and update:
   ```javascript
   export const IMAGE_CONFIG = {
     cloudName: 'YOUR_CLOUD_NAME',
     uploadPreset: 'campusfind_reports',
     ...
   };
   ```
5. Save the file. Photos uploaded through lost and found forms will upload directly to your Cloudinary storage and persist across devices.

### Security Safeguards:
- Client JavaScript only has access to the unsigned preset name, never administrative API secrets.
- Unsigned upload presets only permit asset creation; delete or modify operations are blocked from untrusted clients.
