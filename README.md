# 🏥 MediTap v4 — Emergency Medical Identity Platform

> **Your medical identity. Always accessible. Always secure.**
>
> MediTap is a full-stack web application that gives patients a digital medical identity card (via NFC/QR), real-time crash & fall detection, multi-portal access for hospitals and insurance providers, and an emergency SOS system that instantly alerts friends and emergency contacts with your live location.

---

## ✨ Feature Overview

### 🆔 1. Digital Medical Identity Card
- Each patient gets a unique **MediTap ID** (QR-scannable URL).
- The ID card displays: blood group, allergies, medications, emergency contact, and vitals at a glance.
- Hospitals can **scan the QR code** to access an instant **Emergency View** — no login required.
- The Emergency View shows critical medical information, recent vitals, medical history, and a one-tap call to the emergency contact.

---

### 🚨 2. Emergency SOS System
Triggered manually from the dashboard or automatically via crash detection.

**Manual SOS Options:**
- **🚑 Nearest Hospital** — Uses GPS + Google Gemini AI to find the top 3 closest hospitals with directions and phone numbers. Falls back to a curated emergency hospital list if offline.
- **📞 Call 112** — One-tap emergency dial.
- **👥 Alert Friends** — Broadcasts your live GPS location to all connected friends via Supabase Realtime channels AND sends a message to every friend in the in-app chat.

---

### 🤖 3. AI-Powered Crash & Fall Detection
Using the device's **accelerometer (DeviceMotion API)**:

1. **Impact Detection** — Monitors for acceleration spikes above a configurable threshold (`20 m/s²`).
2. **Stasis Confirmation** — Checks for immobility after the impact (resting-gravity range for 2+ seconds), confirming a likely fall/crash.
3. **Gemini AI Verification** — Sends a 3-second accelerometer buffer to **Google Gemini 1.5 Flash** for intelligent confirmation, reducing false positives.
4. **10-Second Countdown** — Before triggering, a cancellable countdown gives the user a chance to dismiss the alert.
5. **Automatic Emergency Sequence** on confirmation:
   - Gets current GPS location
   - Finds the nearest hospital
   - Notifies emergency contacts (logged in Supabase)
   - Broadcasts SOS to all friends via Realtime
   - Auto-dials `112`

> If the Gemini API is unavailable (quota/network), the system falls back to sensor-only detection for safety.

---

### 👥 4. Friends & Community
- Add friends by searching MediTap users.
- **Real-time SOS listener** (`FriendSOSListener`) runs in the background for all logged-in patients — triggers a browser siren + alert popup with a Google Maps link when any friend sends an SOS.
- Friend list with pending/accepted status.

---

### 💬 5. In-App Chat
- Real-time messaging between connected friends via Supabase Realtime.
- **SOS broadcast** automatically posts an emergency message to every friend chat.
- Chat history persisted in the database.

---

### 📋 6. Patient Dashboard
A rich, animated dashboard featuring:
- **Vitals Tracking** — Blood Pressure & Weight with interactive **Recharts area graphs** and historical timeline.
- **Appointment Manager** — Add/delete upcoming doctor appointments with reminders.
- **Hospital Access Log** — Tracks when and which hospitals accessed your record.
- **Profile Completion Meter** — Animates to show what health fields are still missing.
- **System Diagnostic Tool** — Checks Supabase connectivity, geolocation, and sensor availability.

---

### 📁 7. Medical Records & Vault
- Upload and categorize medical records (Checkup, Lab Report, Prescription, Vaccination).
- **Vault** — Secure storage for sensitive personal documents.
- Filter, view, and manage full medical history.

---

