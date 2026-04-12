# SevaSetu Deployment Guide

This guide is for the current `main` branch deployment path.

- Frontend: `Vercel`
- Backend: `Railway`
- Deployment style: normal hosted build/run, no Docker required for this branch
- Goal: one stable public prototype link
- Auth mode for this prototype: hosted demo-user bypass, no login mechanism required

Use this exact order:

1. Prepare production env values
2. Deploy backend to Railway
3. Deploy frontend to Vercel
4. Configure Firebase + Google Maps domains
5. Run smoke tests

---

## 1. Decide your production URLs

Pick and write these down before deploying:

- Frontend URL: `https://<your-project>.vercel.app`
- Backend URL: `https://<your-backend>.up.railway.app`

You will need both URLs multiple times.

---

## 2. Prepare production environment values

You need two env sets:

- frontend `VITE_*` env vars for Vercel
- backend server env vars for Railway

### 2.1 Frontend env vars

Use values from your Firebase web app and backend URL:

```env
VITE_API_BASE_URL=https://<your-backend>.up.railway.app/api
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_GOOGLE_MAPS_API_KEY=...
VITE_USE_FIREBASE_EMULATOR=false
VITE_DEV_AUTH_BYPASS=true
```

### 2.2 Backend env vars

Use your Firebase Admin values and Gemini key:

```env
PORT=3001
NODE_ENV=production
ALLOWED_ORIGINS=https://<your-project>.vercel.app

FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GCS_BUCKET_NAME=...

GEMINI_API_KEY=...
GEMINI_FLASH_MODEL=gemini-1.5-flash
GEMINI_PRO_MODEL=gemini-1.5-pro

PROTOTYPE_AUTH_BYPASS=true

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=300
RATE_LIMIT_AUTH_MAX=20
RATE_LIMIT_UPLOAD_MAX=30
RATE_LIMIT_AI_MAX=60
```

Notes:

- `ALLOWED_ORIGINS` must exactly match the Vercel frontend origin.
- Do not use localhost values in production.
- For this prototype deployment path, use the explicit hosted auth bypass:
  - `VITE_DEV_AUTH_BYPASS=true`
  - `PROTOTYPE_AUTH_BYPASS=true`

---

## 3. Deploy backend to Railway

### 3.1 Login to Railway

```bash
npx @railway/cli login
```

### 3.2 Create the Railway service

In Railway:

1. Create a new project
2. Connect your GitHub repo
3. Create a service from the repo
4. Set the service root directory to `backend/`

### 3.3 Configure backend build/start

Use these values in Railway if it asks:

- Root Directory: `backend`
- Build Command: `npm run build`
- Start Command: `npm run start`

### 3.4 Add backend env vars

In Railway service settings, add all backend env vars from section 2.2.

### 3.5 Trigger backend deploy

Deploy the backend service.

### 3.6 Verify backend health

After deploy, open these URLs:

```bash
https://<your-backend>.up.railway.app/health
https://<your-backend>.up.railway.app/api/health/deps
```

Expected:

- `/health` returns status `ok`
- `/api/health/deps` shows:
  - Firebase configured
  - Gemini configured
  - production node env

If this fails, do not continue to frontend deployment yet.

---

## 4. Deploy frontend to Vercel

### 4.1 Login to Vercel

```bash
npx vercel login
```

### 4.2 Import the project

In Vercel:

1. Import your GitHub repo
2. Keep the root directory as repo root

### 4.3 Configure frontend build

Use these values:

- Framework preset: `Vite` if detected
- Build Command: `npm run build`
- Output Directory: `dist`

### 4.4 Add frontend env vars

Add all frontend env vars from section 2.1.

Most important one:

```env
VITE_API_BASE_URL=https://<your-backend>.up.railway.app/api
```

### 4.5 Deploy frontend

Deploy and note the final Vercel URL.

---

## 5. Configure Firebase Auth for the deployed frontend

In Firebase Console:

1. Open Authentication
2. Open Settings / Authorized domains
3. Add your Vercel production domain

Add:

- `your-project.vercel.app`

If you later use a custom domain, add that too.

If you skip this step, login flows can fail on the deployed site.

---

## 6. Configure Google Maps for the deployed frontend

In Google Cloud Console:

1. Open APIs & Services -> Credentials
2. Open the browser key used for `VITE_GOOGLE_MAPS_API_KEY`
3. Add your Vercel domain to HTTP referrer restrictions

Add something like:

- `https://<your-project>.vercel.app/*`

Also verify these APIs are enabled:

- Maps JavaScript API
- Geocoding API

