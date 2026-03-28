# SevaSetu — Feature Addition Implementation Spec
## AI Agent Execution Document | Version 1.0
### Read this entire document before writing a single line of code.

---

## CONTEXT & RULES

You are adding 6 new features to an **existing, partially live** React + Express/TypeScript + Firebase application called SevaSetu. The codebase already has a working intake pipeline, classification service, matching engine, dispatch flow, and all major frontend pages.

**Your job is ADDITIVE only.** Do not refactor existing working code unless a specific instruction below says to modify a named file. Do not rename files. Do not change existing Firestore collection names. Do not change existing API route paths unless told to.

**Stack:**
- Frontend: React 18 + TypeScript + Vite + React Router + Zustand + Firebase Web SDK + `@react-google-maps/api`
- Backend: Express + TypeScript + Node.js
- AI: `@google/generative-ai` (direct Gemini API — no ADK, no Agent Builder)
- Database: Firebase Firestore + Firebase Realtime Database
- Storage: Firebase Storage (with local disk fallback)
- Notifications: Firebase Cloud Messaging + WhatsApp simulation

**Existing backend services to be aware of (DO NOT recreate):**
- `backend/src/services/geminiClient.ts` — Gemini API client, use this for all new Gemini calls
- `backend/src/services/classification.ts` — existing classifier, you will UPGRADE this
- `backend/src/services/matchingEngine.ts` — existing matcher, you will ADD one factor to this
- `backend/src/services/autoDispatch.ts` — existing dispatch pipeline, you will HOOK into this
- `backend/src/services/visionAnalysis.ts` — existing Gemini Vision wrapper, reuse for VerifierAgent

**Existing Firestore collections (DO NOT rename):**
`needReports`, `volunteers`, `dispatchTasks`, `users`, `volunteerProfiles`, `taskChats`, `volunteerSquads`, `resources`, `ngos`, `notifications`, `notificationFallbacks`, `agentDecisionLogs`, `companyEmployees`, `teamChallenges`, `crisisStates`, `postCrisisReports`, `resourceRequests`, `emergencyAlerts`

---

## FEATURE 1 — DedupEngine

### What it does
After every new `needReport` is created and classified, before any dispatch is triggered, check if this report is a duplicate of an existing open report nearby. If it is, merge them instead of creating a separate dispatch task.

### New file: `backend/src/services/dedupEngine.ts`

```typescript
// Full implementation spec below — write exactly this logic

import { getFirestore, GeoPoint, Timestamp } from 'firebase-admin/firestore';
import { getGeminiClient } from './geminiClient'; // use existing client

const db = getFirestore();

// ── Types ──────────────────────────────────────────────────────────────────

export interface DedupResult {
  isDuplicate: boolean;
  isPossibleDuplicate: boolean;
  mergedIntoReportId: string | null;
  reportCount: number;
  isSystemic: boolean;
  similarityScore: number;
}

// ── Constants ──────────────────────────────────────────────────────────────

const GEOFENCE_RADIUS_KM = 0.5;           // 500m
const TIME_WINDOW_HOURS = 3;
const AUTO_MERGE_THRESHOLD = 0.85;
const POSSIBLE_DUPLICATE_THRESHOLD = 0.65;
const SYSTEMIC_COUNT_THRESHOLD = 4;

// ── Haversine distance (km) ────────────────────────────────────────────────

function haversineKm(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Cosine similarity between two float arrays ─────────────────────────────

function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val ** 2, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val ** 2, 0));
  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
}

// ── Get Gemini embedding for a text string ─────────────────────────────────

async function getEmbedding(text: string): Promise<number[]> {
  const genai = getGeminiClient(); // existing client
  const model = genai.getGenerativeModel({ model: 'text-embedding-004' });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

// ── Main dedup function — call this after classification, before dispatch ───

export async function runDedupCheck(
  newReportId: string,
  newDescription: string,
  newCategory: string,
  newLat: number,
  newLon: number,
): Promise<DedupResult> {

  const defaultResult: DedupResult = {
    isDuplicate: false,
    isPossibleDuplicate: false,
    mergedIntoReportId: null,
    reportCount: 1,
    isSystemic: false,
    similarityScore: 0,
  };

  try {
    // 1. Get embedding for the new report description
    const newEmbedding = await getEmbedding(newDescription);

    // 2. Store embedding on the new report document
    await db.collection('needReports').doc(newReportId).update({
      embedding_vector: newEmbedding,
    });

    // 3. Query open reports in the same category within the last 3 hours
    const cutoffTime = Timestamp.fromMillis(
      Date.now() - TIME_WINDOW_HOURS * 60 * 60 * 1000
    );
    const snapshot = await db
      .collection('needReports')
      .where('category', '==', newCategory)
      .where('status', 'in', ['pending', 'classified', 'dispatched', 'in_progress'])
      .where('createdAt', '>=', cutoffTime)
      .get();

    // 4. Filter to geofence and exclude the new report itself
    const candidates = snapshot.docs.filter((doc) => {
      if (doc.id === newReportId) return false;
      const data = doc.data();
      const lat = data.location?.latitude;
      const lon = data.location?.longitude;
      if (!lat || !lon) return false;
      return haversineKm(newLat, newLon, lat, lon) <= GEOFENCE_RADIUS_KM;
    });

    if (candidates.length === 0) return defaultResult;

    // 5. Find the candidate with highest cosine similarity
    let bestScore = 0;
    let bestDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;

    for (const doc of candidates) {
      const data = doc.data();
      if (!data.embedding_vector || !Array.isArray(data.embedding_vector)) continue;
      const score = cosineSimilarity(newEmbedding, data.embedding_vector);
      if (score > bestScore) {
        bestScore = score;
        bestDoc = doc;
      }
    }

    if (!bestDoc || bestScore < POSSIBLE_DUPLICATE_THRESHOLD) return defaultResult;

    const existingData = bestDoc.data();
    const existingId = bestDoc.id;
    const newReportCount = (existingData.report_count ?? 1) + 1;
    const isSystemic = newReportCount >= SYSTEMIC_COUNT_THRESHOLD;

    // 6a. AUTO MERGE — score above 0.85
    if (bestScore >= AUTO_MERGE_THRESHOLD) {
      const mergedFromIds = [
        ...(existingData.merged_from ?? []),
        newReportId,
      ];

      // Average the coordinates
      const avgLat = (existingData.location.latitude + newLat) / 2;
      const avgLon = (existingData.location.longitude + newLon) / 2;

      // Keep higher urgency
      const urgencyOrder = ['critical', 'high', 'medium', 'low'];
      const existingUrgencyIdx = urgencyOrder.indexOf(existingData.urgency ?? 'low');
      // Note: urgencyScore (float) comparison handled separately if Feature 2 is built first
      
      await db.collection('needReports').doc(existingId).update({
        report_count: newReportCount,
        merged_from: mergedFromIds,
        systemic: isSystemic,
        'location.latitude': avgLat,
        'location.longitude': avgLon,
        ...(isSystemic && { urgency: 'critical' }),
        updatedAt: Timestamp.now(),
      });

      // Mark the new report as merged (do not dispatch it)
      await db.collection('needReports').doc(newReportId).update({
        status: 'cancelled',
        merged_into: existingId,
        updatedAt: Timestamp.now(),
      });

      return {
        isDuplicate: true,
        isPossibleDuplicate: false,
        mergedIntoReportId: existingId,
        reportCount: newReportCount,
        isSystemic,
        similarityScore: bestScore,
      };
    }

    // 6b. POSSIBLE DUPLICATE — score 0.65–0.85
    await db.collection('needReports').doc(newReportId).update({
      possible_duplicate: true,
      possible_duplicate_of: existingId,
      possible_duplicate_score: bestScore,
      updatedAt: Timestamp.now(),
    });

    return {
      isDuplicate: false,
      isPossibleDuplicate: true,
      mergedIntoReportId: null,
      reportCount: 1,
      isSystemic: false,
      similarityScore: bestScore,
    };

  } catch (err) {
    console.error('[DedupEngine] Error:', err);
    return defaultResult; // fail open — never block a report submission
  }
}
```

