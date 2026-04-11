import { randomUUID } from 'node:crypto';
import { Request, Response, NextFunction } from 'express';

export type RequestWithContext = Request & {
  requestId?: string;
};

export function requestContext(req: Request, res: Response, next: NextFunction): void {
  const requestId = req.header('x-request-id') || randomUUID();
  const startedAt = Date.now();
  const contextualRequest = req as RequestWithContext;

  contextualRequest.requestId = requestId;
  res.setHeader('x-request-id', requestId);

  res.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    console.log(
      `[request] ${requestId} ${req.method} ${req.originalUrl} -> ${res.statusCode} (${durationMs}ms)`
    );
  });

  next();
}
