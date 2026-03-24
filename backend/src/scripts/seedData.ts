/**
 * Seed Data Script
 * Populates Firestore with sample need reports for testing
 */

import { getFirestore } from '../config/firebase';
import { NeedCategory, UrgencyLevel, ReportStatus, IntakeSource } from '../models/NeedReport';

const firestore = getFirestore();

const categories = [
  NeedCategory.EMERGENCY,
  NeedCategory.FOOD_NUTRITION,
  NeedCategory.HEALTH,
  NeedCategory.EDUCATION,
  NeedCategory.WATER_SANITATION,
  NeedCategory.SHELTER,
  NeedCategory.WOMEN_CHILD,
  NeedCategory.ENVIRONMENT,
];

const urgencyLevels = [
  UrgencyLevel.CRITICAL,
  UrgencyLevel.HIGH,
  UrgencyLevel.MEDIUM,
  UrgencyLevel.LOW,
];

const statuses = [
  ReportStatus.PENDING,
  ReportStatus.DISPATCHED,
  ReportStatus.IN_PROGRESS,
  ReportStatus.RESOLVED,
];

// Sample locations across India (fuzzy coordinates)
const sampleLocations = [
  { lat: 28.6139, lng: 77.2090, area: 'Delhi', state: 'Delhi' },
  { lat: 19.0760, lng: 72.8777, area: 'Mumbai', state: 'Maharashtra' },
  { lat: 13.0827, lng: 80.2707, area: 'Chennai', state: 'Tamil Nadu' },
  { lat: 22.5726, lng: 88.3639, area: 'Kolkata', state: 'West Bengal' },
  { lat: 12.9716, lng: 77.5946, area: 'Bangalore', state: 'Karnataka' },
  { lat: 17.3850, lng: 78.4867, area: 'Hyderabad', state: 'Telangana' },
  { lat: 23.0225, lng: 72.5714, area: 'Ahmedabad', state: 'Gujarat' },
  { lat: 18.5204, lng: 73.8567, area: 'Pune', state: 'Maharashtra' },
  { lat: 26.9124, lng: 75.7873, area: 'Jaipur', state: 'Rajasthan' },
  { lat: 21.1458, lng: 79.0882, area: 'Nagpur', state: 'Maharashtra' },
];

// Sample descriptions by category
const sampleDescriptions: Record<string, string[]> = {
  'emergency': [
    'Flood has affected 50 families, urgent rescue needed',
    'Building collapse in residential area, people trapped',
    'Major fire incident, immediate medical aid required',
  ],
  'food-nutrition': [
    'Community kitchen needed for 100 families affected by floods',
    '200 children in village need nutritious meals',
    'Food shortage in remote tribal area, 500 people affected',
  ],
  'health': [
    'Medical camp needed for 300 villagers, no doctor available',
    'Dengue outbreak in area, need medicines and mosquito nets',
    'Pregnant women need prenatal care, no nearby facility',
  ],
  'education': [
    'School building damaged, 200 students without classroom',
    'Need books and supplies for 50 underprivileged children',
    'Computer lab needed for government school',
  ],
  'water-sanitation': [
    'Village borewell broken, 1000 people without water',
    'Sanitation facilities needed for slum area',
    'Water purification system required for contaminated supply',
  ],
  'shelter': [
    'Flood destroyed 30 homes, families living on roadside',
    'Elderly couple needs urgent housing repair',
    'Makeshift shelter for 20 migrant families',
  ],
  'women-child': [
    'Women need safe space and counseling support',
    'Child protection case requiring intervention',
    'Maternity care needed for expecting mothers',
  ],
  'environment': [
    'Lake pollution affecting community health',
    'Tree plantation drive needed in barren area',
    'Waste management system for village required',
  ],
};

async function generateSeedReports(count: number = 100) {
  console.log(`Generating ${count} seed reports...`);
  
  const batch = firestore.batch();
  const reportsCollection = firestore.collection('needReports');
  
  for (let i = 0; i < count; i++) {
    const category = categories[Math.floor(Math.random() * categories.length)];
    const urgency = urgencyLevels[Math.floor(Math.random() * urgencyLevels.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const location = sampleLocations[Math.floor(Math.random() * sampleLocations.length)];
    const descriptions = sampleDescriptions[category];
    const description = descriptions[Math.floor(Math.random() * descriptions.length)];
    
    // Add some fuzzing to location (within 500m)
    const fuzzLat = location.lat + (Math.random() - 0.5) * 0.009; // ~500m
    const fuzzLng = location.lng + (Math.random() - 0.5) * 0.009;
    
    // Generate realistic timestamps (past 30 days)
    const daysAgo = Math.floor(Math.random() * 30);
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - daysAgo);
    
    const intakeSources = [IntakeSource.VOICE, IntakeSource.PHOTO, IntakeSource.WEB_FORM, IntakeSource.WHATSAPP];
    
    const report: any = {
      reporterId: `seed_user_${i % 10}`,
      category,
      urgency,
      status,
      title: `${category.replace(/_/g, ' ')} - ${location.area}`,
      description,
      location: {
        latitude: fuzzLat,
        longitude: fuzzLng,
        address: `${location.area}, ${location.state}`,
        district: location.area,
        state: location.state,
      },
      peopleAffected: Math.floor(Math.random() * 500) + 10,
      photos: [],
      intakeSource: intakeSources[Math.floor(Math.random() * intakeSources.length)],
      language: 'hindi',
      createdAt: createdAt.toISOString(),
      updatedAt: createdAt.toISOString(),
    };
    
    // Add dispatch info for non-pending reports
    if (status !== ReportStatus.PENDING) {
      report.dispatchedTo = {
        ngoId: `ngo_${Math.floor(Math.random() * 5) + 1}`,
        ngoName: `NGO ${Math.floor(Math.random() * 5) + 1}`,
        dispatchedAt: new Date(createdAt.getTime() + 3600000).toISOString(), // 1 hour after creation
      };
    }
    
    const docRef = reportsCollection.doc();
    batch.set(docRef, report);
    
    if ((i + 1) % 10 === 0) {
      console.log(`  Generated ${i + 1}/${count} reports...`);
    }
  }
  
  await batch.commit();
  console.log(`✅ Successfully created ${count} seed reports!`);
}

async function clearExistingData() {
  console.log('Clearing existing reports...');
  
  const reportsSnapshot = await firestore.collection('needReports').get();
  const batch = firestore.batch();
  
  reportsSnapshot.docs.forEach((doc: any) => {
    batch.delete(doc.ref);
  });
  
  await batch.commit();
  console.log(`✅ Cleared ${reportsSnapshot.size} existing reports`);
}

// Main execution
async function main() {
  try {
    const args = process.argv.slice(2);
    const shouldClear = args.includes('--clear');
    const count = parseInt(args.find(arg => arg.startsWith('--count='))?.split('=')[1] || '100');
    
    console.log('🌱 SevaSetu Seed Data Script');
    console.log('============================\n');
    
    if (shouldClear) {
      await clearExistingData();
      console.log('');
    }
    
    await generateSeedReports(count);
    
    console.log('\n✨ Seed data generation complete!');
    console.log('You can now view the data on the Community Pulse Map at /pulse-map');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error generating seed data:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { generateSeedReports, clearExistingData };
