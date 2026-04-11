/**
 * API Service
 * Handles all communication with the backend API
 */

import { auth } from '../config/firebase';
import type { 
  ApiResponse, 
  NeedReport, 
  CreateReportInput, 
  ClassificationResult 
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

// DEV MODE: Same check as AuthContext
const DEV_MODE = import.meta.env.DEV && import.meta.env.VITE_DEV_AUTH_BYPASS !== 'false';
const DEV_TOKEN = 'dev-mock-token-for-prototype';

async function getAuthToken(): Promise<string | null> {
  // In dev mode, always return the dev token
  if (DEV_MODE) {
    return DEV_TOKEN;
  }
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = await getAuthToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: data.error || { message: 'Request failed', code: 'UNKNOWN_ERROR' },
      };
    }

    return data;
  } catch (error: any) {
    return {
      success: false,
      error: {
        message: error.message || 'Network error',
        code: 'NETWORK_ERROR',
      },
    };
  }
}

function mapVolunteerProfileData(data: any) {
  const profile = data?.profile || data;
  if (!profile) return data;

  return {
    ...profile,
    name: profile.displayName || profile.name || 'Volunteer',
    zone: profile.zone || profile.languages?.join(', ') || 'Delhi NCR',
    reliabilityScore: profile.reliabilityScore || 0,
  };
}

function mapVolunteerTask(task: any) {
  if (!task) return task;

  const state = task.state || task.status || 'available';
  const normalizedStatus =
    state === 'available' ? 'pending' : state === 'accepted' ? 'accepted' : state;

  return {
    ...task,
    taskId: task.taskId || task.id,
    status: normalizedStatus,
    description: task.description || task.summary,
    distance: task.distance ?? task.distanceKm,
    eta: task.eta || (typeof task.estimatedTimeMinutes === 'number' ? `${task.estimatedTimeMinutes} min` : ''),
  };
}

function mapVolunteerChatMessage(message: any) {
  if (!message) return message;
  return {
    ...message,
    sender: message.sender || message.senderType,
    text: message.text || message.message,
    timestamp: message.timestamp || message.createdAt,
  };
}

function mapVolunteerGamification(data: any) {
  if (!data) return data;
  return {
    ...data,
    totalPoints: data.totalPoints ?? data.sevaPoints ?? 0,
    streak: data.streak ?? 0,
    level: data.level ?? Math.max(1, Math.floor((data.sevaPoints || 0) / 500) + 1),
    completedMissions: data.completedMissions ?? data.tasksCompleted ?? 0,
  };
}

function mapCompanyLeaderboard(data: any) {
  if (!data) return data;
  return {
    ...data,
    divisions: (data.divisionLeaderboard || []).map((division: any) => ({
      ...division,
      divisionId: division.division,
      name: division.division,
      totalHours: division.hours,
    })),
  };
}

function mapCompanyBRSR(data: any) {
  if (!data) return data;
  const section = data.brsrSectionC?.socialCapital || {};
  return {
    ...data,
    brsrStatus: 'generated',
    reportsFiled: data.brsrSectionC?.gri413?.localCommunityEngagements || 0,
    auditScore: section.totalNeedsResolved || 0,
    narrative: section.methodologyNotes,
    metrics: {
      volunteer_hours: section.totalVolunteerHours || 0,
      needs_resolved: section.totalNeedsResolved || 0,
      beneficiaries: section.totalBeneficiaries || 0,
    },
  };
}

function mapCsrPricing(data: any) {
  if (!data) return data;
  return {
    ...data,
    currentTier: {
      name: data.tier,
      priceMonthlyInr: data.priceMonthlyInr,
    },
  };
}

function mapPanchayatOverview(data: any) {
  if (!data) return data;
  return {
    ...data,
    totalNeeds: data.totalNeeds ?? data.activeNeedsCount ?? 0,
    resolved: data.resolved ?? 0,
    activeNgos: Array.isArray(data.activeNgos) ? data.activeNgos : [],
    coverageNgos: data.coverageNgos || data.activeNgos || [],
  };
}

function mapPanchayatHistory(data: any) {
  if (!data) return data;
  const history = data.history || [];
  return {
    ...data,
    events: history.map((entry: any) => ({
      ...entry,
      title: entry.month,
      summary: Object.entries(entry.categories || {})
        .map(([category, count]) => `${category}: ${count}`)
        .join(', '),
      date: entry.month,
    })),
  };
}

function mapPanchayatMonthlyReport(data: any) {
  if (!data) return data;
  return {
    ...data,
    month: data.month || data.title,
    summary: data.summary || (Array.isArray(data.highlights) ? data.highlights.join(' · ') : ''),
  };
}

