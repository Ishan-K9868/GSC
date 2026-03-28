import { z } from 'zod';
import { NeedCategory, UrgencyLevel } from './NeedReport';

export const DispatchTaskStatus = {
  PENDING: 'pending',
  INVITED: 'invited',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  EXPIRED: 'expired',
  ESCALATED: 'escalated',
  COMPLETED: 'completed',
} as const;

export type DispatchTaskStatusType = typeof DispatchTaskStatus[keyof typeof DispatchTaskStatus];

export const DispatchDecisionSchema = z.object({
  volunteerId: z.string(),
  volunteerName: z.string(),
  totalScore: z.number().min(0).max(1),
  componentScores: z.object({
    proximity: z.number().min(0).max(1),
    skillFit: z.number().min(0).max(1),
    availability: z.number().min(0).max(1),
    reliability: z.number().min(0).max(1),
    equityBoost: z.number().min(0).max(1),
    needUrgency: z.number().min(0).max(1),
  }),
  distanceKm: z.number().min(0),
  explanation: z.string(),
});

export const DispatchTaskSchema = z.object({
  id: z.string().optional(),
  needReportId: z.string(),
  needDescription: z.string().optional(),
  category: z.nativeEnum(NeedCategory),
  urgency: z.nativeEnum(UrgencyLevel),
  status: z.nativeEnum(DispatchTaskStatus).default(DispatchTaskStatus.PENDING),

  candidateVolunteerIds: z.array(z.string()).default([]),
  rankedDecisions: z.array(DispatchDecisionSchema).default([]),
  currentInviteIndex: z.number().min(0).default(0),

  acceptedVolunteerId: z.string().optional(),
  acceptedAt: z.date().or(z.string()).optional(),

  escalated: z.boolean().default(false),
  escalatedReason: z.string().optional(),
  escalatedAt: z.date().or(z.string()).optional(),

  coordinatorOverride: z.object({
    overridden: z.boolean().default(false),
    coordinatorId: z.string().optional(),
    reason: z.string().optional(),
    selectedVolunteerId: z.string().optional(),
    at: z.date().or(z.string()).optional(),
  }).default({ overridden: false }),

  invitationHistory: z.array(z.object({
    volunteerId: z.string(),
    invitedAt: z.date().or(z.string()),
    status: z.enum(['pending', 'accepted', 'declined', 'expired']),
    respondedAt: z.date().or(z.string()).optional(),
  })).default([]),

  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
});

export type DispatchTask = z.infer<typeof DispatchTaskSchema>;
export type DispatchDecision = z.infer<typeof DispatchDecisionSchema>;
