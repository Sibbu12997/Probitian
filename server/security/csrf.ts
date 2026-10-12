import express from 'express';
import { isAllowedOrigin } from './cors';

export function csrfDefenseMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const isStateChanging = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method);
  
  // Explicitly exempt public form submission endpoints
  if (req.method === 'POST' && (req.path === '/api/newsletter' || req.path === '/api/cms/messages')) {
    return next();
  }

  // External schedulers authenticate with a secret header; browser/session-authenticated
  // cron requests must still pass the same Origin/Referer checks as other privileged writes.
  const isCronSecretRequest = req.path.startsWith('/api/cron') &&
    (Boolean(req.headers.authorization) || Boolean(req.headers['x-cron-key']));
  if (isCronSecretRequest) return next();

  if (isStateChanging && (req.path.startsWith('/api/admin') || req.path.startsWith('/api/cms') || req.path.startsWith('/api/crm') || req.path.startsWith('/api/cron'))) {
    const origin = req.headers.origin;
    const isAllowed = isAllowedOrigin(origin, req);

    if (origin && !isAllowed) {
      return res.status(403).json({ error: 'Forbidden: Untrusted cross-site request origin' });
    }

    const referer = req.headers.referer;
    if (!origin && !referer) {
      return res.status(403).json({ error: 'Forbidden: Origin or Referer header required for state-changing request' });
    }
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
