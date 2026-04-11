import { getFirestore } from '../config/firebase';
import { analyzeImageWithGemini } from './visionAnalysis';
import { triggerAutoDispatch } from './autoDispatch';

function getDb() {
  return getFirestore();
}

export interface VerificationResult {
  verified: boolean;
  confidence: number;
  reason: string;
  tier: 'auto_resolved' | 'needs_review' | 'rejected';
}

const CATEGORY_VERIFICATION_PROMPTS: Record<string, string> = {
  food_nutrition: 'food items, food packets, people receiving food, cooked meals, or ration distribution',
  health: 'medical supplies, a person receiving medical attention, medicines being distributed, or a health camp',
  shelter: 'blankets, tarpaulins, tents, or people being provided shelter materials',
  water_sanitation: 'water cans, water distribution, clean water access, or sanitation work',
  education: 'notebooks, school supplies, a tutoring session, or educational materials being distributed',
  emergency: 'emergency response activity, rescue, first aid being administered',
  women_child: 'support materials for women or children, care activities, or relevant supplies',
  environment: 'cleaning activity, waste removal, or environmental work in progress',
};

export async function verifyTaskCompletion(
  taskId: string,
  needReportId: string,
  volunteerId: string,
  reporterId: string,
  needCategory: string,
  photoUrl: string
): Promise<VerificationResult> {
  const expectedContent = CATEGORY_VERIFICATION_PROMPTS[needCategory] || 'evidence that a community need was addressed';

  let geminiResult: { verified: boolean; confidence: number; reason: string };

  try {
    const response = await fetch(photoUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch verification photo: ${response.status}`);
    }

    const imageBuffer = Buffer.from(await response.arrayBuffer());
    const mimeType = response.headers.get('content-type') || 'image/jpeg';
    const analysis = await analyzeImageWithGemini(imageBuffer, mimeType);
    geminiResult = buildVerificationFromAnalysis(analysis, needCategory, expectedContent);
  } catch (error) {
    console.error('[VerifierAgent] Vision API error:', error);
    geminiResult = {
      verified: false,
      confidence: 0.5,
      reason: 'Vision analysis failed — routed to coordinator review',
    };
  }

  let tier: VerificationResult['tier'];

  if (geminiResult.confidence >= 0.75) {
    tier = 'auto_resolved';

    await Promise.all([
      getDb().collection('dispatchTasks').doc(taskId).set(
        {
          status: 'completed',
          verificationPhoto: photoUrl,
          verificationConfidence: geminiResult.confidence,
          verificationReason: geminiResult.reason,
          verifiedAt: new Date().toISOString(),
          pendingCoordinatorReview: false,
          verificationRejected: false,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      ),
      getDb().collection('needReports').doc(needReportId).set(
        {
          status: 'resolved',
          resolvedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      ),
    ]);

    await sendReporterConfirmationRequest(needReportId, reporterId, taskId);
  } else if (geminiResult.confidence >= 0.4) {
    tier = 'needs_review';

    await getDb().collection('dispatchTasks').doc(taskId).set(
      {
        verificationPhoto: photoUrl,
        verificationConfidence: geminiResult.confidence,
        verificationReason: geminiResult.reason,
        pendingCoordinatorReview: true,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    const task = await getDb().collection('dispatchTasks').doc(taskId).get();
    const ngoId = task.data()?.ngoId || task.data()?.assignedNgoId || null;

    if (ngoId) {
      await getDb().collection('notifications').add({
        ngoId,
        type: 'verification_review_needed',
        taskId,
        needReportId,
        message: `Verification photo needs review (confidence: ${(geminiResult.confidence * 100).toFixed(0)}%). AI says: "${geminiResult.reason}"`,
        photoUrl,
        createdAt: new Date().toISOString(),
        read: false,
      });
    }
  } else {
    tier = 'rejected';

    await Promise.all([
      getDb().collection('notifications').add({
        userId: volunteerId,
        type: 'verification_rejected',
        taskId,
        message: `Your completion photo doesn't clearly show the task being addressed. Please re-upload a photo showing: ${expectedContent}.`,
        createdAt: new Date().toISOString(),
        read: false,
      }),
      getDb().collection('dispatchTasks').doc(taskId).set(
        {
          status: 'in_progress',
          verificationRejected: true,
          verificationRejectionReason: geminiResult.reason,
          pendingCoordinatorReview: false,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      ),
    ]);
  }

  return {
    verified: geminiResult.verified,
    confidence: geminiResult.confidence,
    reason: geminiResult.reason,
    tier,
  };
}

