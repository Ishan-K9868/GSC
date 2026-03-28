/**
 * Seed Data Script
 * Populates Firestore with sample need reports for testing and demos.
 */

import { getFirestore } from '../config/firebase';
import { IntakeSource, NeedCategory, ReportStatus, UrgencyLevel, type NeedCategoryType, type NeedReport, type UrgencyLevelType } from '../models/NeedReport';
import { urgencyEnumToBase } from '../services/urgencyMultipliers';
import { VolunteerAvailability } from '../models/Volunteer';

const firestore = getFirestore();

type SeedLocation = {
  latitude: number;
  longitude: number;
  address: string;
  district: string;
  state: string;
};

type SeedUrgencyBreakdown = {
  base: number;
  weatherMult: number;
  vulnerabilityMult: number;
  timeMult: number;
  finalScore: number;
  weatherReason: string;
  vulnerabilityReason: string;
  timeReason: string;
};

type SeedNeedReport = NeedReport & {
  id: string;
  urgencyScore: number;
  urgencyBreakdown: SeedUrgencyBreakdown;
  urgencyDecayCount: number;
  urgencyDecayAlert: boolean;
  report_count: number;
  merged_from: string[];
  systemic: boolean;
  possible_duplicate: boolean;
};

type SeedVolunteer = {
  id: string;
  userId: string;
  ngoId: string;
  ngoName: string;
  name: string;
  phoneNumber: string;
  preferredLanguage: string;
  isActive: boolean;
  location: {
    latitude: number;
    longitude: number;
    district: string;
    state: string;
    updatedAt: string;
  };
  skills: string[];
  categories: NeedCategoryType[];
  certifications: string[];
  availability: string;
  maxServiceableDistanceKm: number;
  supportsUnderservedZones: boolean;
  ngoVolunteerCount: number;
  stats: {
    assignedTasks: number;
    completedTasks: number;
    avgBeneficiaryRating: number;
    reliabilityScore: number;
    activeTasks: number;
    last90dAssignedTasks: number;
    last90dCompletedTasks: number;
  };
  createdAt: string;
  updatedAt: string;
};

type SeedInventoryItem = {
  itemId: string;
  volunteerId: string;
  itemName: string;
  quantity: number;
  unit: string;
  categoriesRelevant: NeedCategoryType[];
  expiryDate: string | null;
  updatedAt: string;
};

const categories: NeedCategoryType[] = [
  NeedCategory.EMERGENCY,
  NeedCategory.FOOD_NUTRITION,
  NeedCategory.HEALTH,
  NeedCategory.EDUCATION,
  NeedCategory.WATER_SANITATION,
  NeedCategory.SHELTER,
  NeedCategory.WOMEN_CHILD,
  NeedCategory.ENVIRONMENT,
];

const urgencyLevels: UrgencyLevelType[] = [
  UrgencyLevel.CRITICAL,
  UrgencyLevel.HIGH,
  UrgencyLevel.MEDIUM,
  UrgencyLevel.LOW,
];

const statuses = [
  ReportStatus.CLASSIFIED,
  ReportStatus.DISPATCHED,
  ReportStatus.IN_PROGRESS,
  ReportStatus.RESOLVED,
];

const sampleLocations: SeedLocation[] = [
  {
    latitude: 28.5453,
    longitude: 77.2734,
    address: 'Okhla, South East Delhi, Delhi',
    district: 'South East Delhi',
    state: 'Delhi',
  },
  {
    latitude: 28.5337,
    longitude: 77.2912,
    address: 'Sarita Vihar, South East Delhi, Delhi',
    district: 'South East Delhi',
    state: 'Delhi',
  },
  {
    latitude: 28.5677,
    longitude: 77.2434,
    address: 'Lajpat Nagar, South East Delhi, Delhi',
    district: 'South East Delhi',
    state: 'Delhi',
  },
  {
    latitude: 28.6729,
    longitude: 77.2691,
    address: 'Seelampur, North East Delhi, Delhi',
    district: 'North East Delhi',
    state: 'Delhi',
  },
  {
    latitude: 28.6967,
    longitude: 77.2861,
    address: 'Mustafabad, North East Delhi, Delhi',
    district: 'North East Delhi',
    state: 'Delhi',
  },
  {
    latitude: 28.7052,
    longitude: 77.2846,
    address: 'Yamuna Vihar, North East Delhi, Delhi',
    district: 'North East Delhi',
    state: 'Delhi',
  },
  {
    latitude: 28.7041,
    longitude: 77.2668,
    address: 'Bhajanpura, North East Delhi, Delhi',
    district: 'North East Delhi',
    state: 'Delhi',
  },
  {
    latitude: 28.7494,
    longitude: 77.0565,
    address: 'Rohini, North West Delhi, Delhi',
    district: 'North West Delhi',
    state: 'Delhi',
  },
  {
    latitude: 28.5921,
    longitude: 77.046,
    address: 'Dwarka, South West Delhi, Delhi',
    district: 'South West Delhi',
    state: 'Delhi',
  },
  {
    latitude: 28.5208,
    longitude: 77.1855,
    address: 'Mehrauli, South Delhi, Delhi',
    district: 'South Delhi',
    state: 'Delhi',
  },
];

