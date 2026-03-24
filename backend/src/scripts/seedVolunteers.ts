import { getFirestore } from '../config/firebase';
import { NeedCategory } from '../models/NeedReport';
import { VolunteerAvailability } from '../models/Volunteer';

const db = getFirestore();

const cities = [
  { district: 'Delhi', state: 'Delhi', latitude: 28.6139, longitude: 77.209 },
  { district: 'Mumbai', state: 'Maharashtra', latitude: 19.076, longitude: 72.8777 },
  { district: 'Bengaluru', state: 'Karnataka', latitude: 12.9716, longitude: 77.5946 },
  { district: 'Hyderabad', state: 'Telangana', latitude: 17.385, longitude: 78.4867 },
  { district: 'Kolkata', state: 'West Bengal', latitude: 22.5726, longitude: 88.3639 },
];

const skills = [
  'first_aid',
  'rescue',
  'community_outreach',
  'child_protection',
  'water_sanitation',
  'nutrition_support',
  'medical_assistance',
];

const categories = Object.values(NeedCategory);

async function seedVolunteers(count = 120): Promise<void> {
  const batch = db.batch();
  const now = new Date().toISOString();

  for (let i = 0; i < count; i += 1) {
    const city = cities[i % cities.length];
    const chosenCategories = pickRandom(categories, 2 + (i % 3));
    const chosenSkills = pickRandom(skills, 3);
    const assignedTasks = Math.floor(Math.random() * 80);
    const completedTasks = Math.max(0, assignedTasks - Math.floor(Math.random() * 15));
    const avgRating = Number((3.6 + Math.random() * 1.4).toFixed(2));

    const ref = db.collection('volunteers').doc();
    batch.set(ref, {
      userId: `vol_user_${i + 1}`,
      ngoId: `ngo_${(i % 20) + 1}`,
      ngoName: `NGO ${(i % 20) + 1}`,
      name: `Volunteer ${i + 1}`,
      phoneNumber: `+9199${String(10000000 + i).slice(0, 8)}`,
      preferredLanguage: i % 3 === 0 ? 'hi' : i % 3 === 1 ? 'en' : 'ta',
      isActive: true,
      location: {
        latitude: city.latitude + (Math.random() - 0.5) * 0.12,
        longitude: city.longitude + (Math.random() - 0.5) * 0.12,
        district: city.district,
        state: city.state,
        updatedAt: now,
      },
      skills: chosenSkills,
      categories: chosenCategories,
      certifications: i % 2 === 0 ? ['first_aid_certified'] : ['community_response'],
      availability:
        i % 10 === 0
          ? VolunteerAvailability.OFFLINE
          : i % 4 === 0
            ? VolunteerAvailability.IN_TASK
            : VolunteerAvailability.FREE,
      maxServiceableDistanceKm: 15 + (i % 20),
      supportsUnderservedZones: i % 5 === 0,
      ngoVolunteerCount: 20 + (i % 120),
      stats: {
        assignedTasks,
        completedTasks,
        avgBeneficiaryRating: avgRating,
        reliabilityScore: Number(((completedTasks / Math.max(1, assignedTasks)) * (avgRating / 5)).toFixed(3)),
        activeTasks: i % 4 === 0 ? 2 : i % 6 === 0 ? 3 : 0,
        last90dAssignedTasks: Math.floor(assignedTasks * 0.4),
        last90dCompletedTasks: Math.floor(completedTasks * 0.4),
      },
      createdAt: now,
      updatedAt: now,
    });
  }

  await batch.commit();
}

function pickRandom<T>(arr: T[], count: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < count && copy.length > 0; i += 1) {
    const idx = Math.floor(Math.random() * copy.length);
    out.push(copy[idx]);
    copy.splice(idx, 1);
  }
  return out;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const shouldClear = args.includes('--clear');
  const countArg = args.find((arg) => arg.startsWith('--count='));
  const count = countArg ? Number(countArg.split('=')[1]) : 120;

  if (shouldClear) {
    const snapshot = await db.collection('volunteers').limit(1000).get();
    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }

  await seedVolunteers(count);
  console.log(`Seeded ${count} volunteers`);
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
