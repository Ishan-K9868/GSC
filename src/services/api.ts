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

async function getAuthToken(): Promise<string | null> {
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
  return apiFetch('/dispatch/tasks-list');
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

export async function getSurgeForecast(): Promise<ApiResponse<any>> {
  return apiFetch('/dashboard/surge-forecast');
}

export async function getCrossNgoCoordination(): Promise<ApiResponse<any>> {
  return apiFetch('/dashboard/cross-ngo');
}

// ============ VOLUNTEER EXPERIENCE API ============

export async function getVolunteerProfile(volunteerId: string): Promise<ApiResponse<any>> {
  return apiFetch(`/volunteer-app/profile/${volunteerId}`);
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
  return apiFetch(`/volunteer-app/tasks/${volunteerId}`);
}

export async function acceptVolunteerTask(taskId: string, volunteerId: string): Promise<ApiResponse<any>> {
  return apiFetch(`/volunteer-app/tasks/${taskId}/accept`, {
    method: 'POST',
    body: JSON.stringify({ volunteerId }),
  });
}

export async function getVolunteerTaskChat(taskId: string): Promise<ApiResponse<any>> {
  return apiFetch(`/volunteer-app/tasks/${taskId}/chat`);
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
  return apiFetch(`/volunteer-app/gamification/${volunteerId}`);
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
  return apiFetch('/csr/pricing');
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
  return apiFetch(`/csr/leaderboard/${companyId}`);
}

export async function getCompanyBRSR(companyId: string): Promise<ApiResponse<any>> {
  return apiFetch(`/csr/compliance/brsr/${companyId}`);
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
  return apiFetch(`/panchayat/overview/${panchayatId}`);
}

export async function getPanchayatHistory(panchayatId: string, months = 6): Promise<ApiResponse<any>> {
  return apiFetch(`/panchayat/history/${panchayatId}?months=${months}`);
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
  return apiFetch(`/panchayat/monthly-health-report/${panchayatId}?monthLabel=${encodeURIComponent(monthLabel)}`);
}

export async function getPanchayatPmGatiShaktiOverlay(panchayatId: string): Promise<ApiResponse<any>> {
  return apiFetch(`/panchayat/pm-gatishakti/${panchayatId}`);
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
  return apiFetch(`/crisis/dashboard/${zoneId}`);
}

export async function generatePostCrisisReport(crisisId: string, zoneId: string): Promise<ApiResponse<any>> {
  return apiFetch('/crisis/post-report', {
    method: 'POST',
    body: JSON.stringify({ crisisId, zoneId }),
  });
}
