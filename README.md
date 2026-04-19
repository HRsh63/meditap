🏥 MediTap
Your medical identity. One tap. Every time.
MediTap is a full-stack emergency health identity platform. Your complete medical profile lives in the cloud — accessible to hospitals instantly via QR code or phone number, while your friends and family are automatically alerted with your live location the moment something goes wrong.

📋 Table of Contents

Overview
User Health Profile
Digital Medical ID Card
Emergency SOS
Friends System
In-App Chat
Crash Detection
Patient Dashboard
Medical Records & Vault
Hospital Portal
Insurance Portal
Security
Tech Stack
Database Schema
User Roles
Revenue Model
Getting Started
Project Structure
Roadmap


Overview
In an emergency, doctors waste precious minutes trying to find out who you are, what conditions you have, what medications you take, and what your blood group is. MediTap solves this — your entire health identity is one QR scan away, with zero friction for the patient and zero setup burden for the hospital.
Beyond emergency access, MediTap builds a human safety net around every user — a friends network that gets your exact live location the moment you tap SOS or a crash is detected, even before an ambulance arrives.

👤 User Health Profile
Every user builds a complete health identity on signup:

Full name, date of birth, age, sex, weight, height
Blood group
Known allergies
Chronic conditions and diagnoses
Current medications and dosages
Emergency contacts
Health insurance details
Physical address

All data is stored securely in the cloud and linked to the user's phone number. Users can update any field anytime from their phone. A Profile Completion Meter on the dashboard shows what health fields are still missing and animates as you fill them in.

🆔 Digital Medical ID Card
Every patient gets a unique MediTap ID — a scannable QR code that links directly to their Emergency View.

The ID card displays blood group, allergies, medications, emergency contact, and vitals at a glance
Hospitals scan the QR code to access an instant Emergency View — no login required
The Emergency View shows all critical medical information, recent vitals, full medical history, and a one-tap call button for the emergency contact
Every time a hospital or first responder accesses the Emergency View, it is logged automatically in the patient's access history — the patient always knows who viewed their data and when


🆘 Emergency SOS
A large, always-visible SOS button on the home screen. When pressed, three options appear:
1. 🚑 Find Nearest Hospital

Reads the user's real-time GPS location
Uses Google Gemini AI + Google Maps to find the top 3 closest hospitals
Shows name, distance, directions, and phone number for each
Falls back to a curated offline hospital list if there is no internet
Each result has a one-tap Navigate button that opens Google Maps with the fastest route

2. 📞 Emergency — Call 112
One-tap dial to the national emergency number.
3. 🚑 Ambulance — Call 108
One-tap dial to the national ambulance service.
When any SOS option is triggered, simultaneously:

Every friend in the user's friends list receives an immediate loud alert notification that overrides silent mode
The notification contains the user's exact real-time GPS location with a Google Maps link
An emergency message is broadcast to every friend's chat automatically
The SOS event is logged in the database


👥 Friends System
A social safety network built specifically for emergency awareness.

Add friends by searching any MediTap user by username or phone number
A friend request is sent — the other person must accept before becoming friends
Both users can see each other in their friends list once accepted — mutual, like Facebook friends
Remove friends anytime
A real-time SOS listener runs in the background for every logged-in user — if any friend triggers SOS or a crash is detected, your phone sounds an alert and shows a popup with their exact location and a Google Maps link, even if the app is in the background
Friend list shows pending and accepted status clearly


💬 In-App Chat
Real-time messaging between connected friends.

Live chat powered by Supabase Realtime
Full chat history saved in the database
When a friend triggers SOS, an automatic emergency message is posted to every friend chat instantly — no manual action needed
Regular messaging works between any two connected friends


💥 Crash & Fall Detection
Runs silently in the background using the phone's built-in accelerometer and gyroscope sensors.
Detection flow:

Impact Detection — Continuously monitors acceleration. A spike above 20 m/s² triggers the detection sequence
Stasis Confirmation — Checks for immobility after impact for 2+ seconds, confirming a likely crash or fall rather than a normal bump
Gemini AI Verification — Sends a 3-second accelerometer data buffer to Google Gemini 1.5 Flash for intelligent confirmation, significantly reducing false positives
10-Second Countdown — A cancellable countdown appears on screen giving a conscious user time to dismiss the alert
Automatic Emergency Sequence if not cancelled:

Gets current GPS location
Finds the nearest hospital
Notifies all emergency contacts — logged in database
Broadcasts live location SOS to all friends via Realtime
Auto-dials 112




If the Gemini API is unavailable due to network or quota issues, the system falls back to sensor-only detection automatically — safety is never compromised.


📋 Patient Dashboard
A rich animated dashboard with full health management:

Vitals Tracking — Blood pressure and weight tracked over time with interactive area graphs and historical timeline
Appointment Manager — Add and delete upcoming doctor appointments
Hospital Access Log — Full audit trail of when and which hospitals accessed your record
Profile Completion Meter — Animated indicator showing missing health fields
System Diagnostic Tool — Checks Supabase connectivity, geolocation availability, and sensor status in real time


📁 Medical Records & Vault

Upload and categorize medical documents — Checkup reports, Lab results, Prescriptions, Vaccination records
Filter and search full medical history
Insurance Checkup Integration — When a user does an insurance-affiliated health checkup at a partner hospital, the hospital uploads the report directly to the user's cloud profile. The patient always owns their own data — no more reports trapped with the insurer
Vault — Secure storage for sensitive personal documents separate from medical records


🏥 Hospital Portal
A dedicated role-gated portal for hospital staff:

Search and access patient records by MediTap ID or QR scan
View full patient profile — vitals, allergies, medications, blood group, emergency contacts, medical history
Every access is automatically logged and visible to the patient in their access history
No patient account or login required for emergency access — QR scan is enough


🛡️ Insurance Portal
A dedicated role-gated portal for insurance providers:

View and manage insurance claims submitted by patients
Approve or reject claim workflows
Upload checkup reports directly to a patient's cloud profile after affiliated hospital checkups


🔐 Security

All data is protected by Supabase Row Level Security — patients can only access their own data
Hospital-role users can read patient data and write access logs — nothing else
Emergency View (/emergency/:id) is intentionally public so first responders can access critical info without an account — this is by design
Every Emergency View access is logged for patient audit — full transparency on who viewed your data
Sensitive data like allergies and medications is only readable by the patient or verified hospital-role users
