import { Router, Request, Response, NextFunction } from 'express';
import { verifyToken } from './auth';
import { createError } from '../middleware/errorHandler';
import { aiLimiter } from '../middleware/rateLimit';
import {
  flagNeedBySarpanch,
  generateMonthlyVillageHealthReport,
  getPanchayatOverview,
  getPmGatiShaktiOverlay,
  getVillageNeedHistory,
  runSchemeGapFinder,
} from '../services/panchayatInterface';

const panchayatRouter = Router();

panchayatRouter.post('/needs/flag', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { panchayatId, description, category, urgency, location } = req.body as {
      panchayatId?: string;
      description?: string;
      category?: string;
      urgency?: string;
      location?: { latitude: number; longitude: number; district?: string; state?: string; address?: string };
    };
    const { uid } = (req as any).user;

    if (!panchayatId || !description || !location) {
      throw createError('panchayatId, description and location are required', 400, 'INVALID_PANCHAYAT_NEED_PAYLOAD');
    }

    const data = await flagNeedBySarpanch({
      panchayatId,
      sarpanchUid: uid,
      description,
      category,
      urgency,
      location,
    });

    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

panchayatRouter.get('/overview/:panchayatId', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await getPanchayatOverview(req.params.panchayatId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

panchayatRouter.get('/history/:panchayatId', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const months = req.query.months ? Number(req.query.months) : 6;
    const data = await getVillageNeedHistory(req.params.panchayatId, months);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

panchayatRouter.post('/scheme-gap-finder', verifyToken, aiLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { panchayatId, needsSummary, enrolledSchemes } = req.body as {
      panchayatId?: string;
      needsSummary?: string;
      enrolledSchemes?: string[];
    };

    if (!panchayatId || !needsSummary || !enrolledSchemes) {
      throw createError('panchayatId, needsSummary and enrolledSchemes are required', 400, 'INVALID_SCHEME_GAP_PAYLOAD');
    }

    const data = await runSchemeGapFinder({ panchayatId, needsSummary, enrolledSchemes });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

panchayatRouter.get('/monthly-health-report/:panchayatId', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const monthLabel = req.query.monthLabel ? String(req.query.monthLabel) : 'Current Month';
    const data = await generateMonthlyVillageHealthReport({
      panchayatId: req.params.panchayatId,
      monthLabel,
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

panchayatRouter.get('/pm-gatishakti/:panchayatId', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await getPmGatiShaktiOverlay(req.params.panchayatId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

export default panchayatRouter;
