/**
 * Map Data Aggregation Service
 * PRD: 5.2 Community Pulse Map - Data Aggregation
 * 
 * Aggregates need reports into H3 hexagons for map visualization.
 * Implements privacy fuzzing (500m radius).
 */

import { latLngToCell, cellToBoundary } from 'h3-js';
import { getFirestore, isFirebaseMockMode } from '../config/firebase';
import {
  NeedReport,
  UrgencyLevel,
  NeedCategory,
  ReportStatus,
  IntakeSource,
} from '../models/NeedReport';

// H3 resolution 8 = ~0.46 km² hexagons (roughly 1km² as per PRD)
const H3_RESOLUTION = 8;

// Privacy fuzzing radius in meters
const PRIVACY_FUZZ_RADIUS_METERS = 500;

function createMockNeedReport(input: {
  id: string;
  category: NeedReport['category'];
  urgency: NeedReport['urgency'];
  status: NeedReport['status'];
  latitude: number;
  longitude: number;
  district: string;
  state: string;
  description: string;
  estimatedPeopleAffected: number;
  assignedNgoId?: string;
}): NeedReport {
  const now = new Date().toISOString();

  return {
    id: input.id,
    reporterId: `mock-reporter-${input.id}`,
    category: input.category,
    urgency: input.urgency,
    status: input.status,
    description: input.description,
    estimatedPeopleAffected: input.estimatedPeopleAffected,
    location: {
      latitude: input.latitude,
      longitude: input.longitude,
      district: input.district,
      state: input.state,
    },
    source: IntakeSource.WEB_FORM,
    language: 'en',
    createdAt: now,
    updatedAt: now,
    assignedNgoId: input.assignedNgoId,
    isOfflineSubmission: false,
    isPrivate: false,
  };
}

const MOCK_NEED_REPORTS: NeedReport[] = [
  createMockNeedReport({
    id: 'mock-001',
    category: NeedCategory.HEALTH,
    urgency: UrgencyLevel.HIGH,
    status: ReportStatus.PENDING,
    latitude: 28.6139,
    longitude: 77.209,
    district: 'New Delhi',
    state: 'Delhi',
    description: 'Primary health camp support needed in urban settlement cluster.',
    estimatedPeopleAffected: 34,
    assignedNgoId: 'ngo-health-01',
  }),
  createMockNeedReport({
    id: 'mock-002',
    category: NeedCategory.WATER_SANITATION,
    urgency: UrgencyLevel.CRITICAL,
    status: ReportStatus.PENDING,
    latitude: 19.076,
    longitude: 72.8777,
    district: 'Mumbai',
    state: 'Maharashtra',
    description: 'Water contamination alert and urgent purification support request.',
    estimatedPeopleAffected: 120,
    assignedNgoId: 'ngo-wash-03',
  }),
  createMockNeedReport({
    id: 'mock-003',
    category: NeedCategory.FOOD_NUTRITION,
    urgency: UrgencyLevel.HIGH,
    status: ReportStatus.DISPATCHED,
    latitude: 13.0827,
    longitude: 80.2707,
    district: 'Chennai',
    state: 'Tamil Nadu',
    description: 'Food kit dispatch required for flood-affected households.',
    estimatedPeopleAffected: 56,
    assignedNgoId: 'ngo-food-02',
  }),
  createMockNeedReport({
    id: 'mock-004',
    category: NeedCategory.EDUCATION,
    urgency: UrgencyLevel.MEDIUM,
    status: ReportStatus.IN_PROGRESS,
    latitude: 12.9716,
    longitude: 77.5946,
    district: 'Bengaluru',
    state: 'Karnataka',
    description: 'Community classroom material distribution already underway.',
    estimatedPeopleAffected: 42,
    assignedNgoId: 'ngo-edu-08',
  }),
  createMockNeedReport({
    id: 'mock-005',
    category: NeedCategory.SHELTER,
    urgency: UrgencyLevel.HIGH,
    status: ReportStatus.RESOLVED,
    latitude: 22.5726,
    longitude: 88.3639,
    district: 'Kolkata',
    state: 'West Bengal',
    description: 'Temporary shelter and tarpaulin support completed successfully.',
    estimatedPeopleAffected: 27,
    assignedNgoId: 'ngo-relief-04',
  }),
  createMockNeedReport({
    id: 'mock-006',
    category: NeedCategory.EMERGENCY,
    urgency: UrgencyLevel.CRITICAL,
    status: ReportStatus.PENDING,
    latitude: 26.9124,
    longitude: 75.7873,
    district: 'Jaipur',
    state: 'Rajasthan',
    description: 'Medical emergency requiring immediate dispatch in peri-urban ward.',
    estimatedPeopleAffected: 9,
    assignedNgoId: 'ngo-emergency-01',
  }),
  createMockNeedReport({
    id: 'mock-007',
    category: NeedCategory.WOMEN_CHILD,
    urgency: UrgencyLevel.HIGH,
    status: ReportStatus.DISPATCHED,
    latitude: 17.385,
    longitude: 78.4867,
    district: 'Hyderabad',
    state: 'Telangana',
    description: 'Maternal support visit assigned to specialist social worker.',
    estimatedPeopleAffected: 18,
    assignedNgoId: 'ngo-wc-06',
  }),
  createMockNeedReport({
    id: 'mock-008',
    category: NeedCategory.ENVIRONMENT,
    urgency: UrgencyLevel.LOW,
    status: ReportStatus.RESOLVED,
    latitude: 23.0225,
    longitude: 72.5714,
    district: 'Ahmedabad',
    state: 'Gujarat',
    description: 'Waste cleanup drive completed and verified by local volunteers.',
    estimatedPeopleAffected: 80,
    assignedNgoId: 'ngo-env-11',
  }),
];

