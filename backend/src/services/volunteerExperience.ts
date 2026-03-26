import { getFirestore } from '../config/firebase';
import { NeedCategory, type NeedReport, ReportStatus } from '../models/NeedReport';
import { VolunteerAvailability, type Volunteer } from '../models/Volunteer';
import { buildFallbackMeta, geminiSchema, generateStructuredJson, getModelName } from './geminiClient';
import {
  IdentityVerificationStatus,
  VolunteerTaskState,
  type VolunteerCompletionPayload,
  type VolunteerProfileCard,
} from '../models/VolunteerApp';

const DEFAULT_SDG_INTERESTS = ['SDG 2', 'SDG 3', 'SDG 4'];

const VOLUNTEER_ASSESSMENT_SCHEMA = geminiSchema.object(
  {
    skills: geminiSchema.array(geminiSchema.string('snake_case skill')),
    certifications: geminiSchema.array(geminiSchema.string('snake_case certification')),
    profileCardText: geminiSchema.string('Short profile summary line'),
  },
  ['skills', 'certifications', 'profileCardText']
);

export async function getOrCreateVolunteerProfile(volunteerId: string, fallbackName = 'Volunteer') {
  const db = getFirestore();
  const ref = db.collection('volunteerProfiles').doc(volunteerId);
  const doc = await ref.get();

  if (doc.exists) {
    return doc.data() as VolunteerProfileCard;
  }

  const now = new Date().toISOString();
  const profile: VolunteerProfileCard = {
    volunteerId,
    displayName: fallbackName,
    languages: ['en', 'hi'],
    skills: [],
    verifiedCertifications: [],
    sdgInterests: DEFAULT_SDG_INTERESTS,
    impactStats: {
      tasksCompleted: 0,
      beneficiariesImpacted: 0,
      sevaPoints: 0,
      badges: [],
    },
    identityVerificationStatus: IdentityVerificationStatus.NOT_PROVIDED,
    weeklyHourLimit: 8,
    availabilityCalendar: [
      { day: 'Mon', isAvailable: true, slots: ['18:00-20:00'] },
      { day: 'Tue', isAvailable: true, slots: ['18:00-20:00'] },
      { day: 'Wed', isAvailable: false, slots: [] },
      { day: 'Thu', isAvailable: true, slots: ['18:00-20:00'] },
      { day: 'Fri', isAvailable: true, slots: ['18:00-20:00'] },
      { day: 'Sat', isAvailable: true, slots: ['09:00-12:00'] },
      { day: 'Sun', isAvailable: false, slots: [] },
    ],
    updatedAt: now,
  };

  await ref.set(profile);
  return profile;
}

export async function runSkillAssessment(volunteerId: string, answers: string[]) {
  const db = getFirestore();
  const normalized = answers.map((a) => a.toLowerCase()).join(' ');

  const fallbackSkills = inferSkills(normalized);
  const fallbackCertifications = inferCertifications(normalized);
  const prompt = `You are assessing a volunteer's field readiness for an NGO response platform.
Volunteer freeform answers: ${answers.join(' | ')}

Return JSON only:
{
  "skills": ["snake_case_skill"],
  "certifications": ["snake_case_certification"],
  "profileCardText": "short summary line"
}`;

  let skills = fallbackSkills;
  let certifications = fallbackCertifications;
  let profileCardText: string | null = null;
  let warning: string | null = null;

  try {
    const { data } = await generateStructuredJson<Record<string, unknown>>(prompt, {
      task: 'volunteer skill assessment',
      model: 'flash',
      temperature: 0.2,
      maxOutputTokens: 300,
      schema: VOLUNTEER_ASSESSMENT_SCHEMA,
    });

    skills = normalizeStringArray(data.skills, fallbackSkills);
    certifications = normalizeStringArray(data.certifications, fallbackCertifications);
    profileCardText = typeof data.profileCardText === 'string' ? data.profileCardText : null;
  } catch (error) {
    warning = buildFallbackMeta('volunteer skill assessment', error, 'flash').warning || null;
  }

  const ref = db.collection('volunteerProfiles').doc(volunteerId);
  const profile = await getOrCreateVolunteerProfile(volunteerId);

  const updated = {
    ...profile,
    skills,
    verifiedCertifications: certifications,
    updatedAt: new Date().toISOString(),
  };

  await ref.set(updated, { merge: true });

  return {
    skills,
    certifications,
    profileCardText: profileCardText || `${updated.displayName} · ${skills.join(', ')} · ${updated.languages.join(', ')}`,
    ...(warning
      ? { warning, degraded: true, provider: 'fallback' as const, model: getModelName('flash') }
      : { degraded: false, provider: 'gemini_api_key' as const, model: getModelName('flash') }),
  };
}

