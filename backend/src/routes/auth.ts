/**
 * Authentication Routes
 * PRD: Firebase Phone OTP Authentication
 * 
 * Handles:
 * - Verify Firebase ID token
 * - Get/update user profile
 */

import { Router, Request, Response, NextFunction } from 'express';
import { getAuth, getFirestore } from '../config/firebase';
import { createError } from '../middleware/errorHandler';
import { UserRole, UserRoleType } from '../models/User';

export const authRouter = Router();

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    phoneNumber?: string;
  };
  userProfile?: {
    role?: UserRoleType;
    [key: string]: unknown;
  };
}

// Middleware to verify Firebase ID token
export async function verifyToken(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      throw createError('No token provided', 401, 'AUTH_NO_TOKEN');
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await getAuth().verifyIdToken(token);
    
    // Attach user info to request
    (req as AuthenticatedRequest).user = {
      uid: decodedToken.uid,
      phoneNumber: decodedToken.phone_number,
    };
    
    next();
  } catch (error: any) {
    if (error.code === 'auth/id-token-expired') {
      next(createError('Token expired', 401, 'AUTH_TOKEN_EXPIRED'));
    } else if (error.statusCode) {
      next(error);
    } else {
      next(createError('Invalid token', 401, 'AUTH_INVALID_TOKEN'));
    }
  }
}

export function requireRoles(...allowedRoles: UserRoleType[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const uid = authReq.user?.uid;

      if (!uid) {
        throw createError('Unauthorized', 401, 'AUTH_UNAUTHORIZED');
      }

      const db = getFirestore();
      const userDoc = await db.collection('users').doc(uid).get();

      if (!userDoc.exists) {
        throw createError('User profile not found', 404, 'USER_NOT_FOUND');
      }

      const userData = userDoc.data() as { role?: UserRoleType };
      const role = userData?.role;

      if (!role || !allowedRoles.includes(role)) {
        throw createError('Forbidden', 403, 'AUTH_FORBIDDEN');
      }

      authReq.userProfile = userData;
      next();
    } catch (error) {
      next(error);
    }
  };
}

// POST /api/auth/verify - Verify token and get/create user
authRouter.post('/verify', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { uid, phoneNumber } = (req as AuthenticatedRequest).user || {};
    if (!uid) {
      throw createError('Unauthorized', 401, 'AUTH_UNAUTHORIZED');
    }
    const db = getFirestore();
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();

    let userData;
    
    if (userDoc.exists) {
      // Update last login
      await userRef.update({
        lastLoginAt: new Date().toISOString(),
      });
      userData = userDoc.data();
    } else {
      // Create new user
      userData = {
        id: uid,
        phoneNumber,
        role: UserRole.FIELD_WORKER, // Default role
        preferredLanguage: 'hi',
        reportsSubmitted: 0,
        reportsResolved: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };
      await userRef.set(userData);
    }

    res.json({
      success: true,
      data: {
        user: userData,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/me - Get current user profile
authRouter.get('/me', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { uid } = (req as AuthenticatedRequest).user || {};
    if (!uid) {
      throw createError('Unauthorized', 401, 'AUTH_UNAUTHORIZED');
    }
    const db = getFirestore();
    const userDoc = await db.collection('users').doc(uid).get();

    if (!userDoc.exists) {
      throw createError('User not found', 404, 'USER_NOT_FOUND');
    }

    res.json({
      success: true,
      data: {
        user: userDoc.data(),
      },
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/auth/me - Update user profile
authRouter.patch('/me', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { uid } = (req as AuthenticatedRequest).user || {};
    if (!uid) {
      throw createError('Unauthorized', 401, 'AUTH_UNAUTHORIZED');
    }
    const { displayName, preferredLanguage, avatarUrl } = req.body;
    
    const db = getFirestore();
    const userRef = db.collection('users').doc(uid);
    
    const updates: any = {
      updatedAt: new Date().toISOString(),
    };
    
    if (displayName) updates.displayName = displayName;
    if (preferredLanguage) updates.preferredLanguage = preferredLanguage;
    if (avatarUrl) updates.avatarUrl = avatarUrl;
    
    await userRef.update(updates);
    
    const updatedDoc = await userRef.get();

    res.json({
      success: true,
      data: {
        user: updatedDoc.data(),
      },
    });
  } catch (error) {
    next(error);
  }
});
