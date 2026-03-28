import type { QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { getFirestore } from '../config/firebase';
import { getGeminiClient } from './geminiClient';

const db = getFirestore();

export interface DedupResult {
  isDuplicate: boolean;
  isPossibleDuplicate: boolean;
  mergedIntoReportId: string | null;
  reportCount: number;
  isSystemic: boolean;
  similarityScore: number;
}

const GEOFENCE_RADIUS_KM = 0.5;
const TIME_WINDOW_HOURS = 3;
const AUTO_MERGE_THRESHOLD = 0.85;
const POSSIBLE_DUPLICATE_THRESHOLD = 0.65;
const SYSTEMIC_COUNT_THRESHOLD = 4;

type NeedReportCandidate = {
  location?: {
    latitude?: number;
    longitude?: number;
  };
  report_count?: number;
  merged_from?: string[];
  urgency?: string;
  urgencyScore?: number;
  embedding_vector?: number[];
};

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const radius = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function cosineSimilarity(a: number[], b: number[]): number {
  const length = Math.min(a.length, b.length);

  if (length === 0) return 0;

  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (let index = 0; index < length; index += 1) {
    dot += a[index] * b[index];
    magA += a[index] ** 2;
    magB += b[index] ** 2;
  }

  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

async function getEmbedding(text: string): Promise<number[]> {
  const genai = getGeminiClient();
  const model = genai.getGenerativeModel({ model: 'text-embedding-004' });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

export async function runDedupCheck(
  newReportId: string,
  newDescription: string,
  newCategory: string,
  newLat: number,
  newLon: number
): Promise<DedupResult> {
  const defaultResult: DedupResult = {
    isDuplicate: false,
    isPossibleDuplicate: false,
    mergedIntoReportId: null,
    reportCount: 1,
    isSystemic: false,
    similarityScore: 0,
  };

  try {
    const newEmbedding = await getEmbedding(newDescription);

    await db.collection('needReports').doc(newReportId).update({
      embedding_vector: newEmbedding,
    });

    const cutoffTime = new Date(Date.now() - TIME_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
    const snapshot = await db
      .collection('needReports')
      .where('category', '==', newCategory)
      .where('status', 'in', ['pending', 'classified', 'dispatched', 'in_progress'])
      .where('createdAt', '>=', cutoffTime)
      .get();

    const candidates = snapshot.docs.filter((doc) => {
      if (doc.id === newReportId) return false;

      const data = doc.data() as NeedReportCandidate;
      const lat = data.location?.latitude;
      const lon = data.location?.longitude;

      if (typeof lat !== 'number' || typeof lon !== 'number') return false;
      return haversineKm(newLat, newLon, lat, lon) <= GEOFENCE_RADIUS_KM;
    });

    if (candidates.length === 0) return defaultResult;

    let bestScore = 0;
    let bestDoc: QueryDocumentSnapshot | null = null;

    for (const doc of candidates) {
      const data = doc.data() as NeedReportCandidate;
      const embedding = data.embedding_vector;

      if (!Array.isArray(embedding) || embedding.length === 0) continue;

      const score = cosineSimilarity(newEmbedding, embedding);
      if (score > bestScore) {
        bestScore = score;
        bestDoc = doc;
      }
    }

    if (!bestDoc || bestScore < POSSIBLE_DUPLICATE_THRESHOLD) {
      return defaultResult;
    }

    const existingData = bestDoc.data() as NeedReportCandidate;
    const existingId = bestDoc.id;
    const newReportCount = (existingData.report_count ?? 1) + 1;
    const isSystemic = newReportCount >= SYSTEMIC_COUNT_THRESHOLD;

    if (bestScore >= AUTO_MERGE_THRESHOLD) {
      const existingLat = existingData.location?.latitude ?? newLat;
      const existingLon = existingData.location?.longitude ?? newLon;

      await db.collection('needReports').doc(existingId).update({
        report_count: newReportCount,
        merged_from: [...(existingData.merged_from ?? []), newReportId],
        systemic: isSystemic,
        'location.latitude': (existingLat + newLat) / 2,
        'location.longitude': (existingLon + newLon) / 2,
        ...(isSystemic
          ? {
              urgency: 'critical',
              urgencyScore: Math.max(Number(existingData.urgencyScore || 0), 9),
            }
          : {}),
        updatedAt: new Date().toISOString(),
      });

      await db.collection('needReports').doc(newReportId).update({
        status: 'cancelled',
        merged_into: existingId,
        updatedAt: new Date().toISOString(),
      });

      return {
        isDuplicate: true,
        isPossibleDuplicate: false,
        mergedIntoReportId: existingId,
        reportCount: newReportCount,
        isSystemic,
        similarityScore: bestScore,
      };
    }

    await db.collection('needReports').doc(newReportId).update({
      possible_duplicate: true,
      possible_duplicate_of: existingId,
      possible_duplicate_score: bestScore,
      updatedAt: new Date().toISOString(),
    });

    return {
      isDuplicate: false,
      isPossibleDuplicate: true,
      mergedIntoReportId: null,
      reportCount: 1,
      isSystemic: false,
      similarityScore: bestScore,
    };
  } catch (error) {
    console.error('[DedupEngine] Error:', error);
    return defaultResult;
  }
}
