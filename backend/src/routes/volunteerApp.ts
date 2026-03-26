import { Router, Request, Response, NextFunction } from 'express';
import { verifyToken } from './auth';
import { createError } from '../middleware/errorHandler';
import { aiLimiter } from '../middleware/rateLimit';
import {
  completeVolunteerTask,
  getGamificationSummary,
  getOrCreateVolunteerProfile,
  getTaskChat,
  getVolunteerTaskFeed,
  runSkillAssessment,
  sendTaskChatMessage,
  updateVolunteerInterestsAndAvailability,
  acceptVolunteerTask,
} from '../services/volunteerExperience';
import { VolunteerCompletionPayloadSchema } from '../models/VolunteerApp';

const volunteerAppRouter = Router();

volunteerAppRouter.get('/profile/:volunteerId', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { volunteerId } = req.params;
    const profile = await getOrCreateVolunteerProfile(volunteerId);
    res.json({ success: true, data: { profile } });
  } catch (error) {
    next(error);
  }
});

volunteerAppRouter.post('/onboarding/assess', verifyToken, aiLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { volunteerId, answers } = req.body as { volunteerId?: string; answers?: string[] };
    if (!volunteerId || !answers || !Array.isArray(answers) || answers.length === 0) {
      throw createError('volunteerId and answers are required', 400, 'INVALID_ASSESSMENT_INPUT');
    }

    const result = await runSkillAssessment(volunteerId, answers);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

volunteerAppRouter.patch('/onboarding/preferences', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { volunteerId, sdgInterests, weeklyHourLimit, availabilityCalendar } = req.body as {
      volunteerId?: string;
      sdgInterests?: string[];
      weeklyHourLimit?: number;
      availabilityCalendar?: Array<{ day: string; isAvailable: boolean; slots: string[] }>;
    };

    if (!volunteerId) {
      throw createError('volunteerId is required', 400, 'MISSING_VOLUNTEER_ID');
    }

    const profile = await updateVolunteerInterestsAndAvailability({
      volunteerId,
      sdgInterests,
      weeklyHourLimit,
      availabilityCalendar,
    });

    res.json({ success: true, data: { profile } });
  } catch (error) {
    next(error);
  }
});

volunteerAppRouter.get('/tasks/:volunteerId', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { volunteerId } = req.params;
    const tasks = await getVolunteerTaskFeed(volunteerId);
    res.json({ success: true, data: { tasks, count: tasks.length } });
  } catch (error) {
    next(error);
  }
});

volunteerAppRouter.post('/tasks/:taskId/accept', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { taskId } = req.params;
    const { volunteerId } = req.body as { volunteerId?: string };
    if (!volunteerId) {
      throw createError('volunteerId is required', 400, 'MISSING_VOLUNTEER_ID');
    }

    const result = await acceptVolunteerTask(taskId, volunteerId);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

volunteerAppRouter.get('/tasks/:taskId/chat', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { taskId } = req.params;
    const messages = await getTaskChat(taskId);
    res.json({ success: true, data: { messages, count: messages.length } });
  } catch (error) {
    next(error);
  }
});

volunteerAppRouter.post('/tasks/:taskId/chat', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { taskId } = req.params;
    const { senderType, senderId, message } = req.body as {
      senderType?: 'volunteer' | 'coordinator';
      senderId?: string;
      message?: string;
    };

    if (!senderType || !senderId || !message) {
      throw createError('senderType, senderId and message are required', 400, 'INVALID_CHAT_PAYLOAD');
    }

    const result = await sendTaskChatMessage({ taskId, senderType, senderId, message });
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

volunteerAppRouter.post('/tasks/complete', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = VolunteerCompletionPayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      throw createError(parsed.error.errors.map((err) => err.message).join(', '), 400, 'INVALID_COMPLETION_PAYLOAD');
    }

    const result = await completeVolunteerTask(parsed.data);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

volunteerAppRouter.get('/gamification/:volunteerId', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { volunteerId } = req.params;
    const data = await getGamificationSummary(volunteerId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

export default volunteerAppRouter;
