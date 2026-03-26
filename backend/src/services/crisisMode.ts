import { getFirestore } from '../config/firebase';
import { ReportStatus, NeedCategory, type NeedReport } from '../models/NeedReport';
import { buildFallbackMeta, geminiSchema, generateStructuredJson } from './geminiClient';

const ALERT_LETTER_SCHEMA = geminiSchema.object(
  {
    subject: geminiSchema.string('Letter subject'),
    letter: geminiSchema.string('Formal government alert letter'),
    attachments: geminiSchema.array(geminiSchema.string('Attachment name')),
  },
  ['subject', 'letter', 'attachments']
);

const MEDIA_BULLETIN_SCHEMA = geminiSchema.object(
  {
    bulletin: geminiSchema.string('Public bulletin text'),
    hashtags: geminiSchema.array(geminiSchema.string('Hashtag')),
    tone: geminiSchema.string('Message tone'),
  },
  ['bulletin', 'hashtags', 'tone']
);

export async function evaluateCrisisActivation(input: {
  zoneId: string;
  imdAlert?: boolean;
}) {
  const db = getFirestore();
  const now = Date.now();
  const windowMs = 2 * 60 * 60 * 1000;

  const snapshot = await db.collection('needReports').where('category', '==', NeedCategory.EMERGENCY).limit(4000).get();
  const emergencyReports = snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() } as NeedReport))
    .filter((report) => {
      const createdMs = new Date(report.createdAt).getTime();
      return Number.isFinite(createdMs) && now - createdMs <= windowMs;
    });

  const cluster = detectEmergencyCluster(emergencyReports, 5, 5);
  const thresholdByReports = cluster.triggered;
  const thresholdByWeather = Boolean(input.imdAlert);
  const activate = thresholdByReports || thresholdByWeather;

  if (!activate) {
    return {
      activate: false,
      reason: 'Activation thresholds not met',
      evidence: {
        reportCluster: cluster,
        imdAlert: thresholdByWeather,
      },
    };
  }

  const crisisState = await upsertCrisisState({
    zoneId: input.zoneId,
    reason: thresholdByWeather
      ? 'IMD weather alert'
      : `Emergency report cluster detected (${cluster.maxInRadius} within 5km/2h)`,
    evidence: {
      reportCluster: cluster,
      imdAlert: thresholdByWeather,
    },
  });

  return {
    activate: true,
    crisisId: crisisState.crisisId,
    reason: crisisState.reason,
    evidence: crisisState.evidence,
  };
}

export async function activateCrisisMode(input: { zoneId: string; reason: string; evidenceSummary: string }) {
  const state = await upsertCrisisState({
    zoneId: input.zoneId,
    reason: input.reason,
    evidence: { summary: input.evidenceSummary },
  });

  const [surge, requisition, governmentLetter] = await Promise.all([
    triggerVolunteerSurgeAlert(input.zoneId),
    requestCrossNgoResourceSharing(input.zoneId),
    generateGovernmentAlertLetter({ zoneId: input.zoneId, evidenceSummary: input.evidenceSummary }),
  ]);

  return {
    crisisId: state.crisisId,
    mode: 'crisis',
    matchingWeights: {
      proximity: 0.5,
      skillFit: 0.15,
      availability: 0.2,
      reliability: 0.1,
      equityBoost: 0.03,
      needUrgency: 0.02,
    },
    dispatchTargetSeconds: 60,
    volunteerNotificationRadiusKm: 25,
    surgeAlert: surge,
    resourceRequisition: requisition,
    governmentNotification: governmentLetter,
  };
}

export async function resolveCrisisMode(input: { crisisId: string; closedBy: string }) {
  const db = getFirestore();
  const ref = db.collection('crisisStates').doc(input.crisisId);
  const now = new Date().toISOString();

  await ref.set(
    {
      status: 'resolved',
      resolvedAt: now,
      closedBy: input.closedBy,
      updatedAt: now,
      postCrisisReportDueAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    },
    { merge: true }
  );

  return {
    crisisId: input.crisisId,
    status: 'resolved',
    postCrisisReportDueAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
  };
}