const sampleDescriptions: Record<NeedCategoryType, string[]> = {
  emergency: [
    'Road accident near the flyover. Two people need first aid and quick transport support.',
    'A major electrical fire has displaced families and immediate response is needed.',
    'Flood water entered low-lying lanes and residents need urgent rescue support.',
  ],
  food_nutrition: [
    'Cooked meal distribution is needed for families who missed work for three days.',
    'Children in the basti need dry ration kits and milk support this evening.',
    'A community kitchen is needed for migrant workers affected by heavy rain.',
  ],
  health: [
    'A medicine refill camp is needed for fever and dehydration cases in the area.',
    'Pregnant women in the lane need access to prenatal check-ups and transport support.',
    'A mobile health camp is needed because nearby clinics are overcrowded today.',
  ],
  education: [
    'Students need school bags, notebooks, and a temporary learning corner after repairs.',
    'Children are missing classes because textbooks and uniforms have not arrived.',
    'Local volunteers need supplies for an evening tutoring camp in the settlement.',
  ],
  water_sanitation: [
    'Community taps are dry and families need safe drinking water tankers today.',
    'Drain overflow has contaminated the lane and urgent sanitation cleanup is needed.',
    'Water purification tablets and buckets are needed in the cluster after flooding.',
  ],
  shelter: [
    'Rain damaged roofs in the cluster and families need tarpaulins and blankets.',
    'Temporary shelter material is needed for displaced families near the main road.',
    'An elderly couple needs urgent roof repair support before the next rain spell.',
  ],
  women_child: [
    'Women in the area need private support kits and safe referral assistance.',
    'A child protection case needs discreet intervention and follow-up coordination.',
    'Mothers in the settlement need baby food, sanitary pads, and care support.',
  ],
  environment: [
    'Waste has piled up near the drain and community cleanup supplies are needed.',
    'Residents are reporting heavy smoke and pollution from unmanaged burning nearby.',
    'Local volunteers need gloves, bags, and tools for a cleanup drive this weekend.',
  ],
};

function buildUrgencyBreakdown(
  urgency: UrgencyLevelType,
  weatherMult: number,
  vulnerabilityMult: number,
  timeMult: number,
  weatherReason: string,
  vulnerabilityReason: string,
  timeReason: string
): SeedUrgencyBreakdown {
  const base = urgencyEnumToBase(urgency);
  const finalScore = Number((base * weatherMult * vulnerabilityMult * timeMult).toFixed(2));

  return {
    base,
    weatherMult,
    vulnerabilityMult,
    timeMult,
    finalScore,
    weatherReason,
    vulnerabilityReason,
    timeReason,
  };
}

function getLocation(index: number): SeedLocation {
  return sampleLocations[index % sampleLocations.length];
}

function jitter(value: number, range: number): number {
  return Number((value + (Math.random() - 0.5) * range).toFixed(6));
}