export interface HexagonData {
  hexId: string;
  center: {
    lat: number;
    lng: number;
  };
  boundary: Array<[number, number]>;
  needCount: number;
  dominantCategory: string;
  dominantUrgency: string;
  categories: Record<string, number>;
  urgencies: Record<string, number>;
  reports: {
    id: string;
    category: string;
    urgency: string;
    status: string;
    estimatedPeopleAffected: number;
    createdAt: string;
    fuzzedLocation?: { lat: number; lng: number };
  }[];
  nearbyVolunteers: number;
  assignedNgos: string[];
  lastUpdated: string;
}

export interface MapLayer {
  name: string;
  hexagons: HexagonData[];
  totalNeeds: number;
  lastUpdated: string;
}

export interface MapLayersResponse {
  active: MapLayer;
  inProgress: MapLayer;
  resolved: MapLayer;
  centerPoint: { lat: number; lng: number };
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

/**
 * Fuzz location for privacy (add random offset within radius)
 */
function fuzzLocation(lat: number, lng: number): { lat: number; lng: number } {
  // Convert radius to degrees (rough approximation)
  const radiusInDegrees = PRIVACY_FUZZ_RADIUS_METERS / 111000; // 1 degree ≈ 111km
  
  // Random angle
  const angle = Math.random() * 2 * Math.PI;
  
  // Random distance within radius
  const distance = Math.sqrt(Math.random()) * radiusInDegrees;
  
  return {
    lat: lat + distance * Math.cos(angle),
    lng: lng + distance * Math.sin(angle),
  };
}

/**
 * Convert H3 cell to hexagon boundary coordinates
 */
function h3CellToBoundary(hexId: string): Array<[number, number]> {
  const boundary = cellToBoundary(hexId);
  // Convert [lat, lng] to [lng, lat] for GeoJSON format
  return boundary.map(coord => [coord[1], coord[0]]);
}

/**
 * Get center point of H3 cell
 */
function h3CellToCenter(hexId: string): { lat: number; lng: number } {
  const boundary = cellToBoundary(hexId);
  
  // Calculate centroid
  let latSum = 0;
  let lngSum = 0;
  
  boundary.forEach(coord => {
    latSum += coord[0];
    lngSum += coord[1];
  });
  
  return {
    lat: latSum / boundary.length,
    lng: lngSum / boundary.length,
  };
}

/**
 * Aggregate reports into hexagons
 */
function aggregateReportsToHexagons(
  reports: NeedReport[],
  fuzzForPrivacy: boolean = true
): Map<string, HexagonData> {
  const hexMap = new Map<string, HexagonData>();
  
  for (const report of reports) {
    // Skip reports without valid location
    if (!report.location?.latitude || !report.location?.longitude) continue;
    
    // Convert lat/lng to H3 cell
    const hexId = latLngToCell(
      report.location.latitude,
      report.location.longitude,
      H3_RESOLUTION
    );
    
    // Get or create hexagon data
    let hexData = hexMap.get(hexId);
    
    if (!hexData) {
      hexData = {
        hexId,
        center: h3CellToCenter(hexId),
        boundary: h3CellToBoundary(hexId),
        needCount: 0,
        dominantCategory: report.category,
        dominantUrgency: report.urgency,
        categories: {},
        urgencies: {},
        reports: [],
        nearbyVolunteers: 0,
        assignedNgos: [],
        lastUpdated: new Date().toISOString(),
      };
      hexMap.set(hexId, hexData);
    }
    
    // Increment counts
    hexData.needCount++;
    hexData.categories[report.category] = (hexData.categories[report.category] || 0) + 1;
    hexData.urgencies[report.urgency] = (hexData.urgencies[report.urgency] || 0) + 1;
    
    // Add report summary
    hexData.reports.push({
      id: report.id!,
      category: report.category,
      urgency: report.urgency,
      status: report.status,
      estimatedPeopleAffected: report.estimatedPeopleAffected || 0,
      createdAt: typeof report.createdAt === 'string' ? report.createdAt : report.createdAt.toISOString(),
      fuzzedLocation: fuzzForPrivacy 
        ? fuzzLocation(report.location.latitude, report.location.longitude)
        : { lat: report.location.latitude, lng: report.location.longitude },
    });
    
    // Update dominant category (most common)
    const maxCategory = Object.entries(hexData.categories)
      .sort((a, b) => b[1] - a[1])[0];
    hexData.dominantCategory = maxCategory[0];
    
    // Update dominant urgency (highest priority)
    const urgencyRank = {
      [UrgencyLevel.CRITICAL]: 4,
      [UrgencyLevel.HIGH]: 3,
      [UrgencyLevel.MEDIUM]: 2,
      [UrgencyLevel.LOW]: 1,
    };
    
    const maxUrgency = Object.keys(hexData.urgencies)
      .sort((a, b) => (urgencyRank[b as keyof typeof urgencyRank] || 0) - (urgencyRank[a as keyof typeof urgencyRank] || 0))[0];
    hexData.dominantUrgency = maxUrgency;
    
    // Track assigned NGOs
    if (report.assignedNgoId && !hexData.assignedNgos.includes(report.assignedNgoId)) {
      hexData.assignedNgos.push(report.assignedNgoId);
    }
  }
  
  return hexMap;
}

function filterReportsByBounds(
  reports: NeedReport[],
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  }
): NeedReport[] {
  if (!bounds) return reports;

  return reports.filter((report) => {
    const lat = report.location?.latitude;
    const lng = report.location?.longitude;
    if (lat === undefined || lng === undefined) return false;

    return lat <= bounds.north && lat >= bounds.south && lng <= bounds.east && lng >= bounds.west;
  });
}