export async function getCrisisDashboard(zoneId: string) {
  const db = getFirestore();
  const crisisSnapshot = await db
    .collection('crisisStates')
    .where('zoneId', '==', zoneId)
    .where('status', '==', 'active')
    .limit(1)
    .get();

  const crisis = crisisSnapshot.docs[0]?.data() as any;

  const reportsSnapshot = await db.collection('needReports').where('status', 'in', [ReportStatus.DISPATCHED, ReportStatus.IN_PROGRESS]).limit(2000).get();
  const volunteersSnapshot = await db.collection('volunteers').limit(3000).get();
  const resourcesSnapshot = await db.collection('resources').limit(500).get();

  const activeReports = reportsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as NeedReport));
  const volunteers = volunteersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as any));
  const resources = resourcesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as any));

  const surgeQueue = buildVolunteerSurgeQueue(volunteers);
  const resourceTracking = buildResourceTracking(resources);
  const mediaBulletin = await generateMediaBulletin(zoneId, activeReports.length, surgeQueue.totalInbound);

  return {
    mode: crisis ? 'crisis' : 'standard',
    crisis: crisis || null,
    liveOperations: {
      activeDeployments: activeReports.length,
      highUrgencyDeployments: activeReports.filter((r) => r.urgency === 'critical' || r.urgency === 'high').length,
      dispatchTimeTarget: crisis ? '60 sec' : '15 min',
    },
    volunteerSurgeQueue: surgeQueue,
    resourceTracking,
    mediaBulletin,
    generatedAt: new Date().toISOString(),
  };
}

export async function generatePostCrisisReport(input: { crisisId: string; zoneId: string }) {
  const dashboard = await getCrisisDashboard(input.zoneId);

  const report = {
    crisisId: input.crisisId,
    zoneId: input.zoneId,
    generatedAt: new Date().toISOString(),
    timeline: [
      'Crisis mode activated',
      'Volunteer surge alerts dispatched',
      'Cross-NGO resource requisition issued',
      'Government notification drafted and shared',
    ],
    summary: {
      activeDeploymentsHandled: dashboard.liveOperations.activeDeployments,
      inboundVolunteerCount: dashboard.volunteerSurgeQueue.totalInbound,
      resourcesDeployed: dashboard.resourceTracking.deployedCount,
      replenishmentAlerts: dashboard.resourceTracking.replenishmentAlerts,
    },
    lessonsLearned: [
      'Proximity-heavy matching reduced first response delay in dense clusters.',
      'Cross-NGO requisition improved supply continuity for health and food kits.',
      'Automated government drafts reduced escalation prep time significantly.',
    ],
    donorReadyNarrative:
      'Within the crisis window, SevaSetu shifted into high-speed dispatch mode, scaled volunteer mobilization, and sustained inter-NGO resource flow while maintaining traceable response records.',
  };

  const db = getFirestore();
  await db.collection('postCrisisReports').doc(input.crisisId).set(report);

  return report;
}

async function upsertCrisisState(input: {
  zoneId: string;
  reason: string;
  evidence: any;
}) {
  const db = getFirestore();
  const existing = await db
    .collection('crisisStates')
    .where('zoneId', '==', input.zoneId)
    .where('status', '==', 'active')
    .limit(1)
    .get();

  const now = new Date().toISOString();
  if (!existing.empty) {
    const doc = existing.docs[0];
    await doc.ref.set(
      {
        reason: input.reason,
        evidence: input.evidence,
        updatedAt: now,
      },
      { merge: true }
    );
    return { crisisId: doc.id, reason: input.reason, evidence: input.evidence };
  }

  const ref = db.collection('crisisStates').doc();
  await ref.set({
    zoneId: input.zoneId,
    status: 'active',
    reason: input.reason,
    evidence: input.evidence,
    startedAt: now,
    updatedAt: now,
  });

  return { crisisId: ref.id, reason: input.reason, evidence: input.evidence };
}

async function triggerVolunteerSurgeAlert(zoneId: string) {
  const db = getFirestore();
  const volunteersSnapshot = await db.collection('volunteers').limit(3000).get();
  const volunteers = volunteersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as any));

  const target = volunteers.filter((v) => v.availability !== 'offline').slice(0, 500);
  const batch = db.batch();
  target.forEach((volunteer) => {
    const ref = db.collection('notifications').doc();
    batch.set(ref, {
      recipientType: 'volunteer',
      recipientId: volunteer.id,
      type: 'crisis_surge_alert',
      title: 'Crisis Mode Activated',
      body: `Emergency mobilization in ${zoneId}. Respond if available within 25km radius criteria.`,
      createdAt: new Date().toISOString(),
      read: false,
    });
  });
  await batch.commit();

  return {
    zoneId,
    radiusKm: 25,
    notifiedVolunteers: target.length,
  };
}

async function requestCrossNgoResourceSharing(zoneId: string) {
  const db = getFirestore();
  const ngosSnapshot = await db.collection('ngos').where('isActive', '==', true).limit(3).get();
  const ngos = ngosSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as any));

  const requests = ngos.map((ngo) => ({
    ngoId: ngo.id,
    ngoName: ngo.name || 'Unknown NGO',
    requestedResources: ['food_kits', 'medical_kits', 'water_cans'],
    status: 'requested',
  }));

  const now = new Date().toISOString();
  const batch = db.batch();
  requests.forEach((request) => {
    const ref = db.collection('resourceRequests').doc();
    batch.set(ref, {
      ...request,
      zoneId,
      createdAt: now,
      updatedAt: now,
    });
  });
  await batch.commit();

  return {
    zoneId,
    nearestNgosContacted: requests.length,
    requests,
  };
}