export async function updateVolunteerInterestsAndAvailability(input: {
  volunteerId: string;
  sdgInterests?: string[];
  weeklyHourLimit?: number;
  availabilityCalendar?: Array<{ day: string; isAvailable: boolean; slots: string[] }>;
}) {
  const db = getFirestore();
  const profile = await getOrCreateVolunteerProfile(input.volunteerId);

  const updated = {
    ...profile,
    sdgInterests: input.sdgInterests || profile.sdgInterests,
    weeklyHourLimit: input.weeklyHourLimit || profile.weeklyHourLimit,
    availabilityCalendar: input.availabilityCalendar || profile.availabilityCalendar,
    updatedAt: new Date().toISOString(),
  };

  await db.collection('volunteerProfiles').doc(input.volunteerId).set(updated, { merge: true });
  return updated;
}

export async function getVolunteerTaskFeed(volunteerId: string) {
  const db = getFirestore();
  const volunteerDoc = await db.collection('volunteers').doc(volunteerId).get();
  const volunteer = volunteerDoc.exists ? ({ id: volunteerDoc.id, ...volunteerDoc.data() } as Volunteer) : null;

  const reportsSnapshot = await db
    .collection('needReports')
    .orderBy('createdAt', 'desc')
    .limit(100)
    .get();

  const reports = reportsSnapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() } as NeedReport))
    .filter(
      (report) =>
        report.status === ReportStatus.DISPATCHED ||
        report.status === ReportStatus.IN_PROGRESS ||
        report.status === ReportStatus.CLASSIFIED
    );
  const tasks = reports.map((report) => buildTaskCard(report, volunteer));

  return tasks;
}

export async function acceptVolunteerTask(taskId: string, volunteerId: string) {
  const db = getFirestore();
  await ensureVolunteerRecord(volunteerId);
  const reportRef = db.collection('needReports').doc(taskId);
  const reportDoc = await reportRef.get();

  if (!reportDoc.exists) {
    throw new Error('Task report not found');
  }

  await reportRef.update({
    assignedVolunteerId: volunteerId,
    status: ReportStatus.IN_PROGRESS,
    updatedAt: new Date().toISOString(),
  });

  await db.collection('volunteers').doc(volunteerId).set(
    {
      availability: VolunteerAvailability.IN_TASK,
      updatedAt: new Date().toISOString(),
      'stats.activeTasks': (await getActiveTasks(volunteerId)) + 1,
      'stats.assignedTasks': (await getAssignedTasks(volunteerId)) + 1,
    },
    { merge: true }
  );

  return { success: true };
}

export async function sendTaskChatMessage(input: {
  taskId: string;
  senderType: 'volunteer' | 'coordinator';
  senderId: string;
  message: string;
}) {
  const db = getFirestore();
  const ref = await db.collection('taskChats').add({
    taskId: input.taskId,
    senderType: input.senderType,
    senderId: input.senderId,
    message: input.message,
    createdAt: new Date().toISOString(),
  });

  return { id: ref.id };
}

