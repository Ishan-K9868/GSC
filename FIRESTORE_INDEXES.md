# Firestore Indexes

This file documents the Firestore indexes currently required or likely required by the SevaSetu codebase.

Status note:
- `needReports(status, urgencyScore)` has been runtime-tested and was required for `/pulse-map`
- `needReports(category, status, createdAt)` has been runtime-tested and was required for intake dedup
- `needReports(status, updatedAt)` is already present in Firebase and is used by legacy/live map aggregation code
- `teamChallenges(companyId, createdAt)` is already known for the CSR challenge feed

---

## Confirmed / Active Indexes

### 1) Pulse Map live needs
- Collection: `needReports`
- Fields:
  - `status ASC`
  - `urgencyScore DESC`
- Why: used by `src/pages/pulse-map/CommunityPulseMap.tsx:272`
- Query shape:
  - `where('status', 'in', ['pending', 'classified', 'dispatched', 'in_progress'])`
  - `orderBy('urgencyScore', 'desc')`
  - `limit(200)`
- Runtime status: required and now created
- Console link used:
  - `https://console.firebase.google.com/v1/r/project/seva-setu-9f046/firestore/indexes?create_composite=ClNwcm9qZWN0cy9zZXZhLXNldHUtOWYwNDYvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL25lZWRSZXBvcnRzL2luZGV4ZXMvXxABGgoKBnN0YXR1cxABGhAKDHVyZ2VuY3lTY29yZRACGgwKCF9fbmFtZV9fEAI`

### 2) DedupEngine recent-nearby duplicate scan
- Collection: `needReports`
- Fields:
  - `category ASC`
  - `status ASC`
  - `createdAt ASC`
- Why: used by `backend/src/services/dedupEngine.ts:124`
- Query shape:
  - `where('category', '==', newCategory)`
  - `where('status', 'in', ['pending', 'classified', 'dispatched', 'in_progress'])`
  - `where('createdAt', '>=', cutoffTime)`
- Runtime status: required and now created
- Console link used:
  - `https://console.firebase.google.com/v1/r/project/seva-setu-9f046/firestore/indexes?create_composite=ClNwcm9qZWN0cy9zZXZhLXNldHUtOWYwNDYvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL25lZWRSZXBvcnRzL2luZGV4ZXMvXxABGgwKCGNhdGVnb3J5EAEaCgoGc3RhdHVzEAEaDQoJY3JlYXRlZEF0EAEaDAoIX19uYW1lX18QAQ`

### 3) Resolved map/history reads
- Collection: `needReports`
- Fields:
  - `status ASC`
  - `updatedAt DESC`
- Why: used by `backend/src/services/mapAggregation.ts:467`
- Query shape:
  - `where('status', '==', 'resolved')`
  - `orderBy('updatedAt', 'desc')`
  - `limit(1000)`
- Runtime status: already present in Firebase Console
- Source confirmation: matches the current console state screenshot and existing setup notes
- Create link:
  - `https://console.firebase.google.com/v1/r/project/seva-setu-9f046/firestore/indexes?create_composite=ClNwcm9qZWN0cy9zZXZhLXNldHUtOWYwNDYvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL25lZWRSZXBvcnRzL2luZGV4ZXMvXxABGgoKBnN0YXR1cxABGg0KCXVwZGF0ZWRBdBACGgwKCF9fbmFtZV9fEAI`

### 4) CSR team challenges
- Collection: `teamChallenges`
- Fields:
  - `companyId ASC`
  - `createdAt DESC`
- Why: used by `backend/src/services/csrPortal.ts:277`
- Query shape:
  - `where('companyId', '==', companyId)`
  - `orderBy('createdAt', 'desc')`
  - `limit(100)`
- Runtime status: known required CSR index
- Console link:
  - `https://console.firebase.google.com/v1/r/project/seva-setu-9f046/firestore/indexes?create_composite=ClZwcm9qZWN0cy9zZXZhLXNldHUtOWYwNDYvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL3RlYW1DaGFsbGVuZ2VzL2luZGV4ZXMvXxABGg0KCWNvbXBhbnlJZBABGg0KCWNyZWF0ZWRBdBACGgwKCF9fbmFtZV9fEAI`

---

## Likely Additional Composite Indexes

These are inferred from code. They may not all be needed immediately, but they are the next most likely index errors if those routes/features are exercised.

### 5) Agent decision log history
- Collection: `agentDecisionLogs`
- Suggested fields:
  - `taskId ASC`
  - `createdAt DESC`
- Why: used by `backend/src/routes/dispatch.ts:263`
- Query shape:
  - `where('taskId', '==', taskId)`
  - `orderBy('createdAt', 'desc')`
  - `limit(50)`
