# SevaSetu

AI-powered need intake, volunteer dispatch, civic coordination, CSR operations, crisis escalation, and public impact telemetry for NGOs and local response teams.

## Documentation Plan

- First 3 files/folders to inspect: `package.json`, `backend/src/`, `src/`
- First diagram to generate: `Layered System Architecture`
- Estimated pass order: `1) package.json & env, 2) server routes, 3) frontend components, 4) AI/ML + analytics code`

---

## Table of Contents

- [Project Overview](#project-overview)
- [Quick Start](#quick-start)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
  - [Layered System Architecture](#layered-system-architecture)
  - [Privacy & Trust Layer](#privacy--trust-layer)
  - [Application Role Flows](#application-role-flows)
  - [Data Flow Diagram](#data-flow-diagram)
  - [AI / ML Pipeline Diagram](#ai--ml-pipeline-diagram)
  - [Why-this-stack Diagram](#why-this-stack-diagram)
- [Directory Structure](#directory-structure)
- [Component Index](#component-index)
- [API Contracts](#api-contracts)
- [Data Flow & State Management](#data-flow--state-management)
- [AI/ML Section](#aiml-section)
- [Styling & Theming](#styling--theming)
- [Testing](#testing)
- [Build & Deployment](#build--deployment)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [Validation & Manifest](#validation--manifest)
- [VALIDATION CHECKLIST](#validation-checklist)
- [Appendix](#appendix)

---

## Project Overview

SevaSetu is a warm-surface operations platform built for fast-moving community response. It combines four intake modes, live need mapping, dispatch ranking, volunteer execution, NGO coordination, Panchayat workflows, CSR orchestration, crisis response, and a public KPI surface inside one product.

### Core goals

- Capture needs quickly through `voice`, `photo`, `form`, and `assisted WhatsApp-style` intake.
- Classify and score urgency with context-aware AI instead of flat severity labels.
- Detect duplicate reports, merge clustered signals, and surface systemic issues.
- Match volunteers using proximity, skills, reliability, urgency, and available supplies.
- Close the loop with completion verification, coordinator review, and reporter confirmation.
- Expose the same underlying field graph across NGO, CSR, Panchayat, crisis, and public impact views.

### Target users

- Field workers and community reporters
- NGO coordinators and operations leads
- Volunteers and volunteer captains
- Panchayat / civic administrators
- CSR teams and enterprise impact/compliance stakeholders
- Public audiences viewing live impact summaries

### What makes SevaSetu distinctive

- It is not just an intake app; it is a full need-to-resolution operating system.
- The same `needReports` and `dispatchTasks` graph powers multiple role-specific surfaces rather than separate disconnected tools.
- AI is used as structured decision support: classification, deduplication, urgency explainability, skill fit, verification, scheme-gap analysis, and escalation drafting.
- The UI language stays warm and civic rather than cold enterprise SaaS, which helps dense operational data remain readable.

---

## Quick Start

### Prerequisites

- Node.js `>=18`
- npm
- Firebase project with Firestore and Storage
- Gemini API key
- Google Maps browser key for map/geolocation features

### Install

```bash
npm install
npm install --prefix backend
```

### Run frontend + backend together

```bash
npm run dev:all
```

### Or run separately

```bash
# terminal 1
npm run dev --prefix backend

# terminal 2
npm run dev
```

### Production builds

```bash
npm run build
npm run build --prefix backend
```

### Preview frontend build

```bash
npm run preview
```

### Windows launcher

```bash
start.bat
```

- `start.bat` is the single local launcher: it optionally reseeds demo data, builds/starts the backend Docker container, and starts the frontend locally.
- `start-dev.bat` now just forwards to `start.bat` for backward compatibility.
- `stop.bat` stops both the local frontend process and the Docker backend container.
- `start.bat` opens a frontend terminal window and a backend Docker-log window, then opens `http://localhost:5173` automatically.

### Docker smoke test

```bash
npm run docker:smoke --prefix backend
```

- Builds the backend image, runs it in production mode with envs from `backend/.env`, and verifies `/health`, `/api/health/deps`, and `/api/health/ready`.

### Seed demo data

```bash
npm run seed --prefix backend -- --clear --count=24
```

### Example env keys

#### Root `.env.local`

```env
VITE_API_BASE_URL=http://localhost:3001/api
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

#### `backend/.env`

```env
PORT=3001
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...
GCS_BUCKET_NAME=...

GEMINI_API_KEY=...
GEMINI_FLASH_MODEL=gemini-1.5-flash
GEMINI_PRO_MODEL=gemini-1.5-pro

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
RATE_LIMIT_AUTH_MAX=20
RATE_LIMIT_UPLOAD_MAX=40
RATE_LIMIT_AI_MAX=50
```

### Required env vars verified from code

- Frontend Firebase config: `src/config/firebase.ts`
- Frontend API base and dev bypass: `src/services/api.ts`
- Backend server config: `backend/src/index.ts`
- Backend Firebase admin config: `backend/src/config/firebase.ts`
- Backend Gemini config: `backend/src/services/geminiClient.ts`

---

## Tech Stack

### Frontend

| Package | Version | Role |
|---|---:|---|
| `react` | `^18.3.0` | core UI runtime |
| `react-dom` | `^18.3.0` | DOM renderer |
| `react-router-dom` | `^6.21.0` | route graph |
| `firebase` | `^10.7.0` | auth + Firestore web SDK |
| `@react-google-maps/api` | `^2.19.2` | map components (installed) |
| `@googlemaps/js-api-loader` | `^2.0.2` | direct map script loading |
| `motion` | `^12.0.0` | page/section motion |
| `h3-js` | `^4.4.0` | hex mapping utilities |
| `react-hot-toast` | `^2.4.1` | toast notifications |
| `zustand` | `^4.4.7` | installed but not materially used in inspected source |
| `papaparse` | `^5.4.1` | CSV intake/import support |
| `lenis` | `^1.1.0` | smooth scroll layer |

### Backend

| Package | Version | Role |
|---|---:|---|
| `express` | `^4.18.2` | HTTP API |
| `firebase-admin` | `^12.0.0` | Firestore/Auth/Storage admin |
| `@google/generative-ai` | `^0.24.1` | Gemini structured generation + embeddings |
| `@google-cloud/storage` | `^7.7.0` | cloud storage access |
| `axios` | `^1.14.0` | Open-Meteo fetches |
| `multer` | `^1.4.5-lts.1` | file upload parsing |
| `zod` | `^3.22.4` | schema validation |
| `helmet` | `^7.1.0` | security headers |
| `cors` | `^2.8.5` | CORS policy |
| `express-rate-limit` | `^7.4.1` | rate limiting |
| `uuid` | `^9.0.1` | IDs |
| `h3-js` | `^4.4.0` | hex map aggregation |

### Build / Tooling

| Tool | Version | Role |
|---|---:|---|
| `vite` | `^5.0.0` | frontend dev/build |
| `typescript` | `^5.x` | static typing |
| `ts-node-dev` | `^2.0.0` | backend dev server |
| `concurrently` | `^8.2.2` | run frontend + backend together |
| `eslint` | `^8.55.0` (backend) | backend linting |

### Human-review note

- Versions above were double-checked against `package.json` and `backend/package.json`.
- Some older README references to Vertex AI are stale; the current code uses `@google/generative-ai` directly.

---

## Architecture

### Layered System Architecture

```mermaid
flowchart LR
  subgraph FE[Frontend Layer]
    Landing[Landing + Marketing]
    Intake[Intake Modes\nVoice / Photo / Form / Assisted]
    Ops[NGO Dashboard / Seva Agent / Pulse Map]
    RoleUIs[Volunteer App / CSR Portal / Panchayat / Crisis / Public KPI / Gemini Lab]
  end

  subgraph API[API / Gateway Layer]
    AuthAPI[/Auth/]
    IntakeAPI[/Intake/]
    DispatchAPI[/Dispatch/]
    DashAPI[/Dashboard/]
    RoleAPI[/Volunteer + CSR + Panchayat + Crisis + Gemini/]
  end

  subgraph BL[Business Logic Layer]
    Classify[Classification + Urgency Scoring]
    Dedup[Dedup Engine]
    Match[Matching + Inventory Score]
    Verify[Verifier Agent]
    Coord[Dashboard / Map / Dispatch Intelligence]
  end

  subgraph AI[AI / ML Layer]
    Gemini[Gemini Structured Generation]
    Vision[Gemini Vision Analysis]
    Embed[Text Embeddings]
    Lab[AI Workbench Tools]
  end

  subgraph DATA[Data Storage Layer]
    FS[(Firestore)]
    Storage[(Firebase Storage / Local Uploads)]
    WebSDK[(Firebase Web Auth)]
  end

  subgraph TRUST[Privacy & Trust Layer]
    RoleGuard[Role Guards + Token Verification]
    PrivateReports[Private Report Flagging]
    ReporterLoop[Reporter Confirmation]
    Aggregation[Admin / KPI Aggregation]
  end

  FE --> API
  API --> BL
  BL --> AI
  BL --> DATA
  API --> TRUST
  TRUST --> DATA
  AI --> BL
```

SevaSetu is layered around one core field graph: `needReports`, `dispatchTasks`, volunteers, resources, and operational logs. Frontend surfaces are role-specific, but the same backend services and Firestore collections drive all of them, which is why fixes in intake, dispatch, and verification propagate across NGO, volunteer, CSR, Panchayat, and public views.

Caption: Layered view of SevaSetu from role-facing UI down to storage and trust boundaries.

Alt text: A multi-layer architecture diagram showing frontend role surfaces calling backend APIs, business logic services, Gemini-based AI modules, Firebase storage layers, and privacy/trust controls.

### Privacy & Trust Layer

```mermaid
flowchart TD
  Reporter[Reporter / Field Worker] --> IntakeCapture[Intake capture]
  IntakeCapture --> VerifyToken[Auth token / dev token verification]
  VerifyToken --> Profile[User profile bootstrap / role lookup]
  Profile --> NeedDoc[Create needReport]
  NeedDoc --> PrivateFlag{Private report?}
  PrivateFlag -- Yes --> RestrictedView[Restricted operator visibility]
  PrivateFlag -- No --> StandardOps[Standard operational visibility]
  NeedDoc --> DedupCheck[Dedup + urgency + dispatch queue]
  DedupCheck --> TaskFlow[Dispatch + volunteer execution]
  TaskFlow --> Verification[Photo verification + coordinator review]
  Verification --> ReporterConfirm[Reporter confirmation request]
  ReporterConfirm --> AggregatedViews[Dashboard / map / KPI aggregation]
  AggregatedViews --> PublicViews[Public KPI page]
```

The codebase does not contain zero-knowledge proofs or formal anonymization pipelines, so the trust model is operational rather than cryptographic. Trust comes from token verification, role-based route protection, optional `isPrivate` reports, review queues, and the extra reporter confirmation loop after completion.

Caption: Trust and review controls applied from intake to public/ops visibility.

Alt text: A privacy pipeline diagram showing need intake, token verification, private report branching, dispatch, photo verification, reporter confirmation, and aggregated views.

### Application Role Flows

```mermaid
flowchart LR
  subgraph Reporter[Reporter / Field Worker]
    R1[Landing / Workspace] --> R2[Report a Need]
    R2 --> R3[Voice / Photo / Form / Assisted]
    R3 --> R4[Need submitted]
    R4 --> R5[Reporter confirmation prompt]
  end

  subgraph Coordinator[NGO Coordinator / Admin]
    C1[Workspace] --> C2[Pulse Map]
    C1 --> C3[NGO Dashboard]
    C1 --> C4[SEVA Agent]
    C3 --> C5[Verification review]
    C4 --> C6[Dispatch override / logs]
    C3 --> C7[Gemini Lab / Voice Command Button]
  end

  subgraph Volunteer[Volunteer]
    V1[Volunteer App] --> V2[Missions]
    V2 --> V3[Chat + Accept]
    V3 --> V4[Upload completion photo]
    V4 --> V5[Verification result]
  end

  subgraph Partner[CSR / Panchayat / Public]
    P1[CSR Portal]
    P2[Panchayat Dashboard]
    P3[Impact Live]
  end
```

The app is not one dashboard wearing many hats; it is multiple role lanes over shared operational data. The reporter starts the graph, coordinators steer and verify it, volunteers execute it, and CSR/Panchayat/Public surfaces consume curated slices of the same state.

Caption: Role-oriented navigation lanes across the major SevaSetu surfaces.

Alt text: A role-flow diagram showing separate paths for reporters, NGO coordinators, volunteers, and partner/public users across SevaSetu pages.

### Data Flow Diagram

```mermaid
flowchart LR
  FE[Frontend forms, chats, dashboards, maps] --> API[Express route layer]
  API --> Validate[Zod / route validation / auth checks]
  Validate --> Transform[Mapping + normalization]
  Transform --> Firestore[(Firestore collections)]
  Transform --> Storage[(Storage / local uploads)]
  Transform --> External[Gemini / Open-Meteo / Google Maps]
  External --> Transform
  Firestore --> Dashboards[NGO / SEVA / CSR / Panchayat / Crisis]
  Firestore --> PublicKPI[Public impact KPI page]
  Firestore --> Map[Pulse Map live listeners]
  Firestore --> VolunteerApp[Volunteer task feed]
```

The frontend is mostly a thin client over a typed API layer, except for the live map and public KPI views which listen directly to Firestore. Transformations happen both server-side and in `src/services/api.ts`, where backend payloads are normalized into UI-friendly shapes for volunteer, CSR, Panchayat, crisis, and dashboard screens.

Caption: End-to-end data path from UI input through API logic into storage, external services, and live role-specific views.

Alt text: A left-to-right data flow diagram showing frontend requests passing through validation and transformation into Firestore, uploads, external AI/weather/maps services, and then returning into dashboards and live visualizations.

### AI / ML Pipeline Diagram

```mermaid
flowchart TD
  IntakeText[Need text / transcript / photo context] --> ClassifyPrompt[Structured classification prompts]
  ClassifyPrompt --> GeminiClassify[Gemini Flash / Pro]
  GeminiClassify --> Urgency[Urgency multipliers\nweather + vulnerability + time]
  IntakeText --> EmbedPrompt[Embedding text]
  EmbedPrompt --> GeminiEmbed[text-embedding-004]
  GeminiEmbed --> Dedup[Dedup engine]
  NeedAndVolunteer[Need + volunteer + inventory signals] --> MatchScore[Matching engine]
  CompletionPhoto[Completion photo URL] --> VisionFetch[Image fetch + Gemini Vision]
  VisionFetch --> VerifyTier[auto_resolved / needs_review / rejected]
  OpsQuery[Operator query] --> LabTools[Gemini Lab tools / Copilot / Surge / Burnout / Escalation]
  LabTools --> HumanReadable[Readable operator-facing answers]
```

SevaSetu does not contain a custom-trained ML training pipeline in the repo. Its AI layer is inference-first: structured Gemini calls, prompt-controlled JSON outputs, deterministic fallbacks, heuristics, weather augmentation, ward-vulnerability overlays, and embedding-backed plus lexical deduplication.

Caption: Inference pipeline linking intake, urgency scoring, deduplication, matching, verification, and AI workbench tools.

Alt text: An AI/ML diagram showing Gemini structured classification, urgency multipliers, text embeddings for deduplication, volunteer matching, vision verification, and operator tool outputs.

### Why-this-stack Diagram

```mermaid
flowchart LR
  React[React 18 + Vite] --> UX[Fast route rendering + modular role surfaces]
  Firebase[Firebase Auth + Firestore + Storage] --> Ops[One shared operational graph + realtime listeners]
  Express[Express + TypeScript] --> APIShape[Explicit route contracts + additive backend evolution]
  Gemini[Gemini structured generation] --> Decisions[Readable AI decision support, not loose chat]
  GoogleMaps[Google Maps + JS loader] --> Atlas[Live Delhi operations atlas]
  CSS[CSS Modules + tokenized globals] --> Visuals[Warm civic interface instead of generic SaaS chrome]
```

The stack is practical rather than trendy: Vite for speed, Firebase for operational state, Express for explicit route ownership, Gemini for structured outputs, and CSS tokens for a stable visual language. The result is a role-dense app that still feels coherent because the same primitives power every surface.

Caption: Technology-to-capability mapping behind SevaSetu’s operational UX.

Alt text: A diagram mapping React/Vite, Firebase, Express, Gemini, Google Maps, and CSS tokens to the user-facing capabilities they enable.

### Mermaid export note

To export any embedded Mermaid block to SVG locally:

```bash
npx -y @mermaid-js/mermaid-cli -i diagram.mmd -o diagram.svg
```

---

## Directory Structure

```text
.
├─ backend/
│  ├─ src/
│  │  ├─ config/          # Firebase admin bootstrapping
│  │  ├─ middleware/      # auth, errors, rate limits
│  │  ├─ models/          # zod models + shared backend types
│  │  ├─ routes/          # mounted API groups
│  │  ├─ scripts/         # seed + urgency decay jobs
│  │  └─ services/        # business logic, AI, dispatch, dashboards
│  ├─ package.json
│  └─ tsconfig.json
├─ src/
│  ├─ components/         # marketing + shared primitives + app shell
│  ├─ config/             # frontend Firebase + nav config
│  ├─ context/            # auth + theme contexts
│  ├─ data/              # report templates + Delhi presets
│  ├─ hooks/             # geolocation, voice recording, offline queue
│  ├─ pages/             # role-facing app surfaces
│  ├─ services/          # typed API client + offline queue
│  ├─ styles/            # global/internal token layers
│  └─ types/             # shared frontend types
├─ FIRESTORE_INDEXES.md   # Firestore index inventory and create links
├─ PENDING_INFRA_AND_OPTIONAL.md
├─ package.json
└─ README.md
```

### Important folders

- `backend/src/routes/` maps almost 1:1 to public API surface.
- `backend/src/services/` contains the actual product behavior: classification, dispatch, verification, dashboard aggregation, CSR, Panchayat, crisis, AI tools.
- `src/pages/` is the clearest way to understand role-specific UX boundaries.
- `src/services/api.ts` is the frontend contract adapter and one of the highest-value files to read first.

---

## Component Index

This index focuses on source modules that define runtime behavior. Generated files, logs, and simple `index.ts` barrels are omitted from detailed rows unless they carry meaning.

### Backend Core Modules

| Path | Purpose | Inputs / State | Exports / Example | Dependencies | Tests | Complexity / Notes |
|---|---|---|---|---|---|---|
| `backend/src/index.ts` | Express bootstrap, route mounting, health, static uploads | env vars, Express app, middleware chain | `app.listen(...)` | `cors`, `helmet`, route modules | none found | O(1) bootstrap |
| `backend/src/config/firebase.ts` | Firebase Admin initialization and fallback bucket config | env credentials, bucket name | `initializeFirebase`, `getFirestore`, `getAuth`, `getStorage` | `firebase-admin` | none found | O(1) init; human-review env safety |
| `backend/src/middleware/errorHandler.ts` | standard error payloads and error helper | Express errors | `createError`, `errorHandler` | Express | none found | O(1) |
| `backend/src/middleware/rateLimit.ts` | route-specific throttles | env rate-limit knobs | limiter factories | `express-rate-limit` | none found | O(1) config |
| `backend/src/models/NeedReport.ts` | report schema, enums, metadata | report payloads | `NeedReportSchema`, enums | `zod` | none found | schema only |
| `backend/src/models/DispatchTask.ts` | dispatch task schema + ranked decisions | task payloads | `DispatchTaskSchema` | `zod` | none found | schema only |
| `backend/src/models/Volunteer.ts` | volunteer model used by matcher/ops | volunteer docs | volunteer types | `zod` | none found | schema only |
| `backend/src/models/User.ts` | user roles and auth profile schema | auth/user docs | role enums | `zod` | none found | schema only |
| `backend/src/models/VolunteerApp.ts` | volunteer-app-specific types | volunteer UI contracts | app-level volunteer types | `zod` | none found | schema only |
| `backend/src/routes/auth.ts` | token verification, dev bypass, user profile CRUD | bearer token, profile patches | `/api/auth/*` | Firebase Auth/Firestore | none found | O(1) per request |
| `backend/src/routes/intake.ts` | report submission, classification, dedup, queue creation | report body, batch imports | `/api/intake/*` | classification, dedup, dispatch | none found | O(n) dedup candidate scan after indexed query |
| `backend/src/routes/upload.ts` | photo/audio upload and photo analysis | multipart uploads, base64 image | `/api/upload/*` | Storage, vision analysis | none found | O(file size) |
| `backend/src/routes/classification.ts` | text/voice classification facade | text/transcript payloads | `/api/classification/*` | classification service | none found | O(prompt call) |
| `backend/src/routes/map.ts` | hex map stats and layer APIs | optional bounds | `/api/map/*` | map aggregation | none found | O(hex aggregation size) |
| `backend/src/routes/dispatch.ts` | dispatch trigger, task queue, response, review, logs | route params/body | `/api/dispatch/*` | `sevaAgent`, verifier | none found | queue endpoints vary |
| `backend/src/routes/dashboard.ts` | NGO command-center aggregates | auth role | `/api/dashboard/*` | dashboard intelligence | none found | aggregation-bound |
| `backend/src/routes/volunteerApp.ts` | volunteer onboarding, tasks, chat, completion, gamification | volunteer id/task data | `/api/volunteer-app/*` | volunteer experience service | none found | feed/chat aggregation |
| `backend/src/routes/inventory.ts` | volunteer inventory CRUD | volunteer inventory body | `/api/inventory/*` | inventory engine | none found | indexed subcollection ops |
| `backend/src/routes/gemini.ts` | AI tool API endpoints + live tool bridge | AI inputs, role gating | `/api/gemini/*` | gemini features/live service | none found | prompt/inference bound |
| `backend/src/routes/csr.ts` | CSR onboarding, leaderboard, compliance, challenges | company payloads | `/api/csr/*` | CSR portal service | none found | list + generation |
| `backend/src/routes/panchayat.ts` | Panchayat overview/history/gap finder/flagging | panchayat id, need text | `/api/panchayat/*` | panchayat service | none found | service bound |
| `backend/src/routes/crisis.ts` | evaluate/activate/resolve crisis mode | zone + evidence inputs | `/api/crisis/*` | crisis service | none found | service bound |

### Backend Services

| Path | Purpose | Inputs / State | Exports / Example | Dependencies | Tests | Complexity / Notes |
|---|---|---|---|---|---|---|
| `backend/src/services/geminiClient.ts` | shared Gemini JSON client + fallback metadata | prompt config, env keys | `generateStructuredJson(...)` | `@google/generative-ai` | none found | central AI infra |
| `backend/src/services/classification.ts` | text/voice need classification + urgency enrichment | transcript/text + optional location | `classifyNeedReport(...)` | Gemini + urgency multipliers | none found | prompt-bound |
| `backend/src/services/urgencyMultipliers.ts` | weather/vulnerability/time explainable urgency score | category + lat/lon + urgency enum | `computeFullUrgencyScore(...)` | Open-Meteo + ward GeoJSON | none found | O(features) vulnerability lookup |
| `backend/src/services/dedupEngine.ts` | duplicate detection via embeddings + lexical fallback | report id/description/category/location | `runDedupCheck(...)` | Firestore + Gemini embeddings | none found | indexed query + candidate scan |
| `backend/src/services/matchingEngine.ts` | volunteer ranking using proximity, skills, reliability, urgency, supply | report + volunteer docs | `computeVolunteerMatches(...)` | inventory engine | none found | O(v) over candidate volunteers |
| `backend/src/services/inventoryEngine.ts` | volunteer inventory CRUD + supply score + alert checks | volunteerId, items, category | `computeSupplyScore(...)` | Firestore subcollections | none found | O(items) per volunteer |
| `backend/src/services/sevaAgent.ts` | dispatch queue creation, ranked decisions, overrides, logs | report ids, volunteer choices | `triggerSevaAgentForReport(...)` | matcher + Firestore | none found | key dispatch orchestrator |
| `backend/src/services/autoDispatch.ts` | NGO auto-dispatch path and NGO lookup | report docs | `triggerAutoDispatch(...)` | matcher/NGO data | none found | may require composite indexes |
| `backend/src/services/visionAnalysis.ts` | Gemini vision abstraction for photo analysis | image buffer + mime type | `analyzeImageWithGemini(...)` | Gemini multimodal | none found | image-size bound |
| `backend/src/services/verifierAgent.ts` | completion verification, review queue, reporter loop | task/report/photo/reporter ids | `verifyTaskCompletion(...)` | visionAnalysis + Firestore | none found | branch-heavy but linear |
| `backend/src/services/dashboardIntelligence.ts` | NGO dashboard analytics plus workspace summary cards/highlights | dashboard query context | `getDashboardOverview()`, `getWorkspaceSummary()` | Firestore aggregates | none found | aggregation-heavy |
| `backend/src/services/mapAggregation.ts` | hex stats and map layers | optional bounds/filters | `getMapLayersData(...)` | H3 + Firestore | none found | O(n) over fetched reports |
| `backend/src/services/volunteerExperience.ts` | volunteer profile/task/chat/gamification workflow | volunteer/task ids | task feed + chat methods | Firestore | none found | UI adapter service |
| `backend/src/services/geminiFeatures.ts` | coordinator copilot, skill match, impact report, surge, burnout, escalation | plain operator input | tool-specific exported fns | Gemini client + dashboard | none found | prompt-bound |
| `backend/src/services/geminiLiveService.ts` | tool declaration catalog + execution for voice/text dispatch commands | tool name + args | `executeLiveTool(...)` | Firestore | none found | imperative command layer |
| `backend/src/services/csrPortal.ts` | CSR pool, leaderboard, BRSR, vetting, challenges, pricing | company ids + onboarding inputs | CSR methods | Firestore + Gemini | none found | contains challenge index dependency |
| `backend/src/services/panchayatInterface.ts` | village overview/history/reporting/scheme analysis | panchayat ids + needs summary | Panchayat methods | Firestore + Gemini | none found | mixed analytics + generation |
| `backend/src/services/crisisMode.ts` | crisis evaluate/activate/resolve/dashboard/post-report | zone ids + evidence | crisis methods | Firestore + Gemini | none found | multi-step orchestration |

### Backend Scripts / Operational Modules

| Path | Purpose | Inputs / State | Exports / Example | Dependencies | Tests | Complexity / Notes |
|---|---|---|---|---|---|---|
| `backend/src/scripts/seedData.ts` | seeds reports, volunteers, inventory, and demo-ready dispatch tasks | `--clear`, `--count` | `npm run seed --prefix backend -- --clear --count=24` | Firestore | none found | demo data critical; loads `backend/.env` directly |
| `backend/src/scripts/seedVolunteers.ts` | volunteer-only bulk seed helper | `--clear`, `--count` | volunteer seeding CLI | Firestore | none found | demo helper |
| `backend/src/scripts/urgencyDecay.ts` | batch urgency escalation job | Firestore unresolved reports | `runUrgencyDecay()` | Firestore | none found | invoked at startup and every 30 minutes by backend runtime |
| `backend/src/services/conflictResolution.ts` | report conflict rules | report states | exported helpers | backend services | none found | small utility |

### Frontend Application Surfaces

| Path | Purpose | Inputs / State | Exports / Example | Dependencies | Tests | Complexity / Notes |
|---|---|---|---|---|---|---|
| `src/App.tsx` | root route graph + layout split | route tree | `AppChrome` | Router + pages | none found | core navigation |
| `src/main.tsx` | browser bootstrap | DOM root | app mount | `StrictMode` | none found | bootstrap only |
| `src/pages/workspace/WorkspaceDashboard.tsx` | internal hub for role surfaces with live workspace summary stats | fetched summary + nav links | workspace page | shared icons/styles + `/api/dashboard/workspace-summary` | none found | live/dashboard hybrid |
| `src/pages/intake/IntakePage.tsx` | mode switcher for four intake paths | active mode state | intake page | four intake components | none found | small mode router |
| `src/pages/intake/components/VoiceIntake.tsx` | capture, classify, confirm, submit voice reports | transcript, audio blob, location, confirmation state | voice intake component | `useVoiceRecording`, `useGeolocation`, API | none found | media + AI flow |
| `src/pages/intake/components/PhotoIntake.tsx` | photo upload/analyze/submit path | selected file, analysis, location | photo intake component | upload API + geolocation | none found | file-driven flow |
| `src/pages/intake/components/FormIntake.tsx` | structured intake fallback | fields, attachments, AI suggestion | form intake component | API + templates + presets | none found | conventional form |
| `src/pages/intake/components/WhatsAppIntake.tsx` | guided WhatsApp-style wizard | chat transcript, step machine | assisted intake component | API + geolocation | none found | state-machine UX |
| `src/pages/pulse-map/CommunityPulseMap.tsx` | live Delhi operations atlas | Firestore listeners, selected need, filters | pulse map page | Firebase, Google Maps, Delhi presets | none found | high-density live page |
| `src/pages/pulse-map/PublicKPIDashboard.tsx` | public impact telemetry | Firestore listeners, ward slug | public KPI page | Firebase + Maps | none found | live aggregate dashboard |
| `src/pages/seva-agent/SevaAgentDashboard.tsx` | dispatch queue, ranked decisions, override control | selected task, override target | SEVA agent page | dispatch APIs | none found | ops decision tool |
| `src/pages/ngo-dashboard/NgoDashboard.tsx` | NGO command center | dashboard overview + urgency breakdown fetches | NGO dashboard page | dashboard/dispatch APIs | none found | cross-panel aggregate |
| `src/pages/ngo-dashboard/VoiceCommandButton.tsx` | floating command surface for live tool calls | transcript, response, open state | voice/text command UI | gemini live endpoints | none found | text-first live tool UX |
| `src/pages/volunteer-app/VolunteerExperience.tsx` | mission feed, chat, rewards, completion, inventory tab | selected task, completion states | volunteer page | volunteer APIs + inventory tab | none found | dense task client |
| `src/pages/volunteer-app/InventoryTab.tsx` | volunteer supply management | inventory list, add/update form | inventory tab | inventory endpoints | none found | CRUD UI |
| `src/pages/gemini-lab/GeminiLab.tsx` | AI workbench for operators | per-tool input/result state | Gemini Lab page | gemini API group | none found | multi-tool UI |
| `src/pages/csr-portal/CsrPortalPage.tsx` | CSR volunteering + compliance workspace | volunteer pool, challenges, certificates, pricing | CSR page | CSR + dashboard APIs | none found | fallback-enhanced portal |
| `src/pages/panchayat/PanchayatInterface.tsx` | civic dashboard and scheme gap finder | overview/history/reporting state | Panchayat page | panchayat APIs | none found | Hindi-first civic ops |
| `src/pages/crisis-mode/CrisisModePage.tsx` | crisis activation / post-crisis reporting | dashboard, activation/report state | crisis page | crisis endpoints | none found | stateful incident view |
| `src/pages/for-ngos/ForNgosPage.tsx` | partner-NGO CTA page | static UI state | for-NGOs page | none | none found | lightweight marketing/internal bridge |
| `src/pages/intake/components/LocationPicker.tsx` | location selection modal with GPS, search, reverse geocode, and manual coordinates | `value?: Location`, `onChange(location)`, `onClose?`, `showMap?` | active tab, search state, manual coordinate state, map refs | `LocationPicker` | `useGeolocation`, Google Maps globals, Nominatim | none found | network + map API bound |

### Frontend Platform / Shared Modules

| Path | Purpose | Inputs / State | Exports / Example | Dependencies | Tests | Complexity / Notes |
|---|---|---|---|---|---|---|
| `src/components/app-shell/AppShell.tsx` | internal shell with grouped navigation + top bar | route location, mobile nav state | shell component | nav config + theme | none found | central app chrome |
| `src/components/Navbar/Navbar.tsx` | marketing navbar | menu/open state | navbar component | theme + waitlist | none found | marketing shell |
| `src/components/shared/AppIcons.tsx` | icon system for app and marketing surfaces | `name`, `size` | `AppIcon` | none | none found | O(1) icon switch |
| `src/components/shared/LocationPresetPicker.tsx` | Delhi map section picker | selected preset, current location, callbacks | picker component | Delhi presets | none found | stateless helper |
| `src/components/shared/SectionNavigator/SectionNavigator.tsx` | landing-page section dots / jump navigation | window scroll position | section navigator | landing section ids | none found | small scroll listener |
| `src/components/shared/SectionSkeleton/SectionSkeleton.tsx` | suspense fallback for lazy sections/pages | no required props | skeleton component | none | none found | presentational |
| `src/components/shared/CustomCursor/CustomCursor.tsx` | landing-page custom cursor layer | mouse position and hover states | cursor component | browser pointer events | none found | animation/pointer bound |
| `src/components/shared/WaitlistModal/WaitlistModal.tsx` | accessible waitlist modal with focus trap | `isOpen`, `onClose` | email field, focus refs | modal component | `motion/react` | none found | UI-only; no backend submit yet |
| `src/components/shared/AnimatedCounter/AnimatedCounter.tsx` | animated numeric counters for marketing stats | count-up props | animated value lifecycle | counter component | `motion/react` | none found | O(animation frames) |
| `src/components/shared/NoiseTexture/NoiseTexture.tsx` | decorative SVG/noise layer for surface texture | style/class props | stateless | texture component | none | none found | presentational |
| `src/context/AuthContext.tsx` | Firebase auth + dev bypass | current user, OTP states | `useAuth()` | Firebase Auth | none found | auth provider |
| `src/context/ThemeContext.tsx` | light/dark theme persistence | theme state | `useTheme()` | DOM attrs/localStorage | none found | theme provider |
| `src/hooks/useVoiceRecording.ts` | MediaRecorder + speech recognition | recording state, transcript accumulation | voice hook | browser media APIs | none found | asynchronous media state |
| `src/hooks/useGeolocation.ts` | GPS + reverse geocoding | location state | geolocation hook | browser geolocation + Google/Nominatim | none found | network + permission bound |
| `src/hooks/useOfflineQueue.ts` | offline queue status bridge | online/sync state | offline hook | offlineQueue service | none found | queue wrapper |
| `src/services/api.ts` | typed backend client + response mapping | auth token, endpoint calls | many API methods | Firebase auth | none found | central contract adapter |
| `src/services/offlineQueue.ts` | IndexedDB queue for deferred intake | queued reports, retry | offline queue methods | IndexedDB + API | none found | queue size dependent |
| `src/config/firebase.ts` | frontend Firebase config | Vite env vars | `db`, `auth`, `storage` | Firebase SDK | none found | config |
| `src/config/appNavigation.ts` | grouped nav metadata | route descriptors | nav arrays | none | none found | config |
| `src/data/delhiLocationPresets.ts` | map-aligned location presets | Delhi presets | preset helpers | none | none found | config/data |
| `src/data/reportTemplates.ts` | structured form intake templates | template catalog | template helpers | none | none found | config/data |
| `src/styles/global.css` | global design tokens and utilities | CSS vars | global stylesheet | none | none found | token source |
| `src/styles/internal.css` | internal dashboard primitives | CSS vars/classes | internal stylesheet | none | none found | shared panel system |

### Marketing / Narrative Components

| Path | Purpose | Example usage |
|---|---|---|
| `src/components/Hero/Hero.tsx` | landing hero | rendered in `src/App.tsx` |
| `src/components/TrustStrip/TrustStrip.tsx` | trust/brand proof strip | landing section |
| `src/components/ProblemStatement/ProblemStatement.tsx` | problem framing | landing section |
| `src/components/ThreePillars/ThreePillars.tsx` | value pillars | landing section |
| `src/components/IntakeEngineDemo/IntakeEngineDemo.tsx` | intake explainer | landing section |
| `src/components/PulseMapSection/PulseMapSection.tsx` | map explainer | landing section |
| `src/components/MatchingEngine/MatchingEngine.tsx` | dispatch explainer | landing section |
| `src/components/ImpactStats/ImpactStats.tsx` | metric proof section | landing section |
| `src/components/Personas/Personas.tsx` | role cards | landing section |
| `src/components/CrisisMode/CrisisMode.tsx` | crisis explainer | landing section |
| `src/components/CSRPortal/CSRPortal.tsx` | CSR explainer | landing section |
| `src/components/TechFoundation/TechFoundation.tsx` | tech story | landing section |
| `src/components/Testimonials/Testimonials.tsx` | quotes/social proof | landing section |
| `src/components/FinalCTA/FinalCTA.tsx` | closing CTA | landing section |
| `src/components/Footer/Footer.tsx` | footer | landing section |

### Example usage snippets

```tsx
// Mounting the live pulse map inside the internal app shell
<Route path="/pulse-map" element={<CommunityPulseMap />} />

// Triggering an AI copilot query from Gemini Lab
const result = await runCoordinatorCopilotQuery('Where are Delhi tasks getting stuck right now?')

// Submitting a need report from any intake mode
await submitReport({
  description: 'Handpump has failed for two lanes.',
  category: 'water_sanitation',
  urgency: 'high',
  source: 'web_form',
  language: 'en',
  location: { latitude: 28.5453, longitude: 77.2734, district: 'South East Delhi', state: 'Delhi' },
})
```

---

## API Contracts

### Route surface summary

Mounted route groups are verified from `backend/src/index.ts`:

| Prefix | Source file | Purpose |
|---|---|---|
| `/health`, `/api/health/deps` | `backend/src/index.ts` | health + dependency checks |
| `/api/auth` | `backend/src/routes/auth.ts` | token verification and profile |
| `/api/intake` | `backend/src/routes/intake.ts` | report submission + CRUD |
| `/api/upload` | `backend/src/routes/upload.ts` | photo/audio uploads |
| `/api/classification` | `backend/src/routes/classification.ts` | direct classification endpoints |
| `/api/map` | `backend/src/routes/map.ts` | map layers and stats |
| `/api/dispatch` | `backend/src/routes/dispatch.ts` | dispatch queue + review |
| `/api/dashboard` | `backend/src/routes/dashboard.ts` | NGO dashboard aggregates |
| `/api/volunteer-app` | `backend/src/routes/volunteerApp.ts` | volunteer mission workflows |
| `/api/inventory` | `backend/src/routes/inventory.ts` | volunteer supplies |
| `/api/gemini` | `backend/src/routes/gemini.ts` | AI workbench + live tools |
| `/api/csr` | `backend/src/routes/csr.ts` | CSR workflows |
| `/api/panchayat` | `backend/src/routes/panchayat.ts` | Panchayat workflows |
| `/api/crisis` | `backend/src/routes/crisis.ts` | crisis workflows |

### Auth API

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/auth/verify` | Bearer token | verify token and create/bootstrap user |
| `GET` | `/api/auth/me` | Bearer token | get current profile |
| `PATCH` | `/api/auth/me` | Bearer token | update profile |

Representative request:

```json
{
  "displayName": "Farah Khan",
  "preferredLanguage": "en"
}
```

Representative response:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "dev-user-001",
      "role": "ngo_admin",
      "preferredLanguage": "en"
    }
  }
}
```

```bash
curl -H "Authorization: Bearer <token>" http://localhost:3001/api/auth/me
```

### Intake API

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/intake/report` | Bearer token | submit report, classify, score urgency, dedupe, create queue |
| `GET` | `/api/intake/reports` | Bearer token | filtered report listing |
| `GET` | `/api/intake/reports/:id` | Bearer token | single report fetch |
| `PATCH` | `/api/intake/reports/:id` | Bearer token | update status / assignment |
| `POST` | `/api/intake/batch` | Bearer token | batch import reports |

Representative request:

```json
{
  "description": "Community taps are dry and tanker support is needed.",
  "category": "water_sanitation",
  "urgency": "high",
  "source": "web_form",
  "language": "en",
  "location": {
    "latitude": 28.5453,
    "longitude": 77.2734,
    "district": "South East Delhi",
    "state": "Delhi",
    "address": "Okhla, South East Delhi, Delhi"
  }
}
```

Representative response:

```json
{
  "success": true,
  "data": {
    "report": {
      "id": "report-id",
      "category": "water_sanitation",
      "urgencyScore": 9.1,
      "status": "classified"
    },
    "classification": {
      "category": "water_sanitation",
      "urgency": "high",
      "urgencyBreakdown": {
        "base": 7,
        "weatherMult": 1,
        "vulnerabilityMult": 1.2,
        "timeMult": 1.3,
        "finalScore": 10.92
      }
    },
    "dispatchTaskId": "dispatch-id"
  }
}
```

```bash
curl -X POST http://localhost:3001/api/intake/report \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"description":"Community taps are dry","category":"water_sanitation","source":"web_form","location":{"latitude":28.5453,"longitude":77.2734}}'
```

### Upload API

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/upload/photo` | Bearer token | upload photo and analyze it |
| `POST` | `/api/upload/audio` | Bearer token | upload audio recording |
| `POST` | `/api/upload/photo/analyze` | Bearer token | analyze base64 photo without storage write |

### Classification API

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/classification/text` | Bearer token | classify free text |
| `POST` | `/api/classification/voice` | Bearer token | classify transcript |
| `GET` | `/api/classification/categories` | public | category metadata |

### Map API

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/map/layers` | public | aggregated map layers |
| `GET` | `/api/map/hexagon/:hexId` | public | single hex detail |
| `GET` | `/api/map/stats` | public | map statistics |

### Dispatch API

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/dispatch/trigger/:reportId` | coordinator/admin | create dispatch for report |
| `POST` | `/api/dispatch/tasks/:taskId/respond` | authenticated | accept/decline task invite |
| `POST` | `/api/dispatch/heartbeat` | authenticated | volunteer heartbeat |
| `GET` | `/api/dispatch/tasks/:taskId` | coordinator/admin | task detail |
| `GET` | `/api/dispatch/tasks-list` | coordinator/admin | queue list |
| `POST` | `/api/dispatch/complete` | authenticated | completion photo verification |
| `POST` | `/api/dispatch/reporter-confirm` | authenticated | reporter confirmation |
| `GET` | `/api/dispatch/pending-review` | coordinator/admin | pending AI review queue |
| `POST` | `/api/dispatch/review-decision` | coordinator/admin | approve/reject AI review |
| `POST` | `/api/dispatch/tasks/:taskId/override` | coordinator/admin | manual volunteer override |
| `GET` | `/api/dispatch/tasks/:taskId/logs` | coordinator/admin | decision log history |

Representative request:

```json
{
  "taskId": "workflow-task-001",
  "needReportId": "seed-report-001",
  "volunteerId": "dev-user-001",
  "reporterId": "seed-user-1",
  "needCategory": "water_sanitation",
  "photoUrl": "https://.../verification.jpg"
}
```

Representative response:

```json
{
  "success": true,
  "data": {
    "verified": false,
    "confidence": 0.5,
    "reason": "Vision analysis failed — routed to coordinator review",
    "tier": "needs_review"
  }
}
```

### Dashboard API

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/dashboard/workspace-summary` | coordinator/admin | lightweight workspace hero metrics and highlights |
| `GET` | `/api/dashboard/overview` | coordinator/admin | master NGO dashboard payload |
| `GET` | `/api/dashboard/surge-forecast` | coordinator/admin | surge forecast snapshot |
| `GET` | `/api/dashboard/cross-ngo` | coordinator/admin | cross-NGO coordination summary |
| `POST` | `/api/dashboard/resources` | coordinator/admin | resource updates |

### Volunteer App API

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/volunteer-app/profile/:volunteerId` | authenticated | volunteer profile |
| `POST` | `/api/volunteer-app/onboarding/assess` | authenticated | onboarding assessment |
| `PATCH` | `/api/volunteer-app/onboarding/preferences` | authenticated | preferences save |
| `GET` | `/api/volunteer-app/tasks/:volunteerId` | authenticated | mission feed |
| `POST` | `/api/volunteer-app/tasks/:taskId/accept` | authenticated | accept mission |
| `GET` | `/api/volunteer-app/tasks/:taskId/chat` | authenticated | load task chat |
| `POST` | `/api/volunteer-app/tasks/:taskId/chat` | authenticated | send chat message |
| `POST` | `/api/volunteer-app/tasks/complete` | authenticated | legacy completion flow |
| `GET` | `/api/volunteer-app/gamification/:volunteerId` | authenticated | gamification summary |

### Inventory API

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/inventory/categories` | public | category -> supply map |
| `GET` | `/api/inventory/:volunteerId` | authenticated | volunteer inventory |
| `POST` | `/api/inventory/update` | authenticated | add/update item |
| `POST` | `/api/inventory/decrement` | authenticated | decrement after use |

### Gemini Features API

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/gemini/copilot/query` | coordinator/admin | coordinator copilot |
| `POST` | `/api/gemini/skill-match` | authenticated | semantic skill fit |
| `POST` | `/api/gemini/impact-report` | coordinator/admin | impact narrative |
| `POST` | `/api/gemini/surge-rag` | coordinator/admin | surge forecast |
| `POST` | `/api/gemini/burnout-detect` | coordinator/admin | burnout risk |
| `POST` | `/api/gemini/crisis-escalation` | coordinator/admin | escalation draft |
| `GET` | `/api/gemini/live-functions` | coordinator/admin | voice/text tool declarations |
| `POST` | `/api/gemini/live-tool-call` | coordinator/admin | execute live tool |

### CSR API

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/csr/pricing` | public | pricing tier info |
| `POST` | `/api/csr/employees/bulk-onboard` | authenticated | bulk employee onboarding |
| `GET` | `/api/csr/volunteer-pool/:companyId` | authenticated | volunteer pool |
| `GET` | `/api/csr/leaderboard/:companyId` | authenticated | division leaderboard |
| `GET` | `/api/csr/compliance/brsr/:companyId` | authenticated | BRSR automation output |
| `GET` | `/api/csr/compliance/audit-trail/:companyId` | authenticated | audit trail |
| `GET` | `/api/csr/certificates/:companyId` | authenticated | certificate feed |
| `POST` | `/api/csr/challenges` | authenticated | create challenge |
| `GET` | `/api/csr/challenges/:companyId` | authenticated | list challenges |
| `POST` | `/api/csr/ngo-vetting` | authenticated | NGO due diligence summary |

### Panchayat API

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/panchayat/needs/flag` | authenticated | flag village need |
| `GET` | `/api/panchayat/overview/:panchayatId` | authenticated | overview |
| `GET` | `/api/panchayat/history/:panchayatId` | authenticated | recurring history |
| `POST` | `/api/panchayat/scheme-gap-finder` | authenticated | scheme analysis |
| `GET` | `/api/panchayat/monthly-health-report/:panchayatId` | authenticated | monthly report |
| `GET` | `/api/panchayat/pm-gatishakti/:panchayatId` | authenticated | infra overlay |

### Crisis API

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/crisis/evaluate` | authenticated | evaluate activation |
| `POST` | `/api/crisis/activate` | authenticated | activate crisis mode |
| `POST` | `/api/crisis/resolve` | authenticated | resolve crisis |
| `GET` | `/api/crisis/dashboard/:zoneId` | authenticated | crisis dashboard |
| `POST` | `/api/crisis/post-report` | authenticated | generate post-crisis report |

### External integration mapping

| Integration | Used for | Code location |
|---|---|---|
| Firebase Auth | auth and dev bypass patterns | `backend/src/routes/auth.ts`, `src/context/AuthContext.tsx` |
| Firestore | core operational graph | throughout backend services + map/public KPI listeners |
| Firebase Storage / local uploads | photo/audio persistence | `backend/src/routes/upload.ts` |
| Gemini API | structured generation, embeddings, vision | `backend/src/services/geminiClient.ts`, `classification.ts`, `geminiFeatures.ts`, `dedupEngine.ts`, `visionAnalysis.ts` |
| Open-Meteo | weather multiplier | `backend/src/services/urgencyMultipliers.ts` |
| Google Maps JS API | maps + reverse geocode UX | `src/pages/pulse-map/*.tsx`, `src/hooks/useGeolocation.ts` |

### Integration note

- No FHIR, ABDM, or AWS HealthLake integration was verified in the current codebase.

---

## Data Flow & State Management

```mermaid
flowchart LR
  UI[Pages + Components] --> Local[Local React state]
  UI --> Ctx[AuthContext + ThemeContext]
  UI --> API[src/services/api.ts]
  UI --> Live[Direct Firestore listeners]
  UI --> Offline[IndexedDB offline queue]
  API --> Token[Firebase ID token / dev token]
  Token --> Backend[Express routes]
  Offline --> API
  Backend --> Firestore[(Firestore / Storage / Gemini)]
  Firestore --> Live
```

State is intentionally lightweight on the client: page-local hooks carry most UI state, `AuthContext` and `ThemeContext` are the only global providers, and `src/services/api.ts` acts as the contract adapter between UI and backend. The Pulse Map and public KPI surfaces also subscribe directly to Firestore, so the product mixes REST-driven mutations with realtime reads instead of funneling everything through one store.

Caption: State ownership across local React state, context providers, API helpers, offline queueing, and realtime Firestore listeners.

Alt text: A state-management diagram showing pages using local state, auth/theme contexts, the API client, direct Firestore listeners, and an IndexedDB offline queue that syncs through backend routes into Firestore and Gemini-backed services.

### Frontend state map

- Routing state: `react-router-dom` in `src/App.tsx`
- Theme state: `ThemeContext` with `localStorage` persistence in `src/context/ThemeContext.tsx`
- Auth state: `AuthContext` with Firebase auth listeners in `src/context/AuthContext.tsx`
- Page-local operational state: most major pages keep their own fetch/result state with React hooks
- API normalization state: `src/services/api.ts` reshapes backend payloads before UI consumption
- Live data state: direct Firestore `onSnapshot` listeners in Pulse Map and Public KPI pages
- Offline state: IndexedDB-backed queue via `src/services/offlineQueue.ts`

### Practical flow

1. User action enters through a page or intake mode.
2. Most pages call `src/services/api.ts`, which attaches auth tokens and normalizes responses.
3. Backend routes delegate to service modules.
4. Services write/read Firestore, Storage, Gemini, weather, or map-related integrations.
5. Aggregate views then flow back into role-specific dashboards, or directly into live Firestore listeners.

### Cache / state notes

- No Redux store was verified.
- `zustand` is installed but not meaningfully used in inspected runtime source.
- The app relies on React state, contexts, API helpers, and Firestore listeners rather than a global client-state store.

---

## AI/ML Section

### What exists

- Structured classification for intake text and transcripts
- Vision analysis for photo intake and completion verification
- Text embeddings for deduplication
- Explainable urgency scoring using weather, ward vulnerability, and time of day
- AI workbench tools: copilot, skill fit, impact report, surge forecast, burnout prediction, escalation draft
- Panchayat scheme-gap analysis and CSR NGO vetting generation

### Models verified in code

- `gemini-1.5-flash` (default flash path)
- `gemini-1.5-pro` (longer-form generation path)
- `text-embedding-004` (dedup embeddings)

### Inference modes

- Realtime-ish: intake classification, queue creation, dashboard tool queries, verification routing
- Batch / scheduler-backed: urgency decay script and inventory alert checks now run from backend bootstrap on fixed intervals
- Human-in-loop: verification review, reporter confirmation, coordinator override

### Explainability notes

- Urgency stores `urgencyBreakdown` fields directly on `needReports`
- Gemini tool outputs include `provider`, `model`, and `degraded`
- Dedup is fail-open and now has lexical fallback when embeddings fail
- Gemini Lab now renders model outputs as operational summaries instead of raw JSON dumps

### What was not found

- No custom model training pipeline
- No drift monitoring framework
- No offline model weights or classical ML training code checked into the repo

---

## Styling & Theming

### Styling approach

- CSS Modules for page/component-local styling
- `src/styles/global.css` for root tokens and shared utilities
- `src/styles/internal.css` for internal-product shells, panels, badges, metrics, forms
- Attribute-driven theming using `data-theme="dark"`

### Design tokens

- Typography: `Bricolage Grotesque` for display, `General Sans` for UI/body
- Base surfaces: warm linen / parchment in light mode, deep warm surfaces in dark mode
- Accent: terra cotta
- Success/live: jade
- Warning: amber
- Critical: warm red

### Breakpoints

- Most page modules implement custom responsive behavior around `1260px`, `1100px`, `900px`, `840px`, and `768px`
- Layouts collapse from multi-column dashboards into stacked cards rather than horizontal scroll-heavy shells

### Example token usage

```css
.panel {
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-xl);
  background: var(--internal-grain), var(--surface-glass);
  box-shadow: var(--shadow-sm);
}

.btnPrimary {
  background: var(--jade);
  color: var(--text-inverse);
}
```

---

## Testing

### What is available

- Build verification only was auto-verified from package scripts:

```bash
npm run build
npm run build --prefix backend
```

### What is missing

- No `test`, `test:coverage`, or frontend/backend unit-test scripts were found in current `package.json` files.
- No `*.test.*`, `*.spec.*`, or `__tests__` folders were found in the repo scan.

### Practical QA strategy used during implementation

- route-level curl smoke checks
- live Firestore query verification
- seeded end-to-end workflow checks
- UI route load checks after restarting frontend/backend

---

## Build & Deployment

### Build outputs

- Frontend: `dist/`
- Backend: `backend/dist/`

### Local deployment pattern

```bash
npm run dev:all
```

### Production notes

- Backend serves `/uploads` as static files when cloud storage falls back to disk.
- Firestore composite indexes are required for some production query paths; see `FIRESTORE_INDEXES.md`.
- The backend now starts in-process schedulers for `runUrgencyDecay()` and `checkInventoryAlerts()` during local/runtime bootstrap. Multi-instance production deployments should move those jobs to a single scheduler/cron target to avoid duplicate execution.
- Production upload fallback should be disabled with `ALLOW_LOCAL_UPLOAD_FALLBACK=false` so Railway does not silently write to ephemeral local disk.
- Frontend production builds now fail fast if critical `VITE_*` deployment env vars are missing.
- Detailed Vercel + Railway rollout steps live in `DEPLOYMENT_GUIDE.md`.

### CI/CD / hosting clues

- Backend Docker image definition exists in `backend/Dockerfile`
- Railway deploy defaults are codified in `backend/railway.json`
- Vercel SPA rewrites are codified in `vercel.json`
- Backend Docker CI workflow exists in `.github/workflows/backend-docker.yml`
- Human review is still required for final platform account wiring, domains, and console-side secrets

---

## Troubleshooting

### Common issues found during analysis

- `Pulse Map` blank or degraded
  - usually missing `VITE_GOOGLE_MAPS_API_KEY` or Firestore index setup
- `Assisted Intake` duplicate greeting in dev
  - caused by React StrictMode double-effect behavior; current implementation guards this
- `Seva Agent` queue card crash
  - older tasks without `rankedDecisions` caused undefined access; now normalized safely in frontend API mapping
- intake report not appearing in dispatch queue
  - fixed by routing intake into `triggerSevaAgentForReport(...)`, not just `needReports`
- duplicate volunteer names in map roster
  - caused by duplicate demo docs in Firestore; UI now collapses them
- backend starts but all internal pages show `Failed to fetch`
  - usually means the API process crashed during bootstrap; one historical cause was Firestore access at module-load time before Firebase Admin initialization
- Docker container starts but `/api/health/ready` returns `503`
  - usually means one of the production readiness checks failed (mock Firebase, missing Gemini key, missing bucket, or bad `ALLOWED_ORIGINS`)
- `ERR_BLOCKED_BY_CLIENT`
  - usually browser extension/adblock, not a SevaSetu runtime bug
- `google.maps.Marker` deprecation warning
  - non-blocking today, but future migration to `AdvancedMarkerElement` is recommended
- Google Maps watermark / `This page can't load Google Maps correctly`
  - usually billing, API enablement, or referrer restrictions on `VITE_GOOGLE_MAPS_API_KEY`, not a SevaSetu rendering bug

---

## Contributing

### Code style expectations

- Keep changes additive unless a named file/change explicitly requires otherwise
- Preserve existing route paths and Firestore collection names
- Prefer repo conventions over generic abstractions
- Keep UI within the existing warm internal design language
- Do not invent backend contracts that are not already supported or explicitly approved

### Recommended pre-PR checklist

- `npm run build`
- `npm run build --prefix backend`
- verify changed routes/pages manually
- verify Firestore indexes for any new query shapes
- update `README.md` and `FIRESTORE_INDEXES.md` if contracts/query shapes changed

---

## Validation & Manifest

```json
{
  "docs_manifest": {
    "files_scanned_count": 496,
    "diagrams_generated": [
      "Layered System Architecture",
      "Privacy & Trust Layer",
      "Application Role Flows",
      "Data Flow Diagram",
      "AI / ML Pipeline Diagram",
      "Why-this-stack Diagram",
      "Data Flow & State Management"
    ],
    "components_indexed_count": 71,
    "api_routes_count": 93,
    "issues_flagged_count": 6,
    "run_timestamp": "2026-04-11T17:05:00Z"
  }
}
```

---

## VALIDATION CHECKLIST

- [x] Package versions double-verified against `package.json` and `backend/package.json`
- [x] Mounted backend route groups verified from `backend/src/index.ts`
- [x] Frontend route structure verified from `src/App.tsx`
- [x] Firebase/Gemini env usage verified from runtime config files
- [x] Public KPI, Pulse Map, CSR Portal, Panchayat, Gemini Lab, NGO Dashboard, Volunteer App, and intake flows all have source-backed documentation entries
- [x] All 6 required Mermaid diagrams are embedded in this file, plus a state-management diagram for the dedicated section
- [x] No FHIR / ABDM / HealthLake integration was verified; marked explicitly instead of guessed
- [x] `backend/src/index.ts` now wires `runUrgencyDecay()` and `checkInventoryAlerts()` on startup intervals
- [x] `src/pages/workspace/WorkspaceDashboard.tsx` now uses live summary data from `GET /api/dashboard/workspace-summary`
- [x] Standalone backend scripts now load `backend/.env` before Firebase initialization (`backend/src/scripts/seedData.ts`, `backend/src/scripts/seedVolunteers.ts`, `backend/src/scripts/urgencyDecay.ts`)
- [x] Backend startup no longer fails from eager Firestore access in service module scope; Firestore access is now lazy in affected services
- [x] Backend Dockerization assets are present and locally validated (`backend/Dockerfile`, `backend/.dockerignore`, `backend/railway.json`)
- [x] Production readiness checks now gate hosted startup requirements and are exposed via `GET /api/health/ready`
- [x] SPA rewrites for direct Vercel route hits are codified in `vercel.json`
- [x] Backend Docker CI workflow is present in `.github/workflows/backend-docker.yml`
- [ ] Human review: `backend/.env` contains real-looking secrets and should be checked for exposure/rotation risk
- [ ] Human review: no formal automated test suite was found, so coverage claims should not be overstated
- [ ] Human review: some route groups accept ids in params/body without strict ownership enforcement; verify final RBAC expectations route-by-route
- [ ] Human review: Google Maps deprecation warning for `google.maps.Marker` remains a future maintenance item
- [ ] Human review: current code now encodes Docker/Vercel/Railway defaults, but final platform account wiring still requires Vercel/Railway/Firebase/Google Cloud console access
- [ ] Human review: `backend/src/routes/map.ts:17` keeps map endpoints public; do not assume authenticated map access in downstream deployment docs
- [ ] Human review: `SETUP_GUIDE.md:153` mentions Vertex AI enablement, but runtime inference currently uses direct Gemini API-key access in `backend/src/services/geminiClient.ts:31`
- [ ] Human review: `src/pages/ngo-dashboard/VoiceCommandButton.tsx:243` describes the voice dispatch shell as text fallback with real Firestore actions, not full live speech execution

---

## Appendix

### Useful commands

```bash
# run frontend + backend
npm run dev:all

# backend only
npm run dev --prefix backend

# frontend only
npm run dev

# seed demo data
npm run seed --prefix backend -- --clear --count=24

# build everything
npm run build && npm run build --prefix backend
```

### Example route smoke checks

```bash
curl http://localhost:3001/health
curl -H "Authorization: Bearer dev-mock-token-for-prototype" http://localhost:3001/api/dashboard/overview
curl -H "Authorization: Bearer dev-mock-token-for-prototype" http://localhost:3001/api/dispatch/tasks-list
curl http://localhost:3001/api/health/ready
```

### Notes on completeness

- This README documents the current inspected source code, not hypothetical deployment state.
- Where behavior depended on code-backed fallbacks or operational setup, that has been described precisely and flagged in the validation checklist.