export async function getTaskChat(taskId: string) {
  const db = getFirestore();
  const snapshot = await db.collection('taskChats').where('taskId', '==', taskId).limit(200).get();
  return snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .sort((a: any, b: any) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
}

export async function completeVolunteerTask(input: VolunteerCompletionPayload) {
  const db = getFirestore();
  await ensureVolunteerRecord(input.volunteerId);
  const reportRef = db.collection('needReports').doc(input.taskId);
  const reportDoc = await reportRef.get();
  if (!reportDoc.exists) {
    throw new Error('Task report not found');
  }

  const report = { id: reportDoc.id, ...reportDoc.data() } as NeedReport;

  await reportRef.set(
    {
      status: ReportStatus.RESOLVED,
      resolvedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completionEvidence: {
        photoEvidenceUrls: input.photoEvidenceUrls,
        voiceDebriefText: input.voiceDebriefText,
        beneficiaryRating: input.beneficiaryRating || null,
      },
    },
    { merge: true }
  );

  const pointsResult = await awardGamificationPoints({
    volunteerId: input.volunteerId,
    report,
    beneficiaryRating: input.beneficiaryRating,
  });

  await db.collection('volunteers').doc(input.volunteerId).set(
    {
      availability: VolunteerAvailability.FREE,
      updatedAt: new Date().toISOString(),
      'stats.activeTasks': Math.max(0, (await getActiveTasks(input.volunteerId)) - 1),
      'stats.completedTasks': (await getCompletedTasks(input.volunteerId)) + 1,
    },
    { merge: true }
  );

  return {
    success: true,
    pointsAwarded: pointsResult.pointsAwarded,
    totalPoints: pointsResult.totalPoints,
    badgesUnlocked: pointsResult.badgesUnlocked,
    impactMilestone: pointsResult.impactMilestone,
  };
}

export async function getGamificationSummary(volunteerId: string) {
  const profile = await getOrCreateVolunteerProfile(volunteerId);
  const squad = await getOrCreateDefaultSquad(volunteerId, profile.displayName);
  const league = await getCorporateLeagueSnapshot();

  return {
    sevaPoints: profile.impactStats.sevaPoints,
    badges: profile.impactStats.badges,
    tasksCompleted: profile.impactStats.tasksCompleted,
    beneficiariesImpacted: profile.impactStats.beneficiariesImpacted,
    impactMilestone: buildMilestoneText(profile.impactStats.beneficiariesImpacted),
    squad,
    corporateLeague: league,
    sevaPassport: {
      credentialId: `SSP-${volunteerId.slice(0, 6).toUpperCase()}-${profile.impactStats.tasksCompleted}`,
      anchored: true,
      shareText: `Verified ${profile.impactStats.tasksCompleted} Seva tasks with ${profile.impactStats.beneficiariesImpacted} people impacted.`,
    },
  };
}

async function awardGamificationPoints(input: {
  volunteerId: string;
  report: NeedReport;
  beneficiaryRating?: number;
}) {
  const profile = await getOrCreateVolunteerProfile(input.volunteerId);
  const urgencyMultiplier = getUrgencyMultiplier(input.report.urgency);
  const ratingMultiplier = input.beneficiaryRating ? Math.max(0.8, input.beneficiaryRating / 4) : 1;
  const base = 120;
  const pointsAwarded = Math.round(base * urgencyMultiplier * ratingMultiplier);

  const beneficiaries = input.report.estimatedPeopleAffected || 15;
  const updatedStats = {
    tasksCompleted: profile.impactStats.tasksCompleted + 1,
    beneficiariesImpacted: profile.impactStats.beneficiariesImpacted + beneficiaries,
    sevaPoints: profile.impactStats.sevaPoints + pointsAwarded,
    badges: [...profile.impactStats.badges],
  };

  const badgesUnlocked = evaluateBadges(updatedStats);
  badgesUnlocked.forEach((badge) => {
    if (!updatedStats.badges.includes(badge)) {
      updatedStats.badges.push(badge);
    }
  });

  const updatedProfile = {
    ...profile,
    impactStats: updatedStats,
    updatedAt: new Date().toISOString(),
  };

  const db = getFirestore();
  await db.collection('volunteerProfiles').doc(input.volunteerId).set(updatedProfile, { merge: true });

  return {
    pointsAwarded,
    totalPoints: updatedStats.sevaPoints,
    badgesUnlocked,
    impactMilestone: buildMilestoneText(updatedStats.beneficiariesImpacted),
  };
}

function inferSkills(answerBlob: string): string[] {
  const pool = [
    { key: 'first aid', skill: 'first_aid' },
    { key: 'medical', skill: 'medical_assistance' },
    { key: 'child', skill: 'child_safety' },
    { key: 'flood', skill: 'flood_relief' },
    { key: 'sanitation', skill: 'water_sanitation' },
    { key: 'nutrition', skill: 'nutrition_support' },
    { key: 'rescue', skill: 'rescue_ops' },
  ];

  const skills = pool.filter((item) => answerBlob.includes(item.key)).map((item) => item.skill);
  return skills.length > 0 ? skills : ['community_outreach', 'basic_response'];
}

function inferCertifications(answerBlob: string): string[] {
  const certs: string[] = [];
  if (answerBlob.includes('first aid') || answerBlob.includes('cpr')) certs.push('first_aid_certified');
  if (answerBlob.includes('child')) certs.push('child_safety_trained');
  if (answerBlob.includes('flood')) certs.push('flood_relief_ready');
  return certs;
}

function normalizeStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const items = value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter(Boolean);

  return items.length > 0 ? Array.from(new Set(items)) : fallback;
}

