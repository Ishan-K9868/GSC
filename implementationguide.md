# SevaSetu Implementation Guide

Status: planning only. Do not execute feature code until this guide is reviewed and approved.

This document is the working implementation reference for the SevaSetu feature-addition spec in `SevaSetu_Agent_Implementation_Spec.md`. It combines:
- the hard constraints from the spec,
- repo-specific research from the current codebase,
- the current Claude-shaped design language that must be preserved,
- an exhaustive, atomic build checklist for every feature in the required order.

---

## 1. Hard Constraints That Override Everything

- Additive build only.
- Do not refactor, rename, or delete existing code unless the spec explicitly names the file and the exact change.
- Follow execution order exactly: Feature 2 -> Feature 1 -> Feature 3 -> Feature 6A -> Feature 4 -> Feature 5 -> Feature 6B.
- Do not change existing Firestore collection names.
- Do not change existing API route paths.
- Do not touch `crisisMode.ts`, `csrPortal.ts`, or `panchayatInterface.ts`.
- Do not migrate to ADK.
- Do not change the existing auth flow.
- Do not start implementation until this guide is approved.

Operational interpretation of the user's extra instruction:
- Research first.
- Preserve the current Claude-built design language.
- Use the web-dev-bible skill only as a guardrail; do not let it override the existing SevaSetu internal visual system.

---

## 2. Canonical Source Files For This Plan

### 2.1 Spec
- `SevaSetu_Agent_Implementation_Spec.md`

### 2.2 Design references
- `.agents/skills/ultimate-webdev-bible/ultimate-webdev-bible/references/design-system.md`
- `.agents/skills/ultimate-webdev-bible/ultimate-webdev-bible/references/composition.md`
- `.agents/skills/ultimate-webdev-bible/ultimate-webdev-bible/references/polish.md`
- `.agents/skills/ultimate-webdev-bible/ultimate-webdev-bible/references/components.md`

### 2.3 Current frontend design language sources
- `src/styles/global.css`
- `src/styles/internal.css`
- `src/components/app-shell/AppShell.tsx`
- `src/components/app-shell/AppShell.module.css`
- `src/pages/ngo-dashboard/NgoDashboard.tsx`
- `src/pages/ngo-dashboard/NgoDashboard.module.css`
- `src/pages/volunteer-app/VolunteerExperience.tsx`
- `src/pages/volunteer-app/VolunteerExperience.module.css`
- `src/pages/pulse-map/CommunityPulseMap.tsx`
- `src/pages/pulse-map/CommunityPulseMap.module.css`

### 2.4 Current backend architecture sources
- `backend/src/services/classification.ts`
- `backend/src/routes/intake.ts`
- `backend/src/services/matchingEngine.ts`
- `backend/src/routes/dispatch.ts`
- `backend/src/routes/volunteerApp.ts`
- `backend/src/routes/gemini.ts`
- `backend/src/services/autoDispatch.ts`
- `backend/src/services/visionAnalysis.ts`
- `backend/src/index.ts`
- `backend/src/scripts/seedData.ts`
- `backend/src/models/NeedReport.ts`
- `backend/src/models/DispatchTask.ts`
- `backend/src/models/VolunteerApp.ts`

---

## 3. Design Language To Preserve

The current internal-product design already maps strongly to the Warm Studio family from the web-dev-bible skill. The correct move is not to introduce a new recipe, but to preserve the current SevaSetu variant of that recipe.

### 3.1 Visual identity already in the repo
- Backgrounds are warm linen / parchment, not neutral white.
- Primary accent is terra cotta (`--accent`).
- Success / live / healthy state is jade (`--jade`).
- Warning / review / in-progress state is amber (`--amber`).
- Critical state uses a separate warm red family, not a generic alert red.
- Typography uses `Bricolage Grotesque` for titles and metrics, `General Sans` for body/UI.
- Panels are frosted-glass warm surfaces with grain overlays and warm-tinted shadows.
- Corners are soft and rounded, usually `--radius-lg` or `--radius-xl`.
- Motion is restrained, quick, and premium: subtle lift, border tint, soft shadow change, live-dot pulse.

### 3.2 UI composition patterns to preserve
- Internal pages use `hero -> metric strip or tab rail -> modular multi-panel workspace`.
- Panel headers use small uppercase labels with icons.
- Metrics use display typography plus tabular numerals.
- Dense data is expressed as stacked cards, chips, key-value rows, story blocks, and compact strips.
- Copy tone is operational and calm, not generic SaaS hype.

### 3.3 What the skill contributes here
- Keep hierarchy dramatic enough to feel designed, but within the existing internal dashboard language.
- Preserve texture over flatness.
- Keep color restraint.
- Keep motion consistency.
- Avoid generated-looking equal spacing everywhere.

### 3.4 What must not happen
- No new blue/purple enterprise dashboard styling.
- No default gray cards on white backgrounds.
- No Inter/Roboto/system-font drift.
- No detached flashy widgets that ignore the existing glass-card system.
- No bounce-heavy or gimmicky motion.
- No “OpenCode aesthetic”; follow the current Claude-established surfaces and spacing.

### 3.5 Design rules per new feature surface

#### Inventory tab
- Must feel like one more tab inside the current volunteer workspace.
- Use existing tab rail, panel shell, chips, badges, compact forms.
- Low-stock = amber, expired = critical/red, healthy stock = jade.

#### Verification states
- Auto-resolved = jade.
- Needs review = amber.
- Rejected = critical/red.
- Spinner and helper copy must feel like current operational UI, not a consumer upload wizard.

#### Voice command button
- Floating terra-cotta or amber circular mic button.
- Transcript/response bubble should be a glass card with compact operational text.
- Must feel like an internal command tool, not a novelty assistant orb.

#### Public KPI dashboard
- Public page can be cleaner and more open than internal dashboards, but still remain unmistakably SevaSetu.
- Use the same warm palette, typography, and tinted shadows.
- Avoid a totally different public marketing aesthetic.

#### Pulse map live wiring
- Preserve the current “atlas” composition: hero, rail, map stage, detail column.
- Replace mock data, not the design language.
- New badges/rings/toggles should look native to the current map chrome.

---

## 4. Repo Reality: Important Mismatches To Resolve During Implementation

