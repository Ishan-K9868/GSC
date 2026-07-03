import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import wardData from '../../../backend/src/data/ward_vulnerability_index.json';
import { db } from '../../config/firebase';
import { AppIcon } from '../../components/shared';
import { getReports } from '../../services/api';
import styles from './CommunityPulseMap.module.css';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
const GOOGLE_MAPS_MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID';
const GOOGLE_MAPS_CALLBACK_NAME = 'sevaSetuPulseMapReady';
const GOOGLE_MAPS_SCRIPT_SRC = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=marker&callback=${GOOGLE_MAPS_CALLBACK_NAME}&loading=async`;
const ACTIVE_NEED_STATUSES = ['pending', 'classified', 'dispatched', 'in_progress'] as const;
const NEED_API_FALLBACK_POLL_MS = 12000;
const DELHI_NCR_CENTER = { lat: 28.6139, lng: 77.209 };
const DELHI_NCR_BOUNDS = {
  north: 29.15,
  south: 28.25,
  east: 77.75,
  west: 76.7,
} as const;
const DELHI_NCR_MIN_ZOOM = 9;
const DELHI_NCR_DEFAULT_ZOOM = 10;

type NeedStatus = typeof ACTIVE_NEED_STATUSES[number] | 'resolved' | 'cancelled';
type UrgencyKey = 'critical' | 'high' | 'medium' | 'low';
type StatusFilterKey = typeof ACTIVE_NEED_STATUSES[number];

type NeedReport = {
  id: string;
  category: string;
  urgency: UrgencyKey;
  status: NeedStatus;
  description: string;
  estimatedPeopleAffected?: number;
  urgencyScore?: number;
  report_count?: number;
  systemic?: boolean;
  createdAt?: string | { toMillis?: () => number; seconds?: number; nanoseconds?: number };
  updatedAt?: string | { toMillis?: () => number; seconds?: number; nanoseconds?: number };
  location?: {
    latitude?: number;
    longitude?: number;
    address?: string;
    district?: string;
    state?: string;
  };
};

type VolunteerPosition = {
  id: string;
  name?: string;
  availability?: string;
  skills?: string[];
  categories?: string[];
  reliabilityScore?: number;
  stats?: {
    reliabilityScore?: number;
    activeTasks?: number;
  };
  location?: {
    latitude?: number;
    longitude?: number;
    district?: string;
    state?: string;
  };
};

type CuratedVolunteer = VolunteerPosition & {
  duplicateCount: number;
  reliability: number;
  activeTasks: number;
};

type MapMarker = google.maps.Marker | google.maps.marker.AdvancedMarkerElement;

type WardFeature = {
  properties: {
    ward_name?: string;
    district?: string;
    bpl_pct?: number;
    elderly_pct?: number;
    hospital_dist_km?: number;
    school_dist_km?: number;
  };
  geometry: {
    coordinates: number[][][];
  };
};

const DEMO_NEED_REPORTS: NeedReport[] = [
  {
    id: 'demo-need-okhla-shelter',
    category: 'shelter',
    urgency: 'critical',
    status: 'pending',
    description: 'Night shelter queue expanded after rain displacement near river-edge settlements.',
    estimatedPeopleAffected: 44,
    urgencyScore: 9.8,
    report_count: 6,
    systemic: true,
    createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    location: {
      latitude: 28.5453,
      longitude: 77.2734,
      address: 'Okhla, South East Delhi, Delhi',
      district: 'South East Delhi',
      state: 'Delhi',
    },
  },
  {
    id: 'demo-need-seelampur-water',
    category: 'water_sanitation',
    urgency: 'high',
    status: 'classified',
    description: 'Tankers delayed and community taps are below normal output since morning.',
    estimatedPeopleAffected: 31,
    urgencyScore: 8.7,
    report_count: 5,
    systemic: true,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    location: {
      latitude: 28.6729,
      longitude: 77.2691,
      address: 'Seelampur, North East Delhi, Delhi',
      district: 'North East Delhi',
      state: 'Delhi',
    },
  },
  {
    id: 'demo-need-mustafabad-health',
    category: 'health',
    urgency: 'high',
    status: 'in_progress',
    description: 'Fever-medicine restock underway and two pediatric cases need follow-up visits.',
    estimatedPeopleAffected: 19,
    urgencyScore: 8.2,
    report_count: 4,
    systemic: false,
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    location: {
      latitude: 28.6967,
      longitude: 77.2861,
      address: 'Mustafabad, North East Delhi, Delhi',
      district: 'North East Delhi',
      state: 'Delhi',
    },
  },
  {
    id: 'demo-need-yamuna-food',
    category: 'food_nutrition',
    urgency: 'high',
    status: 'dispatched',
    description: 'Cooked-meal line increased after midday school kitchen disruption.',
    estimatedPeopleAffected: 26,
    urgencyScore: 7.9,
    report_count: 3,
    systemic: false,
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
    location: {
      latitude: 28.7052,
      longitude: 77.2846,
      address: 'Yamuna Vihar, North East Delhi, Delhi',
      district: 'North East Delhi',
      state: 'Delhi',
    },
  },
  {
    id: 'demo-need-bhajanpura-wc',
    category: 'women_child',
    urgency: 'critical',
    status: 'in_progress',
    description: 'Maternal-care support paired with privacy-safe case handling.',
    estimatedPeopleAffected: 8,
    urgencyScore: 9.2,
    report_count: 2,
    systemic: false,
    createdAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    location: {
      latitude: 28.7041,
      longitude: 77.2668,
      address: 'Bhajanpura, North East Delhi, Delhi',
      district: 'North East Delhi',
      state: 'Delhi',
    },
  },
  {
    id: 'demo-need-rohini-food',
    category: 'food_nutrition',
    urgency: 'medium',
    status: 'classified',
    description: 'Weekend ration support required for migrant households near pocket clusters.',
    estimatedPeopleAffected: 17,
    urgencyScore: 6.4,
    report_count: 2,
    systemic: false,
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 75 * 60 * 1000).toISOString(),
    location: {
      latitude: 28.7494,
      longitude: 77.0565,
      address: 'Rohini, North West Delhi, Delhi',
      district: 'North West Delhi',
      state: 'Delhi',
    },
  },
  {
    id: 'demo-need-dwarka-health',
    category: 'health',
    urgency: 'medium',
    status: 'pending',
    description: 'Elder-care medicine refill requests are stacking up across two housing blocks.',
    estimatedPeopleAffected: 14,
    urgencyScore: 6.8,
    report_count: 3,
    systemic: false,
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    location: {
      latitude: 28.5921,
      longitude: 77.046,
      address: 'Dwarka, South West Delhi, Delhi',
      district: 'South West Delhi',
      state: 'Delhi',
    },
  },
  {
    id: 'demo-need-lajpat-meds',
    category: 'health',
    urgency: 'medium',
    status: 'classified',
    description: 'Medicine pickup corridor is steady but the second courier wave is still pending.',
    estimatedPeopleAffected: 13,
    urgencyScore: 6.1,
    report_count: 3,
    systemic: false,
    createdAt: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 95 * 60 * 1000).toISOString(),
    location: {
      latitude: 28.5677,
      longitude: 77.2434,
      address: 'Lajpat Nagar, South East Delhi, Delhi',
      district: 'South East Delhi',
      state: 'Delhi',
    },
  },
  {
    id: 'demo-need-mehrauli-shelter',
    category: 'shelter',
    urgency: 'high',
    status: 'pending',
    description: 'Temporary tarpaulin support is needed for families affected by overnight wind damage.',
    estimatedPeopleAffected: 22,
    urgencyScore: 7.6,
    report_count: 4,
    systemic: true,
    createdAt: new Date(Date.now() - 100 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    location: {
      latitude: 28.5208,
      longitude: 77.1855,
      address: 'Mehrauli, South Delhi, Delhi',
      district: 'South Delhi',
      state: 'Delhi',
    },
  },
  {
    id: 'demo-need-bawana-edu',
    category: 'education',
    urgency: 'medium',
    status: 'dispatched',
    description: 'Learning kits and floor mats are being routed to a pop-up community classroom.',
    estimatedPeopleAffected: 28,
    urgencyScore: 5.9,
    report_count: 3,
    systemic: false,
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
    location: {
      latitude: 28.7976,
      longitude: 77.0431,
      address: 'Bawana, North West Delhi, Delhi',
      district: 'North West Delhi',
      state: 'Delhi',
    },
  },
  {
    id: 'demo-need-shahdara-env',
    category: 'environment',
    urgency: 'low',
    status: 'classified',
    description: 'Drain-side waste accumulation is worsening mosquito risk and needs coordinated cleanup.',
    estimatedPeopleAffected: 35,
    urgencyScore: 4.8,
    report_count: 5,
    systemic: true,
    createdAt: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    location: {
      latitude: 28.6735,
      longitude: 77.2899,
      address: 'Shahdara, East Delhi, Delhi',
      district: 'East Delhi',
      state: 'Delhi',
    },
  },
];

const DEMO_VOLUNTEER_POSITIONS: VolunteerPosition[] = [
  {
    id: 'demo-vol-farah',
    name: 'Farah Khan',
    availability: 'free',
    categories: ['shelter', 'women_child'],
    skills: ['community_outreach', 'relief_ops'],
    stats: { reliabilityScore: 0.94, activeTasks: 1 },
    location: { latitude: 28.5478, longitude: 77.2681, district: 'South East Delhi', state: 'Delhi' },
  },
  {
    id: 'demo-vol-arjun',
    name: 'Arjun Dabas',
    availability: 'free',
    categories: ['water_sanitation', 'health'],
    skills: ['water_sanitation', 'first_aid'],
    stats: { reliabilityScore: 0.91, activeTasks: 0 },
    location: { latitude: 28.6711, longitude: 77.261, district: 'North East Delhi', state: 'Delhi' },
  },
  {
    id: 'demo-vol-saba',
    name: 'Saba Parveen',
    availability: 'free',
    categories: ['health', 'women_child'],
    skills: ['medical_assistance', 'child_protection'],
    stats: { reliabilityScore: 0.96, activeTasks: 1 },
    location: { latitude: 28.694, longitude: 77.281, district: 'North East Delhi', state: 'Delhi' },
  },
  {
    id: 'demo-vol-nidhi',
    name: 'Nidhi Batra',
    availability: 'free',
    categories: ['food_nutrition', 'education'],
    skills: ['nutrition_support', 'community_outreach'],
    stats: { reliabilityScore: 0.89, activeTasks: 0 },
    location: { latitude: 28.7014, longitude: 77.2792, district: 'North East Delhi', state: 'Delhi' },
  },
  {
    id: 'demo-vol-aman',
    name: 'Aman Malik',
    availability: 'free',
    categories: ['health', 'shelter'],
    skills: ['medical_assistance', 'logistics'],
    stats: { reliabilityScore: 0.87, activeTasks: 2 },
    location: { latitude: 28.5682, longitude: 77.2458, district: 'South East Delhi', state: 'Delhi' },
  },
  {
    id: 'demo-vol-tushar',
    name: 'Tushar Yadav',
    availability: 'free',
    categories: ['food_nutrition', 'water_sanitation'],
    skills: ['nutrition_support', 'community_outreach'],
    stats: { reliabilityScore: 0.84, activeTasks: 0 },
    location: { latitude: 28.7465, longitude: 77.0631, district: 'North West Delhi', state: 'Delhi' },
  },
  {
    id: 'demo-vol-ruchi',
    name: 'Ruchi Nanda',
    availability: 'free',
    categories: ['water_sanitation', 'health'],
    skills: ['water_sanitation', 'medical_assistance'],
    stats: { reliabilityScore: 0.92, activeTasks: 0 },
    location: { latitude: 28.5901, longitude: 77.0505, district: 'South West Delhi', state: 'Delhi' },
  },
  {
    id: 'demo-vol-meenal',
    name: 'Meenal Joshi',
    availability: 'free',
    categories: ['women_child', 'health'],
    skills: ['child_protection', 'community_outreach'],
    stats: { reliabilityScore: 0.95, activeTasks: 1 },
    location: { latitude: 28.7032, longitude: 77.2687, district: 'North East Delhi', state: 'Delhi' },
  },
  {
    id: 'demo-vol-karan',
    name: 'Karan Sethi',
    availability: 'free',
    categories: ['health', 'education'],
    skills: ['medical_assistance', 'logistics'],
    stats: { reliabilityScore: 0.86, activeTasks: 0 },
    location: { latitude: 28.5856, longitude: 77.0408, district: 'South West Delhi', state: 'Delhi' },
  },
  {
    id: 'demo-vol-sonal',
    name: 'Sonal Verma',
    availability: 'free',
    categories: ['education', 'food_nutrition'],
    skills: ['community_outreach', 'nutrition_support'],
    stats: { reliabilityScore: 0.88, activeTasks: 0 },
    location: { latitude: 28.7938, longitude: 77.0515, district: 'North West Delhi', state: 'Delhi' },
  },
  {
    id: 'demo-vol-imran',
    name: 'Imran Sheikh',
    availability: 'free',
    categories: ['shelter', 'environment'],
    skills: ['relief_ops', 'community_outreach'],
    stats: { reliabilityScore: 0.9, activeTasks: 1 },
    location: { latitude: 28.6744, longitude: 77.2867, district: 'East Delhi', state: 'Delhi' },
  },
  {
    id: 'demo-vol-neha',
    name: 'Neha Ahlawat',
    availability: 'free',
    categories: ['education', 'women_child'],
    skills: ['child_protection', 'community_outreach'],
    stats: { reliabilityScore: 0.9, activeTasks: 0 },
    location: { latitude: 28.5233, longitude: 77.1894, district: 'South Delhi', state: 'Delhi' },
  },
];

const urgencyConfig: Record<UrgencyKey, { label: string; color: string }> = {
  critical: { label: 'Critical', color: '#B73A1E' },
  high: { label: 'High', color: '#D4622A' },
  medium: { label: 'Medium', color: '#D4921A' },
  low: { label: 'Low', color: '#2D9D78' },
};

const statusConfig: Record<StatusFilterKey, { label: string; color: string }> = {
  pending: { label: 'Pending', color: '#B73A1E' },
  classified: { label: 'Classified', color: '#D4622A' },
  dispatched: { label: 'Dispatched', color: '#D4921A' },
  in_progress: { label: 'In Progress', color: '#2D9D78' },
};

function formatCategory(value: string): string {
  return value.replace(/_/g, ' ');
}

function summarizeNeed(report: NeedReport): string {
  const text = (report.description || '').trim();
  if (!text) return 'Fresh field signal waiting for operator review.';
  return text.length > 88 ? `${text.slice(0, 85)}...` : text;
}

function toMillis(value: NeedReport['createdAt']): number {
  if (!value) return Date.now();
  if (typeof value === 'string') {
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : Date.now();
  }
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.seconds === 'number') return value.seconds * 1000;
  return Date.now();
}

function computeVulnerabilityIndex(feature: WardFeature): number {
  const {
    bpl_pct = 0,
    elderly_pct = 0,
    hospital_dist_km = 0,
    school_dist_km = 0,
  } = feature.properties;

  return (
    Math.min(bpl_pct / 100, 1) * 0.35 +
    Math.min(elderly_pct / 100, 1) * 0.25 +
    Math.min(hospital_dist_km / 20, 1) * 0.25 +
    Math.min(school_dist_km / 10, 1) * 0.15
  );
}

function getVulnerabilityColor(score: number): string {
  if (score > 0.7) return '#D44425';
  if (score > 0.4) return '#D4921A';
  return '#2D9D78';
}

function getSafeUrgencyScore(report: NeedReport): number {
  const rawScore = Number(report.urgencyScore);
  if (Number.isFinite(rawScore) && rawScore >= 0) {
    return Math.min(rawScore, 10);
  }

  switch (report.urgency) {
    case 'critical':
      return 9;
    case 'high':
      return 7;
    case 'low':
      return 3;
    default:
      return 5;
  }
}

function isWithinDelhiNcr(location?: { latitude?: number; longitude?: number }): boolean {
  if (typeof location?.latitude !== 'number' || typeof location?.longitude !== 'number') return false;

  return (
    location.latitude >= DELHI_NCR_BOUNDS.south &&
    location.latitude <= DELHI_NCR_BOUNDS.north &&
    location.longitude >= DELHI_NCR_BOUNDS.west &&
    location.longitude <= DELHI_NCR_BOUNDS.east
  );
}

function getClusterGlyph(category: string): string {
  switch (category) {
    case 'shelter':
      return 'M18 28.8 27 21l9 7.8v10.7h-4.6v-6.8h-8.8v6.8H18z';
    case 'water_sanitation':
      return 'M27 18c4.8 6 8.2 10.4 8.2 14.1A8.2 8.2 0 1 1 18.8 32c0-3.7 3.4-8.2 8.2-14Z';
    case 'food_nutrition':
      return 'M20.5 18.5v9.2M24 18.5v9.2M27.5 18.5v9.2M31 18.5v9.2M21.8 29.8c1.2 4.6 3.1 7.2 5.2 7.2s4-2.6 5.2-7.2Z';
    case 'education':
      return 'M18 21.5 27 18l9 3.5v11L27 36l-9-3.5v-11Zm9 1.7-5.6 2.2 5.6 2.1 5.6-2.1Z';
    default:
      return 'M27 17a7.5 7.5 0 0 1 7.5 7.5v4.5h2v3h-19v-3h2v-4.5A7.5 7.5 0 0 1 27 17Zm0 21.5a3.2 3.2 0 0 0 3.1-2.5h-6.2a3.2 3.2 0 0 0 3.1 2.5Z';
  }
}

function buildNeedMarkerIcon(report: NeedReport, selected: boolean) {
  const urgency = urgencyConfig[report.urgency] || urgencyConfig.medium;
  const reportCount = report.report_count || 1;
  const createdAtMs = toMillis(report.createdAt);
  const ageHours = (Date.now() - createdAtMs) / (1000 * 60 * 60);
  const opacity = Math.max(0.3, 1 - ageHours / 48);
  const pinScale = 0.8 + (getSafeUrgencyScore(report) / 20);
  const size = Math.max(42, Math.round(54 * Math.min(pinScale, 1.9)));
  const center = size / 2;
  const badge = reportCount >= 2
    ? `<circle cx="${size - 13}" cy="13" r="11" fill="#1C0E06" stroke="#F5EDE0" stroke-width="1.5" />
       <text x="${size - 13}" y="16" text-anchor="middle" font-size="10" font-weight="700" font-family="Arial, sans-serif" fill="#F5EDE0">x${Math.min(reportCount, 9)}</text>`
    : '';
  const systemicRing = report.systemic
    ? `<circle cx="${center}" cy="${center}" r="${center - 2}" stroke="#D44425" stroke-opacity="0.65" stroke-width="3" />`
    : '';
  const selectedRing = selected
    ? `<circle cx="${center}" cy="${center}" r="${center - 6}" stroke="#1C0E06" stroke-opacity="0.32" stroke-width="2" />`
    : '';

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none">
      ${systemicRing}
      ${selectedRing}
      <circle cx="${center}" cy="${center}" r="${center - 10}" fill="${urgency.color}" fill-opacity="${opacity.toFixed(2)}" stroke="#1C0E06" stroke-width="2.5" />
      <circle cx="${center}" cy="${center}" r="${center - 5}" stroke="${urgency.color}" stroke-opacity="0.20" stroke-width="4" />
      <g transform="translate(${(size - 54) / 2}, ${(size - 54) / 2})">
        <path d="${getClusterGlyph(report.category)}" fill="#1C0E06" />
      </g>
      ${badge}
    </svg>`;

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(size, size),
    anchor: new google.maps.Point(center, center),
  };
}

