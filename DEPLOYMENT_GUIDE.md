# SevaSetu Deployment Guide

This guide captures the production-oriented deployment decisions and manual platform steps for the supported hosting model:

- Frontend: `Vercel`
- Backend: Dockerized `Railway` service rooted at `backend/`
- Scope: one stable production URL for judges, no preview-domain auth/maps support in the first pass

## Phase 0 — Chosen Defaults

- Frontend project name: `sevasetu`
- Backend service name: `sevasetu-api`
- Recommended production URLs:
  - `https://sevasetu.vercel.app`
  - `https://sevasetu-api.up.railway.app`
- Deployment target: one stable production URL only
- Preview support: intentionally deferred
- Upload fallback policy in production: `cloud only`
- Scheduler mode in production: `in-process` with `ENABLE_RUNTIME_SCHEDULERS=true` on exactly one Railway replica

## Phase 1 — Security And Secret Hygiene

- Keep all deploy-time secrets in platform env settings.
- Do not rely on checked-in `.env` files for either hosted service.
- Use inline Firebase Admin env vars on Railway instead of `GOOGLE_APPLICATION_CREDENTIALS` file paths.
- Confirm the Firebase service account used by Railway can access:
  - Firestore
  - Firebase Auth token verification
  - Cloud Storage bucket operations
- Confirm the Google Maps browser key is restricted to the final Vercel production domain.
- Confirm billing is enabled for the Google Cloud project backing Maps.

## Phase 2 — Backend Dockerization

Implemented in repo:

- `backend/Dockerfile`
- `backend/.dockerignore`
- `backend/railway.json`
- `backend/scripts/docker-smoke-test.mjs`

Key design choices:

- Multi-stage Docker build
- TypeScript compile in builder stage
- Runtime image only carries production dependencies and `dist/`
- Runtime JSON assets are copied into `dist/` by `backend/scripts/copy-runtime-assets.mjs`

## Phase 3 — Backend Runtime Hardening

Implemented in repo:

- `app.set('trust proxy', 1)` in `backend/src/index.ts`
- trimmed/sanitized `ALLOWED_ORIGINS`
- production startup validation for Firebase / Gemini / storage / CORS
- readiness report and `/api/health/ready`
- request IDs and request logging middleware
- production cloud-only upload enforcement when `ALLOW_LOCAL_UPLOAD_FALLBACK=false`

Production env defaults to adopt:

```env
NODE_ENV=production
ALLOW_LOCAL_UPLOAD_FALLBACK=false
ENABLE_RUNTIME_SCHEDULERS=true
```

## Phase 4 — Railway Backend Setup

Manual Railway steps:

1. Create a new Railway service from this GitHub repo.
2. Set the service root directory to `backend/`.
3. Keep build mode as Dockerfile-based.
4. Confirm `backend/railway.json` is detected.
5. Set health check path to `/health` if Railway UI asks again.
6. Keep instance count at `1`.
7. Disable autoscaling for the prototype environment.

### Railway Environment Variables

Required:

```env
NODE_ENV=production
ALLOWED_ORIGINS=https://sevasetu.vercel.app

FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GCS_BUCKET_NAME=...

GEMINI_API_KEY=...
GEMINI_FLASH_MODEL=...
GEMINI_PRO_MODEL=...

ALLOW_LOCAL_UPLOAD_FALLBACK=false
ENABLE_RUNTIME_SCHEDULERS=true

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=300
RATE_LIMIT_AUTH_MAX=20
RATE_LIMIT_UPLOAD_MAX=30
RATE_LIMIT_AI_MAX=60
```

Optional:

```env
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_NUMBER=
```

### Railway Post-Deploy Verification

Run after the first successful deployment:

```bash
curl https://sevasetu-api.up.railway.app/health
curl https://sevasetu-api.up.railway.app/api/health/deps
curl https://sevasetu-api.up.railway.app/api/health/ready
```

Expected:

- `/health` returns `200`
- `/api/health/deps` shows `firebase.mode = real`
- `/api/health/deps` shows `gemini.configured = true`
- `/api/health/ready` returns `200`
- logs show no fallback to mock mode

## Phase 5 — Vercel Frontend Setup

Manual Vercel steps:

1. Import the GitHub repo into Vercel.
2. Set the root directory to repo root.
3. Build command: `npm run build`
4. Output directory: `dist`
5. Keep framework autodetection on Vite/Other static frontend.
6. Confirm `vercel.json` rewrites are active.

### Vercel Environment Variables

```env
VITE_API_BASE_URL=https://sevasetu-api.up.railway.app/api

VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...

VITE_GOOGLE_MAPS_API_KEY=...

VITE_USE_FIREBASE_EMULATOR=false
VITE_DEV_AUTH_BYPASS=false
```

### Vercel Route Verification

Direct-load all routes after deployment:

- `/`
- `/workspace`
- `/pulse-map`
- `/impact/live`

## Phase 6 — Cross-Service Console Configuration

### Firebase Auth

- Add the final Vercel production domain to Firebase Auth `Authorized domains`.
- If you later introduce a custom domain, add it too.
- Preview-domain auth support is intentionally deferred in this plan.

### Google Maps Key Restrictions

- Restrict the browser key to:
  - `https://sevasetu.vercel.app/*`
- Enable/verify:
  - Maps JavaScript API
  - Geocoding API
- Confirm billing is enabled.

### Backend CORS

- Ensure Railway `ALLOWED_ORIGINS` matches the exact deployed Vercel origin.
- If you switch to a custom domain later, update it there too.

## Phase 7 — Firebase / Firestore / Storage Readiness

