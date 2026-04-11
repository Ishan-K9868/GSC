import { getFirestore } from '../config/firebase';
import { NeedCategory, ReportStatus, UrgencyLevel, type NeedReport } from '../models/NeedReport';
import type { Volunteer } from '../models/Volunteer';

type ResourceItem = {
  id: string;
  name: string;
  quantity: number;
  location: string;
  usagePerDay: number;
  unit: string;
};

const SDG_MAP: Record<string, string[]> = {
  [NeedCategory.EMERGENCY]: ['SDG 11', 'SDG 3'],
  [NeedCategory.FOOD_NUTRITION]: ['SDG 2', 'SDG 1'],
  [NeedCategory.HEALTH]: ['SDG 3'],
  [NeedCategory.EDUCATION]: ['SDG 4'],
  [NeedCategory.WATER_SANITATION]: ['SDG 6', 'SDG 3'],
  [NeedCategory.SHELTER]: ['SDG 11', 'SDG 1'],
  [NeedCategory.WOMEN_CHILD]: ['SDG 5', 'SDG 10', 'SDG 3'],
  [NeedCategory.ENVIRONMENT]: ['SDG 11', 'SDG 13'],
};

export async function getDashboardOverview() {
  const db = getFirestore();

  const [needReportsSnapshot, volunteersSnapshot, dispatchTasksSnapshot, resourcesSnapshot] = await Promise.all([
    db.collection('needReports').limit(2000).get(),
    db.collection('volunteers').limit(2000).get(),
    db.collection('dispatchTasks').limit(2000).get(),
    db.collection('resources').limit(200).get(),
  ]);

  const reports = needReportsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as NeedReport));
  const volunteers = volunteersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Volunteer));
  const dispatchTasks = dispatchTasksSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as any));
  const resources = resourcesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as ResourceItem));

  const liveOperations = buildLiveOperations(reports, dispatchTasks);
  const volunteerHealth = buildVolunteerHealth(volunteers);
  const needsPipeline = buildNeedsPipeline(reports);
  const impactAnalytics = buildImpactAnalytics(reports, volunteers);
  const resourceInventory = buildResourceInventory(resources);
  const sdgAlignment = buildSdgAlignment(reports);
  const surgeForecast = buildSurgeForecast(reports);
  const crossNgoCoordination = buildCrossNgoCoordination(reports);

  return {
    liveOperations,
    volunteerHealth,
    needsPipeline,
    impactAnalytics,
    resourceInventory,
    sdgAlignment,
    surgeForecast,
    crossNgoCoordination,
    generatedAt: new Date().toISOString(),
  };
}

export async function getWorkspaceSummary() {
  const db = getFirestore();
  const [needReportsSnapshot, volunteersSnapshot, dispatchTasksSnapshot] = await Promise.all([
    db.collection('needReports').limit(2000).get(),
    db.collection('volunteers').limit(2000).get(),
    db.collection('dispatchTasks').limit(2000).get(),
  ]);

  const reports = needReportsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as NeedReport));
  const volunteers = volunteersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Volunteer));
  const dispatchTasks = dispatchTasksSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as any));
  const now = Date.now();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTodayMs = startOfToday.getTime();

  const activeNeedStatuses = new Set<string>([ReportStatus.PENDING, ReportStatus.CLASSIFIED, ReportStatus.DISPATCHED, ReportStatus.IN_PROGRESS]);
  const activeDispatchStatuses = new Set(['pending', 'invited', 'accepted']);

  const activeNeeds = reports.filter((report) => activeNeedStatuses.has(report.status));
  const reportsToday = reports.filter((report) => parseDateMs(report.createdAt) >= startOfTodayMs);
  const resolvedToday = reports.filter(
    (report) => report.status === ReportStatus.RESOLVED && parseDateMs(report.resolvedAt || report.updatedAt) >= startOfTodayMs
  );
  const activeDeployments = dispatchTasks.filter((task) => activeDispatchStatuses.has(String(task.status || '').toLowerCase())).length;

  const responseDurationsHours = reports
    .filter((report) => report.status === ReportStatus.RESOLVED)
    .map((report) => {
      const createdMs = parseDateMs(report.createdAt);
      const endedMs = parseDateMs(report.resolvedAt || report.updatedAt);
      if (!Number.isFinite(createdMs) || !Number.isFinite(endedMs) || endedMs < createdMs) return null;
      return (endedMs - createdMs) / (1000 * 60 * 60);
    })
    .filter((value): value is number => value !== null);

  const averageResponseHours = responseDurationsHours.length > 0
    ? responseDurationsHours.reduce((sum, value) => sum + value, 0) / responseDurationsHours.length
    : 0;

  const highlights = buildWorkspaceHighlights(activeNeeds, dispatchTasks);
  const districtSnapshots = buildWorkspaceDistrictSnapshots(activeNeeds);

  return {
    stats: {
      activeNeeds: activeNeeds.length,
      activeDeployments,
      reportsToday: reportsToday.length,
      resolvedToday: resolvedToday.length,
      volunteerBase: volunteers.length,
      averageResponseHours: Number(averageResponseHours.toFixed(1)),
    },
    highlights,
    districtSnapshots,
    generatedAt: new Date(now).toISOString(),
  };
}

