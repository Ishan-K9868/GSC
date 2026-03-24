import { getFirestore } from '../config/firebase';
import type { NeedReport, UrgencyLevelType } from '../models/NeedReport';
import { NeedCategory } from '../models/NeedReport';
import type { Volunteer } from '../models/Volunteer';
import { VolunteerAvailability } from '../models/Volunteer';
import type { DispatchDecision } from '../models/DispatchTask';

export interface MatchWeights {
  proximity: number;
  skillFit: number;
  availability: number;
  reliability: number;
  equityBoost: number;
  needUrgency: number;
}

const DEFAULT_WEIGHTS: MatchWeights = {
  proximity: 0.3,
  skillFit: 0.25,
  availability: 0.2,
  reliability: 0.15,
  equityBoost: 0.05,
  needUrgency: 0.05,
};

const EMERGENCY_WEIGHTS: MatchWeights = {
  proximity: 0.5,
  skillFit: 0.15,
  availability: 0.2,
  reliability: 0.1,
  equityBoost: 0.03,
  needUrgency: 0.02,
};

export interface MatchResult {
  top20: DispatchDecision[];
  top3: DispatchDecision[];
  usedWeights: MatchWeights;
}

export async function computeVolunteerMatches(report: NeedReport): Promise<MatchResult> {
  const db = getFirestore();
  const weights = getWeightsForReport(report.category);

  const volunteersSnapshot = await db
    .collection('volunteers')
    .where('isActive', '==', true)
    .limit(300)
    .get();

  const volunteers = volunteersSnapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() } as Volunteer))
    .filter((volunteer) => isEligibleForReport(volunteer, report));

  const scored = volunteers
    .map((volunteer) => buildDecision(volunteer, report, weights))
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, 20);

  const top3 = scored.slice(0, 3);

  return {
    top20: scored,
    top3,
    usedWeights: weights,
  };
}

function getWeightsForReport(category: string): MatchWeights {
  return category === NeedCategory.EMERGENCY ? EMERGENCY_WEIGHTS : DEFAULT_WEIGHTS;
}

function isEligibleForReport(volunteer: Volunteer, report: NeedReport): boolean {
  const canHandleCategory = volunteer.categories.includes(report.category);
  const underTaskCap = (volunteer.stats?.activeTasks || 0) < 3;
  const notOffline = volunteer.availability !== VolunteerAvailability.OFFLINE;
  return canHandleCategory && underTaskCap && notOffline;
}

function buildDecision(volunteer: Volunteer, report: NeedReport, weights: MatchWeights): DispatchDecision {
  const distanceKm = calculateDistance(
    report.location.latitude,
    report.location.longitude,
    volunteer.location.latitude,
    volunteer.location.longitude
  );

  const proximity = calculateProximityScore(distanceKm, volunteer.maxServiceableDistanceKm || 25);
  const skillFit = calculateSkillFitScore(volunteer, report);
  const availability = calculateAvailabilityScore(volunteer.availability);
  const reliability = calculateReliabilityScore(volunteer);
  const equityBoost = calculateEquityBoost(volunteer);
  const needUrgency = urgencyToScore(report.urgency);

  const totalScore = clamp01(
    weights.proximity * proximity +
      weights.skillFit * skillFit +
      weights.availability * availability +
      weights.reliability * reliability +
      weights.equityBoost * equityBoost +
      weights.needUrgency * needUrgency
  );

  return {
    volunteerId: volunteer.id || volunteer.userId,
    volunteerName: volunteer.name,
    totalScore,
    componentScores: {
      proximity,
      skillFit,
      availability,
      reliability,
      equityBoost,
      needUrgency,
    },
    distanceKm,
    explanation: buildExplanation(volunteer, distanceKm, skillFit, reliability),
  };
}

function calculateProximityScore(distanceKm: number, maxDistanceKm: number): number {
  if (distanceKm > maxDistanceKm) return 0;
  const base = 1 - distanceKm / maxDistanceKm;
  if (distanceKm <= 5) return clamp01(base);
  const decay = Math.exp(-(distanceKm - 5) / 5);
  return clamp01(base * decay);
}

function calculateSkillFitScore(volunteer: Volunteer, report: NeedReport): number {
  const needTokens = tokenize(`${report.category} ${report.subCategory || ''} ${report.description}`);
  const volunteerTokens = tokenize(`${volunteer.skills.join(' ')} ${volunteer.certifications.join(' ')}`);
  if (needTokens.size === 0 || volunteerTokens.size === 0) return 0.35;

  let intersection = 0;
  needTokens.forEach((token) => {
    if (volunteerTokens.has(token)) intersection += 1;
  });
  const union = new Set([...needTokens, ...volunteerTokens]).size;
  return clamp01(union === 0 ? 0 : intersection / union);
}

function calculateAvailabilityScore(availability: string): number {
  if (availability === VolunteerAvailability.FREE) return 1;
  if (availability === VolunteerAvailability.IN_TASK) return 0.25;
  return 0;
}

function calculateReliabilityScore(volunteer: Volunteer): number {
  const assigned = volunteer.stats?.last90dAssignedTasks || volunteer.stats?.assignedTasks || 0;
  const completed = volunteer.stats?.last90dCompletedTasks || volunteer.stats?.completedTasks || 0;
  const rating = volunteer.stats?.avgBeneficiaryRating || 4;

  if (assigned === 0) {
    return clamp01((volunteer.stats?.reliabilityScore || 0.8) * (rating / 5));
  }

  const completionRatio = completed / assigned;
  return clamp01(completionRatio * (rating / 5));
}

function calculateEquityBoost(volunteer: Volunteer): number {
  let boost = 0;
  if (volunteer.supportsUnderservedZones) boost += 0.15;
  if ((volunteer.ngoVolunteerCount || 0) > 0 && (volunteer.ngoVolunteerCount || 0) < 50) boost += 0.1;
  return clamp01(boost);
}

function urgencyToScore(urgency: UrgencyLevelType): number {
  if (urgency === 'critical') return 1;
  if (urgency === 'high') return 0.75;
  if (urgency === 'medium') return 0.5;
  return 0.25;
}

function buildExplanation(volunteer: Volunteer, distanceKm: number, skillFit: number, reliability: number): string {
  const distanceText = `${distanceKm.toFixed(1)}km away`;
  const reliabilityText = `${Math.round(reliability * 100)}% reliability`;
  const skillText = `${Math.round(skillFit * 100)}% skill fit`;
  return `Matched ${volunteer.name} because they are ${distanceText}, with ${skillText} and ${reliabilityText}.`;
}

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9_\s]/g, ' ')
      .split(/\s+/)
      .filter((token) => token.length > 2)
  );
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(value: number): number {
  return value * (Math.PI / 180);
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