These are not blockers to planning, but they must be handled consciously during execution.

### 4.1 Classification persistence mismatch
- Spec says to modify `backend/src/services/classification.ts` and add urgency fields before saving to Firestore.
- Reality: `classification.ts` does not save anything to Firestore; `backend/src/routes/intake.ts` writes `needReports`.
- Planned adaptation: compute urgency score in `classification.ts`, then persist it in `intake.ts` when the report object is built.
- Approval note: this technically requires an F2-side additive change in `backend/src/routes/intake.ts` even though the F2 section of the spec does not explicitly call that out.

### 4.2 Matching engine mismatch
- Spec says to order candidate need reports by `urgencyScore` in `backend/src/services/matchingEngine.ts`.
- Reality: `matchingEngine.ts` currently accepts one report and ranks volunteers; it does not fetch need reports.
- Planned adaptation: use `urgencyScore` inside matching/scoring where possible, and document that cross-report prioritization likely lives upstream.
- Approval note: if true queue prioritization is required, an upstream file may need adjustment later.

### 4.3 Dashboard urgency-breakdown mismatch
- Spec wants tooltip breakdowns in `src/pages/ngo-dashboard/`.
- Reality: `backend/src/services/dashboardIntelligence.ts` currently strips `urgencyBreakdown` out of returned task summaries.
- Planned adaptation options:
  - preferred: add pass-through fields in the dashboard service if allowed,
  - fallback: tooltip renders only when breakdown data is already available,
  - second fallback: fetch richer report detail client-side from a new file/local helper without touching unlisted `api.ts`.
- Approval note: this is another practical repo/spec mismatch.

### 4.4 Timestamp-type mismatch
- Spec examples use Firestore `Timestamp` heavily.
- Current repo mostly stores ISO strings for `createdAt`, `updatedAt`, `resolvedAt`, `acceptedAt`-style values.
- Planned adaptation: add mixed-type normalization helpers wherever needed and avoid migrations.
- Critical impact areas:
  - Dedup query time window
  - Pulse-map age decay
  - KPI calculations
  - Verification/request expiry logic

### 4.5 Vision service naming/signature mismatch
- Spec references `analyzeImageWithVision(photoUrl, prompt)`.
- Current repo exports `analyzeImageWithGemini(imageBuffer, mimeType)` from `backend/src/services/visionAnalysis.ts`.
- Planned adaptation: verifier service will fetch image bytes from `photoUrl`, call the existing vision service, and derive verification logic from the result without rewriting the vision layer.

### 4.6 Auto-dispatch trigger naming mismatch
- Spec references `triggerDispatch` for redispatch after reporter denial.
- Current repo exports `triggerAutoDispatch` from `backend/src/services/autoDispatch.ts`.
- Planned adaptation: use the existing `triggerAutoDispatch` export.

### 4.7 Existing volunteer completion route mismatch
- Current frontend volunteer completion flows through `/api/volunteer-app/tasks/complete`.
- Spec adds completion and reporter-confirm routes under `/api/dispatch/*`.
- Planned adaptation: keep the spec-required dispatch routes, and wire the named frontend file(s) to them directly without editing unlisted `src/services/api.ts`.

### 4.8 Dependency gaps
- `backend/package.json` currently does not include `axios`.
- `backend/package.json` currently does not include `ws` or `@types/ws`.
- Root `package.json` currently does not include `@google/generative-ai` for frontend Live SDK usage.
- Root `package.json` does not include `recharts`.
- Planned adaptation:
  - add `axios` in backend when execution begins,
  - decide whether backend `ws` proxy is truly needed or whether REST fallback alone satisfies the demo path,
  - use simple CSS bars for KPI charts instead of adding `recharts`,
  - if direct frontend Gemini Live SDK is required, package changes must be approved during execution.

### 4.9 `resources` collection coexistence risk
- Existing code already queries top-level `resources` docs in `dashboardIntelligence.ts` and `crisisMode.ts`.
- Spec for Inventory Engine uses `resources/{volunteerId}/items`.
- This means creating volunteer root docs in the same collection may pollute existing top-level resource queries.
- Planned adaptation: handle carefully during execution; likely requires either filtering in existing resource readers or a very deliberate volunteer-root document shape.
- Approval note: because spec forbids touching unrelated files, this needs special care before coding.

### 4.10 Named-file-only discipline
- The user explicitly asked to touch only named existing files from the spec.
- Therefore, avoid modifying unlisted helper files like `src/services/api.ts` or unlisted CSS modules unless absolutely necessary and approved.
- Planned approach:
  - use local fetch helpers inside newly created files if needed,
  - reuse `internal.css` and existing module classes where possible,
  - if an unlisted file becomes unavoidable, pause and surface that exact reason.

---

## 5. New Files Ledger

### 5.1 Primary spec files
- `backend/src/services/urgencyMultipliers.ts`
- `backend/src/services/dedupEngine.ts`
- `backend/src/services/inventoryEngine.ts`
- `backend/src/routes/inventory.ts`
- `backend/src/services/verifierAgent.ts`
- `backend/src/services/geminiLiveService.ts`
- `src/pages/pulse-map/PublicKPIDashboard.tsx`

### 5.2 Spec-mandated supporting files
- `backend/src/scripts/urgencyDecay.ts`
- `backend/src/data/ward_vulnerability_index.json`
- `src/pages/volunteer-app/InventoryTab.tsx`
- `src/pages/ngo-dashboard/VoiceCommandButton.tsx`

### 5.3 Planning files for this session
- `implementationguide.md`
- `implementationplan.md`

---

## 6. Existing Files Intended For Modification Under The Spec

- `backend/src/services/classification.ts`
- `backend/src/routes/intake.ts`
- `backend/src/services/matchingEngine.ts`
- `backend/src/index.ts`
- `backend/src/routes/dispatch.ts`
- `backend/src/routes/gemini.ts`
- `backend/src/scripts/seedData.ts`
- `src/pages/pulse-map/CommunityPulseMap.tsx`
- `src/pages/volunteer-app/VolunteerExperience.tsx`
- `src/pages/ngo-dashboard/NgoDashboard.tsx`
- `src/App.tsx`

Execution discipline note:
- Default assumption is: do not modify unlisted existing files unless the user explicitly approves a repo-reality exception.

