import { VertexAI } from '@google-cloud/vertexai';
import { getFirestore } from '../config/firebase';
import { NeedCategory, ReportStatus, UrgencyLevel, type NeedReport } from '../models/NeedReport';

const vertexAI = new VertexAI({
  project: process.env.GOOGLE_CLOUD_PROJECT || 'sevasetu-dev',
  location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1',
});

const flashModel = vertexAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

export async function flagNeedBySarpanch(input: {
  panchayatId: string;
  sarpanchUid: string;
  description: string;
  category?: string;
  urgency?: string;
  location: { latitude: number; longitude: number; district?: string; state?: string; address?: string };
}) {
  const db = getFirestore();
  const now = new Date().toISOString();

  const reportRef = db.collection('needReports').doc();
  const report: Partial<NeedReport> = {
    id: reportRef.id,
    reporterId: input.sarpanchUid,
    category: (input.category as any) || NeedCategory.HEALTH,
    urgency: (input.urgency as any) || UrgencyLevel.HIGH,
    description: input.description,
    location: {
      latitude: input.location.latitude,
      longitude: input.location.longitude,
      district: input.location.district,
      state: input.location.state,
      address: input.location.address,
    },
    source: 'web_form' as any,
    status: ReportStatus.CLASSIFIED,
    language: 'hi',
    isOfflineSubmission: false,
    isPrivate: false,
    createdAt: now,
    updatedAt: now,
  };

  await reportRef.set({
    ...report,
    panchayatId: input.panchayatId,
    sourceChannel: 'panchayat_direct',
  });

  return {
    reportId: reportRef.id,
    message: 'Need flagged successfully by verified sarpanch',
  };
}

export async function getPanchayatOverview(panchayatId: string) {
  const db = getFirestore();
  const reportsSnapshot = await db.collection('needReports').where('panchayatId', '==', panchayatId).limit(2000).get();
  const ngosSnapshot = await db.collection('ngos').where('panchayatIds', 'array-contains', panchayatId).limit(500).get();

  const reports = reportsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as NeedReport));
  const ngos = ngosSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as any));

  const activeNeeds = reports.filter((report) => report.status !== ReportStatus.RESOLVED && report.status !== ReportStatus.CANCELLED);
  const recurringNeeds = buildRecurringNeeds(reports);
  const duplicateClusters = detectDuplicateClusters(activeNeeds);

  return {
    panchayatId,
    activeNeedsCount: activeNeeds.length,
    activeNgos: ngos.map((ngo) => ({
      ngoId: ngo.id,
      name: ngo.name || 'Unknown NGO',
      categories: ngo.categories || [],
      activeCases: activeNeeds.filter((need) => need.assignedNgoId === ngo.id).length,
    })),
    duplicateClusters,
    recurringNeeds,
  };
}

export async function getVillageNeedHistory(panchayatId: string, months = 6) {
  const db = getFirestore();
  const cutoffMs = Date.now() - months * 30 * 24 * 60 * 60 * 1000;
  const snapshot = await db.collection('needReports').where('panchayatId', '==', panchayatId).limit(3000).get();
  const reports = snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() } as NeedReport))
    .filter((report) => new Date(report.createdAt).getTime() >= cutoffMs);

  const monthly = new Map<string, Record<string, number>>();
  reports.forEach((report) => {
    const d = new Date(report.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!monthly.has(key)) monthly.set(key, {});
    const bucket = monthly.get(key)!;
    bucket[report.category] = (bucket[report.category] || 0) + 1;
  });

  return {
    panchayatId,
    months,
    history: Array.from(monthly.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, categories]) => ({ month, categories })),
  };
}

