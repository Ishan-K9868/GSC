/**
 * Error Handler Middleware
 * Centralized error handling for all API routes
 */

import { Request, Response, NextFunction } from 'express';
import { RequestWithContext } from './requestContext';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId = (req as RequestWithContext).requestId || 'unknown';
  console.error(`❌ Error [${requestId}] ${req.method} ${req.originalUrl}:`, err.message);
  console.error(err.stack);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      code: err.code || 'INTERNAL_ERROR',
      requestId,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
}

export function createError(message: string, statusCode: number, code?: string): AppError {
  const error: AppError = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}
