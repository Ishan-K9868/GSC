# SevaSetu Setup Guide (Firebase + GCP + Env)

This guide is for new developers setting up SevaSetu from scratch.

It covers:
- Frontend and backend environment files
- Firebase project setup
- Google Cloud API enablement
- Firestore indexes required by current backend queries
- Verification steps and common errors

---

## 1) Prerequisites

- Node.js 20+ (Node 22 works)
- npm
- Firebase project (same project for Auth + Firestore + Storage)
- Google Cloud billing enabled for APIs that require it

Local folders used by this repo:
- Frontend env: `.env.local`
- Backend env: `backend/.env`

Do not commit secret env files.

---

## 2) Clone and Install

From repo root:

```bash
npm install
cd backend && npm install
```

---

## 3) Create Frontend Env (`.env.local`)

Copy from `.env.example` and fill values:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...

VITE_API_BASE_URL=http://localhost:3001/api
VITE_GOOGLE_MAPS_API_KEY=...
VITE_USE_FIREBASE_EMULATOR=false
```

Where to get Firebase Web values:
- Firebase Console -> Project Settings -> General -> Your apps -> Web app config

Where to get Maps key:
- Google Cloud Console -> APIs & Services -> Credentials -> Create API key

Notes:
- `VITE_API_BASE_URL` should match backend port.
- Vite proxy is already configured for `/api` to backend in `vite.config.ts`, but keep `VITE_API_BASE_URL` correct for direct API service usage.

---

## 4) Create Backend Env (`backend/.env`)

Copy from `backend/.env.example` and fill values.

### Recommended auth method (Option B)

Use service account JSON path:

```env
PORT=3001
NODE_ENV=development

GOOGLE_APPLICATION_CREDENTIALS=C:/absolute/path/to/service-account.json

FIREBASE_PROJECT_ID=your-project-id
GCS_BUCKET_NAME=your-project-id.appspot.com
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_CLOUD_LOCATION=us-central1

ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174,http://localhost:3000

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=300
RATE_LIMIT_AUTH_MAX=20
RATE_LIMIT_UPLOAD_MAX=30
RATE_LIMIT_AI_MAX=60
```

### Alternate auth method (Option A)

Inline service account fields:

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
```

If using Option A, formatting must be exact:
- Use double quotes around the whole key
- Use lowercase `\n` newlines
- No extra characters or escaped uppercase like `\N`

---

## 5) Firebase Console Setup

### 5.1 Authentication

Required to avoid `CONFIGURATION_NOT_FOUND` during token flows.

Steps:
1. Firebase Console -> Authentication -> Sign-in method
2. Enable at least one provider (Phone is expected by product flow; Email/Password can be enabled for dev if needed)
3. Authentication -> Settings -> Authorized domains -> ensure `localhost` exists

Optional but recommended for local testing:
- Add test phone numbers in Phone Auth settings.

### 5.2 Firestore Database

Steps:
1. Firebase Console -> Firestore Database -> Create database
2. Pick region matching `GOOGLE_CLOUD_LOCATION` if possible
3. Use rules suitable for dev/testing initially, then tighten for prod

### 5.3 Storage

Steps:
1. Firebase Console -> Storage -> Get started
2. Confirm bucket name and copy to `GCS_BUCKET_NAME`

---

## 6) Google Cloud APIs to Enable

In Google Cloud Console -> APIs & Services -> Library, enable:

### Backend critical
- Cloud Firestore API (`firestore.googleapis.com`)
- Identity Toolkit API (`identitytoolkit.googleapis.com`) (required by Firebase Auth REST flows)
- Cloud Storage API (`storage.googleapis.com`) (for uploads)

### AI features
- Vertex AI API (`aiplatform.googleapis.com`)

### Frontend map features
- Maps JavaScript API (required)
- Geocoding API (required in current code path)

Not currently required by code:
- Places API
- Directions API
- Distance Matrix API

Billing notes:
- Some APIs require billing enabled.
- Firebase/Auth/Firestore/Storage and Maps/Vertex have free tiers/credits but are not unlimited free.

---

## 7) Required Firestore Composite Indexes

Current map aggregation queries require a composite index.