export async function handleReporterResponse(
  verificationRequestId: string,
  confirmed: boolean
): Promise<void> {
  const requestDoc = await getDb().collection('verificationRequests').doc(verificationRequestId).get();
  if (!requestDoc.exists) return;

  const { needReportId, taskId } = requestDoc.data() as { needReportId: string; taskId: string };

  if (confirmed) {
    await Promise.all([
      getDb().collection('verificationRequests').doc(verificationRequestId).set({ status: 'confirmed' }, { merge: true }),
      getDb().collection('dispatchTasks').doc(taskId).set({ reporterConfirmed: true }, { merge: true }),
      getDb().collection('needReports').doc(needReportId).set(
        {
          status: 'resolved',
          reporterConfirmed: true,
          resolvedAt: new Date().toISOString(),
        },
        { merge: true }
      ),
    ]);

    return;
  }

  await Promise.all([
    getDb().collection('verificationRequests').doc(verificationRequestId).set({ status: 'denied' }, { merge: true }),
    getDb().collection('dispatchTasks').doc(taskId).set({ status: 'escalated', reporterConfirmed: false }, { merge: true }),
    getDb().collection('needReports').doc(needReportId).set(
      {
        status: 'classified',
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    ),
  ]);

  const reportDoc = await getDb().collection('needReports').doc(needReportId).get();
  if (reportDoc.exists) {
    await triggerAutoDispatch({ id: needReportId, ...reportDoc.data() } as any);
  }
}

export async function reviewPendingVerification(taskId: string, approved: boolean): Promise<void> {
  const taskDoc = await getDb().collection('dispatchTasks').doc(taskId).get();
  if (!taskDoc.exists) return;

  const task = taskDoc.data() as {
    needReportId?: string;
    acceptedVolunteerId?: string;
    verificationPhoto?: string;
    verificationReason?: string;
  };

  if (!task.needReportId) return;

  const reportDoc = await getDb().collection('needReports').doc(task.needReportId).get();
  const reporterId = reportDoc.data()?.reporterId as string | undefined;

  if (approved) {
    await Promise.all([
      getDb().collection('dispatchTasks').doc(taskId).set(
        {
          status: 'completed',
          pendingCoordinatorReview: false,
          verificationRejected: false,
          verifiedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      ),
      getDb().collection('needReports').doc(task.needReportId).set(
        {
          status: 'resolved',
          resolvedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      ),
    ]);

    if (reporterId) {
      await sendReporterConfirmationRequest(task.needReportId, reporterId, taskId);
    }

    return;
  }

  await Promise.all([
    getDb().collection('dispatchTasks').doc(taskId).set(
      {
        status: 'in_progress',
        pendingCoordinatorReview: false,
        verificationRejected: true,
        verificationRejectionReason: 'Coordinator requested a clearer completion photo.',
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    ),
    task.acceptedVolunteerId
      ? getDb().collection('notifications').add({
          userId: task.acceptedVolunteerId,
          type: 'verification_rejected',
          taskId,
          message: 'Coordinator review requested a clearer completion photo. Please re-upload and resubmit.',
          createdAt: new Date().toISOString(),
          read: false,
        })
      : Promise.resolve(),
  ]);
}

async function sendReporterConfirmationRequest(
  needReportId: string,
  reporterId: string,
  taskId: string
): Promise<void> {
  await getDb().collection('verificationRequests').add({
    needReportId,
    reporterId,
    taskId,
    status: 'pending',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  });

  await getDb().collection('notifications').add({
    userId: reporterId,
    type: 'reporter_confirmation_request',
    needReportId,
    taskId,
    message: 'A volunteer has addressed your reported need. Was it resolved? Tap to confirm.',
    createdAt: new Date().toISOString(),
    read: false,
  });
}

function buildVerificationFromAnalysis(
  analysis: {
    category: string;
    confidence: number;
    description: string;
    subCategory?: string;
    suggestedAction?: string;
    visibleDistressSignals?: string[];
  },
  needCategory: string,
  expectedContent: string
): { verified: boolean; confidence: number; reason: string } {
  const expectedKeywords = expectedContent
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((token) => token.length > 3)
    .slice(0, 10);
  const analysisText = [
    analysis.description,
    analysis.subCategory,
    analysis.suggestedAction,
    ...(analysis.visibleDistressSignals || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const keywordMatches = expectedKeywords.filter((keyword) => analysisText.includes(keyword)).length;
  const keywordScore = expectedKeywords.length > 0 ? keywordMatches / expectedKeywords.length : 0;
  const categoryMatch = analysis.category === needCategory;

  let confidence = analysis.confidence || 0.1;

  if (categoryMatch && keywordScore >= 0.2) {
    confidence = Math.max(confidence, 0.82);
  } else if (categoryMatch) {
    confidence = Math.max(confidence, 0.58);
  } else if (keywordScore >= 0.3) {
    confidence = Math.max(confidence, 0.48);
  } else {
    confidence = Math.min(confidence, 0.28);
  }

  const verified = categoryMatch || keywordScore >= 0.3;
  const reason = categoryMatch
    ? `AI matched the photo to ${needCategory} and observed: ${analysis.description}`
    : `AI saw: ${analysis.description}. That did not strongly match the expected ${expectedContent}.`;

  return {
    verified,
    confidence: Number(confidence.toFixed(2)),
    reason,
  };
}
