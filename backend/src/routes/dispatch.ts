import { Router, Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest, requireRoles, verifyToken } from './auth';
import { createError } from '../middleware/errorHandler';
import {
  triggerSevaAgentForReport,
  respondToDispatchInvite,
  runDispatchHeartbeat,
  coordinatorOverrideDispatch,
} from '../services/sevaAgent';
import { getFirestore } from '../config/firebase';
import { UserRole } from '../models/User';

const dispatchRouter = Router();

dispatchRouter.post(
  '/trigger/:reportId',
  verifyToken,
  requireRoles(UserRole.NGO_STAFF, UserRole.NGO_ADMIN, UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reportId } = req.params;
    if (!reportId) {
      throw createError('reportId is required', 400, 'MISSING_REPORT_ID');
    }

    const result = await triggerSevaAgentForReport(reportId);

    res.json({
      success: result.success,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

dispatchRouter.post('/tasks/:taskId/respond', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { taskId } = req.params;
    const { volunteerId, action } = req.body as {
      volunteerId?: string;
      action?: 'accept' | 'decline';
    };
    const { uid } = (req as AuthenticatedRequest).user || {};

    if (!taskId || !volunteerId || !action) {
      throw createError('taskId, volunteerId, and action are required', 400, 'INVALID_RESPONSE_PAYLOAD');
    }
    if (!uid) {
      throw createError('Unauthorized', 401, 'AUTH_UNAUTHORIZED');
    }

    const db = getFirestore();
    const volunteerDoc = await db.collection('volunteers').doc(volunteerId).get();
    if (!volunteerDoc.exists) {
      throw createError('Volunteer not found', 404, 'VOLUNTEER_NOT_FOUND');
    }

    const volunteerData = volunteerDoc.data() as { userId?: string };
    if (!volunteerData?.userId || volunteerData.userId !== uid) {
      throw createError('Forbidden: volunteer identity mismatch', 403, 'VOLUNTEER_IDENTITY_MISMATCH');
    }

    const result = await respondToDispatchInvite(taskId, volunteerId, action);

    res.json({
      success: result.success,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

dispatchRouter.post(
  '/heartbeat',
  verifyToken,
  requireRoles(UserRole.NGO_STAFF, UserRole.NGO_ADMIN, UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await runDispatchHeartbeat();
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

dispatchRouter.get(
  '/tasks/:taskId',
  verifyToken,
  requireRoles(UserRole.NGO_STAFF, UserRole.NGO_ADMIN, UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { taskId } = req.params;
    const db = getFirestore();
    const taskDoc = await db.collection('dispatchTasks').doc(taskId).get();

    if (!taskDoc.exists) {
      throw createError('Dispatch task not found', 404, 'TASK_NOT_FOUND');
    }

    res.json({
      success: true,
      data: {
        task: { id: taskDoc.id, ...taskDoc.data() },
      },
    });
  } catch (error) {
    next(error);
  }
});

dispatchRouter.get(
  '/tasks-list',
  verifyToken,
  requireRoles(UserRole.NGO_STAFF, UserRole.NGO_ADMIN, UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getFirestore();
    const snapshot = await db
      .collection('dispatchTasks')
      .orderBy('createdAt', 'desc')
      .limit(30)
      .get();

    const tasks = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    res.json({
      success: true,
      data: {
        tasks,
        count: tasks.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

dispatchRouter.post(
  '/tasks/:taskId/override',
  verifyToken,
  requireRoles(UserRole.NGO_STAFF, UserRole.NGO_ADMIN, UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { taskId } = req.params;
    const { selectedVolunteerId, reason } = req.body as {
      selectedVolunteerId?: string;
      reason?: string;
    };
    const { uid } = (req as AuthenticatedRequest).user || {};

    if (!taskId || !selectedVolunteerId || !reason) {
      throw createError('taskId, selectedVolunteerId, and reason are required', 400, 'INVALID_OVERRIDE_PAYLOAD');
    }
    if (!uid) {
      throw createError('Unauthorized', 401, 'AUTH_UNAUTHORIZED');
    }

    const result = await coordinatorOverrideDispatch(taskId, uid, selectedVolunteerId, reason);

    res.json({
      success: result.success,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

dispatchRouter.get(
  '/tasks/:taskId/logs',
  verifyToken,
  requireRoles(UserRole.NGO_STAFF, UserRole.NGO_ADMIN, UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { taskId } = req.params;
    const db = getFirestore();
    const logsSnapshot = await db
      .collection('agentDecisionLogs')
      .where('taskId', '==', taskId)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const logs = logsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    res.json({
      success: true,
      data: {
        logs,
        count: logs.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default dispatchRouter;
