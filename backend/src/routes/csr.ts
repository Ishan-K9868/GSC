import { Router, Request, Response, NextFunction } from 'express';
import { verifyToken } from './auth';
import { createError } from '../middleware/errorHandler';
import { aiLimiter } from '../middleware/rateLimit';
import {
  bulkOnboardEmployees,
  createTeamChallenge,
  generateImpactCertificates,
  generateNgoVettingReport,
  getBRSRAutomation,
  getCompanyLeaderboard,
  getCompanyVolunteerPool,
  getComplianceAuditTrail,
  getTeamChallenges,
} from '../services/csrPortal';

const csrRouter = Router();

csrRouter.post('/employees/bulk-onboard', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId, companyName, rows } = req.body as {
      companyId?: string;
      companyName?: string;
      rows?: Array<{
        employeeId: string;
        name: string;
        email: string;
        phoneNumber?: string;
        division: string;
        location: string;
      }>;
    };

    if (!companyId || !companyName || !rows || !Array.isArray(rows)) {
      throw createError('companyId, companyName and rows are required', 400, 'INVALID_BULK_ONBOARD_PAYLOAD');
    }

    const data = await bulkOnboardEmployees({ companyId, companyName, rows });
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

csrRouter.get('/volunteer-pool/:companyId', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = req.params;
    const sdgAreas = req.query.sdgAreas ? String(req.query.sdgAreas).split(',').map((v) => v.trim()) : [];
    const preferredNgoIds = req.query.preferredNgoIds
      ? String(req.query.preferredNgoIds).split(',').map((v) => v.trim())
      : [];

    const data = await getCompanyVolunteerPool({ companyId, sdgAreas, preferredNgoIds });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

csrRouter.get('/leaderboard/:companyId', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await getCompanyLeaderboard(req.params.companyId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

csrRouter.get('/compliance/brsr/:companyId', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await getBRSRAutomation(req.params.companyId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

csrRouter.get('/compliance/audit-trail/:companyId', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await getComplianceAuditTrail(req.params.companyId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

csrRouter.get('/certificates/:companyId', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await generateImpactCertificates(req.params.companyId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

csrRouter.post('/challenges', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId, title, targetValue, metric, dueDate } = req.body as {
      companyId?: string;
      title?: string;
      targetValue?: number;
      metric?: 'food_kits' | 'hours' | 'needs_resolved' | 'beneficiaries';
      dueDate?: string;
    };

    if (!companyId || !title || targetValue === undefined || !metric || !dueDate) {
      throw createError('companyId, title, targetValue, metric, dueDate are required', 400, 'INVALID_CHALLENGE_PAYLOAD');
    }

    const data = await createTeamChallenge({ companyId, title, targetValue, metric, dueDate });
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

csrRouter.get('/challenges/:companyId', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await getTeamChallenges(req.params.companyId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

csrRouter.post('/ngo-vetting', verifyToken, aiLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ngoName, fcraStatus, darpanRating, pastProjects, mediaCoverageNotes } = req.body as {
      ngoName?: string;
      fcraStatus?: string;
      darpanRating?: string;
      pastProjects?: string[];
      mediaCoverageNotes?: string;
    };

    if (!ngoName || !fcraStatus || !darpanRating || !pastProjects || !mediaCoverageNotes) {
      throw createError('ngoName, fcraStatus, darpanRating, pastProjects, mediaCoverageNotes are required', 400, 'INVALID_NGO_VETTING_PAYLOAD');
    }

    const data = await generateNgoVettingReport({
      ngoName,
      fcraStatus,
      darpanRating,
      pastProjects,
      mediaCoverageNotes,
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

csrRouter.get('/pricing', async (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      tier: 'Enterprise — CSR Portal',
      priceMonthlyInr: 50000,
      includes: [
        'Employee volunteer management',
        'BRSR automation',
        'Branded portal',
        'Dedicated success manager',
      ],
      monetizationNote:
        'Core platform remains free for NGOs and volunteers. Monetization comes from corporate CSR layer.',
    },
  });
});

export default csrRouter;