---

## 7. Exact Execution Order And Feature Gates

### Step 1: Feature 2 - Urgency Multipliers
Gate to pass before moving on:
- urgency score computed correctly
- urgency breakdown persisted for new reports
- dashboard plan for explainability decided
- seed strategy decided

### Step 2: Feature 1 - DedupEngine
Gate to pass before moving on:
- new report can dedup against nearby recent open reports
- duplicate merge path does not dispatch
- possible-duplicate path marks report safely

### Step 3: Feature 3 - Inventory Engine
Gate to pass before moving on:
- volunteer inventory CRUD works
- matching engine includes supply score
- volunteer UI can add/update inventory

### Step 4: Feature 6A - Pulse Map Live
Gate to pass before moving on:
- live need pins load from Firestore
- volunteer layer toggle works
- vulnerability overlay renders
- merged/systemic badges/rings work

### Step 5: Feature 4 - VerifierAgent
Gate to pass before moving on:
- completion requires photo
- verification tiers behave correctly
- pending review queue visible
- reporter confirmation flow exists

### Step 6: Feature 5 - Gemini Live
Gate to pass before moving on:
- function declarations available
- backend tool-call route works
- dashboard button can invoke tools
- text fallback path works even if audio live mode is unavailable

### Step 7: Feature 6B - Public KPI Dashboard
Gate to pass before moving on:
- public routes render without internal shell
- all 6 KPI metrics compute safely from live data
- mobile layout works
- share and print actions work

### Final wrap gate
- seed data updated
- manual Firebase index tasks documented
- backend build passes
- frontend build passes
- smoke-test flows pass

---

## 8. Cross-Cutting Pre-Execution Checklist

- [ ] Re-read the full spec before touching code.
- [ ] Re-read this guide.
- [ ] Reconfirm named-file-only constraint.
- [ ] Reconfirm additive-only rule.
- [ ] Reconfirm current design language from `global.css` and `internal.css`.
- [ ] Verify package dependencies before editing code.
- [ ] Decide whether `ws` proxy is necessary or whether REST fallback is enough for Feature 5.
- [ ] Decide whether frontend Gemini Live SDK dependency needs to be added at the root package level.
- [ ] Decide whether dashboard tooltip can be implemented without backend DTO changes.
- [ ] Decide how to handle ISO-string timestamps versus Firestore `Timestamp` values.
- [ ] Decide how to prevent top-level `resources` queries from being polluted by volunteer inventory root docs.
- [ ] Decide whether direct local fetch helpers are needed in new frontend files to avoid touching unlisted `src/services/api.ts`.

---

## 9. Feature 2 - ClassifyAgent Upgrade (Urgency Multipliers)

### 9.1 Goal
Compute an explainable continuous urgency score using weather, vulnerability, and time-of-day context, then make downstream features consume it.

### 9.2 Files involved

Create:
- `backend/src/services/urgencyMultipliers.ts`
- `backend/src/scripts/urgencyDecay.ts`
- `backend/src/data/ward_vulnerability_index.json`

Modify:
- `backend/src/services/classification.ts`
- `backend/src/routes/intake.ts` (repo-reality persistence adaptation)
- `backend/src/services/matchingEngine.ts` (repo-reality urgency usage adaptation)
- `src/pages/ngo-dashboard/NgoDashboard.tsx`
- `backend/src/scripts/seedData.ts`

### 9.3 Atomic backend implementation checklist

#### A. Data + dependency preparation
- [ ] Confirm `backend/tsconfig.json` already supports `resolveJsonModule`.
- [ ] Confirm `axios` is missing from `backend/package.json`.
- [ ] Plan backend dependency installation for `axios` when execution starts.
- [ ] Define the schema for simplified Delhi ward GeoJSON.
- [ ] Decide exact 20-30 Delhi wards to include for demo coverage.
- [ ] Ensure each GeoJSON feature includes `ward_id`, `ward_name`, `district`, `bpl_pct`, `elderly_pct`, `hospital_dist_km`, `school_dist_km`.

#### B. Build `urgencyMultipliers.ts`
- [ ] Create `UrgencyBreakdown` type exactly as required.
- [ ] Import `axios`.
- [ ] Import `ward_vulnerability_index.json`.
- [ ] Implement `computeVulnerabilityIndex(feature)`.
- [ ] Implement `pointInPolygon(lat, lon, coordinates)`.
- [ ] Implement `getVulnerabilityMultiplier(lat, lon)`.
- [ ] Add clear reason strings for high/medium/standard/no-zone cases.
- [ ] Implement `getWeatherMultiplier(lat, lon, category)` using Open-Meteo.
- [ ] Add flooding logic.
- [ ] Add heatwave logic.
- [ ] Add no-op fallback on API failure.
- [ ] Implement `getTimeMultiplier(category)`.
- [ ] Implement `urgencyEnumToBase(urgencyEnum)`.
- [ ] Implement `computeFullUrgencyScore(baseUrgencyEnum, category, lat, lon)`.
- [ ] Cap `finalScore` at 99.
- [ ] Ensure all three reason strings are always present.

#### C. Modify `classification.ts`
- [ ] Import `computeFullUrgencyScore`.
- [ ] Inspect current `GeminiExtraction` return type and existing `severity` field.
- [ ] Decide how to extend the returned object without breaking consumers.
- [ ] After existing category/urgency classification, compute urgency breakdown.
- [ ] Attach `urgencyScore` and `urgencyBreakdown` to the returned classification payload.
- [ ] Extend fallback classification path to emit deterministic fallback urgency breakdown data.
- [ ] Extend mock classification path to emit realistic urgency breakdown data.

#### D. Persist urgency fields during intake (repo adaptation)
- [ ] In `backend/src/routes/intake.ts`, read `urgencyScore` and `urgencyBreakdown` returned from classification.
- [ ] Add these fields to the constructed `report` object.
- [ ] Ensure manually supplied category/urgency also still get scored.
- [ ] Decide fallback behavior when context scoring fails but classification succeeds.
- [ ] Keep submission fail-open.