function buildDuplicateClusterReports(): SeedNeedReport[] {
  const now = Date.now();
  const baseLocation = sampleLocations[0];
  const descriptions = [
    'Community taps are dry in the Okhla cluster and residents need safe drinking water today.',
    'No clean water is available in the Okhla lane cluster and tanker support is urgently needed.',
    'Families in the Okhla settlement are without clean water and need tankers plus purification tablets.',
  ];

  return descriptions.map((description, index) => {
    const createdAt = new Date(now - (index + 1) * 45 * 60 * 1000).toISOString();
    const urgencyBreakdown = buildUrgencyBreakdown(
      UrgencyLevel.HIGH,
      1.3,
      1.2,
      1.0,
      'Flooding increases water-access risk',
      'Medium-vulnerability zone (Okhla, index: 0.52)',
      'Daytime (14:00 hrs)'
    );

    return {
      id: `seed-report-${String(index + 1).padStart(3, '0')}`,
      reporterId: `seed-user-${index + 1}`,
      category: NeedCategory.WATER_SANITATION,
      urgency: UrgencyLevel.HIGH,
      description,
      estimatedPeopleAffected: 35 + index * 5,
      location: {
        latitude: jitter(baseLocation.latitude, 0.0025),
        longitude: jitter(baseLocation.longitude, 0.0025),
        address: baseLocation.address,
        district: baseLocation.district,
        state: baseLocation.state,
      },
      photoUrls: [],
      source: IntakeSource.WEB_FORM,
      status: ReportStatus.CLASSIFIED,
      language: 'en',
      urgencyScore: urgencyBreakdown.finalScore,
      urgencyBreakdown,
      urgencyDecayCount: 0,
      urgencyDecayAlert: false,
      report_count: 1,
      merged_from: [],
      systemic: false,
      possible_duplicate: false,
      isOfflineSubmission: false,
      isPrivate: false,
      createdAt,
      updatedAt: createdAt,
    };
  });
}

function buildGeneralReport(index: number): SeedNeedReport {
  const category = categories[index % categories.length];
  const urgency = urgencyLevels[index % urgencyLevels.length];
  const status = statuses[index % statuses.length];
  const location = getLocation(index + 3);
  const descriptionOptions = sampleDescriptions[category];
  const description = descriptionOptions[index % descriptionOptions.length];
  const createdAtMs = Date.now() - (index + 2) * 3 * 60 * 60 * 1000;
  const createdAt = new Date(createdAtMs).toISOString();
  const updatedAt = new Date(createdAtMs + 75 * 60 * 1000).toISOString();

  const weatherMult = status === ReportStatus.RESOLVED ? 1.0 : urgency === UrgencyLevel.CRITICAL ? 1.4 : 1.1;
  const vulnerabilityMult = location.district.includes('North East') ? 1.2 : 1.0;
  const timeMult = urgency === UrgencyLevel.CRITICAL ? 1.3 : 1.0;
  const urgencyBreakdown = buildUrgencyBreakdown(
    urgency,
    weatherMult,
    vulnerabilityMult,
    timeMult,
    weatherMult > 1 ? 'Weather stress is increasing local severity' : 'Normal weather (31°C)',
    vulnerabilityMult > 1
      ? `Medium-vulnerability zone (${location.district}, index: 0.56)`
      : `Standard zone (${location.district}, index: 0.31)`,
    timeMult > 1 ? 'Night-time severity (23:00 hrs) — services unavailable' : 'Daytime (11:00 hrs)'
  );

  return {
    id: `seed-report-${String(index + 1).padStart(3, '0')}`,
    reporterId: `seed-user-${(index % 8) + 1}`,
    category,
    urgency,
    description,
    estimatedPeopleAffected: 12 + (index % 7) * 9,
    location: {
      latitude: jitter(location.latitude, 0.006),
      longitude: jitter(location.longitude, 0.006),
      address: location.address,
      district: location.district,
      state: location.state,
    },
    photoUrls: [],
    source: index % 3 === 0 ? IntakeSource.VOICE : index % 3 === 1 ? IntakeSource.PHOTO : IntakeSource.WEB_FORM,
    status,
    language: index % 2 === 0 ? 'en' : 'hi',
    assignedNgoId:
      status === ReportStatus.DISPATCHED || status === ReportStatus.IN_PROGRESS || status === ReportStatus.RESOLVED
        ? `ngo-${(index % 3) + 1}`
        : undefined,
    assignedVolunteerId:
      status === ReportStatus.IN_PROGRESS || status === ReportStatus.RESOLVED
        ? `volunteer-${(index % 4) + 1}`
        : undefined,
    resolvedAt: status === ReportStatus.RESOLVED ? new Date(createdAtMs + 6 * 60 * 60 * 1000).toISOString() : undefined,
    urgencyScore: urgencyBreakdown.finalScore,
    urgencyBreakdown,
    urgencyDecayCount: 0,
    urgencyDecayAlert: false,
    report_count: 1,
    merged_from: [],
    systemic: false,
    possible_duplicate: false,
    isOfflineSubmission: false,
    isPrivate: category === NeedCategory.WOMEN_CHILD,
    createdAt,
    updatedAt,
  };
}