export async function runSchemeGapFinder(input: {
  panchayatId: string;
  needsSummary: string;
  enrolledSchemes: string[];
}) {
  const prompt = `You are a government scheme gap finder.
Panchayat: ${input.panchayatId}
Needs summary: ${input.needsSummary}
Already enrolled schemes: ${input.enrolledSchemes.join(', ') || 'none'}

Return JSON only:
{
  "eligibleSchemes": [{"scheme":"...","reason":"...","priority":"high|medium|low"}],
  "unenrolledRiskGroups": ["..."],
  "actionPlanHindi": "..."
}`;

  const fallback = {
    eligibleSchemes: [
      { scheme: 'PM Poshan', reason: 'nutrition-linked recurring needs detected', priority: 'high' },
      { scheme: 'Ayushman Bharat', reason: 'frequent health incidents in village clusters', priority: 'high' },
      { scheme: 'Jal Jeevan Mission', reason: 'water and sanitation cases recurring', priority: 'medium' },
    ],
    unenrolledRiskGroups: ['low-income households', 'single-women households', 'elderly with chronic illness'],
    actionPlanHindi:
      'ग्राम सचिव और आशा कार्यकर्ताओं के साथ संयुक्त शिविर लगाकर पात्र परिवारों की सूची सत्यापित करें और 15 दिनों में नामांकन पूरा करें।',
    degraded: true,
  };

  try {
    const result = await flashModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generation_config: { temperature: 0.2, max_output_tokens: 700 },
    } as any);
    const text = result.response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const parsed = safeParseJson(text);
    if (!parsed) return fallback;
    return { ...parsed, degraded: false };
  } catch {
    return fallback;
  }
}

export async function generateMonthlyVillageHealthReport(input: {
  panchayatId: string;
  monthLabel: string;
}) {
  const overview = await getPanchayatOverview(input.panchayatId);
  const history = await getVillageNeedHistory(input.panchayatId, 1);

  const topRecurring = overview.recurringNeeds[0]?.category || 'health';
  const onePager = {
    title: `Village Health One-Pager (${input.monthLabel})`,
    panchayatId: input.panchayatId,
    highlights: [
      `${overview.activeNeedsCount} active needs tracked`,
      `${overview.activeNgos.length} NGOs active in jurisdiction`,
      `Top recurring need type: ${topRecurring}`,
    ],
    recommendationsHindi: [
      'उच्च प्राथमिकता वाले मामलों के लिए दैनिक समीक्षा बैठक करें।',
      'दोहराए जाने वाले जरूरत क्षेत्रों पर लक्षित शिविर आयोजित करें।',
      'NGO समन्वय के लिए साप्ताहिक प्रगति सूची साझा करें।',
    ],
    monthlyCategorySummary: history.history[0]?.categories || {},
    generatedAt: new Date().toISOString(),
  };

  return onePager;
}

export async function getPmGatiShaktiOverlay(panchayatId: string) {
  return {
    panchayatId,
    source: 'pm_gatishakti_proxy',
    infrastructureSignals: [
      {
        assetType: 'road_connectivity',
        severity: 'medium',
        note: 'Two hamlets show weak all-weather road access; affects emergency response time.',
      },
      {
        assetType: 'health_infra',
        severity: 'high',
        note: 'Nearest PHC > 8km for eastern cluster.',
      },
      {
        assetType: 'water_network',
        severity: 'medium',
        note: 'Pipeline gaps correspond to sanitation and water-borne case patterns.',
      },
    ],
    generatedAt: new Date().toISOString(),
    degraded: true,
  };
}

function buildRecurringNeeds(reports: NeedReport[]) {
  const count = reports.reduce<Record<string, number>>((acc, report) => {
    acc[report.category] = (acc[report.category] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(count)
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);
}

function detectDuplicateClusters(reports: NeedReport[]) {
  const grouped = new Map<string, NeedReport[]>();
  reports.forEach((report) => {
    const zone = report.location.district || report.location.state || 'Unknown';
    const key = `${zone}::${report.category}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(report);
  });

  return Array.from(grouped.entries())
    .filter(([, items]) => items.length >= 2)
    .map(([key, items]) => {
      const [zone, category] = key.split('::');
      const ngos = Array.from(new Set(items.map((item) => item.assignedNgoId).filter(Boolean)));
      return {
        zone,
        category,
        potentialDuplicate: ngos.length > 1,
        ngoIds: ngos,
        needsCount: items.length,
      };
    });
}

function safeParseJson(text: string): any | null {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]);
  } catch {
    return null;
  }
}
