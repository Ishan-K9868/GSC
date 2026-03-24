import { z } from 'zod';

export const IdentityVerificationStatus = {
  NOT_PROVIDED: 'not_provided',
  PENDING: 'pending',
  VERIFIED: 'verified',
} as const;

export const VolunteerTaskState = {
  AVAILABLE: 'available',
  ACCEPTED: 'accepted',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
} as const;

export const VolunteerProfileCardSchema = z.object({
  volunteerId: z.string(),
  displayName: z.string(),
  languages: z.array(z.string()).default([]),
  skills: z.array(z.string()).default([]),
  verifiedCertifications: z.array(z.string()).default([]),
  sdgInterests: z.array(z.string()).default([]),
  impactStats: z.object({
    tasksCompleted: z.number().min(0).default(0),
    beneficiariesImpacted: z.number().min(0).default(0),
    sevaPoints: z.number().min(0).default(0),
    badges: z.array(z.string()).default([]),
  }),
  identityVerificationStatus: z.nativeEnum(IdentityVerificationStatus),
  weeklyHourLimit: z.number().min(1).max(80).default(8),
  availabilityCalendar: z.array(
    z.object({
      day: z.string(),
      isAvailable: z.boolean(),
      slots: z.array(z.string()).default([]),
    })
  ).default([]),
  updatedAt: z.date().or(z.string()),
});

export const VolunteerTaskChecklistSchema = z.object({
  item: z.string(),
  done: z.boolean().default(false),
});

export const VolunteerTaskCardSchema = z.object({
  id: z.string(),
  reportId: z.string(),
  language: z.string().default('en'),
  title: z.string(),
  summary: z.string(),
  distanceKm: z.number().min(0),
  estimatedTimeMinutes: z.number().min(5),
  requiredSkills: z.array(z.string()).default([]),
  whatToBring: z.array(z.string()).default([]),
  navigationLink: z.string(),
  checklist: z.array(VolunteerTaskChecklistSchema).default([]),
  state: z.nativeEnum(VolunteerTaskState),
  urgencyMultiplier: z.number().min(1).max(3),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
});

export const VolunteerChatMessageSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  senderType: z.enum(['volunteer', 'coordinator']),
  senderId: z.string(),
  message: z.string(),
  createdAt: z.date().or(z.string()),
});

export const VolunteerCompletionPayloadSchema = z.object({
  taskId: z.string(),
  volunteerId: z.string(),
  photoEvidenceUrls: z.array(z.string()).default([]),
  voiceDebriefText: z.string().min(3),
  beneficiaryRating: z.number().min(1).max(5).optional(),
});

export type VolunteerProfileCard = z.infer<typeof VolunteerProfileCardSchema>;
export type VolunteerTaskCard = z.infer<typeof VolunteerTaskCardSchema>;
export type VolunteerChatMessage = z.infer<typeof VolunteerChatMessageSchema>;
export type VolunteerCompletionPayload = z.infer<typeof VolunteerCompletionPayloadSchema>;