Also verify billing is enabled.

If billing/referrer setup is wrong, the map may show a watermark or fail to load.

---

## 7. Configure backend CORS correctly

Go back to Railway env vars and make sure:

```env
ALLOWED_ORIGINS=https://<your-project>.vercel.app
```

If the frontend URL changes, update this too.

Then redeploy or restart the Railway service.

---

## 8. Ensure Firestore indexes exist

Open `FIRESTORE_INDEXES.md` and create the required indexes in Firebase Console.

At minimum, make sure these exist:

- `needReports(status, urgencyScore)`
- `needReports(category, status, createdAt)`
- `needReports(status, updatedAt)`
- `teamChallenges(companyId, createdAt)`

Without them, map and dedup queries may fail.

---

## 9. Verify Firestore rules for the deployed app

This app reads some data directly from Firestore in the frontend.

You must verify rules support:

- authenticated reads/writes for internal app usage
- whatever public access you intentionally want for `/impact/live`

Do not assume the hosted frontend will work unless rules allow the required reads.

---

## 10. Test the deployed backend first

Run these checks:

```bash
curl https://<your-backend>.up.railway.app/health
curl https://<your-backend>.up.railway.app/api/health/deps
```

Then check one protected route without token and expect auth rejection:

```bash
curl https://<your-backend>.up.railway.app/api/dashboard/overview
```

Expected:

- health works
- protected route does not return a server crash

---

## 11. Test the deployed frontend routes

Open these pages directly in the browser:

- `/`
- `/workspace`
- `/pulse-map`
- `/impact/live`

Use the real deployed frontend URL.

Expected:

- landing page loads
- internal routes load
- public KPI route loads directly

---

## 12. Test login flow

On the deployed frontend:

1. Log in using the real Firebase auth flow
2. Open the authenticated app areas

Then verify:

- Workspace loads
- SEVA Agent loads
- NGO Dashboard loads

If auth fails, re-check:

- Firebase Authorized Domains
- frontend Firebase env vars
- backend CORS origin

---

## 13. Test map and browser permissions

On the deployed frontend:

1. Open Pulse Map
2. Allow geolocation if prompted
3. Try geolocation-dependent UI
4. Try voice/microphone features if part of demo flow

If Google Maps errors appear, inspect browser console for:

- `RefererNotAllowedMapError`
- `BillingNotEnabledMapError`
- `ApiNotActivatedMapError`
- `InvalidKeyMapError`

---

## 14. Test uploads and AI endpoints

Run an end-to-end test in the deployed app:

1. Upload a photo
2. Try voice or text classification
3. Confirm the app gets a valid backend response

If uploads fail, re-check:

- `GCS_BUCKET_NAME`
- Firebase Admin credentials
- Storage permissions

---

## 15. Seed and verify demo data

Before your final demo/deadline:

```bash
npm run seed --prefix backend -- --clear --count=24
```

Run this against the backend environment you are actually using for demo/testing.

Then verify:

- Workspace shows non-zero data
- SEVA Agent queue has items
- Pulse Map has live needs
- `/impact/live` shows meaningful data

---

## 16. Final smoke checklist

Before submission, verify all of these manually:

- [ ] Railway backend URL is live
- [ ] Vercel frontend URL is live
- [ ] `/health` works
- [ ] `/api/health/deps` works
- [ ] frontend login works
- [ ] Workspace loads
- [ ] SEVA Agent loads
- [ ] Pulse Map loads without Google watermark
- [ ] `/impact/live` works on desktop
- [ ] `/impact/live` works on phone
- [ ] uploads work
- [ ] AI routes respond

---

## 17. If something breaks

### Frontend builds fail

Check:

- Vercel env vars are all set
- `VITE_API_BASE_URL` is correct
- Firebase web config values are correct

### Backend starts but frontend cannot talk to it

Check:

- `ALLOWED_ORIGINS`
- backend public URL
- `VITE_API_BASE_URL`

### Login fails on hosted site

Check:

- Firebase Authorized Domains
- frontend Firebase env vars

### Pulse Map fails or shows watermark

Check:

- Maps JavaScript API enabled
- billing enabled
- referrer restriction includes Vercel domain

### Data views are blank

Check:

- Firestore rules
- Firestore indexes
- whether your demo data actually exists

---

## 18. Recommended deployment strategy for this branch

Use this branch exactly as follows:

- deploy frontend from `main` to Vercel
- deploy backend from `main` to Railway
- do not use the Docker branch for this deployment path

This keeps the stable non-Docker path separate from the Dockerized work.