async function ensureVolunteerRecord(volunteerId: string) {
  const db = getFirestore();
  const volunteerRef = db.collection('volunteers').doc(volunteerId);
  const volunteerDoc = await volunteerRef.get();

  if (volunteerDoc.exists) {
    return { id: volunteerDoc.id, ...volunteerDoc.data() } as Volunteer;
  }

  const profile = await getOrCreateVolunteerProfile(volunteerId);
  const now = new Date().toISOString();
  const volunteer: Volunteer = {
    id: volunteerId,
    userId: volunteerId,
    name: profile.displayName,
    phoneNumber: '+919999999999',
    preferredLanguage: profile.languages[0] || 'hi',
    isActive: true,
    location: {
      latitude: 28.6139,
      longitude: 77.209,
      district: 'New Delhi',
      state: 'Delhi',
      updatedAt: now,
    },
    skills: profile.skills,
    categories: [],
    certifications: profile.verifiedCertifications,
    availability: VolunteerAvailability.FREE,
    maxServiceableDistanceKm: 25,
    supportsUnderservedZones: false,
    ngoVolunteerCount: 0,
    stats: {
      assignedTasks: 0,
      completedTasks: 0,
      avgBeneficiaryRating: 4,
      reliabilityScore: 0.8,
      activeTasks: 0,
      last90dAssignedTasks: 0,
      last90dCompletedTasks: 0,
    },
    createdAt: now,
    updatedAt: now,
  };

  await volunteerRef.set(volunteer);
  return volunteer;
}

function buildTaskCard(report: NeedReport, volunteer: Volunteer | null) {
  const distanceKm = volunteer
    ? haversine(
        volunteer.location.latitude,
        volunteer.location.longitude,
        report.location.latitude,
        report.location.longitude
      )
    : 4.5;

  return {
    id: report.id || '',
    reportId: report.id || '',
    category: report.category,
    urgency: report.urgency,
    location: report.location,
    language: volunteer?.preferredLanguage || 'en',
    title: `${humanizeCategory(report.category)} Support Needed`,
    summary: report.description,
    distanceKm: Number(distanceKm.toFixed(1)),
    estimatedTimeMinutes: estimateTaskDuration(report.category, report.urgency),
    requiredSkills: mapRequiredSkills(report.category),
    whatToBring: mapChecklistSupplies(report.category),
    navigationLink: `https://www.google.com/maps/dir/?api=1&destination=${report.location.latitude},${report.location.longitude}`,
    checklist: buildChecklist(report.category),
    state: report.status === ReportStatus.RESOLVED
      ? VolunteerTaskState.COMPLETED
      : report.status === ReportStatus.IN_PROGRESS
        ? VolunteerTaskState.IN_PROGRESS
        : report.assignedVolunteerId
          ? VolunteerTaskState.ACCEPTED
          : VolunteerTaskState.AVAILABLE,
    urgencyMultiplier: getUrgencyMultiplier(report.urgency),
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
  };
}

function buildChecklist(category: string) {
  const lines: Record<string, string[]> = {
    [NeedCategory.EMERGENCY]: ['Reach safely', 'Assess immediate risk', 'Call coordinator update'],
    [NeedCategory.HEALTH]: ['Check patient condition', 'Deliver medicines', 'Capture before-after photo'],
    [NeedCategory.FOOD_NUTRITION]: ['Verify family count', 'Distribute kits', 'Mark beneficiaries'],
    [NeedCategory.EDUCATION]: ['Meet school contact', 'Distribute materials', 'Log attendance support'],
    [NeedCategory.WATER_SANITATION]: ['Inspect source', 'Share hygiene guidance', 'Confirm supply handover'],
    [NeedCategory.SHELTER]: ['Assess shelter damage', 'Provide temporary support', 'Report escalation needs'],
    [NeedCategory.WOMEN_CHILD]: ['Ensure safe environment', 'Connect support services', 'Capture secure notes'],
    [NeedCategory.ENVIRONMENT]: ['Assess site condition', 'Execute cleanup/planting', 'Record outcome photo'],
  };

  return (lines[category] || ['Reach site', 'Assist beneficiary', 'Submit completion']).map((item) => ({ item, done: false }));
}

function mapRequiredSkills(category: string) {
  const skills: Record<string, string[]> = {
    [NeedCategory.EMERGENCY]: ['first_aid', 'rescue_ops'],
    [NeedCategory.HEALTH]: ['medical_assistance'],
    [NeedCategory.FOOD_NUTRITION]: ['distribution', 'community_outreach'],
    [NeedCategory.EDUCATION]: ['teaching_support'],
    [NeedCategory.WATER_SANITATION]: ['water_sanitation'],
    [NeedCategory.SHELTER]: ['relief_support'],
    [NeedCategory.WOMEN_CHILD]: ['child_safety', 'counseling_support'],
    [NeedCategory.ENVIRONMENT]: ['cleanup_drive'],
  };
  return skills[category] || ['community_outreach'];
}