### 🏥 8. Hospital Portal
Role-gated portal for hospital staff:
- Search and access patient records by MediTap ID.
- View patient vitals, allergies, medications, and emergency contacts.
- Log each access (creates an `access_log` entry on the patient's record).

---

### 🛡️ 9. Insurance Portal
Role-gated portal for insurance providers:
- View and manage insurance claims submitted by patients.
- Approve/reject claim workflows.

---

### ⚙️ 10. Settings & Onboarding
- Full patient profile editor (DOB, gender, address, blood group, height, weight, allergies, medications, emergency contacts).
- Multi-step onboarding flow for new patients.
- Profile photo support via DiceBear Initials API fallback.

---

## 🧱 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, TypeScript, Vite 6 |
| **Styling** | TailwindCSS v4 |
| **Routing** | React Router v7 |
| **Animation** | Motion (Framer Motion) |
| **Charts** | Recharts |
| **Icons** | Lucide React |
| **Backend / DB** | Supabase (PostgreSQL + Auth + Realtime) |
| **AI** | Google Gemini 1.5 Flash (`@google/genai`) |
| **QR Scanning** | html5-qrcode |
| **Sensors** | Web DeviceMotion API |
| **Geolocation** | Browser Geolocation API |

---

## 🗃️ Database Schema

| Table | Purpose |
|---|---|
| `profiles` | User profiles (patient / hospital / insurance) |
| `patient_data` | Medical info: blood group, allergies, medications, emergency contact |
| `medical_records` | Checkups, lab reports, prescriptions, vaccinations |
| `access_logs` | Audit trail of every hospital/emergency record access |
| `vitals` | Time-series health metrics (BP, weight, heart rate, temperature) |
| `appointments` | Upcoming doctor appointments |
| `claims` | Insurance claims |
| `friendships` | Friend connections between patients |
| `emergency_alerts` | Logged automatic crash/fall detection events |

Row Level Security (RLS) is enabled on all tables. Patients can only access their own data; hospital-role users can read patient data and write access logs.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) project
- A [Google AI Studio](https://aistudio.google.com/) API key (for crash detection AI verification)

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd v4meditap
npm install
```

### 2. Set Up Environment Variables

Copy `.env.example` to `.env` and fill in your keys:

```bash
cp .env.example .env
```

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
GEMINI_API_KEY=your-gemini-api-key
```

### 3. Set Up the Database

Run the schema in your Supabase SQL editor:

```bash
# Copy and paste the contents of supabase_schema.sql into your Supabase SQL Editor
```

This creates all tables, RLS policies, and the auto-profile-creation trigger.

### 4. Run the App

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

---

## 📁 Project Structure

```
v4meditap/
├── src/
│   ├── components/
│   │   ├── FriendSOSListener.tsx   # Background real-time SOS alert listener
│   │   ├── PatientLayout.tsx       # Shared sidebar/nav layout for patients
│   │   └── QRScanner.tsx           # QR code camera scanner
│   ├── constants/
│   │   └── emergencyHospitals.ts   # Offline fallback hospital list
│   ├── hooks/
│   │   └── useCrashDetection.ts    # React hook wrapping the crash detection service
│   ├── lib/
│   │   └── supabase.ts             # Supabase client initialization
│   ├── pages/
│   │   ├── Dashboard.tsx           # Main patient dashboard
│   │   ├── EmergencyView.tsx       # Public emergency record view (QR scan target)
│   │   ├── Friends.tsx             # Friend management & SOS history
│   │   ├── Chat.tsx                # Real-time friend messaging
│   │   ├── IDCard.tsx              # Digital medical ID card + QR generator
│   │   ├── Records.tsx             # Medical records management
│   │   ├── Vault.tsx               # Secure document vault
│   │   ├── Settings.tsx            # Profile & account settings
│   │   ├── Onboarding.tsx          # New patient setup wizard
│   │   ├── LandingPage.tsx         # Public marketing/login page
│   │   ├── HospitalPortal.tsx      # Hospital staff portal
│   │   └── InsurancePortal.tsx     # Insurance provider portal
│   ├── services/
│   │   ├── crashDetectionService.ts # Accelerometer-based fall/crash engine
│   │   ├── hospitalService.ts       # Geolocation + Gemini-based hospital finder
│   │   ├── friendService.ts         # Friend requests & listing
│   │   └── chatService.ts           # Real-time chat & SOS broadcast
│   ├── types.ts                     # Shared TypeScript interfaces
│   └── App.tsx                      # Root router & auth state
├── supabase_schema.sql              # Full database schema with RLS
├── .env.example                     # Environment variable template
└── vite.config.ts                   # Vite build configuration
```

---

## 👤 User Roles

| Role | Access |
|---|---|
| `patient` | Dashboard, ID Card, Records, Vault, Friends, Chat, SOS, Settings |
| `hospital` | Hospital Portal — search & view patient records, log accesses |
| `insurance` | Insurance Portal — view and manage claims |

Role is set at signup and enforced by both client-side routing and Supabase RLS policies.

---

## 🔐 Security

- All data access is protected by **Supabase Row Level Security**.
- Emergency View (`/emergency/:id`) is intentionally **public** so first responders can access critical info without an account.
- Every Emergency View access is **logged** in `access_logs` for patient audit.
- Sensitive patient data (allergies, medications) is only readable by the patient themselves or hospital-role users.

---

## 📜 License

Apache 2.0 — See source file headers.