#### E. Create `urgencyDecay.ts`
- [ ] Create scheduled-job script structure.
- [ ] Query unresolved reports with `urgencyScore` present.
- [ ] Multiply `urgencyScore` by `1.05` every run.
- [ ] Increment `urgencyDecayCount`.
- [ ] When count reaches 4, set urgency enum to `critical`.
- [ ] Set `urgencyDecayAlert: true`.
- [ ] Write notification for coordinator/NGO.
- [ ] Decide targeting logic for notification recipient(s) using existing fields.
- [ ] Make the script idempotent enough for repeated cron execution.

#### F. Matching-engine urgency adaptation
- [ ] Inspect where urgency currently affects ranking in `matchingEngine.ts`.
- [ ] Decide whether to replace enum-based urgency score with normalized `urgencyScore` when present.
- [ ] Keep existing `urgency` enum fallback for older reports.
- [ ] Document that true need-queue ordering may live outside current file.

### 9.4 Atomic frontend/dashboard checklist
- [ ] Identify every urgency badge location in `src/pages/ngo-dashboard/NgoDashboard.tsx`.
- [ ] Decide whether tooltip data is available from current dashboard response.
- [ ] If available, add small info icon next to urgency badge.
- [ ] Add hover/focus tooltip content showing base x weather x vulnerability x time = final score.
- [ ] Ensure tooltip respects existing warm glass design language.
- [ ] Ensure tooltip has keyboard accessibility.
- [ ] If data is not yet available, note implementation fallback path before execution begins.

### 9.5 Data model fields to write on new reports
- [ ] `urgencyScore`
- [ ] `urgencyBreakdown.base`
- [ ] `urgencyBreakdown.weatherMult`
- [ ] `urgencyBreakdown.vulnerabilityMult`
- [ ] `urgencyBreakdown.timeMult`
- [ ] `urgencyBreakdown.finalScore`
- [ ] `urgencyBreakdown.weatherReason`
- [ ] `urgencyBreakdown.vulnerabilityReason`
- [ ] `urgencyBreakdown.timeReason`

### 9.6 Risks / watchouts
- Current repo stores string timestamps.
- Current `GeminiExtraction` model does not include urgency score fields.
- Dashboard DTO may strip needed explainability fields.
- Open-Meteo timeout handling must fail gracefully.
- GeoJSON polygons must be valid enough for point-in-polygon checks.

### 9.7 Validation checklist for Feature 2
- [ ] Submit a report and confirm `urgencyScore` is written.
- [ ] Confirm `urgencyBreakdown` reasons are human-readable.
- [ ] Confirm weather API failure still produces valid reports.
- [ ] Confirm vulnerability lookup works for at least a Delhi demo coordinate.
- [ ] Confirm urgency tooltip copy matches stored breakdown.
- [ ] Confirm build passes after adding JSON import and axios.

---

## 10. Feature 1 - DedupEngine

### 10.1 Goal
Detect nearby recent duplicate reports after classification and before dispatch, then either merge them or mark them as possible duplicates.

### 10.2 Files involved

Create:
- `backend/src/services/dedupEngine.ts`

Modify:
- `backend/src/routes/intake.ts`
- `src/pages/pulse-map/CommunityPulseMap.tsx`
- `backend/src/scripts/seedData.ts`

### 10.3 Atomic backend checklist

#### A. Service creation
- [ ] Create `DedupResult` interface.
- [ ] Import Firestore utilities.
- [ ] Import Gemini client.
- [ ] Implement haversine helper.
- [ ] Implement cosine similarity helper.
- [ ] Implement embedding fetch helper using `text-embedding-004`.
- [ ] Implement `runDedupCheck(...)` scaffold.
- [ ] Build default fail-open result.
- [ ] Store embedding vector on the new report document.
- [ ] Query open reports in the same category within the time window.
- [ ] Exclude the current report id.
- [ ] Filter candidates by geofence.
- [ ] Skip candidates without valid embeddings.
- [ ] Find highest-similarity candidate.
- [ ] Handle no candidate / below-threshold path.
- [ ] Compute merged report count.
- [ ] Compute systemic flag.
- [ ] Implement auto-merge path.
- [ ] Merge `merged_from` ids.
- [ ] Average coordinates.
- [ ] Escalate urgency to `critical` when systemic threshold is reached.
- [ ] Mark duplicate report as `cancelled` and `merged_into` the primary report.
- [ ] Implement possible-duplicate path.
- [ ] Keep errors fail-open.

#### B. Timestamp adaptation decision
- [ ] Decide whether the query should use Firestore `Timestamp` or ISO strings to match existing data.
- [ ] If using mixed data handling, normalize carefully without migrations.

#### C. Intake integration
- [ ] Import `runDedupCheck` in `backend/src/routes/intake.ts`.
- [ ] Insert dedup check after classification and after the new report has been saved.
- [ ] Ensure dedup runs before auto-dispatch trigger.
- [ ] If duplicate is merged, return `action: 'merged'` response and stop dispatch.
- [ ] If not duplicate, continue existing dispatch flow.
- [ ] Ensure response shape remains additive and safe for existing clients.

#### D. Default field initialization for new reports
- [ ] Ensure newly created reports default to `report_count: 1`.
- [ ] Ensure newly created reports default to `merged_from: []`.
- [ ] Ensure newly created reports default to `systemic: false`.
- [ ] Ensure newly created reports default to `possible_duplicate: false` only if that is safe to persist.

### 10.4 Atomic pulse-map checklist
- [ ] Preserve current pulse-map composition.
- [ ] Add badge rendering for `report_count >= 2`.
- [ ] Add pulsing ring for `systemic === true`.
- [ ] Ensure badge styling matches existing pin language.
- [ ] Ensure systemic animation feels subtle and operational, not flashy.

### 10.5 Firestore/index checklist
- [ ] Document composite index for `needReports(category, status, createdAt)`.
- [ ] Decide whether current timestamp type affects this index/query feasibility.

### 10.6 Risks / watchouts
- Embedding generation increases latency on intake.
- Existing reports may not have embeddings yet.
- Current repo uses string timestamps.
- Merge logic must not break active dispatch state on the surviving report.

### 10.7 Validation checklist for Feature 1
- [ ] Submit near-identical nearby report and confirm merge response.
- [ ] Submit somewhat similar nearby report and confirm possible-duplicate flags.
- [ ] Submit unrelated or far-away report and confirm no merge.
- [ ] Confirm duplicate path does not auto-dispatch.
- [ ] Confirm surviving report count increments and `systemic` flips at threshold.