### Integration: modify `backend/src/routes/intake.ts`

Find the point in the intake route where classification is complete and `autoDispatch` would be triggered. Insert `runDedupCheck` between them:

```typescript
// ADD this import at top of intake.ts
import { runDedupCheck } from '../services/dedupEngine';

// ADD this block AFTER classification is done, BEFORE autoDispatch is called
// (find the existing dispatch trigger and insert this block above it)

const dedupResult = await runDedupCheck(
  reportId,
  classifiedReport.description,
  classifiedReport.category,
  classifiedReport.location.latitude,
  classifiedReport.location.longitude,
);

if (dedupResult.isDuplicate) {
  // Report was merged — do NOT dispatch a new task
  return res.status(200).json({
    success: true,
    action: 'merged',
    mergedInto: dedupResult.mergedIntoReportId,
    reportCount: dedupResult.reportCount,
    isSystemic: dedupResult.isSystemic,
  });
}

// Continue to autoDispatch only if not a duplicate
```

### New fields added to `needReports` documents

```
report_count: number          // default 1, incremented on merge
merged_from: string[]         // array of reportIds merged into this one
merged_into: string           // set on the cancelled duplicate report
possible_duplicate: boolean
possible_duplicate_of: string
possible_duplicate_score: number
systemic: boolean             // true when report_count >= 4
embedding_vector: number[]    // Gemini text-embedding-004 output (768 floats)
```

### New Firestore composite index required

In Firebase Console → Firestore → Indexes → add composite index:
- Collection: `needReports`
- Fields: `category ASC`, `status ASC`, `createdAt ASC`
- Query scope: Collection

### Frontend change: `src/pages/pulse-map/CommunityPulseMap.tsx`

When rendering need pins on the map, add a badge for merged reports:

```tsx
// When rendering a pin/marker, check report_count
// If report_count >= 2, render a small badge overlay on the pin:
// "×{report_count} reports"
// If systemic === true, render pin with a pulsing red ring animation
```

---

## FEATURE 2 — ClassifyAgent Upgrade (Equity-Weighted Urgency Scoring)

### What it does
Upgrade the existing classification service to compute a continuous float urgency score using 3 contextual multipliers: weather conditions, ward vulnerability index, and time of day. Store each factor separately for dashboard explainability.

### New file: `backend/src/services/urgencyMultipliers.ts`

```typescript
import axios from 'axios'; // already in package.json or add it

// ── Types ──────────────────────────────────────────────────────────────────

export interface UrgencyBreakdown {
  base: number;           // 1–10 from Gemini base classification
  weatherMult: number;
  vulnerabilityMult: number;
  timeMult: number;
  finalScore: number;     // base × weather × vulnerability × time
  weatherReason: string;
  vulnerabilityReason: string;
  timeReason: string;
}

// ── Vulnerability GeoJSON loader ───────────────────────────────────────────
// Download this file ONCE from data.gov.in (India Census ward-level data)
// and place at: backend/src/data/ward_vulnerability_index.json
// Schema: GeoJSON FeatureCollection where each Feature has properties:
//   { ward_id, ward_name, district, bpl_pct, elderly_pct, hospital_dist_km, school_dist_km }

import wardData from '../data/ward_vulnerability_index.json';

function computeVulnerabilityIndex(feature: any): number {
  const { bpl_pct, elderly_pct, hospital_dist_km, school_dist_km } = feature.properties;
  // Weighted composite: BPL(0.35) + elderly(0.25) + hospital_dist(0.25) + school_dist(0.15)
  const normalizedBpl = Math.min(bpl_pct / 100, 1);
  const normalizedElderly = Math.min(elderly_pct / 100, 1);
  const normalizedHospital = Math.min(hospital_dist_km / 20, 1); // 20km = max
  const normalizedSchool = Math.min(school_dist_km / 10, 1);     // 10km = max
  return (
    normalizedBpl * 0.35 +
    normalizedElderly * 0.25 +
    normalizedHospital * 0.25 +
    normalizedSchool * 0.15
  );
}

// Point-in-polygon check (ray casting)
function pointInPolygon(lat: number, lon: number, coordinates: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = coordinates.length - 1; i < coordinates.length; j = i++) {
    const xi = coordinates[i][0], yi = coordinates[i][1];
    const xj = coordinates[j][0], yj = coordinates[j][1];
    const intersect =
      yi > lat !== yj > lat &&
      lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function getVulnerabilityMultiplier(
  lat: number,
  lon: number
): { mult: number; reason: string } {
  for (const feature of (wardData as any).features) {
    const coords = feature.geometry.coordinates[0]; // outer ring
    if (pointInPolygon(lat, lon, coords)) {
      const score = computeVulnerabilityIndex(feature);
      const wardName = feature.properties.ward_name ?? 'this area';
      if (score > 0.7)
        return { mult: 1.5, reason: `High-vulnerability zone (${wardName}, index: ${score.toFixed(2)})` };
      if (score > 0.4)
        return { mult: 1.2, reason: `Medium-vulnerability zone (${wardName}, index: ${score.toFixed(2)})` };
      return { mult: 1.0, reason: `Standard zone (${wardName}, index: ${score.toFixed(2)})` };
    }
  }
  return { mult: 1.0, reason: 'Zone not found in index — no multiplier applied' };
}

// ── Weather multiplier via Open-Meteo (free, no API key) ──────────────────

export async function getWeatherMultiplier(
  lat: number,
  lon: number,
  category: string
): Promise<{ mult: number; reason: string }> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,precipitation,weathercode&timezone=auto`;
    const response = await axios.get(url, { timeout: 3000 });
    const current = response.data.current;
    const temp: number = current.temperature_2m;
    const precipitation: number = current.precipitation;
    const weatherCode: number = current.weathercode;

    // Flood conditions: weathercode 51-67 (rain/drizzle), 80-82 (showers), 95-99 (thunderstorm)
    const isFlooding = (weatherCode >= 51 && weatherCode <= 67) ||
                       (weatherCode >= 80 && weatherCode <= 82) ||
                       (weatherCode >= 95 && weatherCode <= 99) ||
                       precipitation > 10;

    const isHeatwave = temp > 40;

    if (isFlooding && ['shelter', 'water_sanitation'].includes(category)) {
      return { mult: 1.5, reason: `Active flooding/heavy rain (${precipitation}mm, code ${weatherCode})` };
    }
    if (isFlooding && ['food_nutrition', 'health'].includes(category)) {
      return { mult: 1.3, reason: `Flooding increases food/health risk` };
    }
    if (isHeatwave && ['food_nutrition', 'shelter', 'health'].includes(category)) {
      return { mult: 1.4, reason: `Heatwave conditions (${temp}°C)` };
    }
    return { mult: 1.0, reason: `Normal weather (${temp}°C)` };
  } catch {
    return { mult: 1.0, reason: 'Weather API unavailable — no multiplier applied' };
  }
}

