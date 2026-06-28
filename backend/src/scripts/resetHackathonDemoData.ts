import dotenv from 'dotenv';
dotenv.config();

import type { firestore as FirestoreTypes } from 'firebase-admin';
import { getFirestore } from '../config/firebase';
import { clearExistingData, generateSeedReports, generateSeedVolunteersAndInventory } from './seedData';

const db = getFirestore();

const OPERATIONAL_COLLECTIONS_TO_CLEAR = [
  'notifications',
  'notificationFallbacks',
  'agentDecisionLogs',
  'verificationRequests',
  'taskChats',
  'emergencyAlerts',
  'resourceRequests',
  'crisisStates',
  'postCrisisReports',
];

async function deleteDocsInChunks(refs: FirestoreTypes.DocumentReference[], label: string) {
  let deleted = 0;

  for (let i = 0; i < refs.length; i += 400) {
    const batch = db.batch();
    const chunk = refs.slice(i, i + 400);
    chunk.forEach((ref) => batch.delete(ref));
    await batch.commit();
    deleted += chunk.length;
  }

  console.log(`${label}: deleted ${deleted}`);
  return deleted;
}

async function resetNeedReports() {
  const snapshot = await db.collection('needReports').get();
  const testReportIds = new Set<string>();
  const testReportRefs: FirestoreTypes.DocumentReference[] = [];

  snapshot.docs.forEach((doc) => {
    if (!doc.id.startsWith('seed-report-')) {
      testReportIds.add(doc.id);
      testReportRefs.push(doc.ref);
    }
  });

  await deleteDocsInChunks(testReportRefs, 'needReports test records');
  return testReportIds;
}

async function resetDispatchTasks(testReportIds: Set<string>) {
  const snapshot = await db.collection('dispatchTasks').get();
  const refs = snapshot.docs
    .filter((doc) => {
      const data = doc.data();
      const needReportId = typeof data.needReportId === 'string' ? data.needReportId : '';
      return !doc.id.startsWith('seed-task-') || testReportIds.has(needReportId);
    })
    .map((doc) => doc.ref);

  await deleteDocsInChunks(refs, 'dispatchTasks test records');
}

async function clearOperationalCollections() {
  for (const collectionName of OPERATIONAL_COLLECTIONS_TO_CLEAR) {
    const snapshot = await db.collection(collectionName).limit(2000).get();
    await deleteDocsInChunks(
      snapshot.docs.map((doc) => doc.ref),
      collectionName
    );
  }
}

async function main() {
  const args = process.argv.slice(2);
  const seedCountArg = args.find((arg) => arg.startsWith('--seed-count='));
  const seedCount = Number(seedCountArg?.split('=')[1] || 8);

  if (!Number.isInteger(seedCount) || seedCount < 0 || seedCount > 24) {
    throw new Error('--seed-count must be an integer from 0 to 24');
  }

  console.log('Resetting hackathon demo data...');
  const testReportIds = await resetNeedReports();
  await resetDispatchTasks(testReportIds);
  await clearOperationalCollections();

  console.log(`Rebuilding seed reports/tasks with ${seedCount} reports...`);
  await clearExistingData();
  if (seedCount > 0) {
    await generateSeedReports(seedCount);
  }
  await generateSeedVolunteersAndInventory();

  console.log('Hackathon demo data reset complete.');
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