function buildLiveOperations(reports: NeedReport[], dispatchTasks: any[]) {
  const active = reports.filter(
    (report) => report.status === ReportStatus.DISPATCHED || report.status === ReportStatus.IN_PROGRESS
  );
  const now = Date.now();

  const activeTasks = active.map((report) => {
    const lastActivity = report.updatedAt || report.createdAt;
    const lastActivityMs = new Date(lastActivity).getTime();
    const stalled = Number.isFinite(lastActivityMs) && now - lastActivityMs > 30 * 60 * 1000;

    const linkedDispatchTask = dispatchTasks.find((task) => task.needReportId === report.id);
    const rerouteSuggestion = stalled
      ? linkedDispatchTask?.rankedDecisions?.[1]?.volunteerId
        ? `Stalled >30 min. Consider re-routing to ${linkedDispatchTask.rankedDecisions[1].volunteerName || linkedDispatchTask.rankedDecisions[1].volunteerId}.`
        : 'Stalled >30 min. Escalate to coordinator and trigger heartbeat.'
      : undefined;

    return {
      reportId: report.id,
      category: report.category,
      urgency: report.urgency,
      status: report.status,
      volunteerId: report.assignedVolunteerId || null,
      ngoId: report.assignedNgoId || null,
      location: {
        latitude: report.location.latitude,
        longitude: report.location.longitude,
        district: report.location.district || null,
        state: report.location.state || null,
      },
      lastActivity,
      stalled,
      rerouteSuggestion,
    };
  });

  return {
    activeCount: activeTasks.length,
    stalledCount: activeTasks.filter((task) => task.stalled).length,
    activeTasks,
  };
}

function buildVolunteerHealth(volunteers: Volunteer[]) {
  const list = volunteers.map((volunteer) => {
    const activeTasks = volunteer.stats?.activeTasks || 0;
    const tasks7d = Math.round((volunteer.stats?.last90dAssignedTasks || 0) / 12.85);
    const burnoutRisk = tasks7d >= 10 || activeTasks >= 3;

    const appreciationMessage = burnoutRisk
      ? `Thanks ${volunteer.name} for leading from the front. Consider a lighter shift tomorrow.`
      : `Great work ${volunteer.name}! Your consistency is improving outcomes.`;

    return {
      volunteerId: volunteer.id || volunteer.userId,
      name: volunteer.name,
      reliabilityScore: volunteer.stats?.reliabilityScore || 0,
      activeTasks,
      tasksLast7d: tasks7d,
      lastActiveAt: volunteer.location.updatedAt,
      skills: volunteer.skills || [],
      burnoutRisk,
      appreciationMessage,
    };
  });

  return {
    totalVolunteers: list.length,
    burnoutRiskCount: list.filter((item) => item.burnoutRisk).length,
    volunteers: list.sort((a, b) => Number(b.burnoutRisk) - Number(a.burnoutRisk)),
  };
}