// ── Time of day multiplier ─────────────────────────────────────────────────

export function getTimeMultiplier(
  category: string
): { mult: number; reason: string } {
  const hour = new Date().getHours(); // server time (IST if server is in IST)
  const isNight = hour >= 22 || hour < 6;

  if (isNight && ['health', 'shelter', 'emergency'].includes(category)) {
    return { mult: 1.3, reason: `Night-time severity (${hour}:00 hrs) — services unavailable` };
  }
  return { mult: 1.0, reason: `Daytime (${hour}:00 hrs)` };
}

// ── Base urgency mapping (enum → float) ────────────────────────────────────

export function urgencyEnumToBase(urgencyEnum: string): number {
  const map: Record<string, number> = {
    critical: 9,
    high: 7,
    medium: 5,
    low: 3,
  };
  return map[urgencyEnum] ?? 5;
}

// ── Master function — run all 3 tools and return breakdown ─────────────────

export async function computeFullUrgencyScore(
  baseUrgencyEnum: string,
  category: string,
  lat: number,
  lon: number
): Promise<UrgencyBreakdown> {
  const base = urgencyEnumToBase(baseUrgencyEnum);

  // Run all 3 in parallel
  const [weatherResult, vulnResult] = await Promise.all([
    getWeatherMultiplier(lat, lon, category),
    Promise.resolve(getVulnerabilityMultiplier(lat, lon)),
  ]);
  const timeResult = getTimeMultiplier(category);

  const finalScore = base * weatherResult.mult * vulnResult.mult * timeResult.mult;

  return {
    base,
    weatherMult: weatherResult.mult,
    vulnerabilityMult: vulnResult.mult,
    timeMult: timeResult.mult,
    finalScore: Math.min(parseFloat(finalScore.toFixed(2)), 99), // cap at 99
    weatherReason: weatherResult.reason,
    vulnerabilityReason: vulnResult.reason,
    timeReason: timeResult.reason,
  };
}
```

### Modify `backend/src/services/classification.ts`

After the existing Gemini classification returns a category + urgency enum, add this block:

```typescript
// ADD import at top
import { computeFullUrgencyScore } from './urgencyMultipliers';

// ADD after existing classification returns urgency enum,
// before saving to Firestore:

const urgencyBreakdown = await computeFullUrgencyScore(
  classified.urgency,   // existing urgency enum string
  classified.category,
  report.location.latitude,
  report.location.longitude,
);

// ADD these fields when writing/updating the needReport document:
// urgencyScore: urgencyBreakdown.finalScore,
// urgencyBreakdown: urgencyBreakdown,
```

### New fields added to `needReports` documents

```
urgencyScore: number          // float, e.g. 12.6 — used for sorting
urgencyBreakdown: {
  base: number,
  weatherMult: number,
  vulnerabilityMult: number,
  timeMult: number,
  finalScore: number,
  weatherReason: string,
  vulnerabilityReason: string,
  timeReason: string,
}
```

### New: Urgency Decay Cloud Function

Create `backend/src/scripts/urgencyDecay.ts` — run as a scheduled Cloud Function or cron job every 30 minutes:

```typescript
// Every 30 minutes, find all needReports with status in
// ['pending', 'classified', 'dispatched', 'in_progress']
// that have an urgencyScore set.
// For each: urgencyScore = urgencyScore * 1.05
//           urgencyDecayCount = (urgencyDecayCount ?? 0) + 1
// If urgencyDecayCount reaches 4 (= 2 hours unresolved):
//   - Set urgency enum to 'critical'
//   - Set urgencyDecayAlert: true
//   - Write to 'notifications' collection for the NGO coordinator
```

### Modify `backend/src/services/matchingEngine.ts`

The existing matching formula sorts volunteers. Add `urgencyScore` as the primary sort dimension for the candidate pool:

```typescript
// When fetching candidate need reports for matching,
// ORDER BY urgencyScore DESC instead of (or in addition to) createdAt.
// This ensures the most time-decayed, high-context-urgency needs get matched first.
```

### Frontend: Dashboard tooltip component

In `src/pages/ngo-dashboard/`, wherever need cards are rendered, add a tooltip that shows urgency breakdown when hovering a need's urgency badge:

```tsx
// Tooltip content (render when needReport.urgencyBreakdown exists):
// "Base: {base} × Weather: {weatherMult} ({weatherReason})
//  × Vulnerability: {vulnerabilityMult} ({vulnerabilityReason})
//  × Time: {timeMult} ({timeReason})
//  = Final Score: {finalScore}"
//
// Style: small info icon (ℹ) next to urgency badge, tooltip on hover
```

### New data file to create

Download ward vulnerability GeoJSON and place at:
`backend/src/data/ward_vulnerability_index.json`

Source: `https://data.gov.in` → search "ward boundary shapefile" → convert to GeoJSON. For demo purposes, create a simplified version with 20–30 Delhi wards with realistic BPL%, hospital distance, and school distance values. The file does not need to be exhaustive for demo — it needs to cover the demo's geographic area.

---

## FEATURE 3 — Inventory Engine

### What it does
Wire the existing `resources` Firestore collection to a new service and routes. Let volunteers log what physical supplies they have. Integrate a `supplyScore` into the existing matching engine.

### New file: `backend/src/services/inventoryEngine.ts`