---

## 11. Feature 3 - Inventory Engine

### 11.1 Goal
Let volunteers log supplies, expose inventory routes, incorporate supply score into matching, and add an Inventory tab to the volunteer app.

### 11.2 Files involved

Create:
- `backend/src/services/inventoryEngine.ts`
- `backend/src/routes/inventory.ts`
- `src/pages/volunteer-app/InventoryTab.tsx`

Modify:
- `backend/src/services/matchingEngine.ts`
- `backend/src/index.ts`
- `src/pages/volunteer-app/VolunteerExperience.tsx`
- `backend/src/scripts/seedData.ts`

### 11.3 Atomic backend checklist

#### A. Data model + collection strategy
- [ ] Reconcile existing top-level `resources` usage with spec-mandated `resources/{volunteerId}/items`.
- [ ] Decide exact root-document shape for volunteer inventory roots.
- [ ] Ensure existing `dashboardIntelligence.ts` and `crisisMode.ts` queries are not silently polluted.
- [ ] If this cannot be done safely without unlisted file edits, stop and escalate before execution.

#### B. Build `inventoryEngine.ts`
- [ ] Create `InventoryItem` interface.
- [ ] Create `SupplyScoreResult` interface.
- [ ] Add `CATEGORY_ITEM_MAP`.
- [ ] Implement `upsertInventoryItem(...)`.
- [ ] Slugify `itemName` for deterministic doc ids.
- [ ] Implement `getVolunteerInventory(...)`.
- [ ] Implement `decrementInventory(...)`.
- [ ] Implement `computeSupplyScore(...)`.
- [ ] Match on both explicit categories and keyword heuristics.
- [ ] Return useful `matchedItems` strings.
- [ ] Implement `checkInventoryAlerts(...)`.
- [ ] Add low-stock thresholds.
- [ ] Add expiry checks within 72 hours.
- [ ] Write notifications for low stock.
- [ ] Write notifications for upcoming expiry.

#### C. Build `routes/inventory.ts`
- [ ] Create router.
- [ ] Import inventory service functions.
- [ ] Import existing auth middleware.
- [ ] Add `GET /inventory/categories`.
- [ ] Add `GET /inventory/:volunteerId`.
- [ ] Add `POST /inventory/update`.
- [ ] Add `POST /inventory/decrement`.
- [ ] Keep response envelope as `{ success: true, ... }`.

#### D. Register route
- [ ] Import `inventoryRouter` into `backend/src/index.ts`.
- [ ] Mount `app.use('/api/inventory', inventoryRouter)`.

#### E. Modify matching engine
- [ ] Import `computeSupplyScore`.
- [ ] Compute supply result inside volunteer scoring loop.
- [ ] Add `supplyScore`, `supplyReason`, and `matchedItems` to ranked decision payload if schema allows.
- [ ] Adjust weight balance to include `0.15 * supplyScore`.
- [ ] Remove or reduce equity contribution per spec guidance.
- [ ] Update explanation text to mention relevant supplies when available.
- [ ] Keep file changes tightly additive.

### 11.4 Atomic frontend checklist

#### A. Create `InventoryTab.tsx`
- [ ] Use current volunteer-app shell language, not a new layout.
- [ ] Reuse `internal.css` classes and existing volunteer page patterns as much as possible.
- [ ] Add “My Current Supplies” section.
- [ ] Add category dropdown.
- [ ] Add item autocomplete driven by `CATEGORY_ITEM_MAP`.
- [ ] Add quantity input.
- [ ] Add unit selector.
- [ ] Add expiry date picker.
- [ ] Add submit/update button.
- [ ] Highlight low-stock items in amber.
- [ ] Highlight expired items in critical/red.
- [ ] Provide empty state copy.
- [ ] Provide success/error feedback.
- [ ] Use local fetch helpers if avoiding `src/services/api.ts` changes.

#### B. Modify `VolunteerExperience.tsx`
- [ ] Add `inventory` to tab type union.
- [ ] Add Inventory tab button to tab rail.
- [ ] Render `InventoryTab` inside main content.
- [ ] Keep existing page structure intact.
- [ ] Avoid visual drift from current mission workspace.

### 11.5 Risks / watchouts
- Existing `resources` top-level collection already drives other views.
- `DispatchDecision` schema currently lacks supply fields.
- Unlisted CSS module changes should be avoided.
- Frontend API helper file is not spec-listed.

### 11.6 Validation checklist for Feature 3
- [ ] Volunteer can load inventory.
- [ ] Volunteer can add/update an item.
- [ ] Supply score changes ranking output.
- [ ] Matching explanation mentions supplies.
- [ ] Low-stock notifications are written.
- [ ] Expiry notifications are written.

---

## 12. Feature 6A - Pulse Map Live Data

### 12.1 Goal
Replace hardcoded Delhi mock clusters with live Firestore needs and volunteer positions while preserving the current atlas-style UI.

### 12.2 Files involved

Modify:
- `src/pages/pulse-map/CommunityPulseMap.tsx`

Reuse:
- `backend/src/data/ward_vulnerability_index.json`
- existing frontend Firebase config in `src/config/firebase.ts`

### 12.3 Atomic checklist

#### A. Data wiring
- [ ] Remove hardcoded need-report arrays from the page logic.
- [ ] Keep any static visual-only constants only if still needed for rendering helpers.
- [ ] Import Firestore client helpers.
- [ ] Import `db` from existing Firebase config.
- [ ] Add live listener for active `needReports`.
- [ ] Add `status in ['pending','classified','dispatched','in_progress']` filter.
- [ ] Add `orderBy('urgencyScore', 'desc')`.
- [ ] Add `limit(200)`.
- [ ] Normalize each report into the view model expected by the current map UI.
- [ ] Add mixed-type timestamp coercion for age calculations.

#### B. Volunteer layer
- [ ] Add listener for free volunteers.
- [ ] Normalize volunteer location data.
- [ ] Track volunteer markers separately from need markers.
- [ ] Add `showVolunteerLayer` state.

