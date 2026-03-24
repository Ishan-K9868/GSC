/**
 * User Model
 * For field workers, NGO staff, and volunteers
 */

import { z } from 'zod';

export const UserRole = {
  FIELD_WORKER: 'field_worker',
  NGO_STAFF: 'ngo_staff',
  NGO_ADMIN: 'ngo_admin',
  VOLUNTEER: 'volunteer',
  ADMIN: 'admin',
} as const;

export type UserRoleType = typeof UserRole[keyof typeof UserRole];

export const UserSchema = z.object({
  id: z.string(),
  phoneNumber: z.string(),
  displayName: z.string().optional(),
  email: z.string().email().optional(),
  role: z.nativeEnum(UserRole),
  ngoId: z.string().optional(),
  
  // Profile
  preferredLanguage: z.string().default('hi'),
  avatarUrl: z.string().optional(),
  
  // Location (for volunteers/field workers)
  lastKnownLocation: z.object({
    latitude: z.number(),
    longitude: z.number(),
    updatedAt: z.date().or(z.string()),
  }).optional(),
  
  // Stats
  reportsSubmitted: z.number().default(0),
  reportsResolved: z.number().default(0),
  
  // Timestamps
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
  lastLoginAt: z.date().or(z.string()).optional(),
});

export type User = z.infer<typeof UserSchema>;
