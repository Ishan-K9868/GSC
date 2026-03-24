/**
 * useOfflineQueue Hook
 * Provides React integration for the offline queue service
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  initOfflineDB,
  queueReport,
  getAllQueuedReports,
  getQueueCount,
  syncPendingReports,
  setupConnectivityListeners,
  isOnline,
} from '../services/offlineQueue';
import { submitReport } from '../services/api';
import type { CreateReportInput } from '../types';

interface QueuedReport {
  id: string;
  data: CreateReportInput;
  createdAt: string;
  retryCount: number;
  lastError?: string;
  status: 'pending' | 'syncing' | 'failed';
}

interface UseOfflineQueueReturn {
  // State
  isOnline: boolean;
  queueCount: number;
  queuedReports: QueuedReport[];
  isSyncing: boolean;
  lastSyncResult: { synced: number; failed: number } | null;

  // Actions
  addToQueue: (report: CreateReportInput) => Promise<string>;
  syncQueue: () => Promise<void>;
  refreshQueue: () => Promise<void>;
}

export function useOfflineQueue(): UseOfflineQueueReturn {
  const [online, setOnline] = useState(isOnline());
  const [queueCount, setQueueCount] = useState(0);
  const [queuedReports, setQueuedReports] = useState<QueuedReport[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<{ synced: number; failed: number } | null>(null);

  // Initialize DB on mount
  useEffect(() => {
    initOfflineDB().catch(console.error);
  }, []);

  // Refresh queue data
  const refreshQueue = useCallback(async () => {
    try {
      const count = await getQueueCount();
      const reports = await getAllQueuedReports();
      setQueueCount(count);
      setQueuedReports(reports);
    } catch (err) {
      console.error('Failed to refresh queue:', err);
    }
  }, []);

  // Set up connectivity listeners
  useEffect(() => {
    const cleanup = setupConnectivityListeners(
      () => {
        setOnline(true);
        // Auto-sync when back online
        syncQueue();
      },
      () => {
        setOnline(false);
      }
    );

    // Initial refresh
    refreshQueue();

    return cleanup;
  }, [refreshQueue]);

  // Sync queue
  const syncQueue = useCallback(async () => {
    if (!online || isSyncing) return;

    setIsSyncing(true);
    try {
      const result = await syncPendingReports(submitReport);
      setLastSyncResult(result);
      await refreshQueue();
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [online, isSyncing, refreshQueue]);

  // Add to queue
  const addToQueue = useCallback(async (report: CreateReportInput): Promise<string> => {
    const id = await queueReport(report);
    await refreshQueue();
    return id;
  }, [refreshQueue]);

  return {
    isOnline: online,
    queueCount,
    queuedReports,
    isSyncing,
    lastSyncResult,
    addToQueue,
    syncQueue,
    refreshQueue,
  };
}