- Recommendation: create proactively if dispatch log viewing is part of the demo
- Create link:
  - `https://console.firebase.google.com/v1/r/project/seva-setu-9f046/firestore/indexes?create_composite=Cllwcm9qZWN0cy9zZXZhLXNldHUtOWYwNDYvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL2FnZW50RGVjaXNpb25Mb2dzL2luZGV4ZXMvXxABGgoKBnRhc2tJZBABGg0KCWNyZWF0ZWRBdBACGgwKCF9fbmFtZV9fEAI`

### 6) NGO auto-dispatch NGO lookup
- Collection: `ngos`
- Suggested fields:
  - `categories ARRAY_CONTAINS`
  - `isActive ASC`
- Why: used by `backend/src/services/autoDispatch.ts:100`
- Query shape:
  - `where('categories', 'array-contains', category)`
  - `where('isActive', '==', true)`
  - `limit(10)`
- Recommendation: create if Firestore throws an index error during live NGO matching
- Create link:
  - `https://console.firebase.google.com/v1/r/project/seva-setu-9f046/firestore/indexes?create_composite=Ckxwcm9qZWN0cy9zZXZhLXNldHUtOWYwNDYvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL25nb3MvaW5kZXhlcy9fEAEaDgoKY2F0ZWdvcmllcxgBGgwKCGlzQWN0aXZlEAEaDAoIX19uYW1lX18QAQ`

### 7) Urgency decay batch scan
- Collection: `needReports`
- Suggested fields:
  - `status ASC`
  - `urgencyScore ASC`
- Why: used by `backend/src/scripts/urgencyDecay.ts:20`
- Query shape:
  - `where('status', 'in', ACTIVE_STATUSES)`
  - `where('urgencyScore', '>', 0)`
- Recommendation: create if/when the scheduled decay job is enabled against production Firestore
- Create link:
  - `https://console.firebase.google.com/v1/r/project/seva-setu-9f046/firestore/indexes?create_composite=ClNwcm9qZWN0cy9zZXZhLXNldHUtOWYwNDYvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL25lZWRSZXBvcnRzL2luZGV4ZXMvXxABGgoKBnN0YXR1cxABGhAKDHVyZ2VuY3lTY29yZRABGgwKCF9fbmFtZV9fEAE`

---

## Intake Report Listing: On-Demand Composite Family

The route `backend/src/routes/intake.ts:227` builds a query with:
- `orderBy('createdAt', 'desc')`
- optional equality filters on `category`, `urgency`, and `status`

Depending on which filters are actually used in the UI/admin tools, Firestore may require one or more of these composites:

### Possible combinations
- `needReports(category ASC, createdAt DESC)`
- `needReports(urgency ASC, createdAt DESC)`
- `needReports(status ASC, createdAt DESC)`
- `needReports(category ASC, urgency ASC, createdAt DESC)`
- `needReports(category ASC, status ASC, createdAt DESC)`
- `needReports(urgency ASC, status ASC, createdAt DESC)`
- `needReports(category ASC, urgency ASC, status ASC, createdAt DESC)`

Recommendation:
- do not create all of these blindly unless that endpoint is heavily used
- create them on demand based on the exact Firestore error link returned by the first failing filter combination

### Prebuilt create links for the most likely intake combinations

#### `needReports(category ASC, createdAt DESC)`
- Link:
  - `https://console.firebase.google.com/v1/r/project/seva-setu-9f046/firestore/indexes?create_composite=ClNwcm9qZWN0cy9zZXZhLXNldHUtOWYwNDYvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL25lZWRSZXBvcnRzL2luZGV4ZXMvXxABGgwKCGNhdGVnb3J5EAEaDQoJY3JlYXRlZEF0EAIaDAoIX19uYW1lX18QAg`

#### `needReports(urgency ASC, createdAt DESC)`
- Link:
  - `https://console.firebase.google.com/v1/r/project/seva-setu-9f046/firestore/indexes?create_composite=ClNwcm9qZWN0cy9zZXZhLXNldHUtOWYwNDYvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL25lZWRSZXBvcnRzL2luZGV4ZXMvXxABGgsKB3VyZ2VuY3kQARoNCgljcmVhdGVkQXQQAhoMCghfX25hbWVfXxAC`

#### `needReports(status ASC, createdAt DESC)`
- Link:
  - `https://console.firebase.google.com/v1/r/project/seva-setu-9f046/firestore/indexes?create_composite=ClNwcm9qZWN0cy9zZXZhLXNldHUtOWYwNDYvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL25lZWRSZXBvcnRzL2luZGV4ZXMvXxABGgoKBnN0YXR1cxABGg0KCWNyZWF0ZWRBdBACGgwKCF9fbmFtZV9fEAI`

