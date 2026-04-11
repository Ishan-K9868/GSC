import dotenv from 'dotenv';
dotenv.config();

import { initializeFirebase, verifyFirebaseRuntimeAvailability, getFirebaseStatus } from './config/firebase';
import { assertProductionRuntimeReadiness, getRuntimeReadinessReport } from './config/runtime';
import { runUrgencyDecay } from './scripts/urgencyDecay';
import { checkInventoryAlerts } from './services/inventoryEngine';

const THIRTY_MINUTES_MS = 30 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;

function scheduleRecurringTask(taskName: string, intervalMs: number, runner: () => Promise<unknown>) {
  const execute = async () => {
    try {
      const result = await runner();
      console.log(`[scheduler-worker] ${taskName} completed`, result ?? '');
    } catch (error) {
      console.error(`[scheduler-worker] ${taskName} failed`, error);
    }
  };

  void execute();
  return setInterval(() => {
    void execute();
  }, intervalMs);
}

async function bootstrapScheduler() {
  initializeFirebase();
  await verifyFirebaseRuntimeAvailability();
  assertProductionRuntimeReadiness();

  const readiness = getRuntimeReadinessReport();
  const firebaseStatus = getFirebaseStatus();

  console.log('🕰️ SevaSetu scheduler worker starting');
  console.log(`🔐 Firebase mode: ${firebaseStatus.mode} (${firebaseStatus.credentialSource})`);
  console.log(`✅ Readiness: ${readiness.ok ? 'ready' : 'degraded'}`);

  scheduleRecurringTask('urgency_decay', THIRTY_MINUTES_MS, runUrgencyDecay);
  scheduleRecurringTask('inventory_alerts', ONE_HOUR_MS, checkInventoryAlerts);
}

void bootstrapScheduler().catch((error) => {
  console.error('❌ Scheduler bootstrap failed:', error);
  process.exit(1);
});