```typescript
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const db = getFirestore();

// ── Types ──────────────────────────────────────────────────────────────────

export interface InventoryItem {
  itemId: string;
  volunteerId: string;
  itemName: string;
  quantity: number;
  unit: string;               // 'kg', 'litres', 'units', 'packets'
  categoriesRelevant: string[]; // matches needReport category enum values
  expiryDate: string | null;  // ISO date string or null
  updatedAt: FirebaseFirestore.Timestamp;
}

export interface SupplyScoreResult {
  score: number;        // 0.0–1.0
  matchedItems: string[];
  reason: string;
}

// ── Category → relevant item keywords mapping ──────────────────────────────
// Used for autocomplete on frontend and for score computation

export const CATEGORY_ITEM_MAP: Record<string, string[]> = {
  food_nutrition: ['rice', 'dal', 'atta', 'oil', 'salt', 'biscuits', 'dry ration', 'food packet', 'khichdi', 'poha', 'milk', 'baby food', 'ORS'],
  health: ['medicines', 'paracetamol', 'bandage', 'antiseptic', 'first aid kit', 'ORS', 'gloves', 'mask', 'sanitiser', 'blood pressure kit'],
  shelter: ['blanket', 'tarpaulin', 'tent', 'mat', 'sleeping bag', 'plastic sheet'],
  water_sanitation: ['water can', 'water purification tablet', 'ORS', 'soap', 'hand sanitiser', 'bucket'],
  education: ['notebook', 'pencil', 'pen', 'textbook', 'school bag', 'stationery'],
  environment: ['trash bag', 'gloves', 'broom', 'spade'],
  emergency: ['torch', 'battery', 'rope', 'first aid kit', 'whistle', 'emergency blanket'],
  women_child: ['sanitary pad', 'baby food', 'diapers', 'baby clothes', 'milk'],
};

// ── CRUD operations ────────────────────────────────────────────────────────

export async function upsertInventoryItem(
  volunteerId: string,
  item: Omit<InventoryItem, 'itemId' | 'volunteerId' | 'updatedAt'>
): Promise<string> {
  // Use itemName as doc ID (slugified) so updating the same item overwrites
  const itemId = item.itemName.toLowerCase().replace(/\s+/g, '_');
  const docRef = db
    .collection('resources')
    .doc(volunteerId)
    .collection('items')
    .doc(itemId);

  await docRef.set({
    itemId,
    volunteerId,
    ...item,
    updatedAt: Timestamp.now(),
  }, { merge: true });

  return itemId;
}

export async function getVolunteerInventory(
  volunteerId: string
): Promise<InventoryItem[]> {
  const snapshot = await db
    .collection('resources')
    .doc(volunteerId)
    .collection('items')
    .where('quantity', '>', 0)
    .get();
  return snapshot.docs.map(d => d.data() as InventoryItem);
}

export async function decrementInventory(
  volunteerId: string,
  itemId: string,
  amountUsed: number
): Promise<void> {
  const docRef = db
    .collection('resources')
    .doc(volunteerId)
    .collection('items')
    .doc(itemId);
  const doc = await docRef.get();
  if (!doc.exists) return;
  const current = doc.data()!.quantity as number;
  await docRef.update({
    quantity: Math.max(0, current - amountUsed),
    updatedAt: Timestamp.now(),
  });
}

// ── Supply score computation — called by matchingEngine ───────────────────

export async function computeSupplyScore(
  volunteerId: string,
  needCategory: string
): Promise<SupplyScoreResult> {
  try {
    const inventory = await getVolunteerInventory(volunteerId);
    if (inventory.length === 0) {
      return { score: 0, matchedItems: [], reason: 'No inventory logged' };
    }

    const relevantKeywords = CATEGORY_ITEM_MAP[needCategory] ?? [];
    const matchedItems: string[] = [];

    for (const item of inventory) {
      const isRelevant =
        item.categoriesRelevant.includes(needCategory) ||
        relevantKeywords.some(kw =>
          item.itemName.toLowerCase().includes(kw.toLowerCase())
        );
      if (isRelevant && item.quantity > 0) {
        matchedItems.push(`${item.itemName} (${item.quantity} ${item.unit})`);
      }
    }

    if (matchedItems.length === 0) {
      return { score: 0, matchedItems: [], reason: 'No matching supplies for this need category' };
    }

    // Score: 1.0 if 3+ matched items, 0.7 if 2, 0.4 if 1
    const score = matchedItems.length >= 3 ? 1.0 : matchedItems.length === 2 ? 0.7 : 0.4;
    return {
      score,
      matchedItems,
      reason: `Has ${matchedItems.join(', ')}`,
    };
  } catch (err) {
    console.error('[InventoryEngine] supplyScore error:', err);
    return { score: 0, matchedItems: [], reason: 'Inventory check failed' };
  }
}

// ── Low-stock and expiry alert checks — run via scheduled function ─────────

export async function checkInventoryAlerts(): Promise<void> {
  // Query all volunteers' inventory items
  // For each item where quantity < thresholds (rice < 2kg, medicines < 5 units, etc.)
  //   → write to 'notifications' collection for that volunteer
  // For each item where expiryDate is within 72 hours
  //   → write to 'notifications' collection for that volunteer
  // Thresholds:
  const LOW_STOCK_THRESHOLDS: Record<string, number> = {
    rice: 2, dal: 1, atta: 2, medicines: 5, bandage: 3,
    blanket: 1, 'water can': 2, ORS: 5,
  };
  // Implementation: iterate all resources/{volunteerId}/items documents
  // This is straightforward Firestore collection group query:
  const snapshot = await db.collectionGroup('items').get();
  for (const doc of snapshot.docs) {
    const item = doc.data() as InventoryItem;
    const threshold = LOW_STOCK_THRESHOLDS[item.itemName.toLowerCase()] ?? null;
    if (threshold && item.quantity <= threshold) {
      await db.collection('notifications').add({
        userId: item.volunteerId,
        type: 'low_stock_alert',
        message: `Your ${item.itemName} stock is low (${item.quantity} ${item.unit} remaining). Consider restocking before your next deployment.`,
        itemName: item.itemName,
        createdAt: Timestamp.now(),
        read: false,
      });
    }
    if (item.expiryDate) {
      const expiryMs = new Date(item.expiryDate).getTime();
      const in72h = Date.now() + 72 * 60 * 60 * 1000;
      if (expiryMs <= in72h && expiryMs > Date.now()) {
        await db.collection('notifications').add({
          userId: item.volunteerId,
          type: 'expiry_alert',
          message: `Your ${item.itemName} expires on ${item.expiryDate}. Please use or return to NGO depot.`,
          itemName: item.itemName,
          expiryDate: item.expiryDate,
          createdAt: Timestamp.now(),
          read: false,
        });
      }
    }
  }
}
```

### New file: `backend/src/routes/inventory.ts`

```typescript
import express from 'express';
import { upsertInventoryItem, getVolunteerInventory, decrementInventory, CATEGORY_ITEM_MAP } from '../services/inventoryEngine';
// Add auth middleware import (use existing middleware from backend/src/middleware/)

const router = express.Router();

// GET /inventory/categories — returns the category→items map for frontend autocomplete
router.get('/categories', (req, res) => {
  res.json({ success: true, data: CATEGORY_ITEM_MAP });
});

// GET /inventory/:volunteerId — get all inventory for a volunteer
router.get('/:volunteerId', authMiddleware, async (req, res) => {
  const items = await getVolunteerInventory(req.params.volunteerId);
  res.json({ success: true, data: items });
});

// POST /inventory/update — upsert an inventory item
router.post('/update', authMiddleware, async (req, res) => {
  const { volunteerId, itemName, quantity, unit, categoriesRelevant, expiryDate } = req.body;
  const itemId = await upsertInventoryItem(volunteerId, {
    itemName, quantity, unit, categoriesRelevant, expiryDate: expiryDate ?? null,
  });
  res.json({ success: true, itemId });
});

// POST /inventory/decrement — called after task completion
router.post('/decrement', authMiddleware, async (req, res) => {
  const { volunteerId, itemId, amountUsed } = req.body;
  await decrementInventory(volunteerId, itemId, amountUsed);
  res.json({ success: true });
});

export default router;
```

### Register new route in backend entry point

```typescript
// In backend/src/index.ts (or wherever routes are registered):
import inventoryRouter from './routes/inventory';
app.use('/api/inventory', inventoryRouter);
```

### Modify `backend/src/services/matchingEngine.ts`

Add `supplyScore` as an additional factor. Find the section where per-volunteer scores are computed and add:

```typescript
// ADD import
import { computeSupplyScore } from './inventoryEngine';

// INSIDE the volunteer scoring loop, add:
const supplyResult = await computeSupplyScore(volunteer.id, needCategory);
const supplyScore = supplyResult.score; // 0.0–1.0

// ADD to the score object stored in rankedDecisions:
// supplyScore: supplyScore,
// supplyReason: supplyResult.reason,
// matchedItems: supplyResult.matchedItems,

// MODIFY the final score computation to include supplyScore:
// Current formula likely has: proximity + skillFit + availability + reliability + equityBoost
// ADD: + (0.15 * supplyScore)
// And reduce one of the other weights by 0.15 to keep total = 1.0
// Suggested: reduce equityBoost weight from 0.05 to 0.00 and add supplyScore weight 0.15
// (equity is now handled by ClassifyAgent's vulnerability multiplier instead)

// UPDATE the reasoning text the agent generates for the coordinator to include:
// if supplyScore > 0: "Has relevant supplies: {matchedItems.join(', ')}"
```

### Frontend: `src/pages/volunteer-app/` — new Inventory tab

Create `src/pages/volunteer-app/InventoryTab.tsx`:

```tsx
// A simple form tab inside the volunteer app page.
// Sections:
// 1. "My Current Supplies" — list of existing inventory items with quantity badges
// 2. "Add / Update Item" form:
//    - Category dropdown (maps to CATEGORY_ITEM_MAP keys)
//    - Item name autocomplete (populated from CATEGORY_ITEM_MAP[selectedCategory])
//    - Quantity number input
//    - Unit selector (kg / litres / units / packets)
//    - Expiry date picker (optional)
//    - Submit button → POST /api/inventory/update
// 3. Low stock items highlighted in amber, expired items in red
// Use existing app styling conventions from other volunteer-app tabs
```

---

## FEATURE 4 — VerifierAgent

### What it does
Close the resolution loop. When a volunteer marks a task complete, require a photo. Run Gemini Vision on the photo to verify it matches the need category. Apply a three-tier confidence routing. Send the original reporter a human-in-loop confirmation request.

### New file: `backend/src/services/verifierAgent.ts`

```typescript
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { analyzeImageWithVision } from './visionAnalysis'; // existing service — reuse it

const db = getFirestore();

// ── Types ──────────────────────────────────────────────────────────────────

export interface VerificationResult {
  verified: boolean;
  confidence: number;   // 0.0–1.0
  reason: string;
  tier: 'auto_resolved' | 'needs_review' | 'rejected';
}

// ── Category → what a completion photo should show ─────────────────────────

const CATEGORY_VERIFICATION_PROMPTS: Record<string, string> = {
  food_nutrition: 'food items, food packets, people receiving food, cooked meals, or ration distribution',
  health: 'medical supplies, a person receiving medical attention, medicines being distributed, or a health camp',
  shelter: 'blankets, tarpaulins, tents, or people being provided shelter materials',
  water_sanitation: 'water cans, water distribution, clean water access, or sanitation work',
  education: 'notebooks, school supplies, a tutoring session, or educational materials being distributed',
  emergency: 'emergency response activity, rescue, first aid being administered',
  women_child: 'support materials for women or children, care activities, or relevant supplies',
  environment: 'cleaning activity, waste removal, or environmental work in progress',
};

// ── Main verification function ─────────────────────────────────────────────

export async function verifyTaskCompletion(
  taskId: string,
  needReportId: string,
  volunteerId: string,
  reporterId: string,
  needCategory: string,
  photoUrl: string,
): Promise<VerificationResult> {

  const expectedContent = CATEGORY_VERIFICATION_PROMPTS[needCategory] ??
    'evidence that a community need was addressed';

  // Build a verification prompt for Gemini Vision
  // Use the existing visionAnalysis service — pass photoUrl and a structured prompt
  const prompt = `You are verifying that a volunteer has completed a community service task.
The task category is: "${needCategory}".
A completed task photo should show: ${expectedContent}.
Analyze this photo and return a JSON object with exactly these fields:
{
  "verified": boolean (true if the photo shows evidence of task completion),
  "confidence": number between 0 and 1,
  "reason": "one sentence describing what you see in the photo and why it does or does not match the expected content"
}
Return only the JSON object. No other text.`;

  let geminiResult: { verified: boolean; confidence: number; reason: string };

  try {
    // visionAnalysis.ts already handles Gemini Vision API calls
    // Pass it the photoUrl and the structured prompt
    // Adapt the call signature to match whatever visionAnalysis.ts exports
    const rawResult = await analyzeImageWithVision(photoUrl, prompt);
    // Parse JSON from Gemini response
    const cleaned = rawResult.replace(/```json|```/g, '').trim();
    geminiResult = JSON.parse(cleaned);
  } catch (err) {
    console.error('[VerifierAgent] Vision API error:', err);
    // On failure: route to human review
    geminiResult = { verified: false, confidence: 0.5, reason: 'Vision analysis failed — routed to coordinator review' };
  }

  // ── Three-tier routing ─────────────────────────────────────────────────

  let tier: VerificationResult['tier'];

  if (geminiResult.confidence >= 0.75) {
    tier = 'auto_resolved';
    // Resolve the task and need report automatically
    await Promise.all([
      db.collection('dispatchTasks').doc(taskId).update({
        status: 'completed',
        verificationPhoto: photoUrl,
        verificationConfidence: geminiResult.confidence,
        verificationReason: geminiResult.reason,
        verifiedAt: Timestamp.now(),
        pendingCoordinatorReview: false,
      }),
      db.collection('needReports').doc(needReportId).update({
        status: 'resolved',
        resolvedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }),
    ]);
    // Still send reporter confirmation (human-in-loop)
    await sendReporterConfirmationRequest(needReportId, reporterId, taskId);

  } else if (geminiResult.confidence >= 0.40) {
    tier = 'needs_review';
    // Flag for coordinator — do not resolve yet
    await db.collection('dispatchTasks').doc(taskId).update({
      verificationPhoto: photoUrl,
      verificationConfidence: geminiResult.confidence,
      verificationReason: geminiResult.reason,
      pendingCoordinatorReview: true,
      updatedAt: Timestamp.now(),
    });
    // Write to notifications for coordinator
    const task = await db.collection('dispatchTasks').doc(taskId).get();
    const ngoId = task.data()?.ngoId;
    if (ngoId) {
      await db.collection('notifications').add({
        ngoId,
        type: 'verification_review_needed',
        taskId,
        needReportId,
        message: `Verification photo needs review (confidence: ${(geminiResult.confidence * 100).toFixed(0)}%). AI says: "${geminiResult.reason}"`,
        photoUrl,
        createdAt: Timestamp.now(),
        read: false,
      });
    }

  } else {
    tier = 'rejected';
    // Notify volunteer to re-upload
    await db.collection('notifications').add({
      userId: volunteerId,
      type: 'verification_rejected',
      taskId,
      message: `Your completion photo doesn't clearly show the task being addressed. Please re-upload a photo showing: ${expectedContent}.`,
      createdAt: Timestamp.now(),
      read: false,
    });
    await db.collection('dispatchTasks').doc(taskId).update({
      verificationRejected: true,
      verificationRejectionReason: geminiResult.reason,
      updatedAt: Timestamp.now(),
    });
  }

  return {
    verified: geminiResult.verified,
    confidence: geminiResult.confidence,
    reason: geminiResult.reason,
    tier,
  };
}

// ── Send reporter a confirmation request (human-in-loop) ──────────────────