#### C. Vulnerability overlay
- [ ] Import `ward_vulnerability_index.json`.
- [ ] Normalize GeoJSON feature properties for color lookup.
- [ ] Add `showVulnerabilityLayer` state.
- [ ] Render subtle choropleth overlay using Google Maps data layer or safe equivalent.
- [ ] Use green -> amber -> red scale.
- [ ] Keep fill opacity subtle.

#### D. Need-pin rendering updates
- [ ] Compute unresolved age in hours.
- [ ] Compute opacity decay.
- [ ] Compute pin scale from `urgencyScore`.
- [ ] Add merged-report badge for `report_count >= 2`.
- [ ] Add pulsing ring for `systemic`.
- [ ] Ensure marker rendering handles missing `urgencyScore` safely.
- [ ] Ensure marker rendering handles missing `location` safely.

#### E. Layer toggle UI
- [ ] Add floating top-right toggle panel.
- [ ] Include Active Needs label (always on).
- [ ] Include Volunteer Positions toggle.
- [ ] Include Predicted Needs placeholder only if implemented safely.
- [ ] Include Vulnerability Overlay toggle.
- [ ] Include Weather Risk placeholder/toggle only if data is available.
- [ ] Match existing pill-chip styling from the page.

#### F. Detail column adaptation
- [ ] Ensure selected detail card still works with live data.
- [ ] Show urgency, district, reporter counts, and systemic state when available.
- [ ] Preserve existing narrative/detail rhythm.

### 12.4 Likely index/manual requirements
- [ ] Verify whether `status in + orderBy urgencyScore` requires a new Firestore composite index.
- [ ] Document the exact console link if Firestore returns one during testing.

### 12.5 Risks / watchouts
- Frontend Firebase reads depend on Firestore rules allowing access.
- Current page uses manual Google Maps script loading, not the React wrapper.
- Marker badge/ring styling should avoid requiring edits to unlisted CSS modules if possible.
- Timestamps may be strings or Firestore `Timestamp` objects.

### 12.6 Validation checklist for Feature 6A
- [ ] Map loads without mock clusters.
- [ ] Need pins update live.
- [ ] Volunteer layer toggle works.
- [ ] Vulnerability layer toggle works.
- [ ] Merged/systemic indicators render correctly.
- [ ] Selected detail card updates when clicking live markers.

---

## 13. Feature 4 - VerifierAgent

### 13.1 Goal
Require completion evidence, run AI verification, route by confidence tier, and involve the original reporter for human-loop confirmation.

### 13.2 Files involved

Create:
- `backend/src/services/verifierAgent.ts`

Modify:
- `backend/src/routes/dispatch.ts`
- `src/pages/volunteer-app/VolunteerExperience.tsx`
- `src/pages/ngo-dashboard/NgoDashboard.tsx`
- `backend/src/scripts/seedData.ts`

Potential repo-reality reuse:
- `backend/src/services/visionAnalysis.ts`
- current volunteer upload flow and upload endpoints

### 13.3 Atomic backend checklist

#### A. Build `verifierAgent.ts`
- [ ] Create `VerificationResult` interface.
- [ ] Add category-to-expected-photo prompt map.
- [ ] Implement `verifyTaskCompletion(...)`.
- [ ] Fetch image bytes from `photoUrl` if needed to reuse current vision service.
- [ ] Reuse existing vision service instead of recreating Gemini vision logic.
- [ ] Map current vision result into verification confidence/reason.
- [ ] Handle service failure by routing to human review.
- [ ] Implement auto-resolved branch.
- [ ] Update `dispatchTasks` fields for verification metadata.
- [ ] Update `needReports` status to resolved for high-confidence success.
- [ ] Send reporter confirmation request even for auto-resolved.
- [ ] Implement needs-review branch.
- [ ] Set `pendingCoordinatorReview: true`.
- [ ] Notify coordinator/NGO.
- [ ] Implement rejected branch.
- [ ] Notify volunteer to re-upload.
- [ ] Add rejection metadata to task.
- [ ] Implement helper to create `verificationRequests` docs.
- [ ] Implement helper to notify reporter.
- [ ] Implement `handleReporterResponse(...)`.
- [ ] On reporter confirmation, mark task/report confirmed/resolved.
- [ ] On denial, reopen need and retrigger dispatch using existing auto-dispatch export.

#### B. Extend `dispatch.ts`
- [ ] Add `POST /dispatch/complete`.
- [ ] Validate required body payload.
- [ ] Call `verifyTaskCompletion(...)`.
- [ ] Return `{ tier, confidence, reason }`.
- [ ] Add `POST /dispatch/reporter-confirm`.
- [ ] Validate `verificationRequestId` and `confirmed`.
- [ ] Call `handleReporterResponse(...)`.
- [ ] Add `GET /dispatch/pending-review`.
- [ ] Filter dispatch tasks where `pendingCoordinatorReview === true`.
- [ ] Support optional NGO filtering.

#### C. Coordinator review action gap
- [ ] Note that spec requests one-tap approve/reject from coordinator, but does not define approve/reject backend endpoints.
- [ ] Decide whether this can be done through existing route additions or requires an extra dispatch route.
- [ ] Do not implement until approved if it requires an extra unlisted route contract.

### 13.4 Atomic frontend checklist

#### A. Volunteer completion UX in `VolunteerExperience.tsx`
- [ ] Add photo upload state per selected task.
- [ ] Disable completion action until photo exists.
- [ ] Keep voice debrief support if already useful.
- [ ] Route completion request to the new dispatch endpoint without touching unlisted API helpers if possible.
- [ ] Show “AI is verifying your completion...” loading state.
- [ ] Show green/jade result for `auto_resolved`.
- [ ] Show amber result for `needs_review`.
- [ ] Show red result with re-upload prompt for `rejected`.
- [ ] Make copy concise and operational.

#### B. NGO dashboard queue in `NgoDashboard.tsx`
- [ ] Add “Pending Verification Review” panel/section.
- [ ] Render tasks needing review.
- [ ] Display photo thumbnail or link if available.
- [ ] Display AI reason and confidence.
- [ ] Add approve/reject UI if backend support exists.
- [ ] Keep new panel visually consistent with current multi-panel dashboard.

