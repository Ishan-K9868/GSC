/**
 * Intake Routes
 * PRD: 5.1 SEVA Intake Engine - Need Report Submission API
 * 
 * Handles all intake modes:
 * - Voice intake (5.1.1)
 * - Photo intake (5.1.2)
 * - Web form intake (5.1.4)
 * - Batch CSV import (5.1.4)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getFirestore } from '../config/firebase';
import { verifyToken } from './auth';
import { ensureUserProfile } from './auth';
import { createError } from '../middleware/errorHandler';
import { 
  CreateNeedReportSchema, 
  NeedReport, 
  NeedCategoryType,
  ReportStatus,
  NeedCategory,
  UrgencyLevelType,
  UrgencyLevel,
  CategoryMetadata,
} from '../models/NeedReport';
import { classifyNeedReport, type ClassifiedNeedReport } from '../services/classification';
import { triggerAutoDispatch } from '../services/autoDispatch';
import { computeFullUrgencyScore, type UrgencyBreakdown } from '../services/urgencyMultipliers';
import { runDedupCheck } from '../services/dedupEngine';

export const intakeRouter = Router();

// POST /api/intake/report - Submit a new need report
intakeRouter.post('/report', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { uid } = (req as any).user;
    
    // Validate input
    const validationResult = CreateNeedReportSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw createError(
        `Validation error: ${validationResult.error.errors.map(e => e.message).join(', ')}`,
        400,
        'VALIDATION_ERROR'
      );
    }

    const input = validationResult.data;
    const reportId = uuidv4();
    const now = new Date().toISOString();

    // Run AI classification if category/urgency not provided
    let classification: {
      category: NeedCategoryType;
      urgency: UrgencyLevelType;
      geminiExtraction?: ClassifiedNeedReport;
      urgencyScore?: number;
      urgencyBreakdown?: UrgencyBreakdown;
    } = {
      category: input.category || NeedCategory.HEALTH,
      urgency: input.urgency || UrgencyLevel.MEDIUM,
      geminiExtraction: undefined,
    };

    if (!input.category || !input.urgency) {
      try {
        const aiClassification = await classifyNeedReport(input.description, input.language, {
          location: input.location,
        });
        classification = {
          category: aiClassification.category as any,
          urgency: (aiClassification.severity || UrgencyLevel.MEDIUM) as any,
          geminiExtraction: aiClassification,
          urgencyScore: aiClassification.urgencyScore,
          urgencyBreakdown: aiClassification.urgencyBreakdown,
        };
      } catch (classificationError) {
        console.warn('AI classification failed, using defaults:', classificationError);
      }
    }

    if (!classification.urgencyBreakdown) {
      try {
        const urgencyBreakdown = await computeFullUrgencyScore(
          classification.urgency,
          classification.category,
          input.location.latitude,
          input.location.longitude
        );

        classification.urgencyScore = urgencyBreakdown.finalScore;
        classification.urgencyBreakdown = urgencyBreakdown;
      } catch (urgencyError) {
        console.warn('Urgency multiplier scoring failed, using base urgency only:', urgencyError);
      }
    }

    // Determine if this is a sensitive report (privacy mode)
    const isPrivate = classification.category === NeedCategory.WOMEN_CHILD;

    // Build the report
    const report: NeedReport & {
      urgencyScore?: number;
      urgencyBreakdown?: UrgencyBreakdown;
      urgencyDecayCount?: number;
      urgencyDecayAlert?: boolean;
      report_count?: number;
      merged_from?: string[];
      merged_into?: string;
      possible_duplicate?: boolean;
      possible_duplicate_of?: string;
      possible_duplicate_score?: number;
      systemic?: boolean;
      embedding_vector?: number[];
    } = {
      id: reportId,
      reporterId: uid,
      category: classification.category,
      urgency: classification.urgency,
      description: input.description,
      estimatedPeopleAffected: input.estimatedPeopleAffected || classification.geminiExtraction?.estimatedCount,
      location: input.location,
      photoUrls: input.photoUrls || [],
      audioUrl: input.audioUrl,
      source: input.source,
      status: ReportStatus.CLASSIFIED,
      language: input.language || 'en',
      geminiExtraction: classification.geminiExtraction,
      urgencyScore: classification.urgencyScore,
      urgencyBreakdown: classification.urgencyBreakdown,
      urgencyDecayCount: 0,
      urgencyDecayAlert: false,
      report_count: 1,
      merged_from: [],
      possible_duplicate: false,
      systemic: false,
      isOfflineSubmission: input.isOfflineSubmission || false,
      isPrivate,
      createdAt: now,
      updatedAt: now,
    };

    if (classification.geminiExtraction?.subCategory) {
      report.subCategory = classification.geminiExtraction.subCategory;
    }
    if (classification.geminiExtraction) {
      report.geminiExtraction = classification.geminiExtraction;
    }
    if (report.estimatedPeopleAffected === undefined) {
      delete (report as Partial<NeedReport>).estimatedPeopleAffected;
    }
    if (!report.audioUrl) {
      delete (report as Partial<NeedReport>).audioUrl;
    }

    const firestoreSafeReport = JSON.parse(JSON.stringify(report));

    // Save to Firestore
    const db = getFirestore();
    await db.collection('needReports').doc(reportId).set(firestoreSafeReport);

    // Increment user's report count without assuming the profile document already exists
    const { userRef } = await ensureUserProfile(uid, (req as any).user?.phoneNumber);
    await userRef.set({
      reportsSubmitted: (await import('firebase-admin')).firestore.FieldValue.increment(1),
      updatedAt: now,
    }, { merge: true });

    const dedupResult = await runDedupCheck(
      reportId,
      report.description,
      report.category,
      report.location.latitude,
      report.location.longitude
    );

    if (dedupResult.isDuplicate) {
      return res.status(200).json({
        success: true,
        action: 'merged',
        mergedInto: dedupResult.mergedIntoReportId,
        reportCount: dedupResult.reportCount,
        isSystemic: dedupResult.isSystemic,
      });
    }

    // Trigger auto-dispatch for critical/high urgency
    if (classification.urgency === UrgencyLevel.CRITICAL || classification.urgency === UrgencyLevel.HIGH) {
      // Fire and forget - don't block response
      triggerAutoDispatch(report).catch(err => {
        console.error('Auto-dispatch error:', err);
      });
    }

    // Get category metadata for response
    const categoryMeta = CategoryMetadata[classification.category as NeedCategoryType];

    res.status(201).json({
      success: true,
      data: {
        report,
        classification: {
          category: classification.category,
          categoryLabel: categoryMeta.label,
          categoryEmoji: categoryMeta.emoji,
          urgency: classification.urgency,
          urgencyScore: classification.urgencyScore,
          urgencyBreakdown: classification.urgencyBreakdown,
          autoAction: categoryMeta.autoAction,
          confidence: classification.geminiExtraction?.confidence || 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/intake/reports - Get reports (with filters)
intakeRouter.get('/reports', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category, urgency, status, limit = 50, startAfter } = req.query;
    const db = getFirestore();
    
    let query = db.collection('needReports')
      .orderBy('createdAt', 'desc')
      .limit(Number(limit));

    if (category) {
      query = query.where('category', '==', category);
    }
    if (urgency) {
      query = query.where('urgency', '==', urgency);
    }
    if (status) {
      query = query.where('status', '==', status);
    }
    if (startAfter) {
      const startDoc = await db.collection('needReports').doc(startAfter as string).get();
      if (startDoc.exists) {
        query = query.startAfter(startDoc);
      }
    }

    const snapshot = await query.get();
    const reports = snapshot.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => doc.data());

    res.json({
      success: true,
      data: {
        reports,
        count: reports.length,
        hasMore: reports.length === Number(limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/intake/reports/:id - Get single report
intakeRouter.get('/reports/:id', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const db = getFirestore();
    const doc = await db.collection('needReports').doc(id).get();

    if (!doc.exists) {
      throw createError('Report not found', 404, 'REPORT_NOT_FOUND');
    }

    res.json({
      success: true,
      data: {
        report: doc.data(),
      },
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/intake/reports/:id - Update report status
intakeRouter.patch('/reports/:id', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, assignedNgoId, assignedVolunteerId } = req.body;
    
    const db = getFirestore();
    const reportRef = db.collection('needReports').doc(id);
    const doc = await reportRef.get();

    if (!doc.exists) {
      throw createError('Report not found', 404, 'REPORT_NOT_FOUND');
    }

    const updates: any = {
      updatedAt: new Date().toISOString(),
    };

    if (status) updates.status = status;
    if (assignedNgoId) updates.assignedNgoId = assignedNgoId;
    if (assignedVolunteerId) updates.assignedVolunteerId = assignedVolunteerId;

    if (status === ReportStatus.RESOLVED) {
      updates.resolvedAt = new Date().toISOString();
    }

    await reportRef.update(updates);

    const updatedDoc = await reportRef.get();

    res.json({
      success: true,
      data: {
        report: updatedDoc.data(),
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/intake/batch - Batch import from CSV
intakeRouter.post('/batch', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { uid } = (req as any).user;
    const { reports } = req.body;

    if (!Array.isArray(reports) || reports.length === 0) {
      throw createError('No reports provided', 400, 'NO_REPORTS');
    }

    if (reports.length > 100) {
      throw createError('Maximum 100 reports per batch', 400, 'BATCH_TOO_LARGE');
    }

    const db = getFirestore();
    const batch = db.batch();
    const now = new Date().toISOString();
    const results: any[] = [];

    for (const reportInput of reports) {
      const reportId = uuidv4();
      
      // Basic validation
      const validationResult = CreateNeedReportSchema.safeParse(reportInput);
      if (!validationResult.success) {
        results.push({
          success: false,
          error: validationResult.error.errors.map(e => e.message).join(', '),
          input: reportInput,
        });
        continue;
      }

      const input = validationResult.data;
      
      // Use provided category/urgency or defaults (skip AI for batch)
      const report: Partial<NeedReport> = {
        id: reportId,
        reporterId: uid,
        category: input.category || NeedCategory.HEALTH,
        urgency: input.urgency || UrgencyLevel.MEDIUM,
        description: input.description,
        location: input.location,
        source: 'csv_import',
        status: ReportStatus.PENDING,
        language: input.language || 'en',
        isPrivate: input.category === NeedCategory.WOMEN_CHILD,
        createdAt: now,
        updatedAt: now,
      };

      batch.set(db.collection('needReports').doc(reportId), report);
      results.push({
        success: true,
        reportId,
      });
    }

    await batch.commit();

    res.status(201).json({
      success: true,
      data: {
        total: reports.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results,
      },
    });
  } catch (error) {
    next(error);
  }
});