### Firestore Indexes

Create/verify the baseline indexes documented in `FIRESTORE_INDEXES.md`:

- `needReports(status, urgencyScore)`
- `needReports(status, updatedAt)`
- `needReports(category, status, createdAt)`
- `teamChallenges(companyId, createdAt)`

### Firestore Rules

Verify rules support:

- authenticated reads/writes for internal app flows
- intentionally public reads for `/impact/live` if that route should remain public

### Storage

- Confirm the backend can write to the configured bucket.
- Confirm `blob.makePublic()` is compatible with your bucket policy.
- If uniform bucket-level access blocks public-object behavior, either:
  - change bucket policy for prototype use, or
  - implement signed URLs later

For the current production prototype target, uploads should succeed as `storageMode: cloud`.

## Phase 8 — Scheduler Strategy

Current production prototype design:

- `ENABLE_RUNTIME_SCHEDULERS=true`
- one Railway instance only
- no autoscaling

Deployment checklist:

- Verify logs show `Runtime schedulers: enabled`
- Verify no scheduler exceptions after boot
- Spot-check urgency decay and inventory alert logs after runtime starts

Future follow-up:

- move schedulers to a dedicated cron/worker path if you later need multiple replicas

## Phase 9 — Auth And Production Behavior

Must-haves:

- `VITE_DEV_AUTH_BYPASS=false` on Vercel
- `NODE_ENV=production` on Railway
- successful hosted login on the final domain

Production auth verification commands:

- Verify login works in the browser on the hosted frontend
- Verify `POST /api/auth/verify` succeeds with a real Firebase token
- Verify `GET /api/dashboard/workspace-summary` succeeds after auth

## Phase 10 — Maps And Browser Capability Validation

Validate on hosted frontend:

- Pulse Map loads without Google watermark
- reverse geocoding works
- `/impact/live` renders on mobile
- microphone permission requests work
- geolocation permission requests work

If Google Maps errors appear, inspect browser console for:

- `RefererNotAllowedMapError`
- `BillingNotEnabledMapError`
- `ApiNotActivatedMapError`
- `InvalidKeyMapError`

## Phase 11 — Upload And Media Validation

Run the following hosted tests:

- photo upload end-to-end
- audio upload end-to-end
- confirm response contains `storageMode: cloud`
- redeploy/restart once and confirm uploaded files still resolve

If `storageMode: local` appears in production, treat it as a deployment bug.

## Phase 12 — End-To-End Production QA Matrix

### Backend

- `/health` returns `200`
- `/api/health/deps` shows real Firebase and configured Gemini
- `/api/health/ready` returns `200`
- logs contain no startup exceptions

### Frontend

- homepage loads
- direct route refresh works
- internal navigation works

### Auth

- phone auth works
- backend token verification works

### Product surfaces

- Workspace metrics populate
- SEVA Agent queue populates
- Pulse Map renders and streams
- `/impact/live` is public and populated as intended

### Uploads and AI

- photo/audio upload succeeds
- classification succeeds
- Gemini-backed flows do not 500

### Mobile

- public route works on a real phone

## Phase 13 — Local Docker Validation

### Build the backend image

```bash
docker build -t sevasetu-backend ./backend
```

Or use the repo helper:

```bash
npm run docker:smoke --prefix backend
```

### Run the backend image locally

```bash
docker run --rm -p 3001:3001 --env-file backend/.env sevasetu-backend
```

### Local smoke checks

```bash
curl http://localhost:3001/health
curl http://localhost:3001/api/health/deps
curl http://localhost:3001/api/health/ready
```

Expected:

- real Firebase mode
- no mock fallback
- no missing-env failures

Only after the image passes locally should you trust the Railway rollout.

## Phase 14 — Observability, Failure Handling, Rollback

### Success indicators in logs

- `Firebase mode: real`
- `Gemini models: ... configured=true`
- `Runtime schedulers: enabled`
- request logs show healthy `2xx/3xx` responses without repeated CORS errors

### Hard-failure conditions

- Firebase mock mode in production
- missing Gemini key in production
- missing/empty `ALLOWED_ORIGINS` in production
- missing cloud bucket while local fallback is disabled
- Maps key rejected on production frontend

### Rollback plan

- keep the last known-good Vercel deployment available
- keep the last known-good Railway deployment/image available
- if frontend-only regression happens, rollback Vercel first
- if API regression happens, rollback Railway first and re-run `/health`, `/api/health/deps`, `/api/health/ready`

### Demo-Day Smoke Sheet

Fill this in after production is live:

```text
Frontend URL: ______________________________
Backend URL: _______________________________
Health URL: ________________________________
Ready URL: _________________________________
Login status: PASS / FAIL
Workspace data: PASS / FAIL
SEVA Agent queue: PASS / FAIL
Pulse Map: PASS / FAIL
Impact Live: PASS / FAIL
Uploads cloud mode: PASS / FAIL
Seed freshness: PASS / FAIL
```

## Phase 15 — Nice-To-Have Follow-Ups

Partially implemented now:

- backend Docker CI workflow added in `.github/workflows/backend-docker.yml`
- improved request-level observability via request IDs and request logs
- readiness endpoint added at `/api/health/ready`
- production upload fallback can now fail hard instead of silently writing to ephemeral disk
- dedicated scheduler-worker entrypoint added via `npm run start:scheduler --prefix backend`

Still deferred for later:

- move schedulers to a dedicated worker/cron job
- add custom domains
- add preview-domain auth/maps/CORS support
- add external monitoring provider (e.g. Sentry or OpenTelemetry export)
- add signed URL upload serving if public bucket access is not acceptable