function buildWorkspaceHighlights(reports: NeedReport[], dispatchTasks: any[]) {
  const sortedReports = [...reports].sort((a, b) => parseDateMs(b.updatedAt || b.createdAt) - parseDateMs(a.updatedAt || a.createdAt));
  const criticalReports = sortedReports
    .filter((report) => report.urgency === UrgencyLevel.CRITICAL || Number((report as any).urgencyScore || 0) >= 9)
    .slice(0, 3)
    .map((report) => ({
      text: `${formatDistrict(report.location?.district)} ${formatCategoryLabel(report.category)} cluster - ${report.urgency} priority`,
      accent: report.urgency === UrgencyLevel.CRITICAL ? 'amber' : 'terra',
    }));

  const stalledTasks = dispatchTasks
    .filter((task) => ['pending', 'invited', 'accepted'].includes(String(task.status || '').toLowerCase()))
    .sort((a, b) => parseDateMs(b.updatedAt || b.createdAt) - parseDateMs(a.updatedAt || a.createdAt))
    .slice(0, 2)
    .map((task) => ({
      text: `${formatCategoryLabel(task.category || 'Need')} dispatch - ${String(task.status || 'pending').replace(/_/g, ' ')}`,
      accent: 'jade',
    }));

  const fallback = [{ text: 'Live updates will appear here once new reports and dispatches stream in.', accent: 'jade' }];
  return [...criticalReports, ...stalledTasks].slice(0, 5).concat(criticalReports.length + stalledTasks.length === 0 ? fallback : []).slice(0, 5);
}

