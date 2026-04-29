 

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/af86840a-51e8-4e16-92c8-6bebea7434b4

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
<div align="center">

<img src="https://img.shields.io/badge/MediTap-Emergency%20Health%20Identity-00c8b4?style=for-the-badge&logoColor=white" alt="MediTap"/>

# 🏥 MediTap

### Your medical identity. One tap. Every time.

[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com)
[![Gemini](https://img.shields.io/badge/Gemini-AI-4285F4?style=flat-square&logo=google)](https://aistudio.google.com)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=flat-square&logo=vite)](https://vitejs.dev)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?style=flat-square&logo=tailwindcss)](https://tailwindcss.com)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue?style=flat-square)](LICENSE)

<br/>

> MediTap is a full-stack emergency health identity platform. Your complete medical profile lives in the cloud — accessible to hospitals instantly via QR code, NFC, or phone number, while your friends and family are automatically alerted with your live location the moment something goes wrong.

<br/>

[Features](#-features) · [Architecture](#-architecture) · [Tech Stack](#-tech-stack) · [Getting Started](#-getting-started) · [Database Schema](#-database-schema) · [Roadmap](#-roadmap)

</div>

---

## 🚨 The Problem

In a medical emergency, three things go wrong simultaneously:

- **Doctors** don't know who you are, your blood group, allergies, or current medications
- **Friends and family** don't know what happened or where you are
- **Ambulances** arrive with no patient context, wasting critical minutes

MediTap fixes all three at once — with a single tap.

---

## ✨ Features

<details>
<summary><b>🆔 Digital Medical ID Card</b></summary>
<br/>

- Every patient gets a unique **MediTap ID** — a scannable QR code linking to their Emergency View
- Emergency View is **public by design** — first responders see full profile with zero login
- Displays blood group, allergies, medications, emergency contacts, and vitals at a glance
- Every access is **automatically logged** — patients always know who viewed their data

</details>

<details>
<summary><b>🆘 Emergency SOS</b></summary>
<br/>

One tap. Three options:

| Option | Action |
|--------|--------|
| 📞 **Call 112** | Instantly dials national emergency number |
| 🚑 **Call 108** | Instantly dials national ambulance service |
| 🗺️ **Nearest Hospital** | GPS → Google Places API → Top 3 hospitals with navigation |

**When any option is triggered**, simultaneously:
- Every friend receives a **loud alert that overrides silent mode**
- Notification includes **exact real-time GPS location** + Google Maps link
- Emergency message is **auto-broadcast to every friend's chat**
- Event is logged in the database

</details>

<details>
<summary><b>👥 Friends & Safety Network</b></summary>
<br/>

- Add friends by **username or phone number**
- Friend request system — **mutual acceptance required** (like Facebook friends)
- **Real-time SOS listener** runs in background for every logged-in user
- When any friend triggers SOS or a crash is detected → **loud alert + live location popup** on your phone, even if the app is in the background

</details>

<details>
<summary><b>💥 AI-Verified Crash Detection</b></summary>
<br/>

Runs silently in the background using the device accelerometer and gyroscope.

```
Impact spike detected (>20 m/s²)
        ↓
Stasis confirmed (immobility for 2+ seconds)
        ↓
Gemini AI verifies on 3-sec sensor buffer → reduces false positives
        ↓
10-second cancellable countdown
        ↓ (if no response)
Auto calls 112 · alerts all friends · sends live GPS location
```

> If Gemini API is unavailable, falls back to sensor-only detection — safety is never compromised.

</details>

<details>
<summary><b>🏥 Hospital Portal</b></summary>
<br/>

- Dedicated role-gated portal for hospital staff
- Access patient profile via **QR scan, NFC tap, or phone number**
- View vitals, allergies, medications, blood group, medical history, emergency contacts
- Every access **automatically logged** for patient audit trail
- **No patient login required** for emergency access

</details>

<details>
<summary><b>🛡️ Insurance Portal</b></summary>
<br/>

- Role-gated portal for insurance providers
- Upload checkup reports **directly to patient's cloud profile**
- Claim management — submit, approve, and reject workflows
- Patient always owns their own checkup data — no more reports siloed with the insurer

</details>

<details>
<summary><b>📋 Patient Dashboard</b></summary>
<br/>

- **Vitals tracking** — blood pressure and weight with interactive Recharts area graphs
- **Appointment manager** — add and remove upcoming doctor visits
- **Hospital access log** — full audit trail of record access
- **Profile completion meter** — animated indicator for missing health fields
- **System diagnostic** — checks Supabase, GPS, and sensor status live

</details>

<details>
<summary><b>📁 Medical Records & Vault</b></summary>
<br/>

- Upload and categorize documents — Checkup reports, Lab results, Prescriptions, Vaccinations
- **Secure vault** for sensitive personal documents
- Full medical history searchable and filterable

</details>

<details>
<summary><b>💬 In-App Chat</b></summary>
<br/>

- Real-time messaging powered by **Supabase Realtime**
- SOS auto-broadcasts emergency message to **all friend chats instantly**
- Full chat history persisted in database

</details>

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────┐
│                    CLIENT LAYER                       │
│   Patient App (Mobile/Web) · Hospital Portal ·        │
│   Insurance Portal                                    │
└───────────────────────┬──────────────────────────────┘
                        │ HTTPS + Supabase Realtime
┌───────────────────────▼──────────────────────────────┐
│                  BACKEND & SERVICES                   │
│  ┌─────────────────────────────────┐                  │
│  │         SUPABASE                │  Gemini 1.5 Flash │
│  │  Auth · Realtime · Storage      │  Google Maps API  │
│  │  PostgreSQL + RLS               │  Google Places    │
│  └─────────────────────────────────┘  Expo Push Notif │
│                                       DeviceMotion API │
└───────────────────────┬──────────────────────────────┘
                        │
┌───────────────────────▼──────────────────────────────┐
│                   DATA LAYER                          │
│  profiles · patient_data · medical_records ·          │
│  access_logs · vitals · appointments ·                │
│  friendships · emergency_alerts · claims              │
└──────────────────────────────────────────────────────┘
```

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
| **Backend / Database** | Supabase (PostgreSQL + Auth + Realtime) |
| **AI** | Google Gemini 1.5 Flash (`@google/genai`) |
| **QR Scanning** | html5-qrcode |
| **Crash Detection** | Web DeviceMotion API + Gemini AI |
| **Geolocation** | Browser Geolocation API |
| **Hospital Search** | Google Places API |
| **Push Notifications** | Expo Push Notifications |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier works)
- A [Google AI Studio](https://aistudio.google.com) API key

### 1. Clone & install

```bash
git clone https://github.com/your-username/meditap.git
cd meditap
npm install
```

### 2. Environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in your keys:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
GEMINI_API_KEY=your-gemini-api-key
```

### 3. Set up the database

Copy the contents of `supabase_schema.sql` and run it in your **Supabase SQL Editor**.

This creates all 9 tables, RLS policies, and the auto-profile-creation trigger.

### 4. Run locally

```bash
npm run dev
```

App runs at `http://localhost:3000`

### 5. Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

> ⚠️ Don't forget to add your three environment variables in **Vercel → Settings → Environment Variables** before deploying. Without them the build will fail silently and the old version will stay live.

---

## 🗃️ Database Schema

| Table | Purpose |
|---|---|
| `profiles` | User accounts — patient, hospital, insurance roles |
| `patient_data` | Medical info — blood group, allergies, medications, emergency contact |
| `medical_records` | Checkups, lab reports, prescriptions, vaccinations |
| `access_logs` | Audit trail of every hospital or emergency record access |
| `vitals` | Time-series metrics — BP, weight, heart rate, temperature |
| `appointments` | Upcoming doctor appointments |
| `claims` | Insurance claims |
| `friendships` | Friend connections with pending/accepted status |
| `emergency_alerts` | Logged crash and fall detection events |

Row Level Security is enabled on all tables. Patients access only their own data. Hospital-role users can read patient data and write access logs — nothing else.

---

## 👤 User Roles

| Role | Access |
|---|---|
| `patient` | Dashboard, ID Card, Records, Vault, Friends, Chat, SOS, Settings |
| `hospital` | Hospital Portal — search and view patient records, log accesses, upload reports |
| `insurance` | Insurance Portal — view and manage claims, upload checkup reports |

Roles are set at signup and enforced by both client-side routing and Supabase RLS policies.

---

## 📁 Project Structure

```
meditap/
├── src/
│   ├── components/
│   │   ├── FriendSOSListener.tsx    # Background real-time SOS listener
│   │   ├── PatientLayout.tsx        # Shared patient sidebar layout
│   │   └── QRScanner.tsx            # QR code scanner
│   ├── constants/
│   │   └── emergencyHospitals.ts    # Offline fallback hospital list
│   ├── hooks/
│   │   └── useCrashDetection.ts     # Crash detection hook
│   ├── lib/
│   │   └── supabase.ts              # Supabase client
│   ├── pages/
│   │   ├── Dashboard.tsx            # Patient dashboard
│   │   ├── EmergencyView.tsx        # Public QR scan landing page
│   │   ├── Friends.tsx              # Friends management
│   │   ├── Chat.tsx                 # Real-time chat
│   │   ├── IDCard.tsx               # Medical ID + QR generator
│   │   ├── Records.tsx              # Medical records
│   │   ├── Vault.tsx                # Secure document vault
│   │   ├── Settings.tsx             # Profile settings
│   │   ├── Onboarding.tsx           # New patient setup
│   │   ├── LandingPage.tsx          # Public landing page
│   │   ├── HospitalPortal.tsx       # Hospital staff portal
│   │   └── InsurancePortal.tsx      # Insurance provider portal
│   ├── services/
│   │   ├── crashDetectionService.ts # Accelerometer + Gemini engine
│   │   ├── hospitalService.ts       # GPS + Places API hospital finder
│   │   ├── friendService.ts         # Friend requests and listing
│   │   └── chatService.ts           # Chat + SOS broadcast
│   ├── types.ts                     # TypeScript interfaces
│   └── App.tsx                      # Root router + auth
├── supabase_schema.sql              # Full DB schema with RLS
├── .env.example                     # Environment variable template
└── vite.config.ts                   # Vite config
```

---

## 💰 Revenue Model

| Stream | Who Pays | Model |
|---|---|---|
| User subscription | Individual patients | ₹99 / month |
| Hospital portal plan | Hospitals and clinics | ₹499 / month |
| Insurance integration | Insurance companies | B2B API deal |

---

## 🗺️ Roadmap

- [x] Patient health profile + cloud storage
- [x] QR emergency access — no login required
- [x] SOS system — 112, 108, nearest hospital
- [x] Friends network with real-time SOS alerts
- [x] AI-verified crash detection with auto emergency sequence
- [x] Hospital portal with access logging
- [x] Insurance portal with report upload
- [x] In-app real-time chat
- [x] Vitals tracking with charts
- [ ] NFC device for hospitals — hardware subscription
- [ ] Phone number lookup at hospital desk
- [ ] Full offline-first mode
- [ ] Native Android + iOS app via React Native (enables true auto-call 112)
- [ ] Government hospital onboarding
- [ ] Aadhaar-linked health identity

---

## 🔐 Security

- All tables protected by **Supabase Row Level Security**
- Emergency View (`/emergency/:id`) is intentionally **public** — first responders need zero friction
- Every Emergency View access is **audit logged** for full patient transparency
- Sensitive data readable only by the patient or verified hospital-role accounts

---

## 🤝 Contributing

Pull requests are welcome. For major changes please open an issue first.

1. Fork the repo
2. Create your feature branch — `git checkout -b feature/amazing-feature`
3. Commit your changes — `git commit -m 'add amazing feature'`
4. Push to branch — `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📜 License

Distributed under the Apache 2.0 License. See `LICENSE` for more information.

---

<div align="center">

Built for the MediTap Hackathon · Designed to matter beyond it

**One tap. Every detail. Every time.**

</div>
