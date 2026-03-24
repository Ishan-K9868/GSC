import { Router, Request, Response, NextFunction } from 'express';
import { requireRoles, verifyToken } from './auth';
import { getDashboardOverview } from '../services/dashboardIntelligence';
import { getFirestore } from '../config/firebase';
import { createError } from '../middleware/errorHandler';
import { UserRole } from '../models/User';

const dashboardRouter = Router();

dashboardRouter.get(
  '/overview',
  verifyToken,
  requireRoles(UserRole.NGO_STAFF, UserRole.NGO_ADMIN, UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await getDashboardOverview();
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
});

dashboardRouter.get(
  '/surge-forecast',
  verifyToken,
  requireRoles(UserRole.NGO_STAFF, UserRole.NGO_ADMIN, UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await getDashboardOverview();
    res.json({
      success: true,
      data: data.surgeForecast,
    });
  } catch (error) {
    next(error);
  }
});

dashboardRouter.get(
  '/cross-ngo',
  verifyToken,
  requireRoles(UserRole.NGO_STAFF, UserRole.NGO_ADMIN, UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await getDashboardOverview();
    res.json({
      success: true,
      data: data.crossNgoCoordination,
    });
  } catch (error) {
    next(error);
  }
});

dashboardRouter.post(
  '/resources',
  verifyToken,
  requireRoles(UserRole.NGO_STAFF, UserRole.NGO_ADMIN, UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, quantity, location, usagePerDay, unit } = req.body as {
      name?: string;
      quantity?: number;
      location?: string;
      usagePerDay?: number;
      unit?: string;
    };

    if (!name || quantity === undefined || !location || usagePerDay === undefined || !unit) {
      throw createError('name, quantity, location, usagePerDay, and unit are required', 400, 'INVALID_RESOURCE_PAYLOAD');
    }

    const db = getFirestore();
    const ref = await db.collection('resources').add({
      name,
      quantity,
      location,
      usagePerDay,
      unit,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    res.status(201).json({
      success: true,
      data: {
        id: ref.id,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default dashboardRouter;