### 13.5 New collection / fields checklist
- [ ] Create `verificationRequests` collection usage.
- [ ] Add task verification fields to `dispatchTasks` writes.
- [ ] Add `reporterConfirmed` fields when relevant.

### 13.6 Risks / watchouts
- Existing completion route lives under volunteer-app, not dispatch.
- Vision service signature differs from the spec.
- Current app may not already associate `reporterId` everywhere in task payloads.
- Coordinator approve/reject backend contract is under-specified in the spec.

### 13.7 Validation checklist for Feature 4
- [ ] Completion without photo is blocked.
- [ ] High-confidence photo auto-resolves.
- [ ] Medium-confidence photo lands in pending review.
- [ ] Low-confidence photo is rejected and prompts re-upload.
- [ ] Reporter confirmation writes request and notification.
- [ ] Reporter denial reopens the need and redispatches.

---

## 14. Feature 5 - Gemini Live Voice Dispatch

### 14.1 Goal
Add a persistent voice-command surface to the NGO dashboard that can call dispatch tools and reflect changes live.

### 14.2 Files involved

Create:
- `backend/src/services/geminiLiveService.ts`
- `src/pages/ngo-dashboard/VoiceCommandButton.tsx`

Modify:
- `backend/src/routes/gemini.ts`
- `backend/src/index.ts` (only if proxy WebSocket path is implemented)
- `src/pages/ngo-dashboard/NgoDashboard.tsx`

### 14.3 Primary implementation strategy

Preferred plan for reliability and minimal risk:
- Use the spec's recommended simpler REST fallback.
- Frontend handles session UX.
- When the model returns a function call, frontend POSTs to `/api/gemini/live-tool-call`.
- Backend returns result strings from `executeLiveTool(...)`.
- Text fallback is acceptable if native audio preview is not practical.

### 14.4 Atomic backend checklist

#### A. Dependency decisions
- [ ] Confirm whether frontend package needs `@google/generative-ai` added.
- [ ] Confirm whether backend `ws` is truly needed.
- [ ] If proxy path is not required, avoid `ws` package churn.

#### B. Build `geminiLiveService.ts`
- [ ] Add `LIVE_FUNCTION_DECLARATIONS` exactly as required.
- [ ] Implement `assign_volunteer` tool.
- [ ] Implement `get_needs_summary` tool.
- [ ] Implement `escalate_need` tool.
- [ ] Implement `mark_resolved` tool.
- [ ] Implement `get_volunteer_list` tool.
- [ ] Keep tool responses conversational but concise.
- [ ] Keep all writes additive and within existing collections.

#### C. Modify `gemini.ts`
- [ ] Import live service helpers.
- [ ] Add `POST /api/gemini/live-tool-call`.
- [ ] Validate `toolName` and `args`.
- [ ] Return `{ success: true, result }`.
- [ ] Add `GET /api/gemini/live-functions`.
- [ ] Return function declarations.

#### D. Optional proxy path
- [ ] Decide if `handleLiveSession(ws)` should be added as a real backend proxy or left documented for later.
- [ ] Only add `ws` server setup in `backend/src/index.ts` if the proxy path is actually implemented.

### 14.5 Atomic frontend checklist

#### A. Create `VoiceCommandButton.tsx`
- [ ] Floating circular mic button in bottom-right.
- [ ] Use existing warm internal surface language.
- [ ] Add `sessionActive` state.
- [ ] Add `isListening` state.
- [ ] Add `transcript` state.
- [ ] Add `response` state.
- [ ] Add `isProcessing` state.
- [ ] Add transcript bubble above button.
- [ ] Display last command.
- [ ] Display last system/AI response.
- [ ] Add session start/stop behavior.
- [ ] Add text fallback mode if native audio session is unavailable.
- [ ] Fetch function declarations from backend.
- [ ] Execute tool calls via REST endpoint.
- [ ] Feed tool-call result back into the live session when possible.
- [ ] Ensure UX still works if only text mode is possible.

#### B. Mount into NGO dashboard
- [ ] Import `VoiceCommandButton` into `NgoDashboard.tsx`.
- [ ] Position it without disrupting existing panel layout.
- [ ] Ensure it does not collide with mobile layout.

### 14.6 Risks / watchouts
- Root frontend package currently lacks `@google/generative-ai`.
- Backend currently has no websocket server; `index.ts` uses `app.listen(...)` directly.
- Audio/live model availability may vary by environment.
- Demo reliability may be better with a text-first fallback.

### 14.7 Validation checklist for Feature 5
- [ ] Function declarations load from backend.
- [ ] Tool-call endpoint returns valid result strings.
- [ ] Dashboard button can invoke at least one real tool successfully.
- [ ] UI shows transcript/result feedback.
- [ ] Text fallback works if live audio session does not.

---

## 15. Feature 6B - Public KPI Dashboard

### 15.1 Goal
Create a public live impact dashboard using Firestore listeners and live computed KPIs.

### 15.2 Files involved

Create:
- `src/pages/pulse-map/PublicKPIDashboard.tsx`

Modify:
- `src/App.tsx`

### 15.3 Atomic checklist

#### A. Page scaffolding
- [ ] Create public page component.
- [ ] Do not wrap it in the internal AppShell.
- [ ] Use warm-linen public surface language consistent with SevaSetu branding.
- [ ] Build mobile-first responsive structure.

#### B. Live data listeners
- [ ] Listen to `needReports`.
- [ ] Listen to `dispatchTasks`.
- [ ] Normalize mixed string/Timestamp date values.
- [ ] Handle missing verification fields gracefully.

#### C. Metric calculations
- [ ] Compute resource utilization rate.
- [ ] Compute demand coverage rate.
- [ ] Compute average response time by category.
- [ ] Compute allocation accuracy rate.
- [ ] Compute overflow rate.
- [ ] Compute unmet-demand map input set.
- [ ] Ensure calculations degrade to `N/A` where required.

#### D. Visualization
- [ ] Use large metric cards/tiles.
- [ ] Use simple CSS bars for category response times.
- [ ] Use a small embedded Google Map for unmet demand.
- [ ] Add green live indicator.
- [ ] Add “Last updated” timer.
- [ ] Add Share button using clipboard API.
- [ ] Add Download as PDF button using `window.print()`.
- [ ] Add print-friendly CSS inside the component if needed.

