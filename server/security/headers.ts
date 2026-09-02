import express from 'express';
import { isAllowedOrigin } from './cors';

export function securityHeadersMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Environment-aware frame policy (clickjacking protection)
  const isDevOrPreview = process.env.NODE_ENV !== 'production' || 
    Boolean(process.env.DISABLE_HMR) || 
    Boolean(process.env.AI_STUDIO_APPLET_ID);

  if (isDevOrPreview) {
    // In AI Studio preview environment, allow embedding from AI Studio and Google domains
    res.setHeader('Content-Security-Policy', "frame-ancestors 'self' https://ai.studio https://*.ai.studio https://*.google.com https://*.googleusercontent.com https://*.run.app");
  } else {
    // Standard production environment clickjacking protection
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Content-Security-Policy', "frame-ancestors 'self'");
  }

  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  const isHttps = req.secure || 
                  req.headers['x-forwarded-proto'] === 'https' ||
                  req.headers['x-forwarded-ssl'] === 'on';

  if (isHttps && process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  // Hardened CORS: Explicit origin validation
  const origin = req.headers.origin;
  const isAllowed = isAllowedOrigin(origin, req);

  if (origin && isAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Vary', 'Origin');
  }

  if (req.method === 'OPTIONS') {
    if (origin && !isAllowed) {
      return res.status(403).json({ error: 'CORS policy violation: Unauthorized origin' });
    }
    return res.status(204).end();
  }

  // Block source maps, env files, and git metadata in all environments
  if (req.path.endsWith('.map') || req.path.includes('.env') || req.path.includes('.git')) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Block direct .ts source file access in production mode
  if (!isDevOrPreview && req.path.endsWith('.ts')) {
    return res.status(403).json({ error: 'Access denied' });
  }

  if (req.path === '/' || req.path.endsWith('.html')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }

  next();
}
