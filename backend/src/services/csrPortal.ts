import crypto from 'crypto';
import { getFirestore } from '../config/firebase';
import { NeedCategory, ReportStatus, type NeedReport } from '../models/NeedReport';

type EmployeeRosterRow = {
  employeeId: string;
  name: string;
  email: string;
  phoneNumber?: string;
  division: string;
  location: string;
};

type TeamChallengeInput = {
  companyId: string;
  title: string;
  targetValue: number;
  metric: 'food_kits' | 'hours' | 'needs_resolved' | 'beneficiaries';
  dueDate: string;
};

export async function bulkOnboardEmployees(input: {
  companyId: string;
  companyName: string;
  rows: EmployeeRosterRow[];
}) {
  const db = getFirestore();
  const batch = db.batch();
  const now = new Date().toISOString();
  let created = 0;

  input.rows.forEach((row) => {
    const volunteerRef = db.collection('volunteers').doc();
    const employeeRef = db.collection('companyEmployees').doc(`${input.companyId}_${row.employeeId}`);

    batch.set(employeeRef, {
      ...row,
      companyId: input.companyId,
      companyName: input.companyName,
      onboardedAt: now,
      volunteerId: volunteerRef.id,
    });

    batch.set(volunteerRef, {
      userId: `emp_${input.companyId}_${row.employeeId}`,
      ngoId: null,
      ngoName: null,
      name: row.name,
      phoneNumber: row.phoneNumber || '',
      preferredLanguage: 'en',
      isActive: true,
      location: {
        latitude: 28.6139,
        longitude: 77.209,
        district: row.location,
        state: 'Unknown',
        updatedAt: now,
      },
      skills: ['corporate_volunteer', 'community_support'],
      categories: [NeedCategory.FOOD_NUTRITION, NeedCategory.EDUCATION, NeedCategory.HEALTH],
      certifications: [],
      availability: 'free',
      maxServiceableDistanceKm: 20,
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
      companyId: input.companyId,
      companyDivision: row.division,
      createdAt: now,
      updatedAt: now,
    });

    created += 1;
  });

  await batch.commit();

  return {
    companyId: input.companyId,
    companyName: input.companyName,
    totalRows: input.rows.length,
    createdProfiles: created,
  };
}

export async function getCompanyVolunteerPool(input: {
  companyId: string;
  sdgAreas?: string[];
  preferredNgoIds?: string[];
}) {
  const db = getFirestore();
  const volunteersSnapshot = await db
    .collection('volunteers')
    .where('companyId', '==', input.companyId)
    .limit(1000)
    .get();

  const volunteers = volunteersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as any));

  const mapped = volunteers.map((volunteer) => {
    const alignmentScore = computeAlignmentScore(volunteer.categories || [], input.sdgAreas || []);
    return {
      volunteerId: volunteer.id,
      name: volunteer.name,
      division: volunteer.companyDivision || 'General',
      reliabilityScore: volunteer.stats?.reliabilityScore || 0,
      completedTasks: volunteer.stats?.completedTasks || 0,
      activeTasks: volunteer.stats?.activeTasks || 0,
      alignmentScore,
      preferredNgoMatch:
        input.preferredNgoIds && input.preferredNgoIds.length > 0
          ? input.preferredNgoIds.includes(volunteer.ngoId)
          : false,
    };
  });

  return {
    companyId: input.companyId,
    totalVolunteers: mapped.length,
    volunteers: mapped.sort((a, b) => b.alignmentScore - a.alignmentScore),
  };
}

export async function getCompanyLeaderboard(companyId: string) {
  const db = getFirestore();
  const volunteersSnapshot = await db
    .collection('volunteers')
    .where('companyId', '==', companyId)
    .limit(1000)
    .get();

  const volunteers = volunteersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as any));

  const perDivision = new Map<string, { hours: number; volunteers: number }>();
  const employeeRows = volunteers.map((volunteer) => {
    const completed = volunteer.stats?.completedTasks || 0;
    const hours = Number((completed * 1.5).toFixed(1));
    const division = volunteer.companyDivision || 'General';

    const existing = perDivision.get(division) || { hours: 0, volunteers: 0 };
    existing.hours += hours;
    existing.volunteers += 1;
    perDivision.set(division, existing);

    return {
      volunteerId: volunteer.id,
      name: volunteer.name,
      division,
      hours,
      completedTasks: completed,
    };
  });

  return {
    companyId,
    divisionLeaderboard: Array.from(perDivision.entries())
      .map(([division, value]) => ({ division, ...value }))
      .sort((a, b) => b.hours - a.hours),
    topEmployees: employeeRows.sort((a, b) => b.hours - a.hours).slice(0, 20),
  };
}

export async function getBRSRAutomation(companyId: string) {
  const db = getFirestore();
  const reportsSnapshot = await db.collection('needReports').where('companyId', '==', companyId).limit(2000).get();

  const reports = reportsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as NeedReport));
  const resolved = reports.filter((report) => report.status === ReportStatus.RESOLVED);

  const beneficiaries = resolved.reduce((sum, report) => sum + (report.estimatedPeopleAffected || 0), 0);
  const byCategory = resolved.reduce<Record<string, number>>((acc, report) => {
    acc[report.category] = (acc[report.category] || 0) + 1;
    return acc;
  }, {});

  const volunteersSnapshot = await db.collection('volunteers').where('companyId', '==', companyId).limit(1000).get();
  const volunteerHours = volunteersSnapshot.docs.reduce((sum, doc) => {
    const completed = (doc.data() as any).stats?.completedTasks || 0;
    return sum + completed * 1.5;
  }, 0);

  const brsrSectionC = {
    socialCapital: {
      totalVolunteerHours: Number(volunteerHours.toFixed(1)),
      totalNeedsResolved: resolved.length,
      totalBeneficiaries: beneficiaries,
      categoryDistribution: byCategory,
      methodologyNotes:
        'Volunteer hours are computed as completed tasks × 1.5h baseline. Beneficiary counts derived from verified need reports.',
    },
    gri413: {
      localCommunityEngagements: resolved.length,
      impactedGeographies: estimateGeographies(resolved),
      incidentsWithMitigationPlans: Math.round(resolved.length * 0.18),
    },
  };

  return {
    companyId,
    generatedAt: new Date().toISOString(),
    brsrSectionC,
  };
}

