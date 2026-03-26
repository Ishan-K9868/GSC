import { Router, Request, Response, NextFunction } from 'express';
import { verifyToken } from './auth';
import { createError } from '../middleware/errorHandler';
import { aiLimiter } from '../middleware/rateLimit';
import {
  activateCrisisMode,
  evaluateCrisisActivation,
  generatePostCrisisReport,
  getCrisisDashboard,
  resolveCrisisMode,
} from '../services/crisisMode';

const crisisRouter = Router();

crisisRouter.post('/evaluate', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { zoneId, imdAlert } = req.body as { zoneId?: string; imdAlert?: boolean };
    if (!zoneId) {
      throw createError('zoneId is required', 400, 'MISSING_ZONE_ID');
    }

    const data = await evaluateCrisisActivation({ zoneId, imdAlert });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

crisisRouter.post('/activate', verifyToken, aiLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { zoneId, reason, evidenceSummary } = req.body as {
      zoneId?: string;
      reason?: string;
      evidenceSummary?: string;
    };

    if (!zoneId || !reason || !evidenceSummary) {
      throw createError('zoneId, reason and evidenceSummary are required', 400, 'INVALID_CRISIS_ACTIVATION_PAYLOAD');
    }

    const data = await activateCrisisMode({ zoneId, reason, evidenceSummary });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

crisisRouter.post('/resolve', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { crisisId } = req.body as { crisisId?: string };
    const { uid } = (req as any).user;

    if (!crisisId) {
      throw createError('crisisId is required', 400, 'MISSING_CRISIS_ID');
    }

    const data = await resolveCrisisMode({ crisisId, closedBy: uid });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

crisisRouter.get('/dashboard/:zoneId', verifyToken, aiLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await getCrisisDashboard(req.params.zoneId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

crisisRouter.post('/post-report', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { crisisId, zoneId } = req.body as { crisisId?: string; zoneId?: string };
    if (!crisisId || !zoneId) {
      throw createError('crisisId and zoneId are required', 400, 'INVALID_POST_REPORT_PAYLOAD');
    }

    const data = await generatePostCrisisReport({ crisisId, zoneId });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

export default crisisRouter;