async function sendReporterConfirmationRequest(
  needReportId: string,
  reporterId: string,
  taskId: string,
): Promise<void> {
  // Write a verificationRequests document
  await db.collection('verificationRequests').add({
    needReportId,
    reporterId,
    taskId,
    status: 'pending',         // 'pending' | 'confirmed' | 'denied' | 'expired'
    createdAt: Timestamp.now(),
    expiresAt: Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000), // 24h expiry
  });
  // Write notification for reporter
  await db.collection('notifications').add({
    userId: reporterId,
    type: 'reporter_confirmation_request',
    needReportId,
    taskId,
    message: 'A volunteer has addressed your reported need. Was it resolved? Tap to confirm.',
    createdAt: Timestamp.now(),
    read: false,
  });
}

// ── Handle reporter response (called from a new API route) ────────────────

export async function handleReporterResponse(
  verificationRequestId: string,
  confirmed: boolean,
): Promise<void> {
  const reqDoc = await db.collection('verificationRequests').doc(verificationRequestId).get();
  if (!reqDoc.exists) return;
  const { needReportId, taskId } = reqDoc.data()!;

  if (confirmed) {
    await Promise.all([
      db.collection('verificationRequests').doc(verificationRequestId).update({ status: 'confirmed' }),
      db.collection('dispatchTasks').doc(taskId).update({ reporterConfirmed: true }),
      db.collection('needReports').doc(needReportId).update({
        status: 'resolved',
        reporterConfirmed: true,
        resolvedAt: Timestamp.now(),
      }),
    ]);
  } else {
    // Reporter says need is still unresolved — reopen and re-dispatch
    await Promise.all([
      db.collection('verificationRequests').doc(verificationRequestId).update({ status: 'denied' }),
      db.collection('dispatchTasks').doc(taskId).update({ status: 'escalated', reporterConfirmed: false }),
      db.collection('needReports').doc(needReportId).update({
        status: 'classified',  // back to classified so autoDispatch picks it up
        updatedAt: Timestamp.now(),
      }),
    ]);
    // Trigger autoDispatch again for this needReportId
    // Import and call the existing triggerDispatch function from autoDispatch.ts
  }
}
```

### New Firestore collection: `verificationRequests`

```
Schema:
  id: string (auto)
  needReportId: string
  reporterId: string
  taskId: string
  status: 'pending' | 'confirmed' | 'denied' | 'expired'
  createdAt: Timestamp
  expiresAt: Timestamp
```

### New fields added to `dispatchTasks`

```
verificationPhoto: string (Storage URL)
verificationConfidence: number
verificationReason: string
pendingCoordinatorReview: boolean
reporterConfirmed: boolean | null
verifiedAt: Timestamp
verificationRejected: boolean
verificationRejectionReason: string
```

### New route: add to `backend/src/routes/dispatch.ts` (or create `routes/verification.ts`)

```typescript
// POST /dispatch/complete — volunteer submits completion + photo
// Body: { taskId, needReportId, volunteerId, reporterId, needCategory, photoUrl }
// Calls: verifyTaskCompletion(...)
// Returns: { tier, confidence, reason }

// POST /dispatch/reporter-confirm — reporter taps ✓ or ✗
// Body: { verificationRequestId, confirmed: boolean }
// Calls: handleReporterResponse(...)

// GET /dispatch/pending-review — coordinator gets tasks needing review
// Query: { ngoId }
// Returns: dispatchTasks where pendingCoordinatorReview === true
```

### Frontend changes

In `src/pages/volunteer-app/` — task completion flow:
- Make photo upload **mandatory** before the "Mark Complete" button becomes active
- After upload, show "AI is verifying your completion..." spinner
- Show result: green checkmark (auto_resolved), yellow clock (needs_review), red X with re-upload prompt (rejected)

In `src/pages/ngo-dashboard/` — add a "Pending Verification Review" queue section showing tasks with `pendingCoordinatorReview: true`. One-tap approve or reject from coordinator.

---

## FEATURE 5 — Gemini Live Voice Dispatch

### What it does
Add a persistent WebSocket voice session to the NGO dashboard using `gemini-2.5-flash-native-audio-preview`. Coordinators speak to dispatch volunteers, filter the map, and query need status — without touching the keyboard.

### New file: `backend/src/services/geminiLiveService.ts`

```typescript
import { GoogleGenAI } from '@google/generative-ai'; // existing SDK
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const db = getFirestore();

// Function declarations — these are the "tools" the Live model can call

export const LIVE_FUNCTION_DECLARATIONS = [
  {
    name: 'assign_volunteer',
    description: 'Assign a specific volunteer to a specific need report. Use when coordinator says assign/dispatch/send.',
    parameters: {
      type: 'object',
      properties: {
        needReportId: { type: 'string', description: 'The ID of the need report' },
        volunteerId: { type: 'string', description: 'The ID of the volunteer to assign' },
      },
      required: ['needReportId', 'volunteerId'],
    },
  },
  {
    name: 'get_needs_summary',
    description: 'Get a summary of current active needs. Use when coordinator asks how many needs, what is the status, show me needs.',
    parameters: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Filter by category (optional)' },
        status: { type: 'string', description: 'Filter by status (optional)' },
        urgencyMin: { type: 'number', description: 'Minimum urgency score (optional)' },
      },
    },
  },
  {
    name: 'escalate_need',
    description: 'Escalate a need report to critical status or to cross-NGO overflow.',
    parameters: {
      type: 'object',
      properties: {
        needReportId: { type: 'string', description: 'The ID of the need report to escalate' },
        reason: { type: 'string', description: 'Reason for escalation' },
      },
      required: ['needReportId'],
    },
  },
  {
    name: 'mark_resolved',
    description: 'Mark a need report as resolved by coordinator override.',
    parameters: {
      type: 'object',
      properties: {
        needReportId: { type: 'string', description: 'The ID of the need report' },
        coordinatorId: { type: 'string', description: 'ID of the coordinator marking it resolved' },
      },
      required: ['needReportId', 'coordinatorId'],
    },
  },
  {
    name: 'get_volunteer_list',
    description: 'Get available volunteers, optionally filtered by location or skills.',
    parameters: {
      type: 'object',
      properties: {
        ward: { type: 'string', description: 'Ward or area name (optional)' },
        category: { type: 'string', description: 'Need category to match skills (optional)' },
      },
    },
  },
];

// ── Tool execution functions (called when Live model requests them) ─────────