function buildVolunteerDotIcon() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="4" fill="#2F7EF7" />
      <circle cx="9" cy="9" r="7" stroke="#2F7EF7" stroke-opacity="0.25" stroke-width="2" />
    </svg>`;

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(18, 18),
    anchor: new google.maps.Point(9, 9),
  };
}

function supportsAdvancedMarkers() {
  return Boolean((google.maps as any).marker?.AdvancedMarkerElement);
}

function createAdvancedMarkerContent(icon: google.maps.Icon, label?: string) {
  const wrapper = document.createElement('div');
  wrapper.style.position = 'relative';
  wrapper.style.display = 'grid';
  wrapper.style.placeItems = 'center';
  wrapper.style.transform = 'translateY(-2px)';
  wrapper.style.pointerEvents = 'auto';

  const image = document.createElement('img');
  image.src = String(icon.url || '');
  image.alt = '';
  image.draggable = false;
  image.style.width = `${icon.scaledSize?.width || 18}px`;
  image.style.height = `${icon.scaledSize?.height || 18}px`;
  image.style.display = 'block';
  wrapper.appendChild(image);

  if (label) {
    const caption = document.createElement('span');
    caption.textContent = label;
    caption.className = styles.markerLabel;
    caption.style.position = 'absolute';
    caption.style.top = 'calc(100% - 6px)';
    caption.style.left = '50%';
    caption.style.transform = 'translateX(-50%)';
    caption.style.whiteSpace = 'nowrap';
    caption.style.color = '#1C0E06';
    caption.style.fontSize = '12px';
    caption.style.fontWeight = '700';
    caption.style.pointerEvents = 'none';
    wrapper.appendChild(caption);
  }

  return wrapper;
}

function clearMapMarker(marker: MapMarker) {
  if ('setMap' in marker) {
    marker.setMap(null);
    return;
  }

  marker.map = null;
}

function createMapMarker(options: {
  map: google.maps.Map;
  position: google.maps.LatLngLiteral;
  title: string;
  icon: google.maps.Icon;
  label?: string;
  onClick?: () => void;
}): MapMarker {
  if (supportsAdvancedMarkers()) {
    const marker = new google.maps.marker.AdvancedMarkerElement({
      map: options.map,
      position: options.position,
      title: options.title,
      content: createAdvancedMarkerContent(options.icon, options.label),
      gmpClickable: Boolean(options.onClick),
    });

    if (options.onClick) {
      marker.addListener('click', options.onClick);
    }

    return marker;
  }

  const marker = new google.maps.Marker({
    map: options.map,
    position: options.position,
    title: options.title,
    icon: options.icon,
    label: options.label
      ? {
          text: options.label,
          color: '#1C0E06',
          fontSize: '12px',
          fontWeight: '700',
          className: styles.markerLabel,
        }
      : undefined,
  });

  if (options.onClick) {
    marker.addListener('click', options.onClick);
  }

  return marker;
}

function isGoogleMapsReady() {
  return typeof (window as any).google?.maps?.Map === 'function';
}

async function loadGoogleMapsLibraries() {
  const mapsApi = (window as any).google?.maps;
  if (!mapsApi) return false;

  if (typeof mapsApi.importLibrary === 'function') {
    await mapsApi.importLibrary('maps');
    await mapsApi.importLibrary('marker').catch(() => undefined);
  }

  return typeof mapsApi.Map === 'function';
}

export function CommunityPulseMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const needMarkersRef = useRef<MapMarker[]>([]);
  const volunteerMarkersRef = useRef<MapMarker[]>([]);
  const weatherCirclesRef = useRef<google.maps.Circle[]>([]);
  const dataLayerRef = useRef<google.maps.Data | null>(null);
  const hasLiveNeedDataRef = useRef(false);
  const hasLiveVolunteerDataRef = useRef(false);

  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needReports, setNeedReports] = useState<NeedReport[]>(DEMO_NEED_REPORTS);
  const [volunteerPositions, setVolunteerPositions] = useState<VolunteerPosition[]>(DEMO_VOLUNTEER_POSITIONS);
  const [selectedNeedId, setSelectedNeedId] = useState('');
  const [useNeedApiFallback, setUseNeedApiFallback] = useState(false);
  const [filters, setFilters] = useState<Record<StatusFilterKey, boolean>>({
    pending: true,
    classified: true,
    dispatched: true,
    in_progress: true,
  });
  const [showVolunteerLayer, setShowVolunteerLayer] = useState(true);
  const [showVulnerabilityLayer, setShowVulnerabilityLayer] = useState(true);
  const [showWeatherLayer, setShowWeatherLayer] = useState(false);

  const filteredNeeds = useMemo(
    () => needReports.filter((report) => (filters[report.status as StatusFilterKey] ?? false) && isWithinDelhiNcr(report.location)),
    [filters, needReports]
  );

  const selectedNeed = useMemo(
    () => filteredNeeds.find((report) => report.id === selectedNeedId) || filteredNeeds[0] || null,
    [filteredNeeds, selectedNeedId]
  );

  const topWatchlist = useMemo(
    () => [...filteredNeeds].sort((a, b) => getSafeUrgencyScore(b) - getSafeUrgencyScore(a)).slice(0, 8),
    [filteredNeeds]
  );
  const watchlistPreview = useMemo(() => topWatchlist.slice(0, 6), [topWatchlist]);

  const availableVolunteers = useMemo(
    () => volunteerPositions.filter(
      (volunteer) => isWithinDelhiNcr(volunteer.location)
    ),
    [volunteerPositions]
  );
  const curatedVolunteers = useMemo(() => {
    const grouped = new Map<string, CuratedVolunteer>();

    for (const volunteer of availableVolunteers) {
      const reliability = Number(volunteer.stats?.reliabilityScore ?? volunteer.reliabilityScore ?? 0.8);
      const activeTasks = Number(volunteer.stats?.activeTasks ?? 0);
      const key = `${(volunteer.name || volunteer.id).toLowerCase()}::${(volunteer.location?.district || 'unknown').toLowerCase()}`;
      const current = grouped.get(key);

      if (!current) {
        grouped.set(key, {
          ...volunteer,
          duplicateCount: 1,
          reliability,
          activeTasks,
        });
        continue;
      }

      const preferred = reliability > current.reliability ? volunteer : current;
      grouped.set(key, {
        ...preferred,
        duplicateCount: current.duplicateCount + 1,
        reliability: Math.max(reliability, current.reliability),
        activeTasks: Math.min(activeTasks, current.activeTasks),
      });
    }

    const selectedDistrict = selectedNeed?.location?.district?.toLowerCase() || '';
    const selectedCategory = selectedNeed?.category || '';

    return Array.from(grouped.values())
      .sort((a, b) => {
        const aDistrictMatch = a.location?.district?.toLowerCase() === selectedDistrict ? 1 : 0;
        const bDistrictMatch = b.location?.district?.toLowerCase() === selectedDistrict ? 1 : 0;
        const aCategoryMatch = Array.isArray(a.categories) && selectedCategory ? (a.categories.includes(selectedCategory) ? 1 : 0) : 0;
        const bCategoryMatch = Array.isArray(b.categories) && selectedCategory ? (b.categories.includes(selectedCategory) ? 1 : 0) : 0;

        return (
          bDistrictMatch - aDistrictMatch ||
          bCategoryMatch - aCategoryMatch ||
          b.reliability - a.reliability ||
          a.activeTasks - b.activeTasks
        );
      })
      .slice(0, 6);
  }, [availableVolunteers, selectedNeed?.category, selectedNeed?.location?.district]);
  const collapsedVolunteerDuplicates = useMemo(
    () => Math.max(0, availableVolunteers.length - curatedVolunteers.length),
    [availableVolunteers.length, curatedVolunteers.length]
  );

  const totals = useMemo(() => {
    const visibleCases = filteredNeeds.length;
    const households = filteredNeeds.reduce((sum, report) => sum + (report.estimatedPeopleAffected || report.report_count || 0), 0);
    const critical = filteredNeeds.filter(
      (report) => report.urgency === 'critical' || getSafeUrgencyScore(report) >= 9
    ).length;

    return { visibleCases, households, critical };
  }, [filteredNeeds]);

  const loadNeedReportsFromApi = useCallback(async () => {
    const response = await getReports({ limit: 200 });
    const reports = response.data?.reports || [];

    if (!response.success) {
      console.warn('Pulse map backend need fallback failed:', response.error);
      if (!hasLiveNeedDataRef.current) {
        setNeedReports(DEMO_NEED_REPORTS);
      }
      return;
    }

    const nextReports = reports
      .filter((report) => Boolean(report.id))
      .map((report) => ({ ...report, id: report.id as string } as NeedReport))
      .filter((report) => ACTIVE_NEED_STATUSES.includes(report.status as StatusFilterKey))
      .filter(
        (report) =>
          typeof report.location?.latitude === 'number' && typeof report.location?.longitude === 'number'
      );

    if (nextReports.length > 0) {
      hasLiveNeedDataRef.current = true;
      setNeedReports(nextReports);
    } else if (!hasLiveNeedDataRef.current) {
      setNeedReports(DEMO_NEED_REPORTS);
    }
  }, []);

  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      setError('Google Maps key missing. Live cartography needs a browser key to render the field layers.');
      return;
    }

    let cancelled = false;
    let readinessTimer: number | undefined;
    const startMap = () => {
      if (!cancelled) {
        void initialiseMap();
      }
    };

    (window as any)[GOOGLE_MAPS_CALLBACK_NAME] = startMap;

    if (isGoogleMapsReady()) {
      startMap();
      return () => {
        cancelled = true;
      };
    }

    const existing = document.getElementById('sevasetu-maps-script');
    if (existing) {
      existing.addEventListener('load', startMap);
      readinessTimer = window.setInterval(() => {
        if (isGoogleMapsReady()) {
          window.clearInterval(readinessTimer);
          startMap();
        }
      }, 100);

      return () => {
        cancelled = true;
        existing.removeEventListener('load', startMap);
        if (readinessTimer) window.clearInterval(readinessTimer);
      };
    }

    const script = document.createElement('script');
    script.id = 'sevasetu-maps-script';
    script.src = GOOGLE_MAPS_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onerror = () => setError('Google Maps failed to load. Check the API key or billing settings.');
    document.head.appendChild(script);

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!(db as any)?.app) {
      return;
    }

    const needQuery = query(
      collection(db, 'needReports'),
      where('status', 'in', [...ACTIVE_NEED_STATUSES]),
      orderBy('urgencyScore', 'desc'),
      limit(200)
    );

    const unsubscribe = onSnapshot(
      needQuery,
      (snapshot) => {
        const nextReports = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() } as NeedReport))
          .filter(
            (report) =>
              typeof report.location?.latitude === 'number' && typeof report.location?.longitude === 'number'
          );

        if (nextReports.length > 0) {
          hasLiveNeedDataRef.current = true;
          setUseNeedApiFallback(false);
          setNeedReports(nextReports);
          setError(null);
        } else if (!hasLiveNeedDataRef.current) {
          setNeedReports(DEMO_NEED_REPORTS);
        }
      },
      (snapshotError) => {
        console.warn('Pulse map need listener unavailable; using backend API fallback:', snapshotError);
        setUseNeedApiFallback(true);
        void loadNeedReportsFromApi();
      }
    );

    return () => unsubscribe();
  }, [loadNeedReportsFromApi]);

  useEffect(() => {
    if (!useNeedApiFallback) return;

    void loadNeedReportsFromApi();
    const fallbackPoll = window.setInterval(() => {
      void loadNeedReportsFromApi();
    }, NEED_API_FALLBACK_POLL_MS);

    return () => window.clearInterval(fallbackPoll);
  }, [loadNeedReportsFromApi, useNeedApiFallback]);

  useEffect(() => {
    if (!(db as any)?.app) return;

    const volunteerQuery = query(
      collection(db, 'volunteers'),
      where('availability', '==', 'free'),
      limit(100)
    );

    const unsubscribe = onSnapshot(
      volunteerQuery,
      (snapshot) => {
        const nextVolunteers = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as VolunteerPosition));
        if (nextVolunteers.length > 0) {
          hasLiveVolunteerDataRef.current = true;
          setVolunteerPositions(nextVolunteers);
        } else if (!hasLiveVolunteerDataRef.current) {
          setVolunteerPositions(DEMO_VOLUNTEER_POSITIONS);
        }
      },
      (snapshotError) => {
        console.warn('Pulse map volunteer listener unavailable; showing seeded responder positions:', snapshotError);
        setVolunteerPositions(DEMO_VOLUNTEER_POSITIONS);
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!selectedNeedId && filteredNeeds[0]?.id) {
      setSelectedNeedId(filteredNeeds[0].id);
      return;
    }

    if (selectedNeedId && !filteredNeeds.find((report) => report.id === selectedNeedId)) {
      setSelectedNeedId(filteredNeeds[0]?.id || '');
    }
  }, [filteredNeeds, selectedNeedId]);

  useEffect(() => {
    if (!mapInstance.current || !ready) return;
    const map = mapInstance.current;

    needMarkersRef.current.forEach(clearMapMarker);
    volunteerMarkersRef.current.forEach(clearMapMarker);
    weatherCirclesRef.current.forEach((circle) => circle.setMap(null));
    needMarkersRef.current = [];
    volunteerMarkersRef.current = [];
    weatherCirclesRef.current = [];

    filteredNeeds.forEach((report) => {
      const position = {
        lat: report.location?.latitude || 0,
        lng: report.location?.longitude || 0,
      };

      const marker = createMapMarker({
        map,
        position,
        title: `${formatCategory(report.category)} · ${report.location?.district || 'Unknown district'}`,
        icon: buildNeedMarkerIcon(report, report.id === selectedNeed?.id),
        label: report.location?.district || report.category,
        onClick: () => setSelectedNeedId(report.id),
      });

      needMarkersRef.current.push(marker);

      if (showWeatherLayer && ['water_sanitation', 'shelter', 'health'].includes(report.category)) {
        const circle = new google.maps.Circle({
          map,
          center: position,
          radius: report.urgency === 'critical' ? 900 : 650,
          strokeColor: '#D4921A',
          strokeOpacity: 0.25,
          strokeWeight: 1,
          fillColor: '#D4921A',
          fillOpacity: 0.08,
        });
        weatherCirclesRef.current.push(circle);
      }
    });

    if (showVolunteerLayer) {
      availableVolunteers.forEach((volunteer) => {
        const position = {
          lat: volunteer.location?.latitude || 0,
          lng: volunteer.location?.longitude || 0,
        };

        const marker = createMapMarker({
          map,
          position,
          title: volunteer.name || volunteer.id,
          icon: buildVolunteerDotIcon(),
        });

        volunteerMarkersRef.current.push(marker);
      });
    }

    if (!dataLayerRef.current) {
      dataLayerRef.current = new google.maps.Data({ map });
      dataLayerRef.current.addGeoJson(wardData as any);
    }

    if (showVulnerabilityLayer) {
      dataLayerRef.current.setMap(map);
      dataLayerRef.current.setStyle((feature) => {
        const score = computeVulnerabilityIndex({
          properties: {
            ward_name: feature.getProperty('ward_name') as string | undefined,
            district: feature.getProperty('district') as string | undefined,
            bpl_pct: Number(feature.getProperty('bpl_pct') || 0),
            elderly_pct: Number(feature.getProperty('elderly_pct') || 0),
            hospital_dist_km: Number(feature.getProperty('hospital_dist_km') || 0),
            school_dist_km: Number(feature.getProperty('school_dist_km') || 0),
          },
          geometry: { coordinates: [] },
        });

        return {
          fillColor: getVulnerabilityColor(score),
          fillOpacity: 0.2,
          strokeColor: getVulnerabilityColor(score),
          strokeOpacity: 0.35,
          strokeWeight: 1,
        };
      });
    } else {
      dataLayerRef.current.setMap(null);
    }

  }, [availableVolunteers, filteredNeeds, ready, selectedNeed?.id, showVolunteerLayer, showVulnerabilityLayer, showWeatherLayer]);

  async function initialiseMap() {
    if (!mapRef.current || mapInstance.current || !(window as any).google?.maps) return;

    const mapsReady = await loadGoogleMapsLibraries();
    if (!mapsReady) {
      setError('Google Maps loaded, but the map library is not ready yet. Refresh the page once.');
      return;
    }

    mapInstance.current = new google.maps.Map(mapRef.current, {
      center: DELHI_NCR_CENTER,
      zoom: DELHI_NCR_DEFAULT_ZOOM,
      minZoom: DELHI_NCR_MIN_ZOOM,
      restriction: {
        latLngBounds: DELHI_NCR_BOUNDS,
        strictBounds: true,
      },
      mapId: GOOGLE_MAPS_MAP_ID,
      mapTypeControl: false,
      fullscreenControl: false,
      streetViewControl: false,
      gestureHandling: 'greedy',
      zoomControl: true,
      styles: [
        { featureType: 'administrative.country', stylers: [{ visibility: 'off' }] },
        { featureType: 'administrative.province', stylers: [{ visibility: 'off' }] },
        { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit.station', stylers: [{ visibility: 'off' }] },
        { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#d7c2a6' }] },
        { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#b2d9d0' }] },
      ],
    });

    setError(null);
    setReady(true);
  }

  function toggleFilter(key: StatusFilterKey) {
    setFilters((current) => ({ ...current, [key]: !current[key] }));
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div>
          <div className={styles.eyebrow}>Delhi Operations Atlas</div>
          <h2>
            Live field pressure,
            <br />
            volunteer movement, and vulnerability context.
          </h2>
          <p>
            The Pulse Map now streams active need reports from Firestore, layers available volunteers, and overlays ward
            vulnerability so operators can read urgency in place instead of jumping across screens.
          </p>
        </div>
        <div className={styles.heroStats}>
          <div className={styles.heroStat}>
            <span>Visible cases</span>
            <strong>{totals.visibleCases}</strong>
          </div>
          <div className={styles.heroStat}>
            <span>People affected</span>
            <strong>{totals.households}</strong>
          </div>
          <div className={styles.heroStat}>
            <span>Critical clusters</span>
            <strong>{totals.critical}</strong>
          </div>
        </div>
      </section>

      <section className={styles.workspace}>
        <aside className={styles.rail}>
          <div className={styles.panel}>
            <div className={styles.panelHeading}>
              <AppIcon name="layers" size={16} />
              Field controls
            </div>
            <div className={styles.controlBlock}>
              <div className={styles.controlIntro}>
                <strong>Need status filters</strong>
                <span>Trim the atlas to the exact stage you want to brief against.</span>
              </div>
              <div className={styles.filterList}>
                {(Object.keys(statusConfig) as StatusFilterKey[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    className={`${styles.filterChip} ${filters[key] ? styles.filterChipActive : ''}`}
                    onClick={() => toggleFilter(key)}
                  >
                    <span className={styles.filterSwatch} style={{ background: statusConfig[key].color }} />
                    {statusConfig[key].label}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.cueGrid}>
              <article className={styles.cueCard}>
                <strong>Fresh demand rises</strong>
                <span>Need pins fade with age so newer unresolved cases stay visually loud.</span>
              </article>
              <article className={styles.cueCard}>
                <strong>Cluster escalation</strong>
                <span>Merged reports show a count badge; systemic clusters get a red outer ring.</span>
              </article>
              <article className={styles.cueCard}>
                <strong>Equity context</strong>
                <span>Ward shading mirrors the same vulnerability data driving urgency explainability.</span>
              </article>
            </div>
          </div>

          <div className={`${styles.panel} ${styles.watchlistPanel}`}>
            <div className={styles.watchlistHeader}>
              <div className={styles.panelHeading}>
                <AppIcon name="alert" size={16} />
                Priority watchlist
              </div>
              <div className={styles.watchlistMeta}>
                <strong>{topWatchlist.length}</strong>
                <span>live priorities</span>
              </div>
            </div>
            <p className={styles.watchlistIntro}>Showing the six strongest field signals so the left rail briefs fast instead of becoming an endless scroll column.</p>
            <div className={`${styles.clusterList} ${styles.watchlistList}`}>
              {watchlistPreview.map((report) => (
                <button
                  key={report.id}
                  type="button"
                  className={`${styles.clusterRow} ${selectedNeed?.id === report.id ? styles.clusterRowActive : ''}`}
                  onClick={() => setSelectedNeedId(report.id)}
                >
                  <div className={styles.clusterContent}>
                    <div className={styles.clusterHeader}>
                      <strong>{report.location?.district || formatCategory(report.category)}</strong>
                      <span className={styles.clusterUrgencyPill} data-urgency={report.urgency}>
                        {report.urgency.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className={styles.clusterMetaRow}>
                      <span className={styles.clusterTypePill}>{formatCategory(report.category)}</span>
                      <span className={styles.clusterStatusPill}>{report.status.replace(/_/g, ' ')}</span>
                    </div>
                    <p className={styles.clusterDescription}>{summarizeNeed(report)}</p>
                  </div>
                  <div className={styles.clusterMeta}>
                    <span className={styles.clusterScore}>{Math.round(getSafeUrgencyScore(report))}</span>
                    <small className={styles.clusterScoreLabel}>urgency</small>
                    <small>{(report.report_count || 1) >= 2 ? `x${report.report_count} reports` : 'single report'}</small>
                  </div>
                </button>
              ))}
              {topWatchlist.length > watchlistPreview.length ? (
                <div className={styles.watchlistFooterNote}>+{topWatchlist.length - watchlistPreview.length} more cases remain visible on the map and detail rail.</div>
              ) : null}
              {topWatchlist.length === 0 ? <p className={styles.helper}>No active needs visible right now.</p> : null}
            </div>
          </div>
        </aside>

        <div className={styles.mapStage}>
          <div className={styles.mapHeader}>
            <div>
              <div className={styles.panelHeading}>
                <AppIcon name="map" size={16} />
                Live cartography
              </div>
              <p>Active needs stream live; volunteer dots and vulnerability shading can be toggled on demand.</p>
            </div>
            <div className={styles.legendInline}>
              {(Object.keys(urgencyConfig) as UrgencyKey[]).map((key) => (
                <span key={key} className={styles.legendChip}>
                  <span className={styles.filterSwatch} style={{ background: urgencyConfig[key].color }} />
                  {urgencyConfig[key].label}
                </span>
              ))}
              <span className={styles.legendChip}>
                <span className={styles.filterSwatch} style={{ background: '#2F7EF7' }} />
                Volunteer dot
              </span>
            </div>
          </div>

          <div className={styles.mapWrap}>
            <div ref={mapRef} className={styles.mapCanvas} />

            <div
              style={{
                position: 'absolute',
                top: '0.85rem',
                right: '0.85rem',
                display: 'grid',
                gap: '0.45rem',
                padding: '0.75rem',
                borderRadius: 'var(--radius-lg)',
                background: 'var(--surface-glass)',
                border: '1px solid var(--glass-border)',
                boxShadow: 'var(--shadow-md)',
                backdropFilter: 'blur(10px)',
                zIndex: 3,
              }}
            >
              <span style={{ fontSize: '0.66rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-subtle)' }}>
                Layer toggles
              </span>
              <span className={styles.legendChip}>Active needs · always on</span>
              <button type="button" className={styles.filterChip} onClick={() => setShowVolunteerLayer((current) => !current)}>
                <span className={styles.filterSwatch} style={{ background: showVolunteerLayer ? '#2F7EF7' : 'var(--surface-3)' }} />
                Volunteer positions
              </button>
              <button type="button" className={styles.filterChip} disabled style={{ opacity: 0.55, cursor: 'not-allowed' }}>
                <span className={styles.filterSwatch} style={{ background: 'rgba(212,98,42,0.35)' }} />
                Predicted needs
              </button>
              <button type="button" className={styles.filterChip} onClick={() => setShowVulnerabilityLayer((current) => !current)}>
                <span className={styles.filterSwatch} style={{ background: showVulnerabilityLayer ? '#D44425' : 'var(--surface-3)' }} />
                Vulnerability overlay
              </button>
              <button type="button" className={styles.filterChip} onClick={() => setShowWeatherLayer((current) => !current)}>
                <span className={styles.filterSwatch} style={{ background: showWeatherLayer ? '#D4921A' : 'var(--surface-3)' }} />
                Weather risk
              </button>
            </div>

            {!GOOGLE_MAPS_API_KEY ? (
              <div className={styles.mapOverlayMessage}>Map key unavailable. Live reads can continue, but the map canvas cannot render.</div>
            ) : null}
            {error ? <div className={styles.mapOverlayMessage}>{error}</div> : null}
          </div>

          <div className={styles.responseDeck}>
            <div className={styles.responseDeckHeader}>
              <div>
                <div className={styles.panelHeading}>
                  <AppIcon name="volunteer" size={16} />
                  Response roster
                </div>
                <p>
                  Use the empty atlas shelf below the map as a live staging row for nearby volunteers instead of burying them in a skinny sidebar.
                </p>
              </div>
              <div className={styles.responseDeckMeta}>
                <strong>{curatedVolunteers.length}</strong>
                <span>unique responders</span>
                {collapsedVolunteerDuplicates > 0 ? <small>{collapsedVolunteerDuplicates} duplicate profiles collapsed</small> : null}
              </div>
            </div>

            <div className={styles.responseRosterGrid}>
              {curatedVolunteers.map((volunteer) => {
                const categorySummary = Array.isArray(volunteer.categories)
                  ? volunteer.categories.slice(0, 2).map((category) => formatCategory(category)).join(' · ')
                  : 'General support';

                return (
                  <article key={volunteer.id} className={styles.rosterCard}>
                    <div className={styles.rosterCardTop}>
                      <span className={styles.hubIcon}>
                        <AppIcon name="volunteer" size={16} />
                      </span>
                      <div className={styles.rosterIdentity}>
                        <strong>{volunteer.name || volunteer.id}</strong>
                        <span>{volunteer.location?.district || 'Delhi NCR'}</span>
                      </div>
                      {volunteer.duplicateCount > 1 ? (
                        <span className={styles.rosterDuplicateBadge}>x{volunteer.duplicateCount}</span>
                      ) : null}
                    </div>

                    <div className={styles.rosterStatRow}>
                      <span>{Math.round(volunteer.reliability * 100)}% reliability</span>
                      <span>{volunteer.activeTasks} active tasks</span>
                    </div>

                    <p className={styles.rosterCategoryText}>{categorySummary}</p>
                  </article>
                );
              })}
              {curatedVolunteers.length === 0 ? <p className={styles.helper}>No available volunteer positions are visible right now.</p> : null}
            </div>
          </div>
        </div>

        <aside className={styles.detailColumn}>
          <div className={styles.panelLarge}>
            <div className={styles.detailTop}>
              <div>
                <div className={styles.eyebrow}>Selected need</div>
                <h3>{selectedNeed?.location?.district || 'Awaiting live data'}</h3>
                <p>{selectedNeed?.location?.address || formatCategory(selectedNeed?.category || 'need')}</p>
              </div>
              {selectedNeed ? (
                <span className={styles.urgencyBadge} style={{ background: urgencyConfig[selectedNeed.urgency].color }}>
                  {urgencyConfig[selectedNeed.urgency].label}
                </span>
              ) : null}
            </div>

            {selectedNeed ? (
              <>
                <div className={styles.metricGrid}>
                  <div>
                    <span>Urgency score</span>
                    <strong>{getSafeUrgencyScore(selectedNeed).toFixed(1)}</strong>
                  </div>
                  <div>
                    <span>People affected</span>
                    <strong>{selectedNeed.estimatedPeopleAffected || selectedNeed.report_count || 1}</strong>
                  </div>
                  <div>
                    <span>Report count</span>
                    <strong>{selectedNeed.report_count || 1}</strong>
                  </div>
                  <div>
                    <span>Status</span>
                    <strong>{selectedNeed.status.replace(/_/g, ' ')}</strong>
                  </div>
                </div>

                <div className={styles.storyBlock}>
                  <strong>{formatCategory(selectedNeed.category)}</strong>
                  <p>{selectedNeed.description}</p>
                </div>

                <div className={styles.assignmentBlock}>
                  <div>
                    <span>Reported from</span>
                    <strong>{selectedNeed.location?.district || 'Unknown district'}</strong>
                  </div>
                  <div>
                    <span>Systemic flag</span>
                    <strong>{selectedNeed.systemic ? 'Escalated cluster' : 'Standard cluster'}</strong>
                  </div>
                </div>
              </>
            ) : (
              <p className={styles.helper}>No active need selected yet.</p>
            )}
          </div>

          <div className={styles.panelLarge}>
            <div className={styles.panelHeading}>
              <AppIcon name="volunteer" size={16} />
              Volunteer coverage cues
            </div>
            <div className={styles.cueGrid}>
              <article className={styles.cueCard}>
                <strong>{availableVolunteers.length}</strong>
                <span>Total free volunteer dots visible on the map right now.</span>
              </article>
              <article className={styles.cueCard}>
                <strong>{curatedVolunteers[0]?.location?.district || 'No district selected'}</strong>
                <span>Best district match in the roster relative to the currently selected need.</span>
              </article>
              <article className={styles.cueCard}>
                <strong>{Math.round((curatedVolunteers[0]?.reliability || 0) * 100)}%</strong>
                <span>Top visible responder reliability after duplicate volunteer profiles are collapsed.</span>
              </article>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}

export default CommunityPulseMap;