function buildSeedReports(count: number): SeedNeedReport[] {
  const duplicateCluster = buildDuplicateClusterReports();
  const reports: SeedNeedReport[] = [...duplicateCluster];

  while (reports.length < count) {
    reports.push(buildGeneralReport(reports.length));
  }

  return reports.slice(0, count);
}

function buildSeedVolunteers(): SeedVolunteer[] {
  const now = new Date().toISOString();

  return [
    {
      id: 'seed-volunteer-001',
      userId: 'seed-volunteer-001',
      ngoId: 'ngo-1',
      ngoName: 'Night Relief Collective',
      name: 'Farah Khan',
      phoneNumber: '+919900000001',
      preferredLanguage: 'en',
      isActive: true,
      location: {
        latitude: 28.5458,
        longitude: 77.2721,
        district: 'South East Delhi',
        state: 'Delhi',
        updatedAt: now,
      },
      skills: ['triage', 'food distribution', 'community coordination'],
      categories: [NeedCategory.FOOD_NUTRITION, NeedCategory.WATER_SANITATION, NeedCategory.SHELTER],
      certifications: ['First Aid'],
      availability: VolunteerAvailability.FREE,
      maxServiceableDistanceKm: 18,
      supportsUnderservedZones: true,
      ngoVolunteerCount: 24,
      stats: {
        assignedTasks: 18,
        completedTasks: 16,
        avgBeneficiaryRating: 4.7,
        reliabilityScore: 0.92,
        activeTasks: 0,
        last90dAssignedTasks: 18,
        last90dCompletedTasks: 16,
      },
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'seed-volunteer-002',
      userId: 'seed-volunteer-002',
      ngoId: 'ngo-2',
      ngoName: 'Sehat Saathi Trust',
      name: 'Arjun Dabas',
      phoneNumber: '+919900000002',
      preferredLanguage: 'hi',
      isActive: true,
      location: {
        latitude: 28.6725,
        longitude: 77.2681,
        district: 'North East Delhi',
        state: 'Delhi',
        updatedAt: now,
      },
      skills: ['first aid', 'medicine handoff', 'field logistics'],
      categories: [NeedCategory.HEALTH, NeedCategory.EMERGENCY, NeedCategory.WATER_SANITATION],
      certifications: ['First Aid', 'Disaster Response'],
      availability: VolunteerAvailability.FREE,
      maxServiceableDistanceKm: 20,
      supportsUnderservedZones: true,
      ngoVolunteerCount: 31,
      stats: {
        assignedTasks: 22,
        completedTasks: 20,
        avgBeneficiaryRating: 4.8,
        reliabilityScore: 0.95,
        activeTasks: 0,
        last90dAssignedTasks: 22,
        last90dCompletedTasks: 20,
      },
      createdAt: now,
      updatedAt: now,
    },
  ];
}

