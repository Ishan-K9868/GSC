import { getFirestore } from '../config/firebase';
import { ReportStatus, UrgencyLevel, type NeedReport } from '../models/NeedReport';

const ACTIVE_STATUSES = [
  ReportStatus.PENDING,
  ReportStatus.CLASSIFIED,
  ReportStatus.DISPATCHED,
  ReportStatus.IN_PROGRESS,
];

type NeedReportWithUrgency = NeedReport & {
  urgencyScore?: number;
  urgencyDecayCount?: number;
  urgencyDecayAlert?: boolean;
  assignedNgoId?: string;
};

export async function runUrgencyDecay(): Promise<{ processed: number; alerted: number }> {
  const db = getFirestore();
  const snapshot = await db
    .collection('needReports')
    .where('status', 'in', ACTIVE_STATUSES)
    .where('urgencyScore', '>', 0)
    .get();

  let processed = 0;
  let alerted = 0;

  for (const doc of snapshot.docs) {
    const report = doc.data() as NeedReportWithUrgency;
    const currentScore = Number(report.urgencyScore || 0);

    if (!Number.isFinite(currentScore) || currentScore <= 0) {
      continue;
    }

    processed += 1;
    const nextDecayCount = (report.urgencyDecayCount || 0) + 1;
    const nextScore = Number((currentScore * 1.05).toFixed(2));
    const reachedAlertThreshold = nextDecayCount >= 4;

    await doc.ref.update({
      urgencyScore: nextScore,
      urgencyDecayCount: nextDecayCount,
      ...(reachedAlertThreshold
        ? {
            urgency: UrgencyLevel.CRITICAL,
            urgencyDecayAlert: true,
          }
        : {}),
      updatedAt: new Date().toISOString(),
    });

    if (reachedAlertThreshold && !report.urgencyDecayAlert) {
      alerted += 1;
      await db.collection('notifications').add({
        ngoId: report.assignedNgoId || null,
        needReportId: doc.id,
        type: 'urgency_decay_alert',
        message:
          'This need has remained unresolved for over 2 hours. Urgency has been escalated to critical for coordinator review.',
        createdAt: new Date().toISOString(),
        read: false,
      });
    }
  }

  return { processed, alerted };
}

async function main() {
  const result = await runUrgencyDecay();
  console.log(`Urgency decay processed ${result.processed} reports and raised ${result.alerted} alerts.`);
}

if (require.main === module) {
  void main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Urgency decay failed:', error);
      process.exit(1);
    });
}