#### `needReports(category ASC, urgency ASC, createdAt DESC)`
- Link:
  - `https://console.firebase.google.com/v1/r/project/seva-setu-9f046/firestore/indexes?create_composite=ClNwcm9qZWN0cy9zZXZhLXNldHUtOWYwNDYvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL25lZWRSZXBvcnRzL2luZGV4ZXMvXxABGgwKCGNhdGVnb3J5EAEaCwoHdXJnZW5jeRABGg0KCWNyZWF0ZWRBdBACGgwKCF9fbmFtZV9fEAI`

#### `needReports(category ASC, status ASC, createdAt DESC)`
- Link:
  - `https://console.firebase.google.com/v1/r/project/seva-setu-9f046/firestore/indexes?create_composite=ClNwcm9qZWN0cy9zZXZhLXNldHUtOWYwNDYvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL25lZWRSZXBvcnRzL2luZGV4ZXMvXxABGgwKCGNhdGVnb3J5EAEaCgoGc3RhdHVzEAEaDQoJY3JlYXRlZEF0EAIaDAoIX19uYW1lX18QAg`

#### `needReports(urgency ASC, status ASC, createdAt DESC)`
- Link:
  - `https://console.firebase.google.com/v1/r/project/seva-setu-9f046/firestore/indexes?create_composite=ClNwcm9qZWN0cy9zZXZhLXNldHUtOWYwNDYvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL25lZWRSZXBvcnRzL2luZGV4ZXMvXxABGgsKB3VyZ2VuY3kQARoKCgZzdGF0dXMQARoNCgljcmVhdGVkQXQQAhoMCghfX25hbWVfXxAC`

#### `needReports(category ASC, urgency ASC, status ASC, createdAt DESC)`
- Link:
  - `https://console.firebase.google.com/v1/r/project/seva-setu-9f046/firestore/indexes?create_composite=ClNwcm9qZWN0cy9zZXZhLXNldHUtOWYwNDYvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL25lZWRSZXBvcnRzL2luZGV4ZXMvXxABGgwKCGNhdGVnb3J5EAEaCwoHdXJnZW5jeRABGgoKBnN0YXR1cxABGg0KCWNyZWF0ZWRBdBACGgwKCF9fbmFtZV9fEAI`

### Already-created dedup variant for ascending time window queries
- `needReports(category ASC, status ASC, createdAt ASC)`
- Link:
  - `https://console.firebase.google.com/v1/r/project/seva-setu-9f046/firestore/indexes?create_composite=ClNwcm9qZWN0cy9zZXZhLXNldHUtOWYwNDYvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL25lZWRSZXBvcnRzL2luZGV4ZXMvXxABGgwKCGNhdGVnb3J5EAEaCgoGc3RhdHVzEAEaDQoJY3JlYXRlZEF0EAEaDAoIX19uYW1lX18QAQ`

---

## Queries That Do Not Currently Need Custom Composite Indexes

### Single-field or simple queries
- `backend/src/services/inventoryEngine.ts:58`
  - `resources/{volunteerId}/items.where('quantity', '>', 0)`
- `backend/src/routes/dispatch.ts:192`
  - `dispatchTasks.where('pendingCoordinatorReview', '==', true)`
- `backend/src/services/geminiLiveService.ts:75`
  - `dispatchTasks.where('needReportId', '==', needReportId)`
- `backend/src/services/geminiLiveService.ts:173`
  - `volunteers.where('availability', '==', 'free')`
- `backend/src/services/mapAggregation.ts:461`
  - `needReports.where('status', '==', 'pending')`
- `backend/src/services/mapAggregation.ts:465`
  - `needReports.where('status', 'in', ['dispatched', 'in_progress'])`
- `backend/src/services/mapAggregation.ts:507`
  - `needReports.where('status', 'in', ['pending', 'dispatched', 'in_progress'])`

### Collection-group note
- `backend/src/services/inventoryEngine.ts:143`
  - `collectionGroup('items').get()`
- As currently written, it does not need a custom collection-group composite index because it has no filters or sorting

---

## Recommended Firebase Console Baseline

If you want a practical baseline for this repo, keep these four created in Firebase at minimum:
- `needReports(status, urgencyScore)`
- `needReports(status, updatedAt)`
- `needReports(category, status, createdAt)`
- `teamChallenges(companyId, createdAt)`

Then add these if/when the related features are actively used:
- `agentDecisionLogs(taskId, createdAt)`
- `ngos(categories ARRAY_CONTAINS, isActive)`
- `needReports(status, urgencyScore)` for the decay job if Firestore asks separately for the inequality shape
- intake listing composites for the exact filter combinations that are actually exercised