export async function executeLiveTool(
  toolName: string,
  args: Record<string, any>,
): Promise<string> {
  try {
    switch (toolName) {

      case 'assign_volunteer': {
        // Use existing autoDispatch coordinator override flow
        const { needReportId, volunteerId } = args;
        await db.collection('dispatchTasks')
          .where('needReportId', '==', needReportId)
          .limit(1)
          .get()
          .then(async snap => {
            if (!snap.empty) {
              await snap.docs[0].ref.update({
                status: 'accepted',
                acceptedVolunteerId: volunteerId,
                'coordinatorOverride.overridden': true,
                'coordinatorOverride.reason': 'Voice command dispatch',
                updatedAt: Timestamp.now(),
              });
            }
          });
        const vol = await db.collection('volunteers').doc(volunteerId).get();
        const volName = vol.data()?.name ?? volunteerId;
        return `Done. ${volName} has been assigned and notified. Estimated arrival will depend on their distance.`;
      }

      case 'get_needs_summary': {
        const { category, status, urgencyMin } = args;
        let query: any = db.collection('needReports')
          .where('status', 'in', status ? [status] : ['pending', 'classified', 'dispatched', 'in_progress']);
        if (category) query = query.where('category', '==', category);
        const snap = await query.get();
        let docs = snap.docs.map((d: any) => d.data());
        if (urgencyMin) docs = docs.filter((d: any) => (d.urgencyScore ?? 0) >= urgencyMin);
        const total = docs.length;
        const critical = docs.filter((d: any) => d.urgency === 'critical' || (d.urgencyScore ?? 0) >= 9).length;
        const categories = docs.reduce((acc: any, d: any) => {
          acc[d.category] = (acc[d.category] ?? 0) + 1;
          return acc;
        }, {});
        const catSummary = Object.entries(categories)
          .map(([k, v]) => `${v} ${k.replace('_', ' ')}`)
          .join(', ');
        return `There are ${total} active needs${category ? ` in ${category}` : ''}: ${catSummary}. ${critical} are critical.`;
      }

      case 'escalate_need': {
        const { needReportId, reason } = args;
        await db.collection('needReports').doc(needReportId).update({
          urgency: 'critical',
          escalatedByVoice: true,
          escalationReason: reason ?? 'Coordinator voice escalation',
          updatedAt: Timestamp.now(),
        });
        return `Need ${needReportId} has been escalated to critical. Coordinators and nearby volunteers will be alerted.`;
      }

      case 'mark_resolved': {
        const { needReportId, coordinatorId } = args;
        await db.collection('needReports').doc(needReportId).update({
          status: 'resolved',
          resolvedAt: Timestamp.now(),
          'coordinatorOverride.overridden': true,
          updatedAt: Timestamp.now(),
        });
        return `Need ${needReportId} has been marked as resolved by coordinator override.`;
      }

      case 'get_volunteer_list': {
        const snap = await db.collection('volunteers')
          .where('availability', '==', 'free')
          .limit(10)
          .get();
        const vols = snap.docs.map(d => {
          const data = d.data();
          return `${data.name} (${data.reliabilityScore?.toFixed(1) ?? 'N/A'} rating, ${data.activeTasks ?? 0} active tasks)`;
        });
        if (vols.length === 0) return 'No volunteers are currently available.';
        return `Available volunteers: ${vols.join('; ')}.`;
      }

      default:
        return `Unknown tool: ${toolName}`;
    }
  } catch (err) {
    console.error(`[GeminiLive] Tool ${toolName} error:`, err);
    return `Error executing ${toolName}. Please try again or use the dashboard manually.`;
  }
}
```

### New WebSocket route: add to `backend/src/routes/gemini.ts`

```typescript
// ADD this WebSocket handler in routes/gemini.ts
// You'll need to use the 'ws' package: npm install ws @types/ws

import WebSocket from 'ws';
import { LIVE_FUNCTION_DECLARATIONS, executeLiveTool } from '../services/geminiLiveService';

// This is attached to the HTTP server, not the Express router
// In your server setup file (index.ts or server.ts), after creating the HTTP server:

// const wss = new WebSocket.Server({ server: httpServer, path: '/api/gemini/live' });
// wss.on('connection', handleLiveSession);

export function handleLiveSession(ws: WebSocket): void {
  // Gemini Live API uses its own streaming WebSocket protocol
  // The frontend will connect to Gemini Live API directly using the API key
  // This backend WebSocket is a PROXY that:
  //   1. Receives audio chunks from the frontend
  //   2. Forwards them to Gemini Live API
  //   3. Receives model responses (text + function calls)
  //   4. Executes function calls using executeLiveTool()
  //   5. Returns results to Gemini and audio/text responses to frontend

  // Alternatively (simpler for hackathon): have the frontend call Gemini Live directly
  // using the JS SDK with the API key, and call your backend REST endpoints
  // when function calls are needed.
  //
  // RECOMMENDED APPROACH for hackathon scope:
  // Frontend uses Gemini Live JS SDK directly for audio session
  // When model returns a function call, frontend POSTs to:
  //   POST /api/gemini/live-tool-call
  //   Body: { toolName, args }
  //   Returns: { result: string }
  // Frontend feeds the result back into the Live session
}
```

### Simpler REST fallback for function calls: add to `backend/src/routes/gemini.ts`

```typescript
// POST /api/gemini/live-tool-call
// Body: { toolName: string, args: Record<string, any> }
// Returns: { result: string }
router.post('/live-tool-call', authMiddleware, async (req, res) => {
  const { toolName, args } = req.body;
  const result = await executeLiveTool(toolName, args);
  res.json({ success: true, result });
});

// GET /api/gemini/live-functions — return function declarations for frontend
router.get('/live-functions', (req, res) => {
  res.json({ success: true, data: LIVE_FUNCTION_DECLARATIONS });
});
```

### Frontend: `src/pages/ngo-dashboard/` — Voice Command UI

Add a `VoiceCommandButton.tsx` component to the NGO dashboard layout:

```tsx
// COMPONENT: VoiceCommandButton
// A floating circular orange mic button, fixed position bottom-right of dashboard
// 
// STATE:
//   sessionActive: boolean
//   isListening: boolean
//   transcript: string (last spoken input)
//   response: string (last AI response)
//   isProcessing: boolean
//
// BEHAVIOR:
//   1. On click: initialize Gemini Live session using @google/generative-ai JS SDK
//      Model: 'gemini-2.5-flash-native-audio-preview' (or use text mode as fallback)
//      Config: { responseModalities: ['TEXT'], tools: [{ functionDeclarations: LIVE_FUNCTION_DECLARATIONS }] }
//      
//   2. While session is active: show a transcript bubble above the button
//      showing the last spoken command and the AI's last response
//
//   3. When model returns a function call:
//      - Show "Executing..." in the transcript bubble
//      - POST to /api/gemini/live-tool-call with { toolName, args }
//      - Send the result back to the Live session
//      - Show the AI's spoken/text confirmation
//
//   4. Map updates in real-time via existing Firebase listeners
//      (the function call modifies Firestore → frontend listeners pick it up)
//
//   5. Session persists until coordinator taps the button again to end
//
// NOTE: If native audio preview is not available in your region/tier,
//       implement text-based Live session as fallback:
//       User types command → Gemini responds with text + function calls → same tool execution flow
//       Present this as "Voice Command" in UI but implement text under the hood for reliability
//
// DEMO TIP: Even text-based function calling with a mic icon looks impressive in a demo
//           if function execution is visually reflected on the map in real-time
```

---

## FEATURE 6 — Pulse Map Live Data + Public KPI Dashboard

### Part A: Wire Pulse Map to Live Firestore Data

### Modify `src/pages/pulse-map/CommunityPulseMap.tsx`

The current page uses hardcoded Delhi mock data. Replace with live Firestore data:

```tsx
// REMOVE: all hardcoded mock data arrays and static pin objects

// ADD: Firebase Realtime listener using existing Firebase Web SDK
// (already imported in the project)

// useEffect hook — subscribe to live needReports:
useEffect(() => {
  const unsubscribe = onSnapshot(
    query(
      collection(db, 'needReports'),
      where('status', 'in', ['pending', 'classified', 'dispatched', 'in_progress']),
      orderBy('urgencyScore', 'desc'),  // uses new urgencyScore field from Feature 2
      limit(200)
    ),
    (snapshot) => {
      const reports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNeedReports(reports);
    }
  );
  return () => unsubscribe();
}, []);