function buildSeedInventoryItems(): SeedInventoryItem[] {
  const now = new Date().toISOString();

  return [
    {
      itemId: 'rice',
      volunteerId: 'seed-volunteer-001',
      itemName: 'rice',
      quantity: 8,
      unit: 'kg',
      categoriesRelevant: [NeedCategory.FOOD_NUTRITION],
      expiryDate: null,
      updatedAt: now,
    },
    {
      itemId: 'water_can',
      volunteerId: 'seed-volunteer-001',
      itemName: 'water can',
      quantity: 3,
      unit: 'units',
      categoriesRelevant: [NeedCategory.WATER_SANITATION],
      expiryDate: null,
      updatedAt: now,
    },
    {
      itemId: 'blanket',
      volunteerId: 'seed-volunteer-001',
      itemName: 'blanket',
      quantity: 4,
      unit: 'units',
      categoriesRelevant: [NeedCategory.SHELTER],
      expiryDate: null,
      updatedAt: now,
    },
    {
      itemId: 'first_aid_kit',
      volunteerId: 'seed-volunteer-002',
      itemName: 'first aid kit',
      quantity: 2,
      unit: 'units',
      categoriesRelevant: [NeedCategory.HEALTH, NeedCategory.EMERGENCY],
      expiryDate: null,
      updatedAt: now,
    },
    {
      itemId: 'ors',
      volunteerId: 'seed-volunteer-002',
      itemName: 'ORS',
      quantity: 12,
      unit: 'packets',
      categoriesRelevant: [NeedCategory.HEALTH, NeedCategory.WATER_SANITATION],
      expiryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: now,
    },
    {
      itemId: 'medicines',
      volunteerId: 'seed-volunteer-002',
      itemName: 'medicines',
      quantity: 9,
      unit: 'units',
      categoriesRelevant: [NeedCategory.HEALTH],
      expiryDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: now,
    },
    {
      itemId: 'dev_water_can',
      volunteerId: 'dev-user-001',
      itemName: 'water can',
      quantity: 2,
      unit: 'units',
      categoriesRelevant: [NeedCategory.WATER_SANITATION],
      expiryDate: null,
      updatedAt: now,
    },
    {
      itemId: 'dev_first_aid_kit',
      volunteerId: 'dev-user-001',
      itemName: 'first aid kit',
      quantity: 1,
      unit: 'units',
      categoriesRelevant: [NeedCategory.HEALTH, NeedCategory.EMERGENCY],
      expiryDate: null,
      updatedAt: now,
    },
  ];
}

async function generateSeedReports(count: number = 24) {
  console.log(`Generating ${count} seed reports...`);

  const reports = buildSeedReports(count);
  const batch = firestore.batch();

  for (const report of reports) {
    const docRef = firestore.collection('needReports').doc(report.id);
    batch.set(docRef, JSON.parse(JSON.stringify(report)), { merge: true });
  }

  await batch.commit();
  console.log(`✅ Successfully upserted ${reports.length} seed reports.`);
}

async function generateSeedVolunteersAndInventory() {
  const volunteers = buildSeedVolunteers();
  const inventoryItems = buildSeedInventoryItems();
  const batch = firestore.batch();

  for (const volunteer of volunteers) {
    batch.set(firestore.collection('volunteers').doc(volunteer.id), JSON.parse(JSON.stringify(volunteer)), { merge: true });
  }

  await batch.commit();

  for (const item of inventoryItems) {
    await firestore
      .collection('resources')
      .doc(item.volunteerId)
      .collection('items')
      .doc(item.itemId)
      .set(JSON.parse(JSON.stringify(item)), { merge: true });
  }

  console.log(`✅ Upserted ${volunteers.length} seed volunteers with inventory items.`);
}

async function clearExistingData() {
  console.log('Clearing existing seeded reports...');

  const snapshot = await firestore.collection('needReports').get();
  const batch = firestore.batch();

  snapshot.docs
    .filter((doc) => doc.id.startsWith('seed-report-'))
    .forEach((doc) => batch.delete(doc.ref));

  await batch.commit();

  const volunteerIds = ['seed-volunteer-001', 'seed-volunteer-002', 'dev-user-001'];
  for (const volunteerId of volunteerIds) {
    const inventorySnapshot = await firestore.collection('resources').doc(volunteerId).collection('items').get();
    const inventoryBatch = firestore.batch();
    inventorySnapshot.docs.forEach((doc) => inventoryBatch.delete(doc.ref));
    await inventoryBatch.commit();
    await firestore.collection('volunteers').doc(volunteerId).delete().catch(() => undefined);
  }

  console.log('✅ Cleared seeded need reports and inventory volunteers');
}

async function main() {
  try {
    const args = process.argv.slice(2);
    const shouldClear = args.includes('--clear');
    const count = parseInt(args.find((arg) => arg.startsWith('--count='))?.split('=')[1] || '24', 10);

    console.log('🌱 SevaSetu Seed Data Script');
    console.log('============================\n');

    if (shouldClear) {
      await clearExistingData();
      console.log('');
    }

    await generateSeedReports(count);
    await generateSeedVolunteersAndInventory();

    console.log('\n✨ Seed data generation complete!');
    console.log('Seeded reports now include urgencyScore, urgencyBreakdown, and volunteer inventory examples.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error generating seed data:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  void main();
}

export { buildSeedReports, generateSeedReports, clearExistingData };
