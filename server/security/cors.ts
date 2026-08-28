import express from 'express';

export function isAllowedOrigin(origin: string | undefined, req: express.Request): boolean {
  if (!origin) return true; // Direct same-origin requests or server-side calls without Origin header

  try {
    const parsed = new URL(origin);
    const host = parsed.host.toLowerCase();
    const serverHost = (req.get('host') || '').toLowerCase();

    // Direct host match against actual server host header
    if (serverHost && host === serverHost) return true;

    // Official ProBitian domains
    if (
      host === 'probitian.com' ||
      host === 'www.probitian.com' ||
      host.endsWith('.probitian.com')
    ) {
      return true;
    }

    // Local development origins
    if (
      host === 'localhost:3000' ||
      host === '127.0.0.1:3000' ||
      host === 'localhost:5173' ||
      host === '127.0.0.1:5173' ||
      host === 'localhost' ||
      host === '127.0.0.1'
    ) {
      return true;
    }

    // Official ProBitian & Google AI Studio container domains
    if (
      host === 'probitian.ai.studio' ||
      host.endsWith('.ai.studio') ||
      host === 'ai.studio' ||
      (host.endsWith('.run.app') && (host.startsWith('ais-dev-') || host.startsWith('ais-pre-') || host.includes('aistudio')))
    ) {
      return true;
    }

    // Custom allowed origins from environment
    const customAllowed = [
      process.env.APP_URL,
      process.env.FRONTEND_URL,
      process.env.PUBLIC_URL,
      process.env.VITE_SITE_URL,
      process.env.CORS_ALLOWED_ORIGINS
    ].filter(Boolean).map(s => s!.toLowerCase().trim());

    for (const allowed of customAllowed) {
      if (allowed.includes(',')) {
        const split = allowed.split(',').map(item => item.trim());
        if (split.some(item => origin.toLowerCase() === item || host === item.replace(/^https?:\/\//, ''))) {
          return true;
        }
      } else {
        if (origin.toLowerCase() === allowed || host === allowed.replace(/^https?:\/\//, '')) {
          return true;
        }
      }
    }
  } catch (e) {
    return false;
  }

  return false;
}

export function corsMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const origin = req.headers.origin;

  if (origin && isAllowedOrigin(origin, req)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Token, X-Requested-With');
  }

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  next();
}
