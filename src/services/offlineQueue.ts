/**
 * Offline Queue Service
 * PRD: 5.1.5 Offline Queue with Background Sync
 * 
 * IndexedDB-based queue for storing reports when offline.
 * Automatically syncs when connection is restored.
 */

import type { CreateReportInput, NeedReport } from '../types';

const DB_NAME = 'sevasetu_offline_db';
const DB_VERSION = 1;
const REPORTS_STORE = 'pending_reports';
const QUEUE_STORE = 'sync_queue';

interface QueuedReport {
  id: string;
  data: CreateReportInput;
  createdAt: string;
  retryCount: number;
  lastError?: string;
  status: 'pending' | 'syncing' | 'failed';
}

let db: IDBDatabase | null = null;

/**
 * Initialize IndexedDB
 */
export async function initOfflineDB(): Promise<IDBDatabase> {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Failed to open offline database'));
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Create pending reports store
      if (!database.objectStoreNames.contains(REPORTS_STORE)) {
        const reportsStore = database.createObjectStore(REPORTS_STORE, { keyPath: 'id' });
        reportsStore.createIndex('status', 'status', { unique: false });
        reportsStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // Create sync queue store
      if (!database.objectStoreNames.contains(QUEUE_STORE)) {
        database.createObjectStore(QUEUE_STORE, { keyPath: 'id' });
      }
    };
  });
}

/**
 * Generate unique ID for offline reports
 */
function generateOfflineId(): string {
  return `offline_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Add a report to the offline queue
 */
export async function queueReport(report: CreateReportInput): Promise<string> {
  const database = await initOfflineDB();
  
  const queuedReport: QueuedReport = {
    id: generateOfflineId(),
    data: {
      ...report,
      isOfflineSubmission: true,
    },
    createdAt: new Date().toISOString(),
    retryCount: 0,
    status: 'pending',
  };

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([REPORTS_STORE], 'readwrite');
    const store = transaction.objectStore(REPORTS_STORE);
    const request = store.add(queuedReport);

    request.onsuccess = () => {
      resolve(queuedReport.id);
      // Trigger background sync if available
      triggerBackgroundSync();
    };

    request.onerror = () => {
      reject(new Error('Failed to queue report'));
    };
  });
}

/**
 * Get all pending reports from the queue
 */
export async function getPendingReports(): Promise<QueuedReport[]> {
  const database = await initOfflineDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([REPORTS_STORE], 'readonly');
    const store = transaction.objectStore(REPORTS_STORE);
    const index = store.index('status');
    const request = index.getAll('pending');

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = () => {
      reject(new Error('Failed to get pending reports'));
    };
  });
}

/**
 * Get all queued reports (any status)
 */
export async function getAllQueuedReports(): Promise<QueuedReport[]> {
  const database = await initOfflineDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([REPORTS_STORE], 'readonly');
    const store = transaction.objectStore(REPORTS_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = () => {
      reject(new Error('Failed to get queued reports'));
    };
  });
}

/**
 * Update report status in queue
 */
export async function updateQueuedReport(
  id: string, 
  updates: Partial<QueuedReport>
): Promise<void> {
  const database = await initOfflineDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([REPORTS_STORE], 'readwrite');
    const store = transaction.objectStore(REPORTS_STORE);
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const report = getRequest.result;
      if (!report) {
        reject(new Error('Report not found'));
        return;
      }

      const updatedReport = { ...report, ...updates };
      const putRequest = store.put(updatedReport);

      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(new Error('Failed to update report'));
    };

    getRequest.onerror = () => {
      reject(new Error('Failed to get report'));
    };
  });
}

/**
 * Remove a report from the queue
 */
export async function removeQueuedReport(id: string): Promise<void> {
  const database = await initOfflineDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([REPORTS_STORE], 'readwrite');
    const store = transaction.objectStore(REPORTS_STORE);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('Failed to remove report'));
  });
}

/**
 * Get queue count
 */
export async function getQueueCount(): Promise<number> {
  const database = await initOfflineDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([REPORTS_STORE], 'readonly');
    const store = transaction.objectStore(REPORTS_STORE);
    const request = store.count();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Failed to count queue'));
  });
}

/**
 * Clear all queued reports
 */
export async function clearQueue(): Promise<void> {
  const database = await initOfflineDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([REPORTS_STORE], 'readwrite');
    const store = transaction.objectStore(REPORTS_STORE);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('Failed to clear queue'));
  });
}

/**
 * Trigger background sync via Service Worker
 */
function triggerBackgroundSync(): void {
  if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
    navigator.serviceWorker.ready.then((registration) => {
      // @ts-ignore - SyncManager types may not be available
      registration.sync?.register('sync-reports').catch((err: Error) => {
        console.error('Background sync registration failed:', err);
      });
    });
  }
}

/**
 * Check if we're online
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Sync pending reports to server
 * Called when back online or via background sync
 */
export async function syncPendingReports(
  submitFn: (report: CreateReportInput) => Promise<{ success: boolean; data?: { report: NeedReport } }>
): Promise<{ synced: number; failed: number }> {
  const pendingReports = await getPendingReports();
  let synced = 0;
  let failed = 0;

  for (const queuedReport of pendingReports) {
    try {
      // Mark as syncing
      await updateQueuedReport(queuedReport.id, { status: 'syncing' });

      // Attempt to submit
      const result = await submitFn(queuedReport.data);

      if (result.success) {
        // Remove from queue on success
        await removeQueuedReport(queuedReport.id);
        synced++;
      } else {
        throw new Error('Submission failed');
      }
    } catch (err: any) {
      // Increment retry count
      const retryCount = queuedReport.retryCount + 1;
      const status = retryCount >= 3 ? 'failed' : 'pending';

      await updateQueuedReport(queuedReport.id, {
        retryCount,
        status,
        lastError: err.message,
      });

      failed++;
    }
  }

  return { synced, failed };
}

/**
 * Online/offline event listeners
 */
let onlineCallback: (() => void) | null = null;
let offlineCallback: (() => void) | null = null;

export function setupConnectivityListeners(
  onOnline?: () => void,
  onOffline?: () => void
): () => void {
  onlineCallback = () => {
    console.log('Connection restored');
    onOnline?.();
  };

  offlineCallback = () => {
    console.log('Connection lost');
    onOffline?.();
  };

  window.addEventListener('online', onlineCallback);
  window.addEventListener('offline', offlineCallback);

  // Return cleanup function
  return () => {
    if (onlineCallback) window.removeEventListener('online', onlineCallback);
    if (offlineCallback) window.removeEventListener('offline', offlineCallback);
  };
}
