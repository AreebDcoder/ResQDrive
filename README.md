# ResQDrive

> **Intelligent Auto-Collision Detection and Real-Time Post-Accident Assistance Platform**
> Final Year Project — built by Kamran (`KAMRANkami313`), Areeb (`AreebDcoder`), and Basit (`AbdulBasit0909`).

ResQDrive is a multi-modal crash detection + emergency response platform that combines on-device YAMNet audio classification, BLE/accelerometer sensor fusion, and a Random Forest crash-severity classifier to detect accidents in real-time. On detection, the platform orchestrates a multi-channel emergency response (FCM push, WhatsApp Cloud API with Urdu TTS voice alerts, Brevo SMTP email, background SMS, and auto-call) to a user's emergency contacts and regional rescue services.

## Architecture

The project is a 4-sub-project monorepo (no pnpm/yarn workspaces — each sub-project manages its own dependencies):

| Sub-project | Path | Stack | Purpose |
|---|---|---|---|
| **Backend** | `backend/` | NestJS 10 + Prisma 5 + PostgreSQL + JWT + Socket.IO + Swagger | REST API + WebSocket gateway for live GPS |
| **Mobile** | `mobile/` | Expo SDK 54 + React Native 0.81 + React 19 + Redux Toolkit + TFLite (YAMNet + MobileNetV2) | Driver-facing mobile app |
| **Admin Web** | `admin-web/` | Vite 5 + React 18 + TypeScript + Tailwind CSS 3 + Recharts + lucide-react | Admin dashboard SPA |
| **Damage Assessment Service** | `damage-assessment-service/` | Python (FastAPI) + YOLO (`cardd_model.tflite`) | AI damage type classification from photos |

## Tech Stack

- **Backend**: NestJS 10, Prisma 5, PostgreSQL 14+, JWT (access + refresh rotation), Socket.IO, Swagger at `/api`, Nodemailer + Brevo SMTP, FCM (Firebase Cloud Messaging), WhatsApp Cloud API, axios
- **Mobile**: Expo SDK 54, React Native 0.81, React 19, Redux Toolkit 2, TFLite (YAMNet audio + Random Forest severity), BLE (ESP32 sensor fusion), Socket.IO client, expo-location, expo-notifications, react-native-immediate-phone-call, react-native-direct-sms, libphonenumber-js
- **Admin Web**: React 18, Vite 5, TypeScript 5, Tailwind CSS 3, Recharts 2, TanStack Query 5, TanStack Table 8, react-router-dom 6, sonner, framer-motion, lucide-react, Leaflet (OpenStreetMap)
- **AI/ML**: YAMNet (audio crash detection), MobileNetV2 / YOLO (damage assessment), Random Forest (crash severity classifier — 91.12% accuracy)

## Prerequisites

- Node.js 20+ and npm 10+
- PostgreSQL 14+ (or use Docker — see below)
- Python 3.10+ (for damage-assessment-service only)
- Expo CLI (`npm install -g expo-cli`) for mobile development
- Android Studio (for Android builds) or EAS Build (cloud builds — recommended)

## Quick Start (Development)

### 1. Clone + install

```bash
git clone https://github.com/AreebDcoder/ResQDrive.git
cd ResQDrive

# Backend
cd backend
npm install
cp .env.example .env  # then edit .env with your real credentials
npx prisma generate
npx prisma migrate dev  # apply all migrations + seed
npm run start:dev        # backend on http://localhost:3000

# Admin web (separate terminal)
cd ../admin-web
npm install
npm run dev              # admin on http://localhost:5173

# Mobile (separate terminal)
cd ../mobile
npm install
npx expo start          # follow QR code in terminal

# Damage assessment service (separate terminal)
cd ../damage-assessment-service
pip install -r requirements.txt
python main.py          # service on http://localhost:8000
```

### 2. Environment variables

Copy `backend/.env.example` to `backend/.env` and fill in:

