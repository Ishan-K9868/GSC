import { getFirestore } from '../config/firebase';
import { ReportStatus, type NeedReport } from '../models/NeedReport';
import {
  DispatchTaskStatus,
  type DispatchDecision,
  type DispatchTask,
} from '../models/DispatchTask';
import { computeVolunteerMatches } from './matchingEngine';

const INVITE_TIMEOUT_MS = 5 * 60 * 1000;
const ESCALATION_TIMEOUT_MS = 15 * 60 * 1000;

export interface AgentRunResult {
  success: boolean;
  taskId?: string;
  message: string;
}

export async function triggerSevaAgentForReport(reportId: string): Promise<AgentRunResult> {
  const db = getFirestore();
  const reportDoc = await db.collection('needReports').doc(reportId).get();

  if (!reportDoc.exists) {
    return { success: false, message: 'Need report not found' };
  }

  const report = reportDoc.data() as NeedReport;
  const matches = await computeVolunteerMatches({ ...report, id: reportId });

  const now = new Date().toISOString();
  const taskRef = db.collection('dispatchTasks').doc();

  const task: DispatchTask = {
    id: taskRef.id,
    needReportId: reportId,
    needDescription: report.description,
    category: report.category,
    urgency: report.urgency,
    status: matches.top3.length > 0 ? DispatchTaskStatus.INVITED : DispatchTaskStatus.ESCALATED,
    candidateVolunteerIds: matches.top3.map((m) => m.volunteerId),
    rankedDecisions: matches.top20,
    currentInviteIndex: 0,
    escalated: matches.top3.length === 0,
    escalatedReason: matches.top3.length === 0 ? 'No eligible volunteers found' : undefined,
    escalatedAt: matches.top3.length === 0 ? now : undefined,
    coordinatorOverride: { overridden: false },
    invitationHistory: [],
    createdAt: now,
    updatedAt: now,
  };

  if (matches.top3.length > 0) {
    const firstDecision = matches.top3[0];
    task.invitationHistory.push({
      volunteerId: firstDecision.volunteerId,
      invitedAt: now,
      status: 'pending',
    });

    await notifyVolunteer(firstDecision, reportId, 'primary');
  }

  await taskRef.set(toFirestoreSafe(task));

  await logAgentDecision({
    reportId,
    taskId: taskRef.id,
    type: matches.top3.length > 0 ? 'initial_dispatch' : 'escalation',
    message:
      matches.top3.length > 0
        ? `I matched ${matches.top3[0].volunteerName} because they ranked highest across proximity, skills, and reliability.`
        : 'I could not find an eligible volunteer in the top candidates, so I escalated this case to the coordinator.',
    top3: matches.top3,
  });

  if (matches.top3.length > 0) {
    await db.collection('needReports').doc(reportId).update({
      status: ReportStatus.DISPATCHED,
      assignedVolunteerId: matches.top3[0].volunteerId,
      updatedAt: now,
    });
  }

  return {
    success: true,
    taskId: taskRef.id,
    message: matches.top3.length > 0 ? 'SEVA Agent dispatched top candidate' : 'SEVA Agent escalated to coordinator',
  };
}

export async function respondToDispatchInvite(
  taskId: string,
  volunteerId: string,
  action: 'accept' | 'decline'
): Promise<AgentRunResult> {
  const db = getFirestore();
  const taskRef = db.collection('dispatchTasks').doc(taskId);
  const taskDoc = await taskRef.get();

  if (!taskDoc.exists) {
    return { success: false, message: 'Dispatch task not found' };
  }

  const task = taskDoc.data() as DispatchTask;
  const now = new Date().toISOString();

  const activeInvite = task.invitationHistory.find(
    (invite) => invite.volunteerId === volunteerId && invite.status === 'pending'
  );

  if (!activeInvite) {
    return { success: false, message: 'No active invitation for volunteer' };
  }

  activeInvite.status = action === 'accept' ? 'accepted' : 'declined';
  activeInvite.respondedAt = now;

  if (action === 'accept') {
    task.status = DispatchTaskStatus.ACCEPTED;
    task.acceptedVolunteerId = volunteerId;
    task.acceptedAt = now;

    await db.collection('needReports').doc(task.needReportId).update({
      assignedVolunteerId: volunteerId,
      status: ReportStatus.IN_PROGRESS,
      updatedAt: now,
    });

    const acceptedDecision = task.rankedDecisions.find((item) => item.volunteerId === volunteerId);
    await logAgentDecision({
      reportId: task.needReportId,
      taskId,
      type: 'accepted',
      message: acceptedDecision
        ? `Volunteer ${acceptedDecision.volunteerName} accepted the task. Assignment confirmed.`
        : `Volunteer ${volunteerId} accepted the task. Assignment confirmed.`,
      top3: task.rankedDecisions.slice(0, 3),
    });
  } else {
    await advanceDispatchCascade(task);

    const nextVolunteerId = task.candidateVolunteerIds[task.currentInviteIndex];
    await logAgentDecision({
      reportId: task.needReportId,
      taskId,
      type: task.status === DispatchTaskStatus.ESCALATED ? 'escalation' : 'cascade',
      message:
        task.status === DispatchTaskStatus.ESCALATED
          ? 'Current invite declined and no further candidates were available. Escalated to coordinator.'
          : `Current invite declined. Auto-cascaded to next ranked volunteer ${nextVolunteerId}.`,
      top3: task.rankedDecisions.slice(0, 3),
    });
  }

  task.updatedAt = now;
  await taskRef.set(toFirestoreSafe(task), { merge: true });

  return {
    success: true,
    taskId,
    message: action === 'accept' ? 'Invitation accepted and task confirmed' : 'Invitation declined and cascade advanced',
  };
}

