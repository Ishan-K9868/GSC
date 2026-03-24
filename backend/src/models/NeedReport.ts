/**
 * NeedReport Model & Schema
 * PRD: 5.1.6 Need Classification Engine
 * 
 * Defines the structure for all need reports submitted via:
 * - Voice intake (5.1.1)
 * - Photo intake (5.1.2)
 * - WhatsApp intake (5.1.3)
 * - Web form intake (5.1.4)
 */

import { z } from 'zod';

// Need categories as defined in PRD 5.1.6
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
  PENDING: 'pending',           // Just submitted, awaiting classification
  CLASSIFIED: 'classified',     // AI has classified, awaiting dispatch
  DISPATCHED: 'dispatched',     // Assigned to NGO/volunteer
  IN_PROGRESS: 'in_progress',   // Being addressed
  RESOLVED: 'resolved',         // Completed
  CANCELLED: 'cancelled',       // Cancelled/invalid
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

export type IntakeSourceType = typeof IntakeSource[keyof typeof IntakeSource];

// GPS Location schema
export const LocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().optional(),
  address: z.string().optional(),
  district: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
});

export type Location = z.infer<typeof LocationSchema>;

// Gemini extraction result
export const GeminiExtractionSchema = z.object({
  category: z.string(),
  subCategory: z.string().optional(),
  severity: z.string(),
  estimatedCount: z.number().optional(),
  description: z.string(),
  keywords: z.array(z.string()).optional(),
  confidence: z.number().min(0).max(1),
  language: z.string().optional(),
  rawTranscript: z.string().optional(),
});

export type GeminiExtraction = z.infer<typeof GeminiExtractionSchema>;

// Main NeedReport schema
export const NeedReportSchema = z.object({
  // Core identification
  id: z.string().optional(), // Firestore document ID
  reporterId: z.string(),    // User who submitted
  
  // Classification (from Gemini or manual)
  category: z.nativeEnum(NeedCategory),
  subCategory: z.string().optional(),
  urgency: z.nativeEnum(UrgencyLevel),
  
  // Content
  description: z.string().min(10).max(2000),
  estimatedPeopleAffected: z.number().min(1).optional(),
  
  // Location
  location: LocationSchema,
  
  // Media attachments
  photoUrls: z.array(z.string()).optional(),
  audioUrl: z.string().optional(),
  
  // Metadata
  source: z.nativeEnum(IntakeSource),
  status: z.nativeEnum(ReportStatus).default('pending'),
  language: z.string().default('en'),
  
  // AI extraction data
  geminiExtraction: GeminiExtractionSchema.optional(),
  
  // Assignment
  assignedNgoId: z.string().optional(),
  assignedVolunteerId: z.string().optional(),
  
  // Timestamps
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
  resolvedAt: z.date().or(z.string()).optional(),
  
  // Offline sync
  isOfflineSubmission: z.boolean().default(false),
  syncedAt: z.date().or(z.string()).optional(),
  
  // Privacy flag (for sensitive categories like women_child)
  isPrivate: z.boolean().default(false),
});

export type NeedReport = z.infer<typeof NeedReportSchema>;

// Create report request (subset for API input)
export const CreateNeedReportSchema = NeedReportSchema.pick({
  description: true,
  location: true,
  source: true,
  language: true,
  isOfflineSubmission: true,
}).extend({
  category: z.nativeEnum(NeedCategory).optional(),
  urgency: z.nativeEnum(UrgencyLevel).optional(),
  estimatedPeopleAffected: z.number().optional(),
  photoUrls: z.array(z.string()).optional(),
  audioUrl: z.string().optional(),
  audioBase64: z.string().optional(), // For direct audio upload
  photoBase64: z.string().optional(), // For direct photo upload
});

export type CreateNeedReportInput = z.infer<typeof CreateNeedReportSchema>;

// Category metadata for UI display
export const CategoryMetadata: Record<NeedCategoryType, {
  emoji: string;
  label: string;
  labelHi: string;
  subCategories: string[];
  defaultUrgency: UrgencyLevelType;
  autoAction: string;
}> = {
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