#### E. Route registration
- [ ] Add `/impact/:wardSlug` public route in `src/App.tsx`.
- [ ] Add `/impact/live` public route in `src/App.tsx`.
- [ ] Ensure routes are top-level public routes, not inside the internal layout.

### 15.4 Risks / watchouts
- Public Firestore reads depend on security rules.
- Some KPI formulas depend on verification fields from Feature 4.
- Existing route structure has only marketing and internal shells; public KPI route needs careful placement.
- Root package does not have `recharts`, so use CSS bars.

### 15.5 Validation checklist for Feature 6B
- [ ] Public route loads without the sidebar shell.
- [ ] Metrics render on desktop and mobile.
- [ ] Live indicator updates.
- [ ] Share button copies the URL.
- [ ] Print button works.
- [ ] Embedded map renders unmet-demand points.

---

## 16. Seed Data Update Plan

Spec explicitly requires `backend/src/scripts/seedData.ts` changes. This file is currently schema-drifted and must be corrected during execution.

### 16.1 Current issues discovered
- It uses category keys like `food-nutrition`, `water-sanitation`, `women-child` instead of underscore enums.
- It writes fields like `title`, `peopleAffected`, `photos`, and `intakeSource`, which do not match the active report model.
- It does not currently seed urgency scores, breakdowns, duplicates, inventory items, or verified tasks.

### 16.2 Atomic seed update checklist
- [ ] Normalize category keys to underscore form.
- [ ] Replace `peopleAffected` with `estimatedPeopleAffected`.
- [ ] Replace `photos` with `photoUrls`.
- [ ] Replace `intakeSource` with `source`.
- [ ] Keep timestamps consistent with the current repo convention.
- [ ] Add `report_count: 1` to new seeded reports.
- [ ] Populate `urgencyScore` using `urgencyEnumToBase()` at minimum.
- [ ] Add realistic `urgencyBreakdown` objects.
- [ ] Seed at least 3 near-duplicate reports within 500m and same category.
- [ ] Seed at least 2 volunteers with inventory items.
- [ ] Seed at least 5 completed tasks with `verificationConfidence > 0.75` and `reporterConfirmed: true`.
- [ ] Ensure seeded reports cover the Delhi demo area used by pulse-map and vulnerability data.

---

## 17. Manual Setup / Index / Dependency Checklist

### 17.1 Packages likely required during execution
- [ ] Backend: `axios`
- [ ] Backend: `ws` and `@types/ws` only if websocket proxy path is actually implemented
- [ ] Frontend/root: `@google/generative-ai` only if direct frontend Live SDK is used

### 17.2 Firestore indexes likely needed
- [ ] `needReports`: `category ASC`, `status ASC`, `createdAt ASC` for DedupEngine
- [ ] `needReports`: likely `status ASC`, `urgencyScore DESC` for live pulse map query if Firestore demands it
- [ ] Re-verify existing known `teamChallenges` index remains a separate manual requirement outside this spec

### 17.3 Manual data artifact
- [ ] Build `backend/src/data/ward_vulnerability_index.json`

---

## 18. Build / Test / Smoke Validation Matrix

### 18.1 Backend build validation
- [ ] `npm run build --prefix backend`

### 18.2 Frontend build validation
- [ ] `npm run build`

### 18.3 Functional smoke tests after each feature

#### After Feature 2
- [ ] New intake report includes urgency score and breakdown.

#### After Feature 1
- [ ] Duplicate report merges correctly.

#### After Feature 3
- [ ] Inventory routes return and update volunteer supplies.

#### After Feature 6A
- [ ] Pulse map listens to live Firestore data.

#### After Feature 4
- [ ] Completion-photo verification routes behave correctly.

#### After Feature 5
- [ ] Live-tool call endpoint changes Firestore and UI reflects it.

#### After Feature 6B
- [ ] Public KPI page calculates all available metrics and renders on mobile.

---

## 19. Execution Log Template

When implementation begins, update this section feature by feature.

### Step 1 - Feature 2
- Status:
- Files touched:
- Build status:
- Smoke result:
- Deviations from plan:

### Step 2 - Feature 1
- Status:
- Files touched:
- Build status:
- Smoke result:
- Deviations from plan:

### Step 3 - Feature 3
- Status:
- Files touched:
- Build status:
- Smoke result:
- Deviations from plan:

### Step 4 - Feature 6A
- Status:
- Files touched:
- Build status:
- Smoke result:
- Deviations from plan:

### Step 5 - Feature 4
- Status:
- Files touched:
- Build status:
- Smoke result:
- Deviations from plan:

### Step 6 - Feature 5
- Status:
- Files touched:
- Build status:
- Smoke result:
- Deviations from plan:

### Step 7 - Feature 6B
- Status:
- Files touched:
- Build status:
- Smoke result:
- Deviations from plan:

---

## 20. Final Pre-Execution Approval Summary

This guide is ready for review.

Most important approval-sensitive items before coding starts:
- F2 requires a practical persistence change in `backend/src/routes/intake.ts` because `classification.ts` does not save documents.
- F2 tooltip may require backend dashboard DTO support beyond the spec's named files.
- F3 inventory path may pollute existing top-level `resources` queries unless handled carefully.
- F4 coordinator approve/reject action is under-specified by the spec.
- F5 direct frontend Live SDK likely needs a root dependency addition unless we stay REST/text-fallback only.
- Timestamp handling must be normalized because the repo uses ISO strings heavily while the spec assumes Firestore `Timestamp` objects.

If these implementation realities are accepted, this guide can be used as the step-by-step execution checklist.

### User review decisions captured after plan approval
- F3: explicitly verify current `resources` usage before implementing `resources/{volunteerId}/items`; if top-level `resources` docs already have a different schema, preserve them and avoid namespace collision.
- F4: coordinator review semantics are now fixed for execution:
  - approve -> set `dispatchTask.status = 'completed'`, set `needReport.status = 'resolved'`, send reporter confirmation request
  - reject -> set `verificationRejected = true`, notify volunteer to re-upload, keep task `in_progress`
- F5: use text-mode Gemini Live fallback for hackathon reliability; keep the mic/button UX, but do not require true native-audio transport for the first pass.