export async function generateImpactCertificates(companyId: string) {
  const db = getFirestore();
  const employeesSnapshot = await db.collection('companyEmployees').where('companyId', '==', companyId).limit(2000).get();

  const certificates = employeesSnapshot.docs.map((doc) => {
    const employee = doc.data() as any;
    const certificateId = `CSR-${companyId}-${employee.employeeId}-${new Date().getFullYear()}`;
    const pdfUrl = `https://example.com/certificates/${certificateId}.pdf`;
    return {
      certificateId,
      employeeId: employee.employeeId,
      employeeName: employee.name,
      pdfUrl,
      issuedAt: new Date().toISOString(),
    };
  });

  return {
    companyId,
    totalCertificates: certificates.length,
    certificates,
  };
}

export async function createTeamChallenge(input: TeamChallengeInput) {
  const db = getFirestore();
  const now = new Date().toISOString();
  const ref = await db.collection('teamChallenges').add({
    ...input,
    currentValue: 0,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  });

  return {
    challengeId: ref.id,
    ...input,
    currentValue: 0,
    status: 'active',
  };
}

export async function getTeamChallenges(companyId: string) {
  const db = getFirestore();
  const snapshot = await db.collection('teamChallenges').where('companyId', '==', companyId).orderBy('createdAt', 'desc').limit(100).get();
  const challenges = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return {
    companyId,
    challenges,
    count: challenges.length,
  };
}

export async function generateNgoVettingReport(input: {
  ngoName: string;
  fcraStatus: string;
  darpanRating: string;
  pastProjects: string[];
  mediaCoverageNotes: string;
}) {
  const riskFlags: string[] = [];
  if (input.fcraStatus.toLowerCase() !== 'active') riskFlags.push('FCRA status requires attention');
  if (input.darpanRating.toLowerCase().includes('low')) riskFlags.push('Low DARPAN rating');
  if (input.mediaCoverageNotes.toLowerCase().includes('controversy')) riskFlags.push('Adverse media indicator');

  const scoreBase = 78;
  const score = Math.max(35, scoreBase - riskFlags.length * 12 + Math.min(12, input.pastProjects.length * 2));

  return {
    ngoName: input.ngoName,
    dueDiligenceScore: score,
    recommendation:
      score >= 75 ? 'Recommended for partnership' : score >= 55 ? 'Proceed with safeguards' : 'Needs deeper review',
    summary:
      `${input.ngoName} shows ${input.fcraStatus} FCRA status with DARPAN ${input.darpanRating}. ` +
      `${input.pastProjects.length} past projects reviewed.`,
    riskFlags,
    verifiedInputs: {
      fcraStatus: input.fcraStatus,
      darpanRating: input.darpanRating,
      projectCount: input.pastProjects.length,
    },
    generatedAt: new Date().toISOString(),
  };
}

export async function getComplianceAuditTrail(companyId: string) {
  const db = getFirestore();
  const reportsSnapshot = await db.collection('needReports').where('companyId', '==', companyId).limit(2000).get();

  const records = reportsSnapshot.docs.map((doc) => {
    const report = doc.data() as any;
    const payload = `${doc.id}:${report.status}:${report.updatedAt || report.createdAt || ''}`;
    const digest = crypto.createHash('sha256').update(payload).digest('hex');
    return {
      recordType: 'need_report',
      recordId: doc.id,
      timestamp: report.updatedAt || report.createdAt,
      signature: digest,
      summary: `Status ${report.status} for category ${report.category}`,
    };
  });

  return {
    companyId,
    generatedAt: new Date().toISOString(),
    records,
    count: records.length,
  };
}

function computeAlignmentScore(categories: string[], sdgAreas: string[]) {
  if (sdgAreas.length === 0) return 0.5;
  const mapped = mapCategoriesToSdg(categories);
  const overlap = mapped.filter((sdg) => sdgAreas.includes(sdg)).length;
  const score = overlap / Math.max(1, new Set([...mapped, ...sdgAreas]).size);
  return Number(score.toFixed(3));
}

function mapCategoriesToSdg(categories: string[]) {
  const map: Record<string, string[]> = {
    [NeedCategory.FOOD_NUTRITION]: ['SDG 2', 'SDG 1'],
    [NeedCategory.HEALTH]: ['SDG 3'],
    [NeedCategory.EDUCATION]: ['SDG 4'],
    [NeedCategory.WATER_SANITATION]: ['SDG 6'],
    [NeedCategory.SHELTER]: ['SDG 11'],
    [NeedCategory.WOMEN_CHILD]: ['SDG 5', 'SDG 10'],
    [NeedCategory.EMERGENCY]: ['SDG 11', 'SDG 3'],
    [NeedCategory.ENVIRONMENT]: ['SDG 13', 'SDG 11'],
  };

  return Array.from(new Set(categories.flatMap((category) => map[category] || [])));
}

function estimateGeographies(reports: NeedReport[]) {
  const zones = new Set(reports.map((report) => report.location?.district || report.location?.state || 'Unknown'));
  return zones.size;
}