export async function runDispatchHeartbeat(): Promise<{ processed: number; escalated: number }> {
  const db = getFirestore();
  const now = Date.now();

  const tasksSnapshot = await db
    .collection('dispatchTasks')
    .where('status', '==', DispatchTaskStatus.INVITED)
    .limit(100)
    .get();

  let processed = 0;
  let escalated = 0;

  for (const doc of tasksSnapshot.docs) {
    const task = doc.data() as DispatchTask;
    const latest = [...task.invitationHistory].reverse().find((item) => item.status === 'pending');
    if (!latest) continue;

    const invitedAtMs = new Date(latest.invitedAt).getTime();
    const sinceInvite = now - invitedAtMs;

    if (sinceInvite >= INVITE_TIMEOUT_MS) {
      latest.status = 'expired';
      latest.respondedAt = new Date().toISOString();

      const shouldEscalate = sinceInvite >= ESCALATION_TIMEOUT_MS;
      if (shouldEscalate) {
        task.status = DispatchTaskStatus.ESCALATED;
        task.escalated = true;
        task.escalatedAt = new Date().toISOString();
        task.escalatedReason = 'No volunteer accepted within 15 minutes';
        escalated += 1;
      } else {
        await advanceDispatchCascade(task);
      }

      task.updatedAt = new Date().toISOString();
      await doc.ref.set(toFirestoreSafe(task), { merge: true });
      processed += 1;
    }
  }

  return { processed, escalated };
}

async function advanceDispatchCascade(task: DispatchTask): Promise<void> {
  const nextIndex = task.currentInviteIndex + 1;
  const nextVolunteerId = task.candidateVolunteerIds[nextIndex];

  if (!nextVolunteerId) {
    task.status = DispatchTaskStatus.ESCALATED;
    task.escalated = true;
    task.escalatedAt = new Date().toISOString();
    task.escalatedReason = 'Top 3 volunteers unavailable/declined';
    return;
  }

  const nextDecision = task.rankedDecisions.find((d) => d.volunteerId === nextVolunteerId);
  if (!nextDecision) {
    task.status = DispatchTaskStatus.ESCALATED;
    task.escalated = true;
    task.escalatedAt = new Date().toISOString();
    task.escalatedReason = 'Next ranked decision missing';
    return;
  }

  task.currentInviteIndex = nextIndex;
  task.status = DispatchTaskStatus.INVITED;
  task.invitationHistory.push({
    volunteerId: nextVolunteerId,
    invitedAt: new Date().toISOString(),
    status: 'pending',
  });

  await notifyVolunteer(nextDecision, task.needReportId, 'primary');
}

export async function coordinatorOverrideDispatch(
  taskId: string,
  coordinatorId: string,
  selectedVolunteerId: string,
  reason: string
): Promise<AgentRunResult> {
  const db = getFirestore();
  const taskRef = db.collection('dispatchTasks').doc(taskId);
  const taskDoc = await taskRef.get();

  if (!taskDoc.exists) {
    return { success: false, message: 'Dispatch task not found' };
  }

  const task = taskDoc.data() as DispatchTask;
  const now = new Date().toISOString();

  task.coordinatorOverride = {
    overridden: true,
    coordinatorId,
    reason,
    selectedVolunteerId,
    at: now,
  };
  task.acceptedVolunteerId = selectedVolunteerId;
  task.acceptedAt = now;
  task.status = DispatchTaskStatus.ACCEPTED;
  task.updatedAt = now;

  await taskRef.set(toFirestoreSafe(task), { merge: true });
  await db.collection('needReports').doc(task.needReportId).update({
    assignedVolunteerId: selectedVolunteerId,
    status: ReportStatus.IN_PROGRESS,
    updatedAt: now,
  });

  await logAgentDecision({
    reportId: task.needReportId,
    taskId,
    type: 'override',
    message: `Coordinator override applied. Selected volunteer ${selectedVolunteerId}. Reason: ${reason}`,
    top3: task.rankedDecisions.slice(0, 3),
  });

  return {
    success: true,
    taskId,
    message: 'Coordinator override applied successfully',
  };
}

async function notifyVolunteer(
  decision: DispatchDecision,
  reportId: string,
  channel: 'primary' | 'secondary' | 'tertiary'
): Promise<void> {
  const db = getFirestore();

  await db.collection('notifications').add({
    recipientType: 'volunteer',
    recipientId: decision.volunteerId,
    reportId,
    channel,
    title: 'New task invitation',
    body: decision.explanation,
    deepLink: `/tasks/${reportId}`,
    createdAt: new Date().toISOString(),
    read: false,
  });

  if (channel === 'primary') {
    await db.collection('notificationFallbacks').add({
      reportId,
      volunteerId: decision.volunteerId,
      whatsappAfterMs: 2 * 60 * 1000,
      smsAfterMs: 4 * 60 * 1000,
      status: 'scheduled',
      createdAt: new Date().toISOString(),
    });
  }
}

async function logAgentDecision(input: {
  reportId: string;
  taskId: string;
  type: 'initial_dispatch' | 'cascade' | 'accepted' | 'escalation' | 'override';
  message: string;
  top3: DispatchDecision[];
}): Promise<void> {
  const db = getFirestore();
  await db.collection('agentDecisionLogs').add({
    ...input,
    createdAt: new Date().toISOString(),
  });
}

function toFirestoreSafe<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}
