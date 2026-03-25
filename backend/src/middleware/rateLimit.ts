import { Request, Response } from 'express';
import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function createLimiter(options: {
  windowMs: number;
  max: number;
  message: string;
  code: string;
}): RateLimitRequestHandler {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        error: {
          message: options.message,
          code: options.code,
        },
      });
    },
  });
}

const baseWindowMs = envInt('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000);

export const globalApiLimiter = createLimiter({
  windowMs: baseWindowMs,
  max: envInt('RATE_LIMIT_MAX', 300),
  message: 'Too many API requests. Please try again later.',
  code: 'RATE_LIMIT_EXCEEDED',
});

export const authLimiter = createLimiter({
  windowMs: baseWindowMs,
  max: envInt('RATE_LIMIT_AUTH_MAX', 20),
  message: 'Too many authentication attempts. Please wait and retry.',
  code: 'AUTH_RATE_LIMIT_EXCEEDED',
});

export const uploadLimiter = createLimiter({
  windowMs: baseWindowMs,
  max: envInt('RATE_LIMIT_UPLOAD_MAX', 30),
  message: 'Too many upload requests. Please wait and retry.',
  code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
});

export const aiLimiter = createLimiter({
  windowMs: baseWindowMs,
  max: envInt('RATE_LIMIT_AI_MAX', 60),
  message: 'Too many AI requests. Please wait and retry.',
  code: 'AI_RATE_LIMIT_EXCEEDED',
});