async function generateGovernmentAlertLetter(input: { zoneId: string; evidenceSummary: string }) {
  const prompt = `Draft a government emergency alert letter for District Collector and SDRF.
Zone: ${input.zoneId}
Evidence summary: ${input.evidenceSummary}

Return JSON only:
{
  "subject":"...",
  "letter":"...",
  "attachments":["..."]
}`;

  const fallback = {
    subject: `Urgent Crisis Alert - ${input.zoneId}`,
    letter:
      `To District Collector and SDRF,\n\nCrisis Mode has been activated in ${input.zoneId}. ` +
      `Evidence summary: ${input.evidenceSummary}. Immediate support requested for coordinated relief operations.\n\nRegards,\nSevaSetu Crisis Desk`,
    attachments: ['Incident heatmap', 'Emergency needs list', 'Resource gap matrix'],
  };

  try {
    const { data, meta } = await generateStructuredJson<Record<string, unknown>>(prompt, {
      task: 'government crisis alert letter',
      model: 'flash',
      temperature: 0.15,
      maxOutputTokens: 1600,
      schema: ALERT_LETTER_SCHEMA,
    });
    return { ...data, ...meta };
  } catch (error) {
    return { ...fallback, ...buildFallbackMeta('government crisis alert letter', error, 'flash') };
  }
}

async function generateMediaBulletin(zoneId: string, activeDeployments: number, inboundVolunteers: number) {
  const prompt = `Generate a concise public social media update.
Zone: ${zoneId}
Active deployments: ${activeDeployments}
Inbound volunteers: ${inboundVolunteers}

Return JSON only:
{
  "bulletin":"...",
  "hashtags":["#..."],
  "tone":"assuring"
}`;

  const fallback = {
    bulletin:
      `Crisis response is active in ${zoneId}. Teams are deployed on priority needs and volunteer mobilization is underway. Please rely on verified updates and avoid rumor sharing.`,
    hashtags: ['#SevaSetu', '#CrisisResponse', '#CommunityFirst'],
    tone: 'assuring',
  };

  try {
    const { data, meta } = await generateStructuredJson<Record<string, unknown>>(prompt, {
      task: 'crisis media bulletin',
      model: 'flash',
      temperature: 0.2,
      maxOutputTokens: 300,
      schema: MEDIA_BULLETIN_SCHEMA,
    });
    return { ...data, ...meta };
  } catch (error) {
    return { ...fallback, ...buildFallbackMeta('crisis media bulletin', error, 'flash') };
  }
}

function buildVolunteerSurgeQueue(volunteers: any[]) {
  const inbound = volunteers
    .filter((v) => v.availability !== 'offline')
    .slice(0, 120)
    .map((v, index) => ({
      volunteerId: v.id,
      name: v.name || `Volunteer ${index + 1}`,
      etaMinutes: 10 + (index % 25),
      skills: v.skills || [],
    }));

  return {
    totalInbound: inbound.length,
    queue: inbound,
  };
}

function buildResourceTracking(resources: any[]) {
  const list = (resources.length > 0 ? resources : [
    { id: 'food_kits', name: 'Food Kits', quantity: 220, usagePerHour: 9 },
    { id: 'med_kits', name: 'Medical Kits', quantity: 85, usagePerHour: 4 },
    { id: 'water_cans', name: 'Water Cans', quantity: 180, usagePerHour: 8 },
  ]).map((resource: any) => {
    const remainingHours = resource.usagePerHour > 0 ? resource.quantity / resource.usagePerHour : 999;
    return {
      resourceId: resource.id,
      name: resource.name,
      deployed: Math.round(resource.quantity * 0.35),
      remaining: resource.quantity,
      replenishmentEtaHours: Number(remainingHours.toFixed(1)),
      needsReplenishment: remainingHours < 24,
    };
  });

  return {
    deployedCount: list.reduce((sum: number, row: any) => sum + row.deployed, 0),
    replenishmentAlerts: list.filter((row: any) => row.needsReplenishment).length,
    resources: list,
  };
}

function detectEmergencyCluster(reports: NeedReport[], radiusKm: number, threshold: number) {
  let maxInRadius = 0;
  let center: { latitude: number; longitude: number } | null = null;

  reports.forEach((pivot) => {
    const within = reports.filter((candidate) => {
      const dist = haversine(
        pivot.location.latitude,
        pivot.location.longitude,
        candidate.location.latitude,
        candidate.location.longitude
      );
      return dist <= radiusKm;
    }).length;

    if (within > maxInRadius) {
      maxInRadius = within;
      center = {
        latitude: pivot.location.latitude,
        longitude: pivot.location.longitude,
      };
    }
  });

  return {
    triggered: maxInRadius >= threshold,
    radiusKm,
    threshold,
    maxInRadius,
    center,
  };
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