function buildWorkspaceDistrictSnapshots(reports: NeedReport[]) {
  const byDistrict = reports.reduce<Record<string, { count: number; critical: number; categoryCounts: Record<string, number> }>>((acc, report) => {
    const district = formatDistrict(report.location?.district);
    if (!acc[district]) {
      acc[district] = { count: 0, critical: 0, categoryCounts: {} };
    }

    acc[district].count += 1;
    if (report.urgency === UrgencyLevel.CRITICAL || Number((report as any).urgencyScore || 0) >= 9) {
      acc[district].critical += 1;
    }
    acc[district].categoryCounts[report.category] = (acc[district].categoryCounts[report.category] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(byDistrict)
    .map(([district, value]) => ({
      zone: district,
      clusters: value.count,
      urgency: value.critical > 0 ? 'high' : value.count >= 3 ? 'medium' : 'low',
      topCategory: formatCategoryLabel(
        Object.entries(value.categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || NeedCategory.HEALTH
      ),
    }))
    .sort((a, b) => b.clusters - a.clusters)
    .slice(0, 4);
}

function buildNeedsPipeline(reports: NeedReport[]) {
  const now = Date.now();
  const enrich = (report: NeedReport) => {
    const createdMs = new Date(report.createdAt).getTime();
    const updatedMs = new Date(report.updatedAt).getTime();
    const referenceMs = Number.isFinite(updatedMs) ? updatedMs : createdMs;
    const timeInStageHours = Math.max(0, (now - referenceMs) / (1000 * 60 * 60));
    const slaHours = report.urgency === UrgencyLevel.CRITICAL ? 1 : report.urgency === UrgencyLevel.HIGH ? 4 : 12;
    const slaBreached = report.status !== ReportStatus.RESOLVED && timeInStageHours > slaHours;

    return {
      reportId: report.id,
      category: report.category,
      urgency: report.urgency,
      status: report.status,
      timeInStageHours: Number(timeInStageHours.toFixed(2)),
      slaBreached,
      escalationDraft: slaBreached
        ? `Escalation draft: Need ${report.id} is overdue (${Math.round(timeInStageHours)}h). Please assign rapid-response support.`
        : null,
    };
  };

  return {
    unassigned: reports
      .filter((r) => r.status === ReportStatus.PENDING || r.status === ReportStatus.CLASSIFIED)
      .map(enrich),
    assigned: reports.filter((r) => r.status === ReportStatus.DISPATCHED).map(enrich),
    inProgress: reports.filter((r) => r.status === ReportStatus.IN_PROGRESS).map(enrich),
    resolved: reports.filter((r) => r.status === ReportStatus.RESOLVED).map(enrich),
  };
}

function parseDateMs(value: unknown): number {
  if (!value) return 0;
  if (typeof value === 'string') {
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (value instanceof Date) {
    return value.getTime();
  }
  return 0;
}

function formatCategoryLabel(value: string) {
  return value.replace(/_/g, ' ');
}

function formatDistrict(value?: string | null) {
  return value || 'Delhi';
}

function buildImpactAnalytics(reports: NeedReport[], volunteers: Volunteer[]) {
  const resolved = reports.filter((report) => report.status === ReportStatus.RESOLVED);
  const beneficiariesServed = resolved.reduce((sum, report) => sum + (report.estimatedPeopleAffected || 0), 0);

  const resolvedByCategory = resolved.reduce<Record<string, number>>((acc, report) => {
    acc[report.category] = (acc[report.category] || 0) + 1;
    return acc;
  }, {});

  const responseHours: number[] = [];
  reports.forEach((report) => {
    if (!report.createdAt || !report.updatedAt) return;
    const createdMs = new Date(report.createdAt).getTime();
    const updatedMs = new Date(report.updatedAt).getTime();
    if (Number.isFinite(createdMs) && Number.isFinite(updatedMs) && updatedMs >= createdMs) {
      responseHours.push((updatedMs - createdMs) / (1000 * 60 * 60));
    }
  });

  const averageResponseTimeHours = responseHours.length
    ? responseHours.reduce((sum, val) => sum + val, 0) / responseHours.length
    : 0;

  const volunteerHours = volunteers.reduce((sum, volunteer) => {
    const completed = volunteer.stats?.completedTasks || 0;
    return sum + completed * 1.5;
  }, 0);

  const impactNarrativeEn =
    `This month, teams resolved ${resolved.length} needs and reached approximately ${beneficiariesServed} beneficiaries. ` +
    `Average operational response time is ${averageResponseTimeHours.toFixed(1)} hours, with strongest outcomes in ` +
    `${topCategoryLabel(resolvedByCategory)}.`;

  const impactNarrativeHi =
    `इस माह टीम ने ${resolved.length} जरूरतों का समाधान किया और लगभग ${beneficiariesServed} लाभार्थियों तक पहुंच बनाई। ` +
    `औसत प्रतिक्रिया समय ${averageResponseTimeHours.toFixed(1)} घंटे रहा और सबसे अच्छा प्रभाव ` +
    `${topCategoryLabel(resolvedByCategory)} श्रेणी में देखा गया।`;

  return {
    beneficiariesServed,
    volunteerHours: Number(volunteerHours.toFixed(1)),
    resolvedByCategory,
    averageResponseTimeHours: Number(averageResponseTimeHours.toFixed(2)),
    responseTimeTrend: buildWeeklyTrend(responseHours),
    impactNarrativeEn,
    impactNarrativeHi,
  };
}

function buildResourceInventory(resources: ResourceItem[]) {
  const base = resources.length > 0 ? resources : getDefaultResources();

  const items = base.map((resource) => {
    const daysRemaining = resource.usagePerDay > 0 ? resource.quantity / resource.usagePerDay : 999;
    const depletionAlert = daysRemaining <= 14;
    const recommendation = depletionAlert
      ? `At current usage, ${resource.name} may run out in ${Math.max(1, Math.round(daysRemaining))} days.`
      : null;

    return {
      ...resource,
      daysRemaining: Number(daysRemaining.toFixed(1)),
      depletionAlert,
      recommendation,
    };
  });

  return {
    totalItems: items.length,
    depletionAlerts: items.filter((item) => item.depletionAlert).length,
    items,
  };
}

function buildSdgAlignment(reports: NeedReport[]) {
  const mapping = reports.reduce<Record<string, number>>((acc, report) => {
    const sdgs = SDG_MAP[report.category] || [];
    sdgs.forEach((sdg) => {
      acc[sdg] = (acc[sdg] || 0) + 1;
    });
    return acc;
  }, {});

  const topSdg = Object.entries(mapping).sort((a, b) => b[1] - a[1])[0]?.[0] || 'SDG 3';
  const brsrSummary =
    `BRSR/GRI draft: Primary activity concentration is in ${topSdg}, with multi-goal contributions across ` +
    `${Object.keys(mapping).length} SDG goals.`;

  return {
    mapping,
    brsrSummary,
  };
}

function buildSurgeForecast(reports: NeedReport[]) {
  const now = Date.now();
  const fourteenDaysAgo = now - 14 * 24 * 60 * 60 * 1000;

  const recent = reports.filter((report) => {
    const createdMs = new Date(report.createdAt).getTime();
    return Number.isFinite(createdMs) && createdMs >= fourteenDaysAgo;
  });

  const byZoneCategory = recent.reduce<Record<string, number>>((acc, report) => {
    const zone = report.location.district || report.location.state || 'Unknown';
    const key = `${zone}::${report.category}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const topSignals = Object.entries(byZoneCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([key, value]) => {
      const [zone, category] = key.split('::');
      const projected14d = Math.round(value * 1.25);
      return {
        zone,
        category,
        observed14d: value,
        projected14d,
        recommendation: `Pre-position ${Math.max(10, Math.round(projected14d * 1.2))} kits for ${category} in ${zone}.`,
      };
    });

  return {
    horizonDays: 14,
    forecasts: topSignals,
  };
}

function buildCrossNgoCoordination(reports: NeedReport[]) {
  const active = reports.filter((report) => report.status !== ReportStatus.RESOLVED && report.status !== ReportStatus.CANCELLED);

  const clusters = new Map<string, Set<string>>();

  active.forEach((report) => {
    const zone = report.location.district || report.location.state || 'Unknown';
    const key = `${zone}::${report.category}`;
    if (!clusters.has(key)) clusters.set(key, new Set<string>());
    if (report.assignedNgoId) {
      clusters.get(key)?.add(report.assignedNgoId);
    }
  });

  const overlaps = Array.from(clusters.entries())
    .filter(([, ngos]) => ngos.size > 1)
    .map(([key, ngos]) => {
      const [zone, category] = key.split('::');
      const ngoList = Array.from(ngos);
      return {
        zone,
        category,
        ngos: ngoList,
        alert: `${ngoList.join(' and ')} are operating on overlapping ${category} needs in ${zone}.`,
      };
    });

  return {
    overlapCount: overlaps.length,
    overlaps,
  };
}

function buildWeeklyTrend(hours: number[]) {
  if (hours.length === 0) {
    return [
      { week: 'W-3', avgHours: 0 },
      { week: 'W-2', avgHours: 0 },
      { week: 'W-1', avgHours: 0 },
      { week: 'W0', avgHours: 0 },
    ];
  }

  const chunk = Math.max(1, Math.floor(hours.length / 4));
  const output = [] as Array<{ week: string; avgHours: number }>;
  for (let i = 0; i < 4; i += 1) {
    const start = i * chunk;
    const slice = hours.slice(start, start + chunk);
    const avg = slice.length ? slice.reduce((sum, h) => sum + h, 0) / slice.length : 0;
    output.push({ week: `W-${3 - i}`, avgHours: Number(avg.toFixed(2)) });
  }
  return output;
}

function topCategoryLabel(resolvedByCategory: Record<string, number>): string {
  const top = Object.entries(resolvedByCategory).sort((a, b) => b[1] - a[1])[0];
  return top ? top[0].replace('_', ' ') : 'health';
}

function getDefaultResources(): ResourceItem[] {
  return [
    { id: 'food_kits', name: 'Food Kits', quantity: 280, location: 'Delhi Hub', usagePerDay: 18, unit: 'kits' },
    { id: 'med_kits', name: 'Medical Kits', quantity: 95, location: 'Lucknow Hub', usagePerDay: 9, unit: 'kits' },
    { id: 'blankets', name: 'Blankets', quantity: 430, location: 'Jaipur Storage', usagePerDay: 11, unit: 'pcs' },
    { id: 'water_cans', name: 'Water Cans', quantity: 210, location: 'Patna Hub', usagePerDay: 17, unit: 'cans' },
  ];
}