If map endpoints return `FAILED_PRECONDITION: The query requires an index`, create index for:
- Collection: `needReports`
- Fields:
  - `status` (Ascending)
  - `updatedAt` (Descending)
  - `__name__` (Descending, auto)

Fastest method:
- Use the exact Firebase error link shown in backend logs and click **Create index**.
- Wait until status is **Enabled** (not Building).

---

## 8) Run the App

Terminal A (backend):

```bash
cd backend
npm run build
npm run start
```

Terminal B (frontend):

```bash
npm run dev
```

If using combined scripts from root, ensure no port conflicts on `3001`.

---

## 9) Verify Setup Health

Use these checks after startup.

### Backend health

```bash
curl http://localhost:3001/health
curl http://localhost:3001/api/health/deps
```

Expected `/api/health/deps`:
- `firebase.mode: "real"` when credentials are valid
- `firebase.mode: "mock"` only if real init/runtime fails

### Functional route smoke checks

Public:
- `GET /api/map/layers` -> `200`
- `GET /api/map/stats` -> `200`
- `GET /api/csr/pricing` -> `200`

Protected routes (without token):
- should return `401` (auth guard active)

---

## 10) Current Backend Runtime Behavior (Important)

Firebase startup is real-first with automatic fallback:
1. Try real Firebase Admin init from env credentials
2. If unavailable/invalid, switch to mock mode

This is intentional so local development does not hard-fail.

To force production-like behavior, ensure:
- Valid credentials
- Required APIs enabled
- Required indexes enabled
- `/api/health/deps` reports real mode

---

## 11) Troubleshooting (From Real Findings)

### Error: `CONFIGURATION_NOT_FOUND`

Cause:
- Firebase Auth sign-in method not enabled, or wrong web API key/project mismatch.

Fix:
- Enable provider under Firebase Authentication.
- Confirm `VITE_FIREBASE_API_KEY` matches the same project used by backend credentials.

### Error: `Failed to parse private key` or PEM invalid

Cause:
- Misformatted `FIREBASE_PRIVATE_KEY`.

Fix:
- Prefer `GOOGLE_APPLICATION_CREDENTIALS` JSON path.
- If inline key is used, ensure exact `\n` formatting.

### Error: `Cloud Firestore API ... disabled`

Cause:
- Firestore API not enabled in GCP.

Fix:
- Enable Cloud Firestore API and wait propagation.

### Error: `The query requires an index`

Cause:
- Missing composite index for map queries.

Fix:
- Open magic link from backend logs, create index, wait until Enabled.

### Error: `index is currently building`

Cause:
- Index created but still building.

Fix:
- Wait for Enabled, then retest.

### 429 Too Many Requests

Cause:
- Rate limits active.

Fix:
- Wait for window reset or adjust backend rate env values for dev.

---

## 12) Security and Operational Best Practices

- Never commit `.env.local` or `backend/.env`.
- Never store real secrets in example/template files.
- Rotate service account keys immediately if exposed.
- Restrict Google Maps API key:
  - Application restrictions: HTTP referrers (`http://localhost:*`, your prod domains)
  - API restrictions: Maps JavaScript API + Geocoding API
- Use least privilege IAM for service accounts.

---

## 13) Quick Go-Live Checklist

- [ ] Frontend env configured
- [ ] Backend env configured
- [ ] Firebase Auth provider enabled
- [ ] Firestore DB created
- [ ] Storage bucket created
- [ ] Firestore API enabled
- [ ] Identity Toolkit API enabled
- [ ] Vertex AI API enabled
- [ ] Maps JavaScript API + Geocoding API enabled
- [ ] Required Firestore index Enabled
- [ ] `/api/health/deps` returns Firebase real mode
- [ ] Map endpoints return `200`
- [ ] Protected routes return `401` without token and `200` with token

---

## 14) Reference Files in This Repo

- Frontend env template: `.env.example`
- Backend env template: `backend/.env.example`
- Backend status endpoint: `backend/src/index.ts`
- Firebase init + mode handling: `backend/src/config/firebase.ts`
- Rate limiting middleware: `backend/src/middleware/rateLimit.ts`
