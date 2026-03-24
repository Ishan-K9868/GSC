import { z } from 'zod';
import { NeedCategory } from './NeedReport';

export const VolunteerAvailability = {
  FREE: 'free',
  IN_TASK: 'in_task',
  OFFLINE: 'offline',
} as const;

export type VolunteerAvailabilityType = typeof VolunteerAvailability[keyof typeof VolunteerAvailability];

export const VolunteerStatsSchema = z.object({
  assignedTasks: z.number().min(0).default(0),
  completedTasks: z.number().min(0).default(0),
  avgBeneficiaryRating: z.number().min(0).max(5).default(4),
  reliabilityScore: z.number().min(0).max(1).default(0.8),
  activeTasks: z.number().min(0).default(0),
  last90dAssignedTasks: z.number().min(0).default(0),
  last90dCompletedTasks: z.number().min(0).default(0),
});

export const VolunteerSchema = z.object({
  id: z.string().optional(),
  userId: z.string(),
  ngoId: z.string().optional(),
  ngoName: z.string().optional(),
  name: z.string().min(2),
  phoneNumber: z.string(),
  preferredLanguage: z.string().default('hi'),
  isActive: z.boolean().default(true),

  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    district: z.string().optional(),
    state: z.string().optional(),
    updatedAt: z.date().or(z.string()),
  }),

  skills: z.array(z.string()).default([]),
  categories: z.array(z.nativeEnum(NeedCategory)).default([]),
  certifications: z.array(z.string()).default([]),

  availability: z.nativeEnum(VolunteerAvailability).default(VolunteerAvailability.FREE),
  maxServiceableDistanceKm: z.number().min(1).max(100).default(25),

  supportsUnderservedZones: z.boolean().default(false),
  ngoVolunteerCount: z.number().min(0).default(0),

  stats: VolunteerStatsSchema.default({
    assignedTasks: 0,
    completedTasks: 0,
    avgBeneficiaryRating: 4,
    reliabilityScore: 0.8,
    activeTasks: 0,
    last90dAssignedTasks: 0,
    last90dCompletedTasks: 0,
  }),

  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
});

export type Volunteer = z.infer<typeof VolunteerSchema>;