// ADD: Volunteer positions Layer (Layer 2)
useEffect(() => {
  const unsubscribe = onSnapshot(
    query(
      collection(db, 'volunteers'),
      where('availability', '==', 'free'),
      limit(100)
    ),
    (snapshot) => {
      const volunteers = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(v => v.location?.latitude && v.location?.longitude);
      setVolunteerPositions(volunteers);
    }
  );
  return () => unsubscribe();
}, []);
```

### Map pin rendering updates in `CommunityPulseMap.tsx`:

```tsx
// For each needReport pin, compute:

// 1. OPACITY DECAY — older unresolved needs appear more faded
// const ageHours = (Date.now() - createdAt.toMillis()) / (1000 * 60 * 60);
// const opacity = Math.max(0.3, 1 - (ageHours / 48)); // fades to 0.3 over 48 hours

// 2. REPORT COUNT BADGE — show "×N" badge if report_count >= 2
// Render a small circular badge on top of the pin with report_count value
// If systemic === true: add pulsing red animation ring

// 3. URGENCY SCORE SIZE — scale pin size by urgencyScore
// const pinScale = 0.8 + (urgencyScore / 20); // 0.8 at score 0, larger at higher scores

// 4. VOLUNTEER DOTS — render as small blue dots, separate layer
// Layer toggle: controlled by state variable showVolunteerLayer

// 5. VULNERABILITY CHOROPLETH — render ward GeoJSON as semi-transparent overlay
// Import ward_vulnerability_index.json (same file from Feature 2)
// Render using Google Maps Data layer or a GeoJSON overlay library
// Color scale: green (score < 0.4) → amber (0.4–0.7) → red (> 0.7)
// Layer toggle: controlled by state variable showVulnerabilityLayer
// Fill opacity: 0.20 (subtle, doesn't obscure need pins)
```

### Layer toggle UI in `CommunityPulseMap.tsx`:

```tsx
// Add a floating panel (top-right of map) with toggle switches for:
// ✅ Active Needs (always on, not toggleable)
// 🔵 Volunteer Positions (toggle)
// 🟠 Predicted Needs (ghost pins from Feature 2 predictorAgent — if implemented)
// 🔴 Vulnerability Overlay (choropleth toggle)
// ☁️ Weather Risk (simple overlay if weather data available)
//
// Use small pill-shaped toggle buttons, matching existing app design system
```

### Part B: Public KPI Dashboard — New page

### New file: `src/pages/pulse-map/PublicKPIDashboard.tsx`

```tsx
// Route: /impact/:wardSlug (or /impact/live for demo)
// NO AUTH REQUIRED — this page is publicly accessible
// Register in App.tsx router as a public route (no auth guard)

// DATA: Firebase Realtime listener on needReports + dispatchTasks collections
// Compute these 6 metrics client-side from live Firestore data:

// 1. RESOURCE UTILIZATION RATE
//    = (volunteers dispatched at least once in last 24h) / (total registered volunteers) × 100
//    Query: dispatchTasks where createdAt >= 24h ago, count distinct acceptedVolunteerId

// 2. DEMAND COVERAGE RATE  
//    = (needs matched within 30 min) / (total needs in last 24h) × 100
//    Query: dispatchTasks where (acceptedAt - createdAt) <= 30 min

// 3. AVERAGE RESPONSE TIME BY CATEGORY
//    = avg(acceptedAt - needReport.createdAt) grouped by category
//    Show as a small horizontal bar chart (use recharts or simple CSS bars)

// 4. ALLOCATION ACCURACY RATE
//    = (tasks where verificationConfidence > 0.75 AND reporterConfirmed === true)
//      / (total completed tasks) × 100
//    Only available if Feature 4 (VerifierAgent) is built — show "N/A" otherwise

// 5. OVERFLOW RATE
//    = (dispatchTasks where escalated === true) / (total dispatchTasks) × 100

// 6. UNMET DEMAND MAP
//    = needReports where status in ['pending','classified'] AND createdAt <= 2 hours ago
//    Render as a mini heatmap (red dots) on a small embedded Google Map

// UI LAYOUT:
// Clean, minimal, white background
// Large number displays for metrics 1–5
// Small embedded map for metric 6
// Live dot indicator (green pulsing) showing "Live data"
// "Last updated: N seconds ago" counter
// "Share" button that copies the URL to clipboard
// "Download as PDF" button — use browser print() with @media print CSS

// This page should work on mobile (judges will open it on their phone)
// QR code for this page should be in your demo slides
```

### Register the new route in `src/App.tsx`:

```tsx
// ADD as a public route (no auth guard):
// <Route path="/impact/:wardSlug" element={<PublicKPIDashboard />} />
// <Route path="/impact/live" element={<PublicKPIDashboard />} />
```

---

## EXECUTION ORDER

Build in this exact sequence. Each feature depends on the ones before it:

| Step | Feature | Files Created/Modified | Why This Order |
|---|---|---|---|
| 1 | Urgency Multipliers (F2) | NEW: `urgencyMultipliers.ts` + MODIFY: `classification.ts` | All downstream sorting uses urgencyScore — build first |
| 2 | DedupEngine (F1) | NEW: `dedupEngine.ts` + MODIFY: `intake.ts` | Must run before dispatch — correctness fix |
| 3 | Inventory Engine (F3) | NEW: `inventoryEngine.ts`, `routes/inventory.ts` + MODIFY: `matchingEngine.ts` | Wires existing `resources` collection |
| 4 | Pulse Map Live (F6A) | MODIFY: `CommunityPulseMap.tsx` | Makes demo centrepiece real; uses urgencyScore from step 1 |
| 5 | VerifierAgent (F4) | NEW: `verifierAgent.ts` + MODIFY: `dispatch.ts` | Needs real tasks completing to test |
| 6 | Gemini Live (F5) | NEW: `geminiLiveService.ts` + MODIFY: `gemini.ts` | Dashboard must be working before voice dispatch is meaningful |
| 7 | Public KPI Dashboard (F6B) | NEW: `PublicKPIDashboard.tsx` + MODIFY: `App.tsx` | Needs real data from steps 1–6 |

---

## WHAT NOT TO DO

- Do NOT migrate to Google ADK — the existing direct Gemini API approach works fine
- Do NOT rename any existing Firestore collections
- Do NOT change existing API route paths
- Do NOT refactor `matchingEngine.ts` beyond the specific additions described above
- Do NOT change the existing auth flow
- Do NOT build real WhatsApp integration — keep the simulation but ensure webhook structure is present in code comments
- Do NOT build A2A cross-NGO flow — out of scope for this build phase
- Do NOT touch `crisisMode.ts`, `csrPortal.ts`, or `panchayatInterface.ts` — they are already built

---

## DEMO DATA SEEDING

Modify `backend/src/scripts/seedData.ts` to ensure seeded reports include:

- `report_count: 1` (default)
- `urgencyScore` populated (compute from existing urgency enum using `urgencyEnumToBase()`)
- `urgencyBreakdown` populated with realistic values
- At least 3 reports that are near-duplicates (within 500m, same category) to demo DedupEngine
- At least 2 volunteers with `resources` subcollection items logged
- At least 5 completed tasks with `verificationConfidence > 0.75` and `reporterConfirmed: true` for KPI dashboard

---

*SevaSetu Feature Addition Spec v1.0 | March 2026*
*Built on top of existing SevaSetu codebase — additive only*