function mapPanchayatOverlay(data: any) {
  if (!data) return data;
  return {
    ...data,
    summary: data.summary || (Array.isArray(data.infrastructureSignals)
      ? data.infrastructureSignals.map((item: any) => item.note).join(' · ')
      : ''),
    projects: data.projects || data.infrastructureSignals,
  };
}

function mapCrisisDashboard(data: any) {
  if (!data) return data;
  return {
    ...data,
    crisis: data.crisis || null,
  };
}

function mapPostCrisisReport(data: any) {
  if (!data) return data;
  return {
    ...data,
    title: data.title || `Post-crisis report for ${data.zoneId || 'zone'}`,
    summary:
      typeof data.summary === 'string'
        ? data.summary
        : data.summary
          ? Object.entries(data.summary).map(([key, value]) => `${key}: ${value}`).join(' · ')
          : '',
    highlights: data.highlights || data.lessonsLearned || [],
  };
}

// ============ INTAKE API ============

/**
 * Submit a new need report
 */
export async function submitReport(
  input: CreateReportInput
): Promise<ApiResponse<{ report: NeedReport; classification: ClassificationResult }>> {
  return apiFetch('/intake/report', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/**
 * Get list of reports
 */
export async function getReports(params?: {
  category?: string;
  urgency?: string;
  status?: string;
  limit?: number;
}): Promise<ApiResponse<{ reports: NeedReport[]; count: number; hasMore: boolean }>> {
  const query = new URLSearchParams();
  if (params?.category) query.set('category', params.category);
  if (params?.urgency) query.set('urgency', params.urgency);
  if (params?.status) query.set('status', params.status);
  if (params?.limit) query.set('limit', params.limit.toString());

  return apiFetch(`/intake/reports?${query.toString()}`);
}

/**
 * Get single report by ID
 */
export async function getReport(id: string): Promise<ApiResponse<{ report: NeedReport }>> {
  return apiFetch(`/intake/reports/${id}`);
}

/**
 * Update report status
 */
export async function updateReport(
  id: string,
  updates: { status?: string; assignedNgoId?: string; assignedVolunteerId?: string }
): Promise<ApiResponse<{ report: NeedReport }>> {
  return apiFetch(`/intake/reports/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

/**
 * Batch import reports from CSV
 */
export async function batchImportReports(
  reports: CreateReportInput[]
): Promise<ApiResponse<{ total: number; successful: number; failed: number; results: any[] }>> {
  return apiFetch('/intake/batch', {
    method: 'POST',
    body: JSON.stringify({ reports }),
  });
}

// ============ UPLOAD API ============

/**
 * Upload a photo and get AI analysis
 */
export async function uploadPhoto(
  file: File
): Promise<ApiResponse<{ url: string; fileName: string; analysis: any }>> {
  const token = await getAuthToken();
  
  const formData = new FormData();
  formData.append('photo', file);

  const response = await fetch(`${API_BASE_URL}/upload/photo`, {
    method: 'POST',
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: formData,
  });

  return response.json();
}

/**
 * Upload audio recording
 */
export async function uploadAudio(
  file: Blob
): Promise<ApiResponse<{ url: string; fileName: string }>> {
  const token = await getAuthToken();
  
  const formData = new FormData();
  formData.append('audio', file, 'recording.webm');

  const response = await fetch(`${API_BASE_URL}/upload/audio`, {
    method: 'POST',
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: formData,
  });

  return response.json();
}

/**
 * Analyze photo without uploading (base64)
 */
export async function analyzePhoto(
  imageBase64: string,
  mimeType: string = 'image/jpeg'
): Promise<ApiResponse<{ analysis: any }>> {
  return apiFetch('/upload/photo/analyze', {
    method: 'POST',
    body: JSON.stringify({ imageBase64, mimeType }),
  });
}

// ============ CLASSIFICATION API ============

/**
 * Classify text description
 */
export async function classifyText(
  text: string,
  language: string = 'en'
): Promise<ApiResponse<{ classification: any; categoryMeta: any }>> {
  return apiFetch('/classification/text', {
    method: 'POST',
    body: JSON.stringify({ text, language }),
  });
}

/**
 * Classify voice transcript
 */
export async function classifyVoice(
  transcript: string,
  language: string = 'hi'
): Promise<ApiResponse<{ classification: any; categoryMeta: any; confirmationMessage: string }>> {
  return apiFetch('/classification/voice', {
    method: 'POST',
    body: JSON.stringify({ transcript, language }),
  });
}

/**
 * Get all category metadata
 */
export async function getCategories(): Promise<ApiResponse<{ categories: any }>> {
  return apiFetch('/classification/categories');
}

// ============ AUTH API ============

/**
 * Verify auth token and get user profile
 */
export async function verifyAuth(): Promise<ApiResponse<{ user: any }>> {
  return apiFetch('/auth/verify', { method: 'POST' });
}

/**
 * Get current user profile
 */
export async function getProfile(): Promise<ApiResponse<{ user: any }>> {
  return apiFetch('/auth/me');
}

/**
 * Update user profile
 */
export async function updateProfile(
  updates: { displayName?: string; preferredLanguage?: string }
): Promise<ApiResponse<{ user: any }>> {
  return apiFetch('/auth/me', {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

/**
 * Map API - Get all map layers
 */
export async function getMapLayers(
  bounds?: { north: number; south: number; east: number; west: number }
): Promise<ApiResponse<any>> {
  const queryParams = bounds ? `?bounds=${JSON.stringify(bounds)}` : '';
  return apiFetch(`/map/layers${queryParams}`);
}

/**
 * Map API - Get hexagon details
 */
export async function getHexagonDetails(hexId: string): Promise<ApiResponse<any>> {
  return apiFetch(`/map/hexagon/${hexId}`);
}

/**
 * Map API - Get map statistics
 */
export async function getMapStats(): Promise<ApiResponse<any>> {
  return apiFetch('/map/stats');
}

// ============ DISPATCH API ============

export async function getDispatchTasks(): Promise<ApiResponse<any>> {
  const response = await apiFetch('/dispatch/tasks-list');
  const data = response.data as any;

  if (response.success && Array.isArray(data?.tasks)) {
    return {
      ...response,
      data: {
        ...data,
        tasks: data.tasks.map((task: any) => ({
          ...task,
          rankedDecisions: Array.isArray(task?.rankedDecisions) ? task.rankedDecisions : [],
          coordinatorOverride: task?.coordinatorOverride || {},
        })),
      },
    };
  }

  return response;
}

export async function runDispatchHeartbeat(): Promise<ApiResponse<any>> {
  return apiFetch('/dispatch/heartbeat', {
    method: 'POST',
  });
}

export async function applyDispatchOverride(
  taskId: string,
  payload: { selectedVolunteerId: string; reason: string }
): Promise<ApiResponse<any>> {
  return apiFetch(`/dispatch/tasks/${taskId}/override`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ============ NGO DASHBOARD API ============

export async function getDashboardOverview(): Promise<ApiResponse<any>> {
  return apiFetch('/dashboard/overview');
}

export async function getWorkspaceSummary(): Promise<ApiResponse<any>> {
  return apiFetch('/dashboard/workspace-summary');
}

export async function getSurgeForecast(): Promise<ApiResponse<any>> {
  return apiFetch('/dashboard/surge-forecast');
}

export async function getCrossNgoCoordination(): Promise<ApiResponse<any>> {
  return apiFetch('/dashboard/cross-ngo');
}

// ============ VOLUNTEER EXPERIENCE API ============

export async function getVolunteerProfile(volunteerId: string): Promise<ApiResponse<any>> {
  const response = await apiFetch(`/volunteer-app/profile/${volunteerId}`);
  if (response.success && response.data) {
    return { ...response, data: mapVolunteerProfileData(response.data) };
  }
  return response;
}

export async function runVolunteerSkillAssessment(volunteerId: string, answers: string[]): Promise<ApiResponse<any>> {
  return apiFetch('/volunteer-app/onboarding/assess', {
    method: 'POST',
    body: JSON.stringify({ volunteerId, answers }),
  });
}

export async function updateVolunteerPreferences(input: {
  volunteerId: string;
  sdgInterests?: string[];
  weeklyHourLimit?: number;
  availabilityCalendar?: Array<{ day: string; isAvailable: boolean; slots: string[] }>;
}): Promise<ApiResponse<any>> {
  return apiFetch('/volunteer-app/onboarding/preferences', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function getVolunteerTasks(volunteerId: string): Promise<ApiResponse<any>> {
  const response = await apiFetch(`/volunteer-app/tasks/${volunteerId}`);
  const data = response.data as any;
  if (response.success && data?.tasks) {
    return {
      ...response,
      data: {
        ...data,
        tasks: data.tasks.map(mapVolunteerTask),
      },
    };
  }
  return response;
}

export async function acceptVolunteerTask(taskId: string, volunteerId: string): Promise<ApiResponse<any>> {
  return apiFetch(`/volunteer-app/tasks/${taskId}/accept`, {
    method: 'POST',
    body: JSON.stringify({ volunteerId }),
  });
}

export async function getVolunteerTaskChat(taskId: string): Promise<ApiResponse<any>> {
  const response = await apiFetch(`/volunteer-app/tasks/${taskId}/chat`);
  const data = response.data as any;
  if (response.success && data?.messages) {
    return {
      ...response,
      data: {
        ...data,
        messages: data.messages.map(mapVolunteerChatMessage),
      },
    };
  }
  return response;
}

export async function sendVolunteerTaskMessage(
  taskId: string,
  payload: { senderType: 'volunteer' | 'coordinator'; senderId: string; message: string }
): Promise<ApiResponse<any>> {
  return apiFetch(`/volunteer-app/tasks/${taskId}/chat`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function completeVolunteerTask(payload: {
  taskId: string;
  volunteerId: string;
  photoEvidenceUrls: string[];
  voiceDebriefText: string;
  beneficiaryRating?: number;
}): Promise<ApiResponse<any>> {
  return apiFetch('/volunteer-app/tasks/complete', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getVolunteerGamification(volunteerId: string): Promise<ApiResponse<any>> {
  const response = await apiFetch(`/volunteer-app/gamification/${volunteerId}`);
  if (response.success && response.data) {
    return { ...response, data: mapVolunteerGamification(response.data) };
  }
  return response;
}

// ============ GEMINI FEATURES API ============

export async function runCoordinatorCopilotQuery(query: string): Promise<ApiResponse<any>> {
  return apiFetch('/gemini/copilot/query', {
    method: 'POST',
    body: JSON.stringify({ query }),
  });
}

export async function runSkillMatchProxy(volunteerSkills: string[], needDescription: string): Promise<ApiResponse<any>> {
  return apiFetch('/gemini/skill-match', {
    method: 'POST',
    body: JSON.stringify({ volunteerSkills, needDescription }),
  });
}

export async function generateGeminiImpactReport(input: {
  ngoName: string;
  periodLabel: string;
  rawActivityLogs: string;
  language: 'en' | 'hi';
}): Promise<ApiResponse<any>> {
  return apiFetch('/gemini/impact-report', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function runSurgeRagForecast(input: {
  historicalSummary: string;
  weatherSignals: string;
  socialSignals: string;
}): Promise<ApiResponse<any>> {
  return apiFetch('/gemini/surge-rag', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function runBurnoutDetection(input: {
  messageToneSample: string;
  usageSummary: string;
  optIn: boolean;
}): Promise<ApiResponse<any>> {
  return apiFetch('/gemini/burnout-detect', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function generateCrisisEscalationDraft(input: {
  zone: string;
  needsSummary: string;
  evidenceSummary: string;
}): Promise<ApiResponse<any>> {
  return apiFetch('/gemini/crisis-escalation', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

// ============ CSR PORTAL API ============

export async function getCsrPricing(): Promise<ApiResponse<any>> {
  const response = await apiFetch('/csr/pricing');
  if (response.success && response.data) {
    return { ...response, data: mapCsrPricing(response.data) };
  }
  return response;
}

export async function bulkOnboardEmployees(
  companyId: string,
  companyName: string,
  rows: Array<{
    employeeId: string;
    name: string;
    email: string;
    phoneNumber?: string;
    division: string;
    location: string;
  }>
): Promise<ApiResponse<any>> {
  return apiFetch('/csr/employees/bulk-onboard', {
    method: 'POST',
    body: JSON.stringify({ companyId, companyName, rows }),
  });
}

export async function getCompanyVolunteerPool(
  companyId: string,
  sdgAreas: string[] = [],
  preferredNgoIds: string[] = []
): Promise<ApiResponse<any>> {
  const params = new URLSearchParams();
  if (sdgAreas.length > 0) params.set('sdgAreas', sdgAreas.join(','));
  if (preferredNgoIds.length > 0) params.set('preferredNgoIds', preferredNgoIds.join(','));
  return apiFetch(`/csr/volunteer-pool/${companyId}?${params.toString()}`);
}

export async function getCompanyLeaderboard(companyId: string): Promise<ApiResponse<any>> {
  const response = await apiFetch(`/csr/leaderboard/${companyId}`);
  if (response.success && response.data) {
    return { ...response, data: mapCompanyLeaderboard(response.data) };
  }
  return response;
}

export async function getCompanyBRSR(companyId: string): Promise<ApiResponse<any>> {
  const response = await apiFetch(`/csr/compliance/brsr/${companyId}`);
  if (response.success && response.data) {
    return { ...response, data: mapCompanyBRSR(response.data) };
  }
  return response;
}

export async function getCompanyAuditTrail(companyId: string): Promise<ApiResponse<any>> {
  return apiFetch(`/csr/compliance/audit-trail/${companyId}`);
}

export async function getCompanyCertificates(companyId: string): Promise<ApiResponse<any>> {
  return apiFetch(`/csr/certificates/${companyId}`);
}

export async function createTeamChallenge(input: {
  companyId: string;
  title: string;
  targetValue: number;
  metric: 'food_kits' | 'hours' | 'needs_resolved' | 'beneficiaries';
  dueDate: string;
}): Promise<ApiResponse<any>> {
  return apiFetch('/csr/challenges', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function getTeamChallenges(companyId: string): Promise<ApiResponse<any>> {
  return apiFetch(`/csr/challenges/${companyId}`);
}

export async function generateNgoVetting(input: {
  ngoName: string;
  fcraStatus: string;
  darpanRating: string;
  pastProjects: string[];
  mediaCoverageNotes: string;
}): Promise<ApiResponse<any>> {
  return apiFetch('/csr/ngo-vetting', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

// ============ PANCHAYAT INTERFACE API ============

export async function flagPanchayatNeed(input: {
  panchayatId: string;
  description: string;
  category?: string;
  urgency?: string;
  location: { latitude: number; longitude: number; district?: string; state?: string; address?: string };
}): Promise<ApiResponse<any>> {
  return apiFetch('/panchayat/needs/flag', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function getPanchayatOverview(panchayatId: string): Promise<ApiResponse<any>> {
  const response = await apiFetch(`/panchayat/overview/${panchayatId}`);
  if (response.success && response.data) {
    return { ...response, data: mapPanchayatOverview(response.data) };
  }
  return response;
}

export async function getPanchayatHistory(panchayatId: string, months = 6): Promise<ApiResponse<any>> {
  const response = await apiFetch(`/panchayat/history/${panchayatId}?months=${months}`);
  if (response.success && response.data) {
    return { ...response, data: mapPanchayatHistory(response.data) };
  }
  return response;
}

export async function runPanchayatSchemeGapFinder(input: {
  panchayatId: string;
  needsSummary: string;
  enrolledSchemes: string[];
}): Promise<ApiResponse<any>> {
  return apiFetch('/panchayat/scheme-gap-finder', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function getPanchayatMonthlyReport(
  panchayatId: string,
  monthLabel = 'Current Month'
): Promise<ApiResponse<any>> {
  const response = await apiFetch(`/panchayat/monthly-health-report/${panchayatId}?monthLabel=${encodeURIComponent(monthLabel)}`);
  if (response.success && response.data) {
    return { ...response, data: mapPanchayatMonthlyReport(response.data) };
  }
  return response;
}

export async function getPanchayatPmGatiShaktiOverlay(panchayatId: string): Promise<ApiResponse<any>> {
  const response = await apiFetch(`/panchayat/pm-gatishakti/${panchayatId}`);
  if (response.success && response.data) {
    return { ...response, data: mapPanchayatOverlay(response.data) };
  }
  return response;
}

// ============ CRISIS MODE API ============

export async function evaluateCrisisActivation(zoneId: string, imdAlert = false): Promise<ApiResponse<any>> {
  return apiFetch('/crisis/evaluate', {
    method: 'POST',
    body: JSON.stringify({ zoneId, imdAlert }),
  });
}

export async function activateCrisisMode(input: {
  zoneId: string;
  reason: string;
  evidenceSummary: string;
}): Promise<ApiResponse<any>> {
  return apiFetch('/crisis/activate', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function resolveCrisisMode(crisisId: string): Promise<ApiResponse<any>> {
  return apiFetch('/crisis/resolve', {
    method: 'POST',
    body: JSON.stringify({ crisisId }),
  });
}

export async function getCrisisDashboard(zoneId: string): Promise<ApiResponse<any>> {
  const response = await apiFetch(`/crisis/dashboard/${zoneId}`);
  if (response.success && response.data) {
    return { ...response, data: mapCrisisDashboard(response.data) };
  }
  return response;
}

export async function generatePostCrisisReport(crisisId: string, zoneId: string): Promise<ApiResponse<any>> {
  const response = await apiFetch('/crisis/post-report', {
    method: 'POST',
    body: JSON.stringify({ crisisId, zoneId }),
  });
  if (response.success && response.data) {
    return { ...response, data: mapPostCrisisReport(response.data) };
  }
  return response;
}
