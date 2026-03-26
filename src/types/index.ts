/**
 * Shared Types for SevaSetu Frontend
 * Mirrors backend models for type safety
 */

// Need categories from PRD 5.1.6
export const NeedCategory = {
  EMERGENCY: 'emergency',
  FOOD_NUTRITION: 'food_nutrition',
  HEALTH: 'health',
  EDUCATION: 'education',
  WATER_SANITATION: 'water_sanitation',
  SHELTER: 'shelter',
  WOMEN_CHILD: 'women_child',
  ENVIRONMENT: 'environment',
} as const;

export type NeedCategoryType = typeof NeedCategory[keyof typeof NeedCategory];

// Urgency levels
export const UrgencyLevel = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
} as const;

export type UrgencyLevelType = typeof UrgencyLevel[keyof typeof UrgencyLevel];

// Report status
export const ReportStatus = {
  PENDING: 'pending',
  CLASSIFIED: 'classified',
  DISPATCHED: 'dispatched',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  CANCELLED: 'cancelled',
} as const;

export type ReportStatusType = typeof ReportStatus[keyof typeof ReportStatus];

// Intake source
export const IntakeSource = {
  VOICE: 'voice',
  PHOTO: 'photo',
  WHATSAPP: 'whatsapp',
  WEB_FORM: 'web_form',
  CSV_IMPORT: 'csv_import',
} as const;

// Map-related types (PRD 5.2)
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

export type IntakeSourceType = typeof IntakeSource[keyof typeof IntakeSource];

// Location
export interface Location {
  latitude: number;
  longitude: number;
  accuracy?: number;
  address?: string;
  district?: string;
  state?: string;
  pincode?: string;
}

// Gemini extraction result
export interface GeminiExtraction {
  category: string;
  subCategory?: string;
  severity: string;
  estimatedCount?: number;
  description: string;
  keywords?: string[];
  confidence: number;
  language?: string;
  rawTranscript?: string;
  provider?: string;
  model?: string;
  degraded?: boolean;
  warning?: string;
}

// Need Report
export interface NeedReport {
  id?: string;
  reporterId: string;
  category: NeedCategoryType;
  subCategory?: string;
  urgency: UrgencyLevelType;
  description: string;
  estimatedPeopleAffected?: number;
  location: Location;
  photoUrls?: string[];
  audioUrl?: string;
  source: IntakeSourceType;
  status: ReportStatusType;
  language: string;
  geminiExtraction?: GeminiExtraction;
  assignedNgoId?: string;
  assignedVolunteerId?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  isOfflineSubmission: boolean;
  syncedAt?: string;
  isPrivate: boolean;
}

// Category metadata for UI
export interface CategoryMeta {
  emoji: string;
  label: string;
  labelHi: string;
  subCategories: string[];
  defaultUrgency: UrgencyLevelType;
  autoAction: string;
}

export const CategoryMetadata: Record<NeedCategoryType, CategoryMeta> = {
  emergency: {
    emoji: '🚨',
    label: 'Emergency',
    labelHi: 'आपातकाल',
    subCategories: ['Medical emergency', 'Drowning', 'Fire', 'Accident', 'Missing person'],
    defaultUrgency: 'critical',
    autoAction: 'Auto-dispatch in 60 sec',
  },
  food_nutrition: {
    emoji: '🍽️',
    label: 'Food & Nutrition',
    labelHi: 'भोजन और पोषण',
    subCategories: ['Acute hunger', 'Malnutrition', 'Food insecurity', 'Mid-day meal disruption'],
    defaultUrgency: 'high',
    autoAction: 'Priority match',
  },
  health: {
    emoji: '🏥',
    label: 'Health',
    labelHi: 'स्वास्थ्य',
    subCategories: ['Medicines', 'Doctor visit', 'Ambulance', 'Mental health', 'Maternal care'],
    defaultUrgency: 'high',
    autoAction: 'Health NGO match',
  },
  education: {
    emoji: '📚',
    label: 'Education',
    labelHi: 'शिक्षा',
    subCategories: ['School dropout risk', 'Learning material', 'Teacher absence', 'Infrastructure'],
    defaultUrgency: 'medium',
    autoAction: 'Education NGO queue',
  },
  water_sanitation: {
    emoji: '💧',
    label: 'Water & Sanitation',
    labelHi: 'पानी और स्वच्छता',
    subCategories: ['Drinking water scarcity', 'Open defecation', 'Sewage overflow'],
    defaultUrgency: 'high',
    autoAction: 'WASH NGO match',
  },
  shelter: {
    emoji: '🏘️',
    label: 'Shelter',
    labelHi: 'आश्रय',
    subCategories: ['Displacement', 'Roof damage', 'Homelessness', 'Temporary shelter'],
    defaultUrgency: 'high',
    autoAction: 'Relief NGO alert',
  },
  women_child: {
    emoji: '👩‍⚕️',
    label: 'Women & Child',
    labelHi: 'महिला और बाल',
    subCategories: ['Domestic violence', 'Child labour', 'Trafficking risk', 'Maternity'],
    defaultUrgency: 'critical',
    autoAction: 'Special dispatch + privacy mode',
  },
  environment: {
    emoji: '🌿',
    label: 'Environment',
    labelHi: 'पर्यावरण',
    subCategories: ['Deforestation', 'Pollution', 'Waste', 'Water body contamination'],
    defaultUrgency: 'low',
    autoAction: 'Environment NGO queue',
  },
};

// User
export interface User {
  id: string;
  phoneNumber: string;
  displayName?: string;
  role: string;
  preferredLanguage: string;
  reportsSubmitted: number;
  reportsResolved: number;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
  };
}

// Classification result
export interface ClassificationResult {
  category: NeedCategoryType;
  categoryLabel: string;
  categoryEmoji: string;
  urgency: UrgencyLevelType;
  autoAction: string;
  confidence: number;
}

// Create report input
export interface CreateReportInput {
  description: string;
  location: Location;
  source: IntakeSourceType;
  language?: string;
  category?: NeedCategoryType;
  urgency?: UrgencyLevelType;
  estimatedPeopleAffected?: number;
  photoUrls?: string[];
  audioUrl?: string;
  isOfflineSubmission?: boolean;
}

// Supported languages (PRD 5.1.1)
export const SupportedLanguages = [
  { code: 'hi', name: 'हिन्दी', nameEn: 'Hindi' },
  { code: 'ta', name: 'தமிழ்', nameEn: 'Tamil' },
  { code: 'te', name: 'తెలుగు', nameEn: 'Telugu' },
  { code: 'bn', name: 'বাংলা', nameEn: 'Bengali' },
  { code: 'mr', name: 'मराठी', nameEn: 'Marathi' },
  { code: 'gu', name: 'ગુજરાતી', nameEn: 'Gujarati' },
  { code: 'kn', name: 'ಕನ್ನಡ', nameEn: 'Kannada' },
  { code: 'or', name: 'ଓଡ଼ିଆ', nameEn: 'Odia' },
  { code: 'en', name: 'English', nameEn: 'English' },
] as const;
