/**
 * CampusFind - College Lost & Found System
 * Mock Data Module (Vanilla JS)
 * 
 * IMPORTANT: This file provides sample/demo data to demonstrate frontend
 * features before connecting to Cloud Firestore in Milestone 2.
 */

// Helper to generate clean, colorful SVG placeholder cards for items
function createItemSvg(title, category, colorBg, iconSymbol) {
  const labelText = (iconSymbol || category || 'CAMPUS').toUpperCase().slice(0, 10);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="260" viewBox="0 0 400 260">
    <defs>
      <linearGradient id="grad-${category.replace(/\s+/g, '')}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${colorBg[0]}" />
        <stop offset="100%" stop-color="${colorBg[1]}" />
      </linearGradient>
    </defs>
    <rect width="400" height="260" fill="url(#grad-${category.replace(/\s+/g, '')})" />
    <circle cx="200" cy="105" r="48" fill="rgba(255,255,255,0.18)" />
    <text x="200" y="113" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="700" text-anchor="middle" fill="#ffffff" letter-spacing="2">${labelText}</text>
    <rect x="20" y="200" width="360" height="38" rx="8" fill="rgba(0,0,0,0.3)" />
    <text x="200" y="225" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="600" text-anchor="middle" fill="#ffffff" letter-spacing="1">${title.toUpperCase()}</text>
  </svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

const INITIAL_SAMPLE_ITEMS = [
  {
    id: "item-101",
    title: "Casio FX-991EX Scientific Calculator",
    category: "Electronics",
    type: "lost",
    status: "open",
    location: "Central Library - 2nd Floor Reading Room #4",
    locationArea: "Central Library",
    date: "2026-10-14",
    description: "Black and white scientific calculator with small blue star sticker on the back cover. Left on table 14 around 4:30 PM.",
    contactName: "Rahul Sharma",
    contactEmail: "rahul.s23@campus.edu",
    contactPhone: "+91 98765 43210",
    image: createItemSvg("Casio FX-991EX", "Electronics", ["#1e3a8a", "#3b82f6"], "CALC"),
    reportedBy: "demo.student@campus.edu",
    custodyInfo: "Believed to be still in Central Library",
    isDemo: true
  },
  {
    id: "item-102",
    title: "Campus Student ID Card (Computer Science)",
    category: "IDs & Cards",
    type: "found",
    status: "open",
    location: "Engineering Block A - Ground Floor Corridor",
    locationArea: "Engineering Block A",
    date: "2026-10-15",
    description: "RFID Smart Card belonging to Ananya Sen (Dept of CSE, Roll No: CS-2024-089). Handed over to main reception desk.",
    contactName: "Campus Security Desk",
    contactEmail: "security@campus.edu",
    contactPhone: "+91 91234 56789",
    image: createItemSvg("Student ID Card", "Cards", ["#065f46", "#10b981"], "ID CARD"),
    reportedBy: "security@campus.edu",
    custodyInfo: "Security Desk (Admin Block - Window 2)",
    isDemo: true
  },
  {
    id: "item-103",
    title: "HP 65W USB-C Laptop Charger",
    category: "Electronics",
    type: "lost",
    status: "open",
    location: "Student Cafeteria - Corner Booth near Coffee Vending",
    locationArea: "Student Cafeteria",
    date: "2026-10-13",
    description: "Original HP Type-C power adapter with black braided cable. Has yellow tape mark near the connector pin.",
    contactName: "Priya Nair",
    contactEmail: "priya.nair@campus.edu",
    contactPhone: "+91 98111 22334",
    image: createItemSvg("HP Laptop Charger", "Electronics", ["#374151", "#4b5563"], "CHARGER"),
    reportedBy: "demo.student@campus.edu",
    custodyInfo: "Unknown, searching campus cafeteria",
    isDemo: true
  },
  {
    id: "item-104",
    title: "Set of 3 Dorm Keys with Blue College Lanyard",
    category: "Keys",
    type: "found",
    status: "open",
    location: "Sports Ground - Near Outdoor Basketball Court Bench",
    locationArea: "Sports Complex & Gym",
    date: "2026-10-15",
    description: "Three brass Godrej keys attached to a blue college anniversary lanyard with a silver carabiner clip.",
    contactName: "Coach Vikram",
    contactEmail: "sports@campus.edu",
    contactPhone: "+91 94555 66778",
    image: createItemSvg("Dorm Keys & Lanyard", "Keys", ["#0f766e", "#14b8a6"], "KEYS"),
    reportedBy: "sports@campus.edu",
    custodyInfo: "Sports Complex Equipment Room",
    isDemo: true
  },
  {
    id: "item-105",
    title: "Hydro Flask 32oz Water Bottle (Teal)",
    category: "Bottles & Bags",
    type: "lost",
    status: "claimed",
    location: "Main Auditorium - Row F, Seat 12",
    locationArea: "Main Auditorium",
    date: "2026-10-10",
    description: "Teal colored vacuum insulated stainless steel bottle with silicone boot and stickers from college hackathon.",
    contactName: "Aditya Mehta",
    contactEmail: "aditya.m@campus.edu",
    contactPhone: "+91 97222 33445",
    image: createItemSvg("Hydro Flask Bottle", "Bags", ["#0369a1", "#0284c7"], "BOTTLE"),
    reportedBy: "demo.student@campus.edu",
    custodyInfo: "Reunited with owner Aditya M. on Oct 12",
    isDemo: true
  },
  {
    id: "item-106",
    title: "Brown Leather Titan Men's Wallet",
    category: "Wallets & Purses",
    type: "found",
    status: "claimed",
    location: "Science Building - 1st Floor Physics Lab Corridor",
    locationArea: "Science Block",
    date: "2026-10-11",
    description: "Dark brown bi-fold wallet containing metro card and passport photos. Kept safely at departmental office.",
    contactName: "Prof. K. Sundaram",
    contactEmail: "physics.dept@campus.edu",
    contactPhone: "+91 99888 77665",
    image: createItemSvg("Brown Leather Wallet", "Wallets", ["#78350f", "#b45309"], "WALLET"),
    reportedBy: "physics.dept@campus.edu",
    custodyInfo: "Returned to verified owner with ID proof",
    isDemo: true
  },
  {
    id: "item-107",
    title: "Noise ColorFit Pulse 2 Smartwatch (Black)",
    category: "Electronics",
    type: "lost",
    status: "under_verification",
    location: "Gymnasium / Fitness Center Locker Room",
    locationArea: "Sports Complex & Gym",
    date: "2026-10-14",
    description: "Matte black strap with small scratch on top right glass bezel. Battery was at 35% when last synchronized.",
    contactName: "Karthik Raja",
    contactEmail: "karthik.r@campus.edu",
    contactPhone: "+91 93456 78901",
    image: createItemSvg("Smartwatch Black", "Electronics", ["#1f2937", "#374151"], "WATCH"),
    reportedBy: "demo.student@campus.edu",
    custodyInfo: "A matching watch was reported to Gym Instructor",
    isDemo: true
  },
  {
    id: "item-108",
    title: "Engineering Physics Textbook (Halliday & Resnick)",
    category: "Books & Study Material",
    type: "found",
    status: "open",
    location: "Hostel Block 2 - Study Lounge Table",
    locationArea: "Hostel Blocks (Dorms)",
    date: "2026-10-15",
    description: "10th Edition paperback textbook. Has handwritten notes and formulas on the inner front page in green ink.",
    contactName: "Hostel Warden Office",
    contactEmail: "warden.h2@campus.edu",
    contactPhone: "+91 98400 11223",
    image: createItemSvg("Physics Textbook", "Books", ["#4338ca", "#6366f1"], "BOOK"),
    reportedBy: "warden.h2@campus.edu",
    custodyInfo: "Hostel 2 Warden Office - Desk 1",
    isDemo: true
  }
];

// College Campus Locations list for drop-downs
const CAMPUS_LOCATIONS = [
  "Central Library",
  "Engineering Block A",
  "Engineering Block B",
  "Science Block",
  "Student Cafeteria",
  "Main Auditorium",
  "Sports Complex & Gym",
  "Hostel Blocks (Dorms)",
  "Student Activity Center (SAC)",
  "Campus Medical Center",
  "Admin Building & Registrar Office",
  "Other / Outside Campus"
];

// Item Categories list for drop-downs
const ITEM_CATEGORIES = [
  "Electronics",
  "IDs & Cards",
  "Keys",
  "Books & Study Material",
  "Bottles & Bags",
  "Clothing & Accessories",
  "Wallets & Purses",
  "Sports Equipment",
  "Other"
];