function buildMapLayersResponse(
  activeReports: NeedReport[],
  inProgressReports: NeedReport[],
  resolvedReports: NeedReport[]
): MapLayersResponse {
  const activeHexagons = aggregateReportsToHexagons(activeReports, true);
  const inProgressHexagons = aggregateReportsToHexagons(inProgressReports, true);
  const resolvedHexagons = aggregateReportsToHexagons(resolvedReports, false);

  const allReports = [...activeReports, ...inProgressReports];
  let centerLat = 20.5937;
  let centerLng = 78.9629;
  let north = 35.5;
  let south = 6.5;
  let east = 97.4;
  let west = 68.2;

  if (allReports.length > 0) {
    const lats = allReports.map((r) => r.location.latitude).filter(Boolean);
    const lngs = allReports.map((r) => r.location.longitude).filter(Boolean);

    if (lats.length > 0) {
      centerLat = lats.reduce((a, b) => a + b, 0) / lats.length;
      centerLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;
      north = Math.max(...lats);
      south = Math.min(...lats);
      east = Math.max(...lngs);
      west = Math.min(...lngs);
    }
  }

  const now = new Date().toISOString();

  return {
    active: {
      name: 'Active Needs',
      hexagons: Array.from(activeHexagons.values()),
      totalNeeds: activeReports.length,
      lastUpdated: now,
    },
    inProgress: {
      name: 'In Progress',
      hexagons: Array.from(inProgressHexagons.values()),
      totalNeeds: inProgressReports.length,
      lastUpdated: now,
    },
    resolved: {
      name: 'Resolved',
      hexagons: Array.from(resolvedHexagons.values()),
      totalNeeds: resolvedReports.length,
      lastUpdated: now,
    },
    centerPoint: {
      lat: centerLat,
      lng: centerLng,
    },
    bounds: {
      north,
      south,
      east,
      west,
    },
  };
}