```
PORT=3000
DATABASE_URL=postgresql://user:pass@localhost:5432/resqdrive
JWT_ACCESS_SECRET=<random-32-byte-hex>
JWT_REFRESH_SECRET=<different-random-32-byte-hex>

# Email (Brevo SMTP — 300/day free tier)
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your-brevo-smtp-user
SMTP_PASS=your-brevo-smtp-key
SMTP_FROM=ResQDrive <noreply@yourdomain.com>

# WhatsApp Cloud API (1000 conversations/month free)
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_ACCESS_TOKEN=...

# Firebase Cloud Messaging (free)
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...

# Cloudinary (free tier — image uploads)
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# Gemini AI (free tier — repair cost estimation)
GEMINI_API_KEY=...

# Geoapify (free tier — hospital/workshop routing)
GEOAPIFY_API_KEY=...

# Damage Assessment microservice (Python)
FASTAPI_API_URL=http://localhost:8000
```

### 3. Seed data

The seed file (`backend/prisma/seed.ts`) creates:
- 1 admin user: `admin@resqdrive.com` / `AdminPassword123!` (auto-verified)
- 1 sample driver + 1 sample mechanic
- 5 regional emergency numbers (Pakistan regions)
- Sample labor cost rates + fallback parts prices

After running `npx prisma migrate dev`, the seed runs automatically. To re-seed:
```bash
cd backend && npx prisma db seed
```

### 4. Access the admin panel

Open `http://localhost:5173` in your browser. Log in with `admin@resqdrive.com` / `AdminPassword123!`.

Swagger UI is at `http://localhost:3000/api` for API exploration.

## Project Structure

```
ResQDrive/
├── .github/workflows/ci.yml          # GitHub Actions CI (backend + admin-web + mobile tsc)
├── README.md                          # this file
├── cardd_model.tflite                 # damage assessment model (also copied to service)
├── crash_severity_random_forest.pkl   # trained Random Forest (300 trees)
├── backend/                           # NestJS API
│   ├── prisma/
│   │   ├── schema.prisma              # 29 models + 15 enums
│   │   ├── migrations/                # 19 migration folders
│   │   └── seed.ts
│   └── src/
│       ├── admin/                    # admin analytics + user governance + audit log
│       ├── auth/                     # JWT + Google OAuth + email verification
│       ├── users/                    # self-service profile
│       ├── incidents/                # user-scoped incident CRUD
│       ├── vehicles/                 # vehicle + insurance CRUD
│       ├── emergency-contacts/       # per-user contact CRUD
│       ├── emergency-notification/   # multi-channel escalation engine (45s timer)
│       ├── alert-dispatch/           # WhatsApp + FCM + SMTP + SMS dispatch
│       ├── emergency-sos/            # regional numbers + auto-dial + accident reports
│       ├── location-sharing/         # Socket.IO live GPS sessions
│       ├── crash-sound-detection/    # YAMNet log endpoint
│       ├── voice-commands/           # voice intent log endpoint
│       ├── damage-assessment/        # photo upload → Python microservice
│       ├── repair-cost/             # 4-tier pricing (cache→scraper→Gemini→fallback)
│       ├── notifications/             # FCM push + device tokens
│       ├── hospitals/                # nearest hospitals (Geoapify)
│       ├── workshops/                # nearest verified mechanics
│       ├── email/                    # SMTP + queue retry cron
│       ├── upload/                   # Cloudinary image upload
│       └── prisma/                   # Prisma client singleton
├── mobile/                           # Expo / React Native app
│   ├── app.json                      # Expo config (Android: com.resqdrive.app)
│   ├── plugins/                      # Expo config plugins (CallPhone, ManifestFix, ...)
│   ├── patches/                      # patch-package patches
│   └── src/
│       ├── api/                      # axios instance with refresh-token retry
│       ├── components/               # NotificationBanner, DevModeBanner
│       ├── config/                   # YAMNet class config, motion thresholds, RF model
│       ├── navigation/               # role-aware Stack Navigator
│       ├── schemas/                  # Zod validators
│       ├── screens/                  # 28 screens (login, register, SOS, countdown, ...)
│       ├── services/                 # crash detection, voice, BLE, fusion, FCM, TTS
│       ├── store/                    # Redux Toolkit (8 slices)
│       └── utils/                    # secureStorage, directCall, directSms, ...
├── admin-web/                        # Vite + React SPA
│   ├── .env.development              # VITE_API_URL=http://localhost:3000
│   ├── .env.production               # VITE_API_URL=https://api.resqdrive.app
│   └── src/
│       ├── components/ui/             # 14 reusable primitives (Button, Card, Badge, ...)
│       ├── components/charts/         # ChartContainer, HistogramChart, DonutChart
│       ├── layouts/AdminLayout.tsx    # Sidebar + Topbar + Outlet
│       ├── hooks/                     # TanStack Query hooks (useIncidents, useUsers, ...)
│       ├── lib/                       # cn, env, query-client
│       ├── pages/                     # 23 pages (lazy-loaded)
│       ├── routes.ts                  # central route + sidebar config
│       ├── theme/                     # ThemeProvider + useTheme (light/dark)
│       └── types/                     # consolidated entity types
└── damage-assessment-service/        # Python FastAPI
    ├── main.py                        # /predict endpoint (multipart upload)
    ├── requirements.txt
    └── cardd_model.tflite
```