function mapChecklistSupplies(category: string) {
  const supply: Record<string, string[]> = {
    [NeedCategory.EMERGENCY]: ['First-aid kit', 'Flashlight'],
    [NeedCategory.HEALTH]: ['Medical pouch', 'Sanitizer'],
    [NeedCategory.FOOD_NUTRITION]: ['Distribution list', 'Food packets'],
    [NeedCategory.EDUCATION]: ['Stationery kit', 'Learning cards'],
    [NeedCategory.WATER_SANITATION]: ['Water test strips', 'Hygiene pamphlets'],
    [NeedCategory.SHELTER]: ['Tarpaulin sheet', 'Rope'],
    [NeedCategory.WOMEN_CHILD]: ['Support contacts card', 'Safety checklist'],
    [NeedCategory.ENVIRONMENT]: ['Gloves', 'Trash bags'],
  };
  return supply[category] || ['ID card', 'Phone'];
}

function estimateTaskDuration(category: string, urgency: string) {
  const base: Record<string, number> = {
    [NeedCategory.EMERGENCY]: 110,
    [NeedCategory.HEALTH]: 85,
    [NeedCategory.FOOD_NUTRITION]: 95,
    [NeedCategory.EDUCATION]: 75,
    [NeedCategory.WATER_SANITATION]: 90,
    [NeedCategory.SHELTER]: 105,
    [NeedCategory.WOMEN_CHILD]: 100,
    [NeedCategory.ENVIRONMENT]: 80,
  };
  const urgencyAdjust = urgency === 'critical' ? 25 : urgency === 'high' ? 15 : urgency === 'medium' ? 0 : -10;
  return Math.max(30, (base[category] || 80) + urgencyAdjust);
}

function getUrgencyMultiplier(urgency: string) {
  if (urgency === 'critical') return 2.5;
  if (urgency === 'high') return 1.8;
  if (urgency === 'medium') return 1.3;
  return 1;
}

function evaluateBadges(stats: { tasksCompleted: number; beneficiariesImpacted: number; sevaPoints: number }) {
  const badges: string[] = [];
  if (stats.tasksCompleted >= 5) badges.push('rapid_responder');
  if (stats.tasksCompleted >= 20) badges.push('community_anchor');
  if (stats.beneficiariesImpacted >= 250) badges.push('impact_catalyst');
  if (stats.sevaPoints >= 2500) badges.push('seva_champion');
  return badges;
}

function buildMilestoneText(beneficiaries: number) {
  if (beneficiaries >= 500) return `You have helped over ${beneficiaries} people in your Seva journey.`;
  if (beneficiaries >= 100) return `You have helped ${beneficiaries} people this season.`;
  return `Every task counts. ${beneficiaries} people impacted so far.`;
}

async function getOrCreateDefaultSquad(volunteerId: string, displayName: string) {
  const db = getFirestore();
  const squadRef = db.collection('volunteerSquads').doc(`squad-${volunteerId}`);
  const squadDoc = await squadRef.get();
  if (squadDoc.exists) return squadDoc.data();

  const squad = {
    id: `squad-${volunteerId}`,
    name: `${displayName.split(' ')[0]}'s Squad`,
    members: [volunteerId, 'friend_1', 'friend_2'],
    points: 1320,
    rank: 8,
    weeklyChallenge: 'Complete 5 high-urgency tasks as a squad',
  };
  await squadRef.set(squad);
  return squad;
}

async function getCorporateLeagueSnapshot() {
  return {
    companyLeaderboard: [
      { company: 'TechNova', points: 8920 },
      { company: 'GreenStack', points: 7450 },
      { company: 'CivicWare', points: 7025 },
    ],
    topVolunteers: [
      { name: 'Asha Singh', points: 980 },
      { name: 'Rohit Jain', points: 920 },
      { name: 'Meera Nair', points: 860 },
    ],
  };
}

async function getActiveTasks(volunteerId: string) {
  const db = getFirestore();
  const volunteerDoc = await db.collection('volunteers').doc(volunteerId).get();
  return (volunteerDoc.data()?.stats?.activeTasks as number) || 0;
}

async function getAssignedTasks(volunteerId: string) {
  const db = getFirestore();
  const volunteerDoc = await db.collection('volunteers').doc(volunteerId).get();
  return (volunteerDoc.data()?.stats?.assignedTasks as number) || 0;
}

async function getCompletedTasks(volunteerId: string) {
  const db = getFirestore();
  const volunteerDoc = await db.collection('volunteers').doc(volunteerId).get();
  return (volunteerDoc.data()?.stats?.completedTasks as number) || 0;
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function humanizeCategory(category: string) {
  return category.replace(/_/g, ' ').replace(/\b\w/g, (match) => match.toUpperCase());
}