/**
 * Get all map layers data
 */
export async function getMapLayers(
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  }
): Promise<MapLayersResponse> {
  if (isFirebaseMockMode()) {
    const filtered = filterReportsByBounds(MOCK_NEED_REPORTS, bounds);
    const activeReports = filtered.filter((r) => r.status === ReportStatus.PENDING);
    const inProgressReports = filtered.filter(
      (r) => r.status === ReportStatus.DISPATCHED || r.status === ReportStatus.IN_PROGRESS
    );
    const resolvedReports = filtered.filter((r) => r.status === ReportStatus.RESOLVED);

    return buildMapLayersResponse(activeReports, inProgressReports, resolvedReports);
  }

  const db = getFirestore();
  
  // Query reports (with optional bounds filtering)
  let activeQuery = db.collection('needReports')
    .where('status', '==', 'pending');
  
  let inProgressQuery = db.collection('needReports')
    .where('status', 'in', ['dispatched', 'in_progress']);
  
  let resolvedQuery = db.collection('needReports')
    .where('status', '==', 'resolved')
    .orderBy('updatedAt', 'desc')
    .limit(1000); // Limit resolved reports
  
  // Execute queries
  const activeSnapshot = await activeQuery.get();
  const inProgressSnapshot = await inProgressQuery.get();
  const resolvedSnapshot = await resolvedQuery.get();

  const activeReports = filterReportsByBounds(
    activeSnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as NeedReport)),
    bounds
  );
  const inProgressReports = filterReportsByBounds(
    inProgressSnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as NeedReport)),
    bounds
  );
  const resolvedReports = filterReportsByBounds(
    resolvedSnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as NeedReport)),
    bounds
  );

  return buildMapLayersResponse(activeReports, inProgressReports, resolvedReports);
}

/**
 * Get hexagon details by ID
 */
export async function getHexagonDetails(hexId: string): Promise<HexagonData | null> {
  if (isFirebaseMockMode()) {
    const layers = await getMapLayers();
    const allHexagons = [...layers.active.hexagons, ...layers.inProgress.hexagons, ...layers.resolved.hexagons];
    return allHexagons.find((hex) => hex.hexId === hexId) || null;
  }

  const db = getFirestore();
  
  // Get all reports in this hexagon
  const reports = await db.collection('needReports')
    .where('status', 'in', ['pending', 'dispatched', 'in_progress'])
    .get();
  
  const hexagonReports: NeedReport[] = [];
  
  for (const doc of reports.docs) {
    const report = { id: doc.id, ...doc.data() } as NeedReport;
    
    if (report.location?.latitude && report.location?.longitude) {
      const reportHexId = latLngToCell(
        report.location.latitude,
        report.location.longitude,
        H3_RESOLUTION
      );
      
      if (reportHexId === hexId) {
        hexagonReports.push(report);
      }
    }
  }
  
  if (hexagonReports.length === 0) {
    return null;
  }
  
  const hexMap = aggregateReportsToHexagons(hexagonReports, true);
  return hexMap.get(hexId) || null;
}

/**
 * Get nearby volunteers count for hexagon
 */
export async function getNearbyVolunteers(hexId: string): Promise<number> {
  if (isFirebaseMockMode()) {
    let hash = 0;
    for (let i = 0; i < hexId.length; i++) {
      hash = (hash * 31 + hexId.charCodeAt(i)) % 997;
    }
    return 3 + (hash % 15);
  }

  const db = getFirestore();
  const center = h3CellToCenter(hexId);
  
  // Query volunteers within 10km radius
  // Note: This is a simplified version. Production would use geohashing.
  const volunteers = await db.collection('users')
    .where('role', '==', 'volunteer')
    .where('isAvailable', '==', true)
    .limit(100)
    .get();
  
  let count = 0;
  
  volunteers.docs.forEach(doc => {
    const volunteer = doc.data();
    if (volunteer.location?.latitude && volunteer.location?.longitude) {
      const distance = calculateDistance(
        center.lat,
        center.lng,
        volunteer.location.latitude,
        volunteer.location.longitude
      );
      
      if (distance <= 10) { // 10km radius
        count++;
      }
    }
  });
  
  return count;
}

/**
 * Calculate distance between two coordinates (Haversine)
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