## Admin Panel Features

The admin panel (`admin-web/`) provides:

- **Dashboard** — KPI cards with sparklines, 6 charts (severity donut, 30-day trend, 7-day stacked area, AUTO-vs-MANUAL pie, dispatch success bar, hotspots Leaflet map), recent activity feed, date range picker, auto-refresh toggle
- **Incidents** — TanStack Table with row-select, bulk resolve/archive, full edit modal, soft-delete/restore, mark-as-false-alarm, tabs (Overview/Timeline/Sensor snapshot)
- **Users** — TanStack Table with bulk deactivate, per-row kebab action menu (View/Activate|Deactivate/Force logout/Delete), edit profile modal, role-specific fields, new user creation form, workshop approval workflow with email notifications
- **Vehicles** — TanStack Table + detail page with linked damage assessments, repair reports, recent incidents
- **Emergency Contacts** — TanStack Table + edit modal with phone validation (libphonenumber-js)
- **Accident Reports** — TanStack Table with severity + auto-dialed filters
- **Emergency Monitor** — live polling (5s), pause auto-refresh, force-end sessions, attempts drill-down modal
- **System Health** — service status grid, dev-mode warning, purge stale device tokens
- **Crash Detection Logs** — confidence histogram, filters (class/confidence/flagged-only)
- **Voice Command Logs** — intent distribution donut, filters (intent/engine/action-taken-only)
- **Damage Assessment** — paginated masonry grid, severity donut, photo zoom modal, low-confidence filter
- **Repair Cost Reports** — aggregate summary cards, Gemini-vs-Fallback donut, expandable line items
- **Notifications** — TanStack Table with filters + broadcast link
- **Broadcast** — segment selector (ALL/DRIVERS/MECHANICS), preview, category dropdown
- **Audit Log** — TanStack Table with admin/action/resource filters (every admin mutation recorded)
- **Data Export** — 7 CSV export targets (incidents, repair-costs, notifications, crash-logs, voice-logs, damage-assessments, dispatch-logs)
- **Settings** — theme toggle, account info, system quick links
- **Profile** — avatar upload, edit profile, change password

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs on every push/PR to `main` or `feature/admin-enhancement`:

- **Backend** job: `npm ci` → `npx prisma generate` → `npx tsc --noEmit`
- **Admin Web** job: `npm ci` → `npx tsc --noEmit` → `npx vite build`
- **Mobile** job: `npm ci` → `npx tsc --noEmit` (skips full Expo build — too heavy for CI without Android SDK)

## License

This project is an academic Final Year Project (FYP). All rights reserved by the project authors.
