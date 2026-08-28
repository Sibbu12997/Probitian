import express from 'express';
import { isAllowedOrigin } from './cors';

export function csrfDefenseMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const isStateChanging = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method);
  
  if (isStateChanging && (req.path.startsWith('/api/admin') || req.path.startsWith('/api/cms'))) {
    const origin = req.headers.origin;
    const isAllowed = isAllowedOrigin(origin, req);

    if (origin && !isAllowed) {
      return res.status(403).json({ error: 'Forbidden: Untrusted cross-site request origin' });
    }

    const referer = req.headers.referer;
    if (!origin && referer) {
      try {
        const refOrigin = new URL(referer).origin;
        if (!isAllowedOrigin(refOrigin, req)) {
          return res.status(403).json({ error: 'Forbidden: Untrusted cross-site request referer' });
        }
      } catch (e) {
        return res.status(403).json({ error: 'Forbidden: Malformed referer' });
      }
    }
  }

  next();
}

export const csrfMiddleware = csrfDefenseMiddleware;
