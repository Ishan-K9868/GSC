import { Router, Request, Response, NextFunction } from 'express';
import { requireRoles, verifyToken } from './auth';
import {
  coordinatorCopilotQuery,
  coordinatorBurnoutDetection,
  crisisEscalationDraft,
  generateImpactNarrative,
  skillMatchingEmbeddingProxy,
  surgeForecastRag,
} from '../services/geminiFeatures';
import { createError } from '../middleware/errorHandler';
import { UserRole } from '../models/User';
import { executeLiveTool, LIVE_FUNCTION_DECLARATIONS } from '../services/geminiLiveService';

const geminiRouter = Router();

geminiRouter.post(
  '/copilot/query',
  verifyToken,
  requireRoles(UserRole.NGO_STAFF, UserRole.NGO_ADMIN, UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { query } = req.body as { query?: string };
    if (!query || query.trim().length < 4) {
      throw createError('query is required', 400, 'INVALID_QUERY');
    }

    const data = await coordinatorCopilotQuery({ query });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

geminiRouter.post('/skill-match', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { volunteerSkills, needDescription } = req.body as {
      volunteerSkills?: string[];
      needDescription?: string;
    };
    if (!volunteerSkills || !needDescription) {
      throw createError('volunteerSkills and needDescription are required', 400, 'INVALID_SKILL_MATCH_INPUT');
    }

    const data = await skillMatchingEmbeddingProxy({ volunteerSkills, needDescription });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

geminiRouter.post(
  '/impact-report',
  verifyToken,
  requireRoles(UserRole.NGO_STAFF, UserRole.NGO_ADMIN, UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ngoName, periodLabel, rawActivityLogs, language } = req.body as {
      ngoName?: string;
      periodLabel?: string;
      rawActivityLogs?: string;
      language?: 'en' | 'hi';
    };
    if (!ngoName || !periodLabel || !rawActivityLogs) {
      throw createError('ngoName, periodLabel, and rawActivityLogs are required', 400, 'INVALID_IMPACT_INPUT');
    }

    const data = await generateImpactNarrative({
      ngoName,
      periodLabel,
      rawActivityLogs,
      language: language || 'en',
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

geminiRouter.post(
  '/surge-rag',
  verifyToken,
  requireRoles(UserRole.NGO_STAFF, UserRole.NGO_ADMIN, UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { historicalSummary, weatherSignals, socialSignals } = req.body as {
      historicalSummary?: string;
      weatherSignals?: string;
      socialSignals?: string;
    };
    if (!historicalSummary || !weatherSignals || !socialSignals) {
      throw createError('historicalSummary, weatherSignals, and socialSignals are required', 400, 'INVALID_SURGE_INPUT');
    }

    const data = await surgeForecastRag({ historicalSummary, weatherSignals, socialSignals });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

geminiRouter.post(
  '/burnout-detect',
  verifyToken,
  requireRoles(UserRole.NGO_STAFF, UserRole.NGO_ADMIN, UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { messageToneSample, usageSummary, optIn } = req.body as {
      messageToneSample?: string;
      usageSummary?: string;
      optIn?: boolean;
    };
    if (optIn === undefined) {
      throw createError('optIn is required', 400, 'MISSING_OPT_IN');
    }

    const data = await coordinatorBurnoutDetection({
      messageToneSample: messageToneSample || '',
      usageSummary: usageSummary || '',
      optIn,
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

geminiRouter.post(
  '/crisis-escalation',
  verifyToken,
  requireRoles(UserRole.NGO_STAFF, UserRole.NGO_ADMIN, UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { zone, needsSummary, evidenceSummary } = req.body as {
      zone?: string;
      needsSummary?: string;
      evidenceSummary?: string;
    };
    if (!zone || !needsSummary || !evidenceSummary) {
      throw createError('zone, needsSummary, and evidenceSummary are required', 400, 'INVALID_ESCALATION_INPUT');
    }

    const data = await crisisEscalationDraft({ zone, needsSummary, evidenceSummary });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

geminiRouter.get(
  '/live-functions',
  verifyToken,
  requireRoles(UserRole.NGO_STAFF, UserRole.NGO_ADMIN, UserRole.ADMIN),
  async (_req: Request, res: Response) => {
    res.json({ success: true, data: { functions: LIVE_FUNCTION_DECLARATIONS } });
  }
);

geminiRouter.post(
  '/live-tool-call',
  verifyToken,
  requireRoles(UserRole.NGO_STAFF, UserRole.NGO_ADMIN, UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { toolName, args } = req.body as { toolName?: string; args?: Record<string, any> };
      if (!toolName) {
        throw createError('toolName is required', 400, 'MISSING_TOOL_NAME');
      }

      const result = await executeLiveTool(toolName, args || {});
      res.json({ success: true, data: { result } });
    } catch (error) {
      next(error);
    }
  }
);

export default geminiRouter;
