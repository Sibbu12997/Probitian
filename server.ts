import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import DOMPurify from 'isomorphic-dompurify';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import { emailService } from './src/services/emailService';
import { campaignEmailService } from './src/services/campaignEmailService';
import { 
  DistributedRateLimitStore, 
  createRateLimiter as createDistributedRateLimiter, 
  SharedStoreProvider 
} from './src/lib/rateLimiter';

dotenv.config();

// Authorized Administrator Emails Allowlist
const OFFICIAL_ADMIN_EMAIL = (process.env.ADMIN_EMAIL || process.env.VITE_CONTACT_EMAIL || 'probitianofficial@gmail.com').toLowerCase().trim();
const CONFIGURED_ADMIN_EMAILS = [
  OFFICIAL_ADMIN_EMAIL,
  'probitianofficial@gmail.com',
  'shivam@probitian.com',
  'shivambaghel79@gmail.com',
  ...(process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(',').map(e => e.trim().toLowerCase()) : [])
];

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Trust reverse proxy (Nginx / Cloud Run) for accurate client IP resolution
app.set('trust proxy', 1);

// Safe baseline body limit for API routes (large uploads use route-specific parser)
app.use(express.json({ limit: '500kb' }));
app.use(express.urlencoded({ limit: '500kb', extended: true }));

// ==================== ORIGIN ALLOWLIST & CORS VALIDATOR ====================
function isAllowedOrigin(origin: string | undefined, req: express.Request): boolean {
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

// ==================== SECURITY HEADERS & SHIELD MIDDLEWARE ====================
app.use((req, res, next) => {
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
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-token, X-Requested-With');
    res.setHeader('Vary', 'Origin');
  }

  if (req.method === 'OPTIONS') {
    if (origin && !isAllowed) {
      return res.status(403).json({ error: 'CORS policy violation: Unauthorized origin' });
    }
    return res.status(204).end();
  }

  // CSRF Defense: Block cross-site state-changing requests from untrusted origins on sensitive routes
  const isStateChanging = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method);
  if (isStateChanging && (req.path.startsWith('/api/admin') || req.path.startsWith('/api/cms'))) {
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
});

// ==================== COOKIE PARSER & ADMIN SESSIONS ====================
function parseCookies(req: express.Request): Record<string, string> {
  const list: Record<string, string> = {};
  const rc = req.headers.cookie;
  if (rc) {
    rc.split(';').forEach(cookie => {
      const parts = cookie.split('=');
      list[parts.shift()!.trim()] = decodeURIComponent(parts.join('='));
    });
  }
  return list;
}

interface AdminSession {
  token: string;
  email: string;
  createdAt: number;
  expiresAt: number;
}

// In-memory cache for ultra-fast lookup and token revocation tracking
const adminSessions = new Map<string, AdminSession>();
const revokedSessions = new Set<string>();

// Ephemeral fallback key generated per server process instance if no explicit secret key is set in environment
const EPHEMERAL_SERVER_KEY = crypto.randomBytes(32).toString('hex');

function getSessionSecret(): string {
  return (process.env.ADMIN_PASSKEY || process.env.SUPABASE_SECRET_KEY || process.env.SESSION_SECRET || EPHEMERAL_SERVER_KEY).trim();
}

function createSignedSessionToken(email: string, maxAgeMs: number = 24 * 60 * 60 * 1000): string {
  const cleanEmail = (email || 'admin@probitian.com').toLowerCase().trim();
  const payload = {
    email: cleanEmail,
    createdAt: Date.now(),
    expiresAt: Date.now() + maxAgeMs,
    nonce: crypto.randomBytes(16).toString('hex')
  };
  const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const hmac = crypto.createHmac('sha256', getSessionSecret());
  hmac.update(payloadStr);
  const sig = hmac.digest('base64url');
  return `${payloadStr}.${sig}`;
}

function verifySignedSessionToken(token: string): AdminSession | null {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadStr, sig] = parts;
  if (!payloadStr || !sig) return null;

  try {
    const hmac = crypto.createHmac('sha256', getSessionSecret());
    hmac.update(payloadStr);
    const expectedSig = hmac.digest('base64url');

    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(payloadStr, 'base64url').toString('utf-8'));
    if (!payload || !payload.email || !payload.expiresAt) return null;
    if (Date.now() > payload.expiresAt) return null;

    return {
      token,
      email: payload.email,
      createdAt: payload.createdAt || Date.now(),
      expiresAt: payload.expiresAt
    };
  } catch (e) {
    return null;
  }
}

function getAdminCookieHeader(token: string, req: express.Request, maxAgeSeconds: number = 86400): string {
  const isHttps = req.secure || 
                  req.headers['x-forwarded-proto'] === 'https' ||
                  req.headers['x-forwarded-ssl'] === 'on' ||
                  Boolean(process.env.AIS_APPLET_ID) ||
                  Boolean(process.env.AI_STUDIO_APPLET_ID) ||
                  Boolean(process.env.DISABLE_HMR) ||
                  process.env.NODE_ENV === 'production';

  if (maxAgeSeconds === 0) {
    if (isHttps) {
      return 'admin_session=; HttpOnly; Path=/; SameSite=None; Secure; Max-Age=0';
    }
    return 'admin_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0';
  }

  if (isHttps) {
    return `admin_session=${token}; HttpOnly; Path=/; SameSite=None; Secure; Max-Age=${maxAgeSeconds}`;
  }
  return `admin_session=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
}

// Cleanup expired sessions every 15 minutes
setInterval(() => {
  const now = Date.now();
  for (const [token, session] of adminSessions.entries()) {
    if (now > session.expiresAt) {
      adminSessions.delete(token);
    }
  }
}, 15 * 60 * 1000);

function getAdminSession(req: express.Request): AdminSession | null {
  const cookies = parseCookies(req);
  let token = cookies['admin_session'];

  if (!token) {
    const authHeader = req.headers['authorization'];
    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    } else if (req.headers['x-admin-token'] && typeof req.headers['x-admin-token'] === 'string') {
      token = req.headers['x-admin-token'].trim();
    }
  }

  if (!token) return null;
  if (revokedSessions.has(token)) return null;

  const session = adminSessions.get(token);
  if (session) {
    if (Date.now() > session.expiresAt) {
      adminSessions.delete(token);
      return null;
    }
    return session;
  }

  // Stateless cryptographic fallback for multi-instance / Cloud Run deployments
  const verified = verifySignedSessionToken(token);
  if (verified) {
    adminSessions.set(token, verified);
    return verified;
  }

  return null;
}

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const session = getAdminSession(req);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized: Admin authentication required' });
  }
  (req as any).adminSession = session;
  next();
}

// ==================== DISTRIBUTED RATE LIMITING ====================
const globalDistributedRateLimitStore = new DistributedRateLimitStore();

const loginLimiter = createDistributedRateLimiter({ windowMs: 15 * 60 * 1000, max: 10, prefix: 'login', message: 'Too many login attempts. Please try again in 15 minutes.' }, globalDistributedRateLimitStore);
const newsletterLimiter = createDistributedRateLimiter({ windowMs: 15 * 60 * 1000, max: 10, prefix: 'newsletter', message: 'Too many subscription attempts. Please try again later.' }, globalDistributedRateLimitStore);
const unsubscribeLimiter = createDistributedRateLimiter({ windowMs: 15 * 60 * 1000, max: 20, prefix: 'unsub', message: 'Too many unsubscribe requests. Please try again later.' }, globalDistributedRateLimitStore);
const contactLimiter = createDistributedRateLimiter({ windowMs: 15 * 60 * 1000, max: 10, prefix: 'contact', message: 'Too many contact messages sent. Please try again later.' }, globalDistributedRateLimitStore);
const uploadLimiter = createDistributedRateLimiter({ windowMs: 15 * 60 * 1000, max: 30, prefix: 'upload', message: 'Too many upload requests. Please try again later.' }, globalDistributedRateLimitStore);
const emailTestLimiter = createDistributedRateLimiter({ windowMs: 15 * 60 * 1000, max: 10, prefix: 'email-test', message: 'Too many test emails sent. Please try again later.' }, globalDistributedRateLimitStore);
const emailSendLimiter = createDistributedRateLimiter({ windowMs: 15 * 60 * 1000, max: 5, prefix: 'email-send', message: 'Too many campaign broadcasts requested. Please try again later.' }, globalDistributedRateLimitStore);

// ==================== SIGNED UNSUBSCRIBE TOKENS ====================
function getUnsubscribeSecret(): string {
  return (process.env.ADMIN_PASSKEY || process.env.SUPABASE_SECRET_KEY || process.env.UNSUBSCRIBE_SECRET || EPHEMERAL_SERVER_KEY).trim();
}

function generateUnsubscribeToken(email: string): string {
  const cleanEmail = email.trim().toLowerCase();
  const hmac = crypto.createHmac('sha256', getUnsubscribeSecret());
  hmac.update(cleanEmail);
  const sig = hmac.digest('hex');
  return Buffer.from(`${cleanEmail}:${sig}`).toString('base64url');
}

function verifyUnsubscribeToken(tokenStr: string): string | null {
  try {
    const decoded = Buffer.from(tokenStr, 'base64url').toString('utf-8');
    const parts = decoded.split(':');
    if (parts.length < 2) return null;
    const sig = parts.pop()!;
    const email = parts.join(':');
    if (!email || !sig) return null;
    const cleanEmail = email.trim().toLowerCase();
    const hmac = crypto.createHmac('sha256', getUnsubscribeSecret());
    hmac.update(cleanEmail);
    const expectedSig = hmac.digest('hex');
    
    const sigBuf = Buffer.from(sig);
    const expectedSigBuf = Buffer.from(expectedSig);
    if (sigBuf.length === expectedSigBuf.length && crypto.timingSafeEqual(sigBuf, expectedSigBuf)) {
      return cleanEmail;
    }

    // Backward compatibility for legacy 16-char sliced signatures
    if (sig.length === 16) {
      const expected16Buf = Buffer.from(expectedSig.slice(0, 16));
      if (sigBuf.length === expected16Buf.length && crypto.timingSafeEqual(sigBuf, expected16Buf)) {
        return cleanEmail;
      }
    }
  } catch (e) {
    return null;
  }
  return null;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ==================== SUPABASE SERVER-SIDE CLIENT ====================
const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const serverSecretKey = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

const isServerSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    serverSecretKey &&
    !supabaseUrl.includes('your-supabase-project') &&
    !supabaseUrl.includes('placeholder-project')
  );
};

const serverSupabase = isServerSupabaseConfigured()
  ? createClient(supabaseUrl, serverSecretKey, { auth: { persistSession: false } })
  : null;

// Initialize distributed rate limiting provider backed by Supabase with fail-safe fallback
if (serverSupabase) {
  const supabaseRateLimitProvider: SharedStoreProvider = {
    async incrementAtomic(key: string, windowMs: number, max: number) {
      const { data, error } = await serverSupabase.rpc('increment_rate_limit', {
        p_key: key,
        p_window_ms: windowMs,
        p_max: max
      });

      if (error) {
        throw error;
      }

      if (Array.isArray(data) && data.length > 0) {
        const row = data[0];
        return {
          count: Number(row.count),
          resetTime: Number(row.reset_time),
          allowed: Boolean(row.allowed),
          remaining: Number(row.remaining)
        };
      } else if (data && typeof data === 'object') {
        const row = data as any;
        return {
          count: Number(row.count),
          resetTime: Number(row.reset_time),
          allowed: Boolean(row.allowed),
          remaining: Number(row.remaining)
        };
      }

      throw new Error('Unexpected return signature from increment_rate_limit RPC');
    },
    async getRecord(key: string) {
      try {
        const { data, error } = await serverSupabase
          .from('rate_limits')
          .select('count, reset_time')
          .eq('key', key)
          .maybeSingle();
        if (error) {
          if (error.code === '42P01' || error.message?.includes('relation "rate_limits" does not exist')) {
            throw new Error('rate_limits table not present in Supabase');
          }
          throw error;
        }
        return data ? { count: data.count, reset_time: Number(data.reset_time) } : null;
      } catch (e) {
        throw e;
      }
    },
    async setRecord(key: string, count: number, reset_time: number) {
      const { error } = await serverSupabase
        .from('rate_limits')
        .upsert({
          key,
          count,
          reset_time,
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });
      if (error) throw error;
    }
  };
  globalDistributedRateLimitStore.setProvider(supabaseRateLimitProvider);
}

const PROBITIAN_MEDIA_BUCKET = 'probitian-media';

async function ensureStorageBucket() {
  if (!serverSupabase) return;
  try {
    const { data: bucket, error } = await serverSupabase.storage.getBucket(PROBITIAN_MEDIA_BUCKET);
    if (error || !bucket) {
      await serverSupabase.storage.createBucket(PROBITIAN_MEDIA_BUCKET, { public: true });
      console.log(`[Supabase Storage] Created bucket "${PROBITIAN_MEDIA_BUCKET}" successfully.`);
    }
  } catch (err) {
    console.warn('[Supabase Storage Bucket Warning]', err);
  }
}

function sanitizeSvg(svgContent: string): string {
  if (!svgContent || typeof svgContent !== 'string') return '';
  let clean = svgContent.trim();
  
  // 1. Strip XML DOCTYPE and ENTITY declarations to prevent XXE / entity expansion attacks
  clean = clean.replace(/<!DOCTYPE[\s\S]*?>/gi, '');
  clean = clean.replace(/<!ENTITY[\s\S]*?>/gi, '');
  clean = clean.replace(/<\?xml-stylesheet[\s\S]*?\?>/gi, '');

  // 2. Parser-backed DOMPurify sanitization with strict SVG profile
  clean = DOMPurify.sanitize(clean, {
    USE_PROFILES: { svg: true, svgFilters: true },
    ADD_TAGS: ['use', 'linearGradient', 'radialGradient', 'stop', 'filter', 'feGaussianBlur', 'feMerge', 'feMergeNode'],
    FORBID_TAGS: [
      'script', 'iframe', 'object', 'embed', 'foreignObject', 'applet', 'meta',
      'link', 'form', 'base', 'frame', 'frameset', 'input', 'textarea',
      'button', 'select', 'option', 'canvas', 'video', 'audio', 'source'
    ],
    FORBID_ATTR: ['onload', 'onerror', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'style', 'formaction', 'action'],
    ALLOW_DATA_ATTR: false
  });

  // 3. Post-sanitization safety checks against dangerous schemes and residual active markup
  clean = clean.replace(/(href|src|xlink:href|action|data)\s*=\s*(?:"\s*(?:javascript|vbscript|data:text\/html)[^"]*"|'\s*(?:javascript|vbscript|data:text\/html)[^']*')/gi, '$1="#"');
  clean = clean.replace(/(href|src|xlink:href|action|data)\s*=\s*(?:javascript|vbscript|data:text\/html)[^\s>]+/gi, '$1="#"');
  clean = clean.replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');

  return clean;
}

function validateFileSignature(buffer: Buffer, claimedMime: string, ext: string): { valid: boolean; detectedMime?: string; error?: string } {
  if (!buffer || buffer.length === 0) {
    return { valid: false, error: 'Empty file buffer' };
  }

  // 1. Block known executable & shell script signatures
  // Windows MZ header (PE executable/DLL)
  if (buffer.length >= 2 && buffer[0] === 0x4D && buffer[1] === 0x5A) {
    return { valid: false, error: 'Executable binary files are strictly forbidden' };
  }
  // Linux ELF header
  if (buffer.length >= 4 && buffer[0] === 0x7F && buffer[1] === 0x45 && buffer[2] === 0x4C && buffer[3] === 0x46) {
    return { valid: false, error: 'Executable binary files are strictly forbidden' };
  }
  // Unix Shebang #!
  if (buffer.length >= 2 && buffer[0] === 0x23 && buffer[1] === 0x21) {
    return { valid: false, error: 'Shell scripts are strictly forbidden' };
  }
  // PHP code tags
  const startStr = buffer.slice(0, 100).toString('utf-8').toLowerCase();
  if (startStr.includes('<?php') || startStr.includes('<?=')) {
    return { valid: false, error: 'PHP scripts are strictly forbidden' };
  }

  // 2. Validate Allowed File Signatures
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  const isPng = buffer.length >= 8 &&
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 &&
    buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A;

  // JPEG: FF D8 FF
  const isJpeg = buffer.length >= 3 &&
    buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;

  // GIF: GIF87a or GIF89a (47 49 46 38 37 61 or 47 49 46 38 39 61)
  const isGif = buffer.length >= 6 &&
    buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38;

  // WEBP: RIFF....WEBP
  const isWebp = buffer.length >= 12 &&
    buffer.slice(0, 4).toString('ascii') === 'RIFF' &&
    buffer.slice(8, 12).toString('ascii') === 'WEBP';

  // PDF: %PDF- (25 50 44 46 2D)
  const isPdf = buffer.length >= 5 &&
    buffer.slice(0, 5).toString('ascii') === '%PDF-';

  // MP4 / M4V / QuickTime MOV: starts with ftyp at offset 4
  const isMp4 = buffer.length >= 12 && (
    buffer.slice(4, 8).toString('ascii') === 'ftyp' ||
    buffer.slice(4, 12).toString('ascii').includes('isom') ||
    buffer.slice(4, 12).toString('ascii').includes('mp4')
  );

  // WEBM / MKV: 1A 45 DF A3
  const isWebm = buffer.length >= 4 &&
    buffer[0] === 0x1A && buffer[1] === 0x45 && buffer[2] === 0xDF && buffer[3] === 0xA3;

  // SVG: textual XML/SVG
  const isSvg = ext === '.svg' || claimedMime === 'image/svg+xml';

  if (isPng) return { valid: true, detectedMime: 'image/png' };
  if (isJpeg) return { valid: true, detectedMime: 'image/jpeg' };
  if (isGif) return { valid: true, detectedMime: 'image/gif' };
  if (isWebp) return { valid: true, detectedMime: 'image/webp' };
  if (isPdf) return { valid: true, detectedMime: 'application/pdf' };
  if (isMp4) return { valid: true, detectedMime: 'video/mp4' };
  if (isWebm) return { valid: true, detectedMime: 'video/webm' };

  if (isSvg) {
    const textSample = buffer.toString('utf-8').trim().toLowerCase();
    if (textSample.includes('<svg') && (textSample.startsWith('<') || textSample.startsWith('<?xml'))) {
      return { valid: true, detectedMime: 'image/svg+xml' };
    }
    return { valid: false, error: 'Malformed or invalid SVG content' };
  }

  return { valid: false, error: 'Unsupported or unverified file signature' };
}

ensureStorageBucket();

function isValidUuid(id?: string): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

function isValidId(id?: string): boolean {
  if (!id || typeof id !== 'string') return false;
  const clean = id.trim();
  if (clean.length === 0 || clean.length > 128) return false;
  if (clean.includes('..') || clean.includes('/') || clean.includes('\\') || clean.includes('\0')) return false;
  return /^[a-zA-Z0-9_.-]+$/.test(clean);
}

// Local storage files for offline / unconfigured dev environment ONLY (NODE_ENV !== 'production' or AI Studio preview)
const CMS_DATA_FILE = path.join(process.cwd(), 'data', 'cms_settings.json');

function readCmsData() {
  if (process.env.NODE_ENV === 'production' && !process.env.AI_STUDIO_APPLET_ID) {
    throw new Error('Local JSON fallback is strictly disabled in production. Supabase PostgreSQL is the required source of truth.');
  }
  try {
    if (fs.existsSync(CMS_DATA_FILE)) {
      const content = fs.readFileSync(CMS_DATA_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.warn('Notice: Error reading local CMS cache in dev:', err);
  }
  return {};
}

function writeCmsData(data: any) {
  if (process.env.NODE_ENV === 'production' && !process.env.AI_STUDIO_APPLET_ID) {
    throw new Error('Local JSON fallback is strictly disabled in production. Supabase PostgreSQL is the required source of truth.');
  }
  try {
    const dir = path.dirname(CMS_DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CMS_DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Notice: Error writing CMS data cache in dev:', err);
  }
}

// Helper to acquire Google OAuth2 Access Token for GA4 Data API via Service Account
async function getGA4AccessToken(clientEmail: string, privateKey: string): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const safeSkew = 60; // 60s tolerance for clock drift
  const iat = now - safeSkew;
  const exp = iat + 3600; // Strictly 3600s lifetime from iat per Google OAuth RFC 7523

  const claimSet = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp,
    iat,
  };

  const base64Url = (str: string) =>
    Buffer.from(str)
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

  const encodedHeader = base64Url(JSON.stringify(header));
  const encodedClaimSet = base64Url(JSON.stringify(claimSet));
  const signatureInput = `${encodedHeader}.${encodedClaimSet}`;

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signatureInput);

  const formattedKey = privateKey.replace(/\\n/g, '\n');
  const signature = signer
    .sign(formattedKey, 'base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const jwt = `${signatureInput}.${signature}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    throw new Error(`Google OAuth Token Error: ${tokenRes.status} ${errText}`);
  }

  const tokenData = (await tokenRes.json()) as { access_token: string };
  return tokenData.access_token;
}

// ==================== ADMIN AUTHENTICATION API ====================

// Constant-time string comparison against timing attacks
function constantTimeCompare(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string' || !a || !b) return false;
  const hashA = crypto.createHash('sha256').update(a).digest();
  const hashB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

// POST /api/admin/verify-passkey
app.post('/api/admin/verify-passkey', loginLimiter, (req, res) => {
  const { passkey, email } = req.body || {};
  const serverPasskey = (process.env.ADMIN_PASSKEY || '').trim();

  if (!serverPasskey) {
    console.warn('[SECURITY WARNING] ADMIN_PASSKEY environment variable is not configured on the server.');
    return res.status(500).json({ error: 'Admin passkey is not configured on the server environment. Please set ADMIN_PASSKEY.' });
  }

  if (typeof passkey !== 'string' || !passkey.trim() || passkey.length > 512) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const enteredPasskey = passkey.trim();

  if (constantTimeCompare(enteredPasskey, serverPasskey)) {
    // Strict Administrator Identity Binding (Prevent arbitrary email override)
    let adminEmail = OFFICIAL_ADMIN_EMAIL;
    if (typeof email === 'string' && email.trim()) {
      const cleanEmail = email.trim().toLowerCase();
      if (CONFIGURED_ADMIN_EMAILS.includes(cleanEmail)) {
        adminEmail = cleanEmail;
      } else {
        console.warn(`[SECURITY AUDIT] Unauthorized email override attempt '${cleanEmail}' during passkey login. Reverted to official admin identity.`);
      }
    }

    const token = createSignedSessionToken(adminEmail);
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    adminSessions.set(token, {
      token,
      email: adminEmail,
      createdAt: Date.now(),
      expiresAt
    });

    res.setHeader('Set-Cookie', getAdminCookieHeader(token, req));
    return res.json({ success: true, email: adminEmail });
  }

  return res.status(401).json({ error: 'Invalid credentials' });
});

// POST /api/admin/verify-supabase-session
app.post('/api/admin/verify-supabase-session', loginLimiter, async (req, res) => {
  const { accessToken } = req.body || {};
  if (!accessToken || typeof accessToken !== 'string') {
    return res.status(400).json({ error: 'Access token is required' });
  }

  try {
    let verifiedUser: { email?: string; id: string; app_metadata?: any; user_metadata?: any } | null = null;

    if (serverSupabase) {
      const { data, error } = await serverSupabase.auth.getUser(accessToken);
      if (!error && data?.user) {
        verifiedUser = data.user;
      }
    } else if (supabaseUrl) {
      const anonKey = (process.env.VITE_SUPABASE_ANON_KEY || '').trim();
      const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          apikey: anonKey || serverSecretKey,
        },
      });
      if (userRes.ok) {
        verifiedUser = (await userRes.json()) as any;
      }
    }

    if (!verifiedUser || !verifiedUser.email) {
      return res.status(401).json({ error: 'Invalid or expired Supabase authentication' });
    }

    const userEmail = verifiedUser.email.toLowerCase().trim();

    // Explicit Admin Authorization Check
    let isAuthorizedAdmin = false;

    // 1. Check authorized administrator email allowlist
    const configuredAdminEmails = [
      'probitianofficial@gmail.com',
      'shivam@probitian.com',
      'shivambaghel79@gmail.com',
      ...(process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(',').map(e => e.trim().toLowerCase()) : [])
    ];

    if (configuredAdminEmails.includes(userEmail)) {
      isAuthorizedAdmin = true;
    }

    // 2. Check profiles table in Supabase if serverSupabase is available
    if (!isAuthorizedAdmin && serverSupabase) {
      try {
        const { data: profile, error: profErr } = await serverSupabase
          .from('profiles')
          .select('role, email')
          .eq('id', verifiedUser.id)
          .maybeSingle();

        if (!profErr && profile && profile.role === 'admin') {
          isAuthorizedAdmin = true;
        }
      } catch (profCheckErr) {
        console.warn('[Admin Authorization Profile Check Warning]', profCheckErr);
      }
    }

    // 3. Check Supabase app_metadata role (set strictly by server/admin, never user_metadata)
    if (!isAuthorizedAdmin) {
      const appRole = verifiedUser.app_metadata?.role;
      if (appRole === 'admin') {
        isAuthorizedAdmin = true;
      }
    }

    if (!isAuthorizedAdmin) {
      console.warn(`[SECURITY] Unauthorized Supabase user attempted admin login: ${userEmail} (${verifiedUser.id})`);
      return res.status(403).json({ error: 'Forbidden: Account does not have administrator privileges' });
    }

    const token = createSignedSessionToken(userEmail);
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    adminSessions.set(token, {
      token,
      email: userEmail,
      createdAt: Date.now(),
      expiresAt,
    });

    res.setHeader('Set-Cookie', getAdminCookieHeader(token, req));
    return res.json({ success: true, email: userEmail });
  } catch (err) {
    console.error('[Admin Supabase Session Verification Error]', err);
    return res.status(500).json({ error: 'Failed to verify Supabase session' });
  }
});

// GET /api/admin/session
app.get('/api/admin/session', (req, res) => {
  const session = getAdminSession(req);
  if (session) {
    return res.json({ authenticated: true, email: session.email });
  }
  return res.json({ authenticated: false });
});

// POST /api/admin/logout
app.post('/api/admin/logout', (req, res) => {
  const cookies = parseCookies(req);
  let token = cookies['admin_session'];

  if (!token) {
    const authHeader = req.headers['authorization'];
    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    } else if (req.headers['x-admin-token'] && typeof req.headers['x-admin-token'] === 'string') {
      token = req.headers['x-admin-token'].trim();
    }
  }

  if (token) {
    adminSessions.delete(token);
    revokedSessions.add(token);
  }
  res.setHeader('Set-Cookie', getAdminCookieHeader('', req, 0));
  return res.json({ success: true });
});

// ==================== PUBLIC NEWSLETTER & MESSAGES API ====================

// Public Newsletter Subscription
app.post('/api/newsletter', newsletterLimiter, async (req, res) => {
  const { email } = req.body;
  const cleanEmail = (email || '').trim().toLowerCase();

  console.log(`[NEWSLETTER] Subscription request received for: ${cleanEmail}`);

  if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
    console.warn(`[NEWSLETTER] Invalid email format provided: ${cleanEmail}`);
    return res.status(400).json({ success: false, message: 'Valid email address is required' });
  }

  let subscriberRecord: any = null;

  if (serverSupabase) {
    try {
      const { data: existing, error: checkErr } = await serverSupabase
        .from('newsletter')
        .select('*')
        .ilike('email', cleanEmail)
        .maybeSingle();

      if (checkErr) {
        console.error(`[NEWSLETTER] Supabase query error checking subscriber: ${checkErr.message}`);
        return res.status(503).json({
          success: false,
          message: 'Database service unavailable. Unable to process subscription.'
        });
      }

      if (existing) {
        if (existing.status === 'active') {
          console.log(`[NEWSLETTER] Email ${cleanEmail} is already actively subscribed in Supabase.`);
          return res.status(200).json({
            success: true,
            message: 'You are already subscribed to ProBitian!',
            subscriber: existing
          });
        } else {
          // Reactivate unsubscribed user
          const { data: updated, error: updateErr } = await serverSupabase
            .from('newsletter')
            .update({ status: 'active' })
            .eq('id', existing.id)
            .select()
            .single();

          if (updateErr || !updated) {
            console.error(`[NEWSLETTER] Supabase reactivation error: ${updateErr?.message}`);
            return res.status(503).json({
              success: false,
              message: 'Database service unavailable. Failed to reactivate subscription.'
            });
          }
          subscriberRecord = updated;
        }
      } else {
        // Insert new subscriber
        const { data: inserted, error: insertErr } = await serverSupabase
          .from('newsletter')
          .insert({ email: cleanEmail, status: 'active' })
          .select()
          .single();

        if (insertErr || !inserted) {
          console.error(`[NEWSLETTER] Supabase insert error: ${insertErr?.message}`);
          return res.status(503).json({
            success: false,
            message: 'Database service unavailable. Failed to save subscription.'
          });
        }
        subscriberRecord = inserted;
      }
    } catch (err: any) {
      console.error(`[NEWSLETTER] Supabase exception: ${err?.message || 'Unknown error'}`);
      return res.status(503).json({
        success: false,
        message: 'Database service unavailable. Exception during subscription.'
      });
    }
  } else {
    // Local JSON fallback ONLY when Supabase is completely unconfigured
    const data = readCmsData();
    data.subscribers = data.subscribers || [];
    const localIdx = data.subscribers.findIndex((s: any) => s.email.toLowerCase() === cleanEmail);

    if (localIdx >= 0) {
      const existingLocal = data.subscribers[localIdx];
      if (existingLocal.status === 'active') {
        return res.status(200).json({
          success: true,
          message: 'You are already subscribed to ProBitian!',
          subscriber: existingLocal
        });
      }
      existingLocal.status = 'active';
      subscriberRecord = existingLocal;
    } else {
      subscriberRecord = {
        id: 'sub-' + Date.now(),
        email: cleanEmail,
        status: 'active',
        created_at: new Date().toISOString()
      };
      data.subscribers.unshift(subscriberRecord);
    }
    writeCmsData(data);
  }

  // Generate signed unsubscribe URL
  const reqProtocol = req.headers['x-forwarded-proto'] || req.protocol;
  const reqHost = req.headers['x-forwarded-host'] || req.headers.host;
  const unsubToken = generateUnsubscribeToken(cleanEmail);
  const unsubUrl = `${reqProtocol}://${reqHost}/api/newsletter/unsubscribe?token=${unsubToken}`;

  // Send welcome email with signed unsubscribe token
  console.log(`[NEWSLETTER] Sending welcome email for: ${cleanEmail}`);
  const emailRes = await emailService.sendWelcomeEmail(cleanEmail, unsubUrl);

  return res.status(200).json({
    success: true,
    message: emailRes.message || 'Successfully subscribed to the newsletter!',
    subscriber: subscriberRecord,
    emailSent: emailRes.success
  });
});

// Public Unsubscribe Endpoint
app.get('/api/newsletter/unsubscribe', unsubscribeLimiter, async (req, res) => {
  const token = (req.query.token || '').toString().trim();
  const rawEmail = (req.query.email || '').toString().trim();

  let verifiedEmail: string | null = null;

  if (token) {
    verifiedEmail = verifyUnsubscribeToken(token);
  } else if (rawEmail) {
    verifiedEmail = verifyUnsubscribeToken(rawEmail);
  }

  if (!verifiedEmail) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Unsubscribe - ProBitian</title><style>body{font-family:sans-serif;text-align:center;padding:50px;background:#f8fafc;color:#1e293b;}.card{max-width:480px;margin:auto;background:white;padding:32px;border-radius:12px;border:1px solid #e2e8f0;}</style></head>
        <body>
          <div class="card">
            <h2 style="color:#ef4444;">Invalid or Expired Request</h2>
            <p>The unsubscribe request is invalid, tampered with, or expired. Please use the original unsubscribe link provided in your newsletter email.</p>
          </div>
        </body>
      </html>
    `);
  }

  // Update in Supabase
  if (serverSupabase) {
    try {
      await serverSupabase.from('newsletter').update({ status: 'unsubscribed' }).eq('email', verifiedEmail);
    } catch (e) {
      console.error('[Unsubscribe DB Error]', e);
    }
  } else {
    const data = readCmsData();
    data.subscribers = data.subscribers || [];
    const target = data.subscribers.find((s: any) => s.email.toLowerCase() === verifiedEmail);
    if (target) {
      target.status = 'unsubscribed';
      writeCmsData(data);
    }
  }

  return res.status(200).send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Unsubscribed - ProBitian</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
          .card { background-color: #1e293b; border: 1px solid #334155; border-radius: 16px; max-width: 500px; width: 100%; padding: 40px; text-align: center; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
          .badge { display: inline-block; background-color: #f59e0b; color: #0f172a; font-weight: 900; padding: 6px 12px; border-radius: 8px; font-size: 16px; margin-bottom: 16px; }
          h1 { color: #ffffff; font-size: 24px; font-weight: 800; margin-bottom: 12px; }
          p { color: #94a3b8; font-size: 15px; line-height: 1.6; margin-bottom: 24px; }
          .email-highlight { color: #a78bfa; font-weight: 600; }
          .btn { display: inline-block; background-color: #7c3aed; color: #ffffff; font-weight: 700; padding: 12px 24px; border-radius: 8px; text-decoration: none; transition: all 0.2s; }
          .btn:hover { background-color: #6d28d9; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">PB</div>
          <h1>You Have Been Unsubscribed</h1>
          <p><span class="email-highlight">${escapeHtml(verifiedEmail)}</span> has been removed from ProBitian newsletter and community campaign emails. You will no longer receive marketing or tutorial updates from us.</p>
          <a href="/" class="btn">Return to ProBitian Homepage</a>
        </div>
      </body>
    </html>
  `);
});

// ==================== CMS PUBLIC READ ENDPOINTS ====================

// CMS SYSTEM STATUS
app.get('/api/cms/status', async (req, res) => {
  const isConfigured = isServerSupabaseConfigured();
  let databaseConnected = false;
  if (isConfigured && serverSupabase) {
    try {
      const { error } = await serverSupabase.from('settings').select('key').limit(1);
      databaseConnected = !error;
    } catch (e) {
      databaseConnected = false;
    }
  }
  return res.json({
    status: 'ok',
    databaseConfigured: isConfigured,
    databaseConnected,
    storageEngine: isConfigured ? 'supabase' : 'local_json'
  });
});

// GENERAL SETTINGS (PUBLIC READ)
app.get('/api/cms/settings/general', async (req, res) => {
  if (serverSupabase) {
    try {
      const { data, error } = await serverSupabase.from('settings').select('value').eq('key', 'general').maybeSingle();
      if (error) {
        console.error('[CMS Settings General Read Error]', error.message);
        return res.status(503).json({ error: 'Database service unavailable' });
      }
      return res.json(data?.value || null);
    } catch (err: any) {
      console.error('[CMS Settings General Read Exception]', err);
      return res.status(503).json({ error: 'Database service unavailable' });
    }
  }
  const data = readCmsData();
  return res.json(data.general || null);
});

// GENERAL SETTINGS (PROTECTED WRITE)
app.post('/api/cms/settings/general', requireAdmin, async (req, res) => {
  const settings = req.body;
  if (!settings) {
    return res.status(400).json({ error: 'Missing settings payload' });
  }

  if (serverSupabase) {
    try {
      const { error } = await serverSupabase.from('settings').upsert({
        key: 'general',
        value: settings,
        updated_at: new Date().toISOString()
      });
      if (error) {
        console.error('[CMS Settings General Write Error]', error.message);
        return res.status(500).json({ error: 'Failed to update general settings' });
      }
      return res.json({ success: true, settings });
    } catch (err: any) {
      console.error('[CMS Settings General Write Exception]', err);
      return res.status(500).json({ error: 'Failed to update general settings' });
    }
  }

  const data = readCmsData();
  data.general = settings;
  writeCmsData(data);

  return res.json({ success: true, settings });
});

// SEO SETTINGS (PUBLIC READ)
app.get('/api/cms/settings/seo', async (req, res) => {
  if (serverSupabase) {
    try {
      const { data, error } = await serverSupabase.from('settings').select('value').eq('key', 'seo').maybeSingle();
      if (error) {
        console.error('[CMS SEO Read Error]', error.message);
        return res.status(503).json({ error: 'Database service unavailable' });
      }
      return res.json(data?.value || null);
    } catch (err: any) {
      console.error('[CMS SEO Read Exception]', err);
      return res.status(503).json({ error: 'Database service unavailable' });
    }
  }
  const data = readCmsData();
  return res.json(data.seo || null);
});

// SEO SETTINGS (PROTECTED WRITE)
app.post('/api/cms/settings/seo', requireAdmin, async (req, res) => {
  const seo = req.body;
  if (!seo) {
    return res.status(400).json({ error: 'Missing SEO settings payload' });
  }

  if (serverSupabase) {
    try {
      const { error } = await serverSupabase.from('settings').upsert({
        key: 'seo',
        value: seo,
        updated_at: new Date().toISOString()
      });
      if (error) {
        console.error('[CMS SEO Write Error]', error.message);
        return res.status(500).json({ error: 'Failed to update SEO settings' });
      }
      return res.json({ success: true, seo });
    } catch (err: any) {
      console.error('[CMS SEO Write Exception]', err);
      return res.status(500).json({ error: 'Failed to update SEO settings' });
    }
  }

  const data = readCmsData();
  data.seo = seo;
  writeCmsData(data);

  return res.json({ success: true, seo });
});

// LEGAL & POLICIES SETTINGS (PUBLIC READ)
app.get('/api/cms/settings/legal', async (req, res) => {
  if (serverSupabase) {
    try {
      const { data, error } = await serverSupabase.from('settings').select('value').eq('key', 'legal_policies').maybeSingle();
      if (error) {
        console.error('[CMS Legal Read Error]', error.message);
        return res.status(503).json({ error: 'Database service unavailable' });
      }
      return res.json(data?.value || null);
    } catch (err: any) {
      console.error('[CMS Legal Read Exception]', err);
      return res.status(503).json({ error: 'Database service unavailable' });
    }
  }
  const data = readCmsData();
  return res.json(data.legal_policies || null);
});

// LEGAL SETTINGS (PROTECTED WRITE)
app.post('/api/cms/settings/legal', requireAdmin, async (req, res) => {
  const legal = req.body;
  if (!legal) {
    return res.status(400).json({ error: 'Missing legal settings payload' });
  }

  if (serverSupabase) {
    try {
      const { error } = await serverSupabase.from('settings').upsert({
        key: 'legal_policies',
        value: legal,
        updated_at: new Date().toISOString()
      });
      if (error) {
        console.error('[CMS Legal Write Error]', error.message);
        return res.status(500).json({ error: 'Failed to update legal settings' });
      }
      return res.json({ success: true, legal });
    } catch (err: any) {
      console.error('[CMS Legal Write Exception]', err);
      return res.status(500).json({ error: 'Failed to update legal settings' });
    }
  }

  const data = readCmsData();
  data.legal_policies = legal;
  writeCmsData(data);

  return res.json({ success: true, legal });
});

// HOME PAGE CONFIG (PUBLIC READ)
app.get('/api/cms/settings/home', async (req, res) => {
  if (serverSupabase) {
    try {
      const { data, error } = await serverSupabase.from('pages').select('*').eq('page_key', 'home').maybeSingle();
      if (error) {
        console.error('[CMS Home Config Read Error]', error.message);
        return res.status(503).json({ error: 'Database service unavailable' });
      }
      if (data) {
        return res.json({
          hero_heading: data.hero_heading,
          hero_description: data.hero_description,
          buttons: data.buttons,
          banner_url: data.banner_url,
          statistics: data.statistics,
          feature_cards: data.feature_cards,
          testimonials: data.testimonials,
          cta: data.cta
        });
      }
      return res.json(null);
    } catch (err: any) {
      console.error('[CMS Home Config Read Exception]', err);
      return res.status(503).json({ error: 'Database service unavailable' });
    }
  }
  const data = readCmsData();
  return res.json(data.home || null);
});

// HOME PAGE CONFIG (PROTECTED WRITE)
app.post('/api/cms/settings/home', requireAdmin, async (req, res) => {
  const homeConfig = req.body;
  if (!homeConfig) {
    return res.status(400).json({ error: 'Missing home config payload' });
  }

  if (serverSupabase) {
    try {
      const { error } = await serverSupabase.from('pages').upsert({
        page_key: 'home',
        title: 'Home Page Configuration',
        hero_heading: homeConfig.hero_heading,
        hero_description: homeConfig.hero_description,
        buttons: homeConfig.buttons,
        banner_url: homeConfig.banner_url,
        statistics: homeConfig.statistics,
        feature_cards: homeConfig.feature_cards,
        testimonials: homeConfig.testimonials,
        cta: homeConfig.cta,
        updated_at: new Date().toISOString()
      });
      if (error) {
        console.error('[CMS Home Config Write Error]', error.message);
        return res.status(500).json({ error: 'Failed to update home configuration' });
      }
      return res.json({ success: true, home: homeConfig });
    } catch (err: any) {
      console.error('[CMS Home Config Write Exception]', err);
      return res.status(500).json({ error: 'Failed to update home configuration' });
    }
  }

  const data = readCmsData();
  data.home = homeConfig;
  writeCmsData(data);

  return res.json({ success: true, home: homeConfig });
});

// PROJECTS (PUBLIC READ)
app.get('/api/cms/projects', async (req, res) => {
  if (serverSupabase) {
    try {
      const { data, error } = await serverSupabase.from('projects').select('*').order('created_at', { ascending: false });
      if (error) {
        console.error('[CMS Projects Read Error]', error.message);
        return res.status(503).json({ error: 'Database service unavailable' });
      }
      return res.json(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('[CMS Projects Read Exception]', err);
      return res.status(503).json({ error: 'Database service unavailable' });
    }
  }
  const data = readCmsData();
  return res.json(data.projects || []);
});

// PROJECTS (PROTECTED WRITE)
app.post('/api/cms/projects', requireAdmin, async (req, res) => {
  const project = req.body;
  if (!project || !project.title) {
    return res.status(400).json({ error: 'Invalid project payload' });
  }

  let savedProject = { ...project };

  if (serverSupabase) {
    try {
      const dbPayload: any = {
        title: project.title,
        category: project.category || 'General',
        description: project.description || '',
        full_description: project.fullDescription || project.description || '',
        tools_used: project.toolsUsed || [],
        image_url: project.imagePlaceholder || project.image_url || '',
        gallery_urls: project.galleryUrls || [],
        kpis: project.kpis || [],
        featured: Boolean(project.featured),
        published: project.published !== false,
        github_url: project.githubUrl || null,
        live_demo_url: project.liveDemoUrl || null,
        youtube_url: project.youtubeUrl || null,
        tags: project.tags || [],
        updated_at: new Date().toISOString()
      };

      if (isValidUuid(project.id)) {
        dbPayload.id = project.id;
      }

      const { data, error } = await serverSupabase.from('projects').upsert(dbPayload).select().single();
      if (error) {
        console.error('[CMS Project Save Error]', error.message);
        return res.status(500).json({ error: 'Failed to save project' });
      }
      if (data) {
        savedProject = { ...project, id: data.id };
      }
      return res.json({ success: true, project: savedProject });
    } catch (err: any) {
      console.error('[CMS Project Save Exception]', err);
      return res.status(500).json({ error: 'Failed to save project' });
    }
  }

  if (!savedProject.id) savedProject.id = 'project-' + Date.now();
  const data = readCmsData();
  data.projects = data.projects || [];
  const idx = data.projects.findIndex((p: any) => p.id === savedProject.id);
  if (idx >= 0) {
    data.projects[idx] = savedProject;
  } else {
    data.projects.unshift(savedProject);
  }
  writeCmsData(data);

  return res.json({ success: true, project: savedProject });
});

// PROJECTS (PROTECTED DELETE)
app.delete('/api/cms/projects/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    return res.status(400).json({ error: 'Invalid project ID format' });
  }

  if (serverSupabase) {
    try {
      const { error } = await serverSupabase.from('projects').delete().eq('id', id);
      if (error) {
        console.error('[CMS Project Delete Error]', error.message);
        return res.status(500).json({ error: 'Failed to delete project' });
      }
      return res.json({ success: true });
    } catch (err: any) {
      console.error('[CMS Project Delete Exception]', err);
      return res.status(500).json({ error: 'Failed to delete project' });
    }
  }

  const data = readCmsData();
  if (data.projects) {
    data.projects = data.projects.filter((p: any) => p.id !== id);
    writeCmsData(data);
  }

  return res.json({ success: true });
});

// BLOGS (PUBLIC READ)
app.get('/api/cms/blogs', async (req, res) => {
  if (serverSupabase) {
    try {
      const { data, error } = await serverSupabase.from('blogs').select('*').order('created_at', { ascending: false });
      if (error) {
        console.error('[CMS Blogs Read Error]', error.message);
        return res.status(503).json({ error: 'Database service unavailable' });
      }
      return res.json(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('[CMS Blogs Read Exception]', err);
      return res.status(503).json({ error: 'Database service unavailable' });
    }
  }
  const data = readCmsData();
  return res.json(data.blogs || []);
});

// BLOGS (PROTECTED WRITE)
app.post('/api/cms/blogs', requireAdmin, async (req, res) => {
  const blog = req.body;
  if (!blog || !blog.title) {
    return res.status(400).json({ error: 'Invalid blog payload' });
  }

  let savedBlog = { ...blog };

  if (serverSupabase) {
    try {
      const slug = blog.slug || blog.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const dbPayload: any = {
        title: blog.title,
        slug,
        excerpt: blog.excerpt || '',
        content: blog.content || '',
        category: blog.category || 'Data Analytics',
        tags: blog.tags || [],
        featured_image: blog.imageUrl || blog.featured_image || '',
        author: blog.author || 'Shivam Singh',
        read_time: blog.readTime || blog.read_time || '5 min read',
        status: blog.status || 'published',
        scheduled_at: blog.scheduledAt || blog.scheduled_at || null,
        updated_at: new Date().toISOString()
      };

      if (isValidUuid(blog.id)) {
        dbPayload.id = blog.id;
      }

      const { data, error } = await serverSupabase.from('blogs').upsert(dbPayload).select().single();
      if (error) {
        console.error('[CMS Blog Save Error]', error.message);
        return res.status(500).json({ error: 'Failed to save blog' });
      }
      if (data) {
        savedBlog = { ...blog, id: data.id };
      }
      return res.json({ success: true, blog: savedBlog });
    } catch (err: any) {
      console.error('[CMS Blog Save Exception]', err);
      return res.status(500).json({ error: 'Failed to save blog' });
    }
  }

  if (!savedBlog.id) savedBlog.id = 'blog-' + Date.now();
  const data = readCmsData();
  data.blogs = data.blogs || [];
  const idx = data.blogs.findIndex((b: any) => b.id === savedBlog.id);
  if (idx >= 0) {
    data.blogs[idx] = savedBlog;
  } else {
    data.blogs.unshift(savedBlog);
  }
  writeCmsData(data);

  return res.json({ success: true, blog: savedBlog });
});

// BLOGS (PROTECTED DELETE)
app.delete('/api/cms/blogs/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    return res.status(400).json({ error: 'Invalid blog ID format' });
  }

  if (serverSupabase) {
    try {
      const { error } = await serverSupabase.from('blogs').delete().eq('id', id);
      if (error) {
        console.error('[CMS Blog Delete Error]', error.message);
        return res.status(500).json({ error: 'Failed to delete blog' });
      }
      return res.json({ success: true });
    } catch (err: any) {
      console.error('[CMS Blog Delete Exception]', err);
      return res.status(500).json({ error: 'Failed to delete blog' });
    }
  }

  const data = readCmsData();
  if (data.blogs) {
    data.blogs = data.blogs.filter((b: any) => b.id !== id);
    writeCmsData(data);
  }

  return res.json({ success: true });
});

// COURSES (PUBLIC READ)
app.get('/api/cms/courses', async (req, res) => {
  if (serverSupabase) {
    try {
      const { data, error } = await serverSupabase.from('courses').select('*').order('created_at', { ascending: false });
      if (error) {
        console.error('[CMS Courses Read Error]', error.message);
        return res.status(503).json({ error: 'Database service unavailable' });
      }
      return res.json(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('[CMS Courses Read Exception]', err);
      return res.status(503).json({ error: 'Database service unavailable' });
    }
  }
  const data = readCmsData();
  return res.json(data.courses || []);
});

// COURSES (PROTECTED WRITE)
app.post('/api/cms/courses', requireAdmin, async (req, res) => {
  const course = req.body;
  if (!course || !course.title) {
    return res.status(400).json({ error: 'Invalid course payload' });
  }

  let savedCourse = { ...course };

  if (serverSupabase) {
    try {
      const slug = course.slug || course.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const dbPayload: any = {
        title: course.title,
        slug,
        level: course.level || 'Intermediate',
        category: course.category || 'Data Analytics',
        description: course.description || '',
        thumbnail: course.thumbnail || course.thumbnail_url || '',
        duration: course.duration || '8 weeks',
        lessons_count: course.lessons_count || course.lessonsCount || 10,
        enrolled_count: course.enrolled_count || course.enrolledCount || 0,
        rating: course.rating || 5.0,
        instructor: course.instructor || 'Shivam Singh',
        featured: Boolean(course.featured),
        status: course.status || 'published',
        tags: course.tags || [],
        curriculum: course.curriculum || [],
        updated_at: new Date().toISOString()
      };

      if (isValidUuid(course.id)) {
        dbPayload.id = course.id;
      }

      const { data, error } = await serverSupabase.from('courses').upsert(dbPayload).select().single();
      if (error) {
        console.error('[CMS Course Save Error]', error.message);
        return res.status(500).json({ error: 'Failed to save course' });
      }
      if (data) {
        savedCourse = { ...course, id: data.id };
      }
      return res.json({ success: true, course: savedCourse });
    } catch (err: any) {
      console.error('[CMS Course Save Exception]', err);
      return res.status(500).json({ error: 'Failed to save course' });
    }
  }

  if (!savedCourse.id) savedCourse.id = 'course-' + Date.now();
  const data = readCmsData();
  data.courses = data.courses || [];
  const idx = data.courses.findIndex((c: any) => c.id === savedCourse.id);
  if (idx >= 0) {
    data.courses[idx] = savedCourse;
  } else {
    data.courses.unshift(savedCourse);
  }
  writeCmsData(data);

  return res.json({ success: true, course: savedCourse });
});

// COURSES (PROTECTED DELETE)
app.delete('/api/cms/courses/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    return res.status(400).json({ error: 'Invalid course ID format' });
  }

  if (serverSupabase) {
    try {
      const { error } = await serverSupabase.from('courses').delete().eq('id', id);
      if (error) {
        console.error('[CMS Course Delete Error]', error.message);
        return res.status(500).json({ error: 'Failed to delete course' });
      }
      return res.json({ success: true });
    } catch (err: any) {
      console.error('[CMS Course Delete Exception]', err);
      return res.status(500).json({ error: 'Failed to delete course' });
    }
  }

  const data = readCmsData();
  if (data.courses) {
    data.courses = data.courses.filter((c: any) => c.id !== id);
    writeCmsData(data);
  }

  return res.json({ success: true });
});

// YOUTUBE VIDEOS (PUBLIC READ)
app.get('/api/cms/videos', async (req, res) => {
  if (serverSupabase) {
    try {
      const { data, error } = await serverSupabase.from('videos').select('*').order('created_at', { ascending: false });
      if (error) {
        console.error('[CMS Videos Read Error]', error.message);
        return res.status(503).json({ error: 'Database service unavailable' });
      }
      return res.json(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('[CMS Videos Read Exception]', err);
      return res.status(503).json({ error: 'Database service unavailable' });
    }
  }
  const data = readCmsData();
  return res.json(data.videos || []);
});

// YOUTUBE VIDEOS (PROTECTED WRITE)
app.post('/api/cms/videos', requireAdmin, async (req, res) => {
  const video = req.body;
  if (!video || !video.title) {
    return res.status(400).json({ error: 'Invalid video payload' });
  }

  let savedVideo = { ...video };

  if (serverSupabase) {
    try {
      const dbPayload: any = {
        title: video.title,
        youtube_url: video.youtube_url || video.youtubeUrl || '',
        youtube_id: video.youtube_id || video.youtubeId || '',
        description: video.description || '',
        category: video.category || 'General',
        tags: video.tags || [],
        duration: video.duration || '10:00',
        featured: Boolean(video.featured),
        views_count: video.views_count || video.viewsCount || 0,
        likes_count: video.likes_count || video.likesCount || 0,
        published_at: video.published_at || video.publishedAt || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (isValidUuid(video.id)) {
        dbPayload.id = video.id;
      }

      const { data, error } = await serverSupabase.from('videos').upsert(dbPayload).select().single();
      if (error) {
        console.error('[CMS Video Save Error]', error.message);
        return res.status(500).json({ error: 'Failed to save video' });
      }
      if (data) {
        savedVideo = { ...video, id: data.id };
      }
      return res.json({ success: true, video: savedVideo });
    } catch (err: any) {
      console.error('[CMS Video Save Exception]', err);
      return res.status(500).json({ error: 'Failed to save video' });
    }
  }

  if (!savedVideo.id) savedVideo.id = 'video-' + Date.now();
  const data = readCmsData();
  data.videos = data.videos || [];
  const idx = data.videos.findIndex((v: any) => v.id === savedVideo.id);
  if (idx >= 0) {
    data.videos[idx] = savedVideo;
  } else {
    data.videos.unshift(savedVideo);
  }
  writeCmsData(data);

  return res.json({ success: true, video: savedVideo });
});

// YOUTUBE VIDEOS (PROTECTED DELETE)
app.delete('/api/cms/videos/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    return res.status(400).json({ error: 'Invalid video ID format' });
  }

  if (serverSupabase) {
    try {
      const { error } = await serverSupabase.from('videos').delete().eq('id', id);
      if (error) {
        console.error('[CMS Video Delete Error]', error.message);
        return res.status(500).json({ error: 'Failed to delete video' });
      }
      return res.json({ success: true });
    } catch (err: any) {
      console.error('[CMS Video Delete Exception]', err);
      return res.status(500).json({ error: 'Failed to delete video' });
    }
  }

  const data = readCmsData();
  if (data.videos) {
    data.videos = data.videos.filter((v: any) => v.id !== id);
    writeCmsData(data);
  }

  return res.json({ success: true });
});

// CONTACT MESSAGES (PUBLIC POST / PROTECTED GET)
app.get('/api/cms/messages', requireAdmin, async (req, res) => {
  if (serverSupabase) {
    try {
      const { data, error } = await serverSupabase.from('messages').select('*').order('created_at', { ascending: false });
      if (error) {
        console.error('[CMS Messages Read Error]', error.message);
        return res.status(503).json({ error: 'Database service unavailable' });
      }
      return res.json(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('[CMS Messages Read Exception]', err);
      return res.status(503).json({ error: 'Database service unavailable' });
    }
  }
  const data = readCmsData();
  return res.json(data.messages || []);
});

app.post('/api/cms/messages', contactLimiter, async (req, res) => {
  const { name, email, phone, course_interested, subject, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required.' });
  }

  let savedMsg: any = null;

  if (serverSupabase) {
    try {
      const { data, error } = await serverSupabase.from('messages').insert({
        name,
        email,
        phone: phone || '',
        course_interested: course_interested || '',
        subject: subject || 'Contact Inquiry',
        message,
        status: 'new'
      }).select().single();

      if (error) {
        console.error('[CONTACT] Supabase insert error:', error.message);
        return res.status(503).json({ error: 'Database service unavailable. Unable to send message.' });
      }
      savedMsg = data;
    } catch (err: any) {
      console.error('[CONTACT] Supabase insert exception:', err);
      return res.status(503).json({ error: 'Database service unavailable. Unable to send message.' });
    }
  } else {
    savedMsg = {
      id: 'msg-' + Date.now(),
      name,
      email,
      phone: phone || '',
      course_interested: course_interested || '',
      subject: subject || 'Contact Inquiry',
      message,
      status: 'new',
      created_at: new Date().toISOString()
    };
    const data = readCmsData();
    data.messages = data.messages || [];
    data.messages.unshift(savedMsg);
    writeCmsData(data);
  }

  // Trigger notification email asynchronously
  emailService.sendContactNotification({
    name,
    email,
    phone,
    course_interested,
    subject,
    message
  }).catch((err) => console.error('Failed to dispatch contact enquiry notification email:', err));

  return res.json({ success: true, message: savedMsg });
});

app.post('/api/cms/messages/:id/reply', requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    return res.status(400).json({ success: false, message: 'Invalid message ID format' });
  }
  const { replyText, replySubject } = req.body;

  if (!replyText || !replyText.trim()) {
    return res.status(400).json({ success: false, message: 'Reply text is required.' });
  }

  let recipientEmail = '';
  let finalSubject = replySubject || 'Inquiry Reply';

  if (serverSupabase) {
    try {
      const { data: dbMsg, error: fetchErr } = await serverSupabase
        .from('messages')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (fetchErr || !dbMsg) {
        return res.status(404).json({ success: false, message: 'Enquiry message not found.' });
      }
      recipientEmail = dbMsg.email;
      finalSubject = replySubject || dbMsg.subject || 'Inquiry Reply';
    } catch (err: any) {
      return res.status(500).json({ success: false, message: 'Failed to process reply' });
    }
  } else {
    const localData = readCmsData();
    const targetMsg = (localData.messages || []).find((m: any) => m.id === id);
    if (!targetMsg) {
      return res.status(404).json({ success: false, message: 'Enquiry message not found.' });
    }
    recipientEmail = targetMsg.email;
    finalSubject = replySubject || targetMsg.subject || 'Inquiry Reply';
  }

  const emailRes = await emailService.sendAdminReply(recipientEmail, finalSubject, replyText);

  const updateData = {
    status: 'replied',
    reply_message: replyText,
    replied_at: new Date().toISOString(),
    reply_status: 'sent',
    email_sent_status: emailRes.message || `Reply dispatched to ${recipientEmail}`
  };

  if (serverSupabase) {
    try {
      const { error: updateErr } = await serverSupabase
        .from('messages')
        .update(updateData)
        .eq('id', id);

      if (updateErr) {
        console.error('[Reply DB Update Error]', updateErr.message);
        return res.status(500).json({ success: false, message: 'Failed to update reply status' });
      }
      return res.json({
        success: true,
        message: emailRes.message || `Reply sent to ${recipientEmail}`,
        data: { id, ...updateData }
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: 'Failed to update reply status' });
    }
  }

  const localData = readCmsData();
  localData.messages = localData.messages || [];
  const idx = localData.messages.findIndex((m: any) => m.id === id);
  if (idx >= 0) {
    localData.messages[idx] = { ...localData.messages[idx], ...updateData };
    writeCmsData(localData);
  }

  return res.json({
    success: true,
    message: emailRes.message || `Reply sent to ${recipientEmail}`,
    data: { id, ...updateData }
  });
});

app.patch('/api/cms/messages/:id/status', requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    return res.status(400).json({ error: 'Invalid message ID format' });
  }
  const { status, adminNotes } = req.body;

  if (serverSupabase) {
    try {
      const updatePayload: any = {};
      if (status) updatePayload.status = status;
      if (adminNotes !== undefined) updatePayload.admin_notes = adminNotes;

      const { data, error } = await serverSupabase
        .from('messages')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[Message Status Update Error]', error.message);
        return res.status(500).json({ error: 'Failed to update message status' });
      }

      return res.json({ success: true, message: data });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to update message status' });
    }
  }

  const data = readCmsData();
  data.messages = data.messages || [];
  const target = data.messages.find((m: any) => m.id === id);
  if (target) {
    if (status) target.status = status;
    if (adminNotes !== undefined) target.admin_notes = adminNotes;
    writeCmsData(data);
    return res.json({ success: true, message: target });
  }
  return res.status(404).json({ error: 'Message not found' });
});

app.delete('/api/cms/messages/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    return res.status(400).json({ error: 'Invalid message ID format' });
  }

  if (serverSupabase) {
    try {
      const { error } = await serverSupabase.from('messages').delete().eq('id', id);
      if (error) {
        console.error('[Message Delete Error]', error.message);
        return res.status(500).json({ error: 'Failed to delete message' });
      }
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to delete message' });
    }
  }

  const data = readCmsData();
  if (data.messages) {
    data.messages = data.messages.filter((m: any) => m.id !== id);
    writeCmsData(data);
  }

  return res.json({ success: true });
});

// SUBSCRIBERS (PROTECTED API ENDPOINTS)
app.get('/api/cms/subscribers', requireAdmin, async (req, res) => {
  if (serverSupabase) {
    try {
      const { data, error } = await serverSupabase.from('newsletter').select('*').order('created_at', { ascending: false });
      if (error) {
        console.error('[Subscribers Read Error]', error.message);
        return res.status(503).json({ error: 'Database service unavailable' });
      }
      return res.json(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('[Subscribers Read Exception]', err);
      return res.status(503).json({ error: 'Database service unavailable' });
    }
  }
  const data = readCmsData();
  return res.json(data.subscribers || []);
});

app.post('/api/cms/subscribers', requireAdmin, async (req, res) => {
  const { email } = req.body;
  const cleanEmail = (email || '').trim().toLowerCase();

  if (!cleanEmail || !cleanEmail.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  let subscriberRecord: any = null;

  if (serverSupabase) {
    try {
      const { data: existing, error: checkErr } = await serverSupabase
        .from('newsletter')
        .select('*')
        .ilike('email', cleanEmail)
        .maybeSingle();

      if (checkErr) {
        console.error('[Subscriber Check Error]', checkErr.message);
        return res.status(500).json({ error: 'Failed to save subscriber' });
      }

      if (existing) {
        subscriberRecord = existing;
      } else {
        const { data: inserted, error: insertErr } = await serverSupabase
          .from('newsletter')
          .insert({ email: cleanEmail, status: 'active' })
          .select()
          .single();

        if (insertErr) {
          console.error('[Subscriber Insert Error]', insertErr.message);
          return res.status(500).json({ error: 'Failed to add subscriber' });
        }
        subscriberRecord = inserted;
      }
      return res.json({ success: true, subscriber: subscriberRecord });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to add subscriber' });
    }
  }

  subscriberRecord = {
    id: 'sub-' + Date.now(),
    email: cleanEmail,
    status: 'active',
    created_at: new Date().toISOString()
  };

  const data = readCmsData();
  data.subscribers = data.subscribers || [];
  const idx = data.subscribers.findIndex((s: any) => s.email.toLowerCase() === cleanEmail);
  if (idx >= 0) {
    data.subscribers[idx] = subscriberRecord;
  } else {
    data.subscribers.unshift(subscriberRecord);
  }
  writeCmsData(data);

  return res.json({ success: true, subscriber: subscriberRecord });
});

app.delete('/api/cms/subscribers/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    return res.status(400).json({ error: 'Invalid subscriber ID format' });
  }

  if (serverSupabase) {
    try {
      const { error } = await serverSupabase.from('newsletter').delete().eq('id', id);
      if (error) {
        console.error('[Subscriber Delete Error]', error.message);
        return res.status(500).json({ error: 'Failed to delete subscriber' });
      }
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to delete subscriber' });
    }
  }

  const data = readCmsData();
  if (data.subscribers) {
    data.subscribers = data.subscribers.filter((s: any) => s.id !== id);
    writeCmsData(data);
  }

  return res.json({ success: true });
});

// ==================== EMAIL CAMPAIGNS & DIAGNOSTICS ====================

app.get('/api/admin/email/status', requireAdmin, async (req, res) => {
  const diag = emailService.getDiagnostics();
  if (!diag.GMAIL_CONFIGURED) {
    return res.status(400).json({
      success: false,
      ...emailService.getMissingCredentialsError(),
      ...diag,
      smtpConnected: false
    });
  }

  const verifyRes = await emailService.verifySmtp();
  return res.json({
    success: verifyRes.success,
    ...diag,
    smtpConnected: verifyRes.success,
    smtpMessage: verifyRes.message
  });
});

app.post('/api/admin/email/verify', requireAdmin, async (req, res) => {
  const diag = emailService.getDiagnostics();
  if (!diag.GMAIL_CONFIGURED) {
    return res.status(400).json({
      success: false,
      ...emailService.getMissingCredentialsError(),
      ...diag,
      smtpConnected: false
    });
  }

  const result = await emailService.verifySmtp();
  return res.json({
    ...diag,
    ...result,
    smtpConnected: result.success
  });
});

app.get('/api/admin/email-campaigns/audience-count', requireAdmin, async (req, res) => {
  let count = 0;
  if (serverSupabase) {
    try {
      const { data, error } = await serverSupabase.from('newsletter').select('id').eq('status', 'active');
      if (error) {
        console.error('[Audience Count Error]', error.message);
        return res.status(503).json({ error: 'Database service unavailable' });
      }
      count = data ? data.length : 0;
      return res.json({ success: true, count, providerConfigured: campaignEmailService.isConfigured() });
    } catch (err: any) {
      return res.status(503).json({ error: 'Database service unavailable' });
    }
  }
  const data = readCmsData();
  const subs = data.subscribers || [];
  count = subs.filter((s: any) => s.status === 'active').length;
  return res.json({ success: true, count, providerConfigured: campaignEmailService.isConfigured() });
});

app.get('/api/admin/email-campaigns', requireAdmin, async (req, res) => {
  if (serverSupabase) {
    try {
      const { data, error } = await serverSupabase.from('email_campaigns').select('*').order('created_at', { ascending: false });
      if (error) {
        console.error('[Campaigns Read Error]', error.message);
        return res.status(503).json({ error: 'Database service unavailable' });
      }
      return res.json(data || []);
    } catch (err: any) {
      return res.status(503).json({ error: 'Database service unavailable' });
    }
  }
  const data = readCmsData();
  return res.json(data.campaigns || []);
});

app.get('/api/admin/email-campaigns/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    return res.status(400).json({ error: 'Invalid campaign ID format' });
  }
  if (serverSupabase) {
    try {
      const { data, error } = await serverSupabase.from('email_campaigns').select('*').eq('id', id).maybeSingle();
      if (error) {
        console.error('[Campaign Single Read Error]', error.message);
        return res.status(503).json({ error: 'Database service unavailable' });
      }
      if (data) {
        const { data: recipients } = await serverSupabase.from('email_campaign_recipients').select('*').eq('campaign_id', id);
        return res.json({ ...data, recipients: recipients || [] });
      }
      return res.status(404).json({ error: 'Campaign not found' });
    } catch (err: any) {
      return res.status(503).json({ error: 'Database service unavailable' });
    }
  }
  const data = readCmsData();
  const campaign = (data.campaigns || []).find((c: any) => c.id === id);
  if (campaign) {
    const recipients = (data.campaign_recipients || []).filter((r: any) => r.campaign_id === id);
    return res.json({ ...campaign, recipients });
  }
  return res.status(404).json({ error: 'Campaign not found' });
});

app.post('/api/admin/email-campaigns', requireAdmin, async (req, res) => {
  const payload = req.body;
  if (!payload || !payload.name || !payload.subject || !payload.content) {
    return res.status(400).json({ error: 'Name, subject, and content are required' });
  }

  let savedCampaign = { ...payload };

  if (serverSupabase) {
    try {
      const dbPayload: any = {
        name: payload.name,
        subject: payload.subject,
        preview_text: payload.preview_text || '',
        content: payload.content,
        status: payload.status || 'draft',
        audience_type: payload.audience_type || 'all_active',
        scheduled_at: payload.scheduled_at || null,
        total_recipients: payload.total_recipients || 0,
        successful_count: payload.successful_count || 0,
        failed_count: payload.failed_count || 0,
        updated_at: new Date().toISOString()
      };

      if (isValidUuid(payload.id)) {
        dbPayload.id = payload.id;
      }

      const { data, error } = await serverSupabase.from('email_campaigns').upsert(dbPayload).select().single();
      if (error) {
        console.error('[Campaign Save Error]', error.message);
        return res.status(500).json({ error: 'Failed to save campaign' });
      }
      if (data) {
        savedCampaign = { ...payload, id: data.id };
      }
      return res.json({ success: true, campaign: savedCampaign });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to save campaign' });
    }
  }

  if (!savedCampaign.id) savedCampaign.id = 'camp-' + Date.now();
  const data = readCmsData();
  data.campaigns = data.campaigns || [];
  const idx = data.campaigns.findIndex((c: any) => c.id === savedCampaign.id);
  if (idx >= 0) {
    data.campaigns[idx] = savedCampaign;
  } else {
    data.campaigns.unshift(savedCampaign);
  }
  writeCmsData(data);

  return res.json({ success: true, campaign: savedCampaign });
});

app.patch('/api/admin/email-campaigns/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    return res.status(400).json({ error: 'Invalid campaign ID format' });
  }
  const updates = req.body;
  updates.updated_at = new Date().toISOString();

  if (serverSupabase) {
    try {
      const { data, error } = await serverSupabase.from('email_campaigns').update(updates).eq('id', id).select().single();
      if (error) {
        console.error('[Campaign Update Error]', error.message);
        return res.status(500).json({ error: 'Failed to update campaign' });
      }
      return res.json({ success: true, campaign: data });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to update campaign' });
    }
  }

  const data = readCmsData();
  data.campaigns = data.campaigns || [];
  const idx = data.campaigns.findIndex((c: any) => c.id === id);
  if (idx >= 0) {
    data.campaigns[idx] = { ...data.campaigns[idx], ...updates };
    writeCmsData(data);
  }

  return res.json({ success: true, campaign: data.campaigns[idx] || updates });
});

app.delete('/api/admin/email-campaigns/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    return res.status(400).json({ error: 'Invalid campaign ID format' });
  }

  if (serverSupabase) {
    try {
      const { error } = await serverSupabase.from('email_campaigns').delete().eq('id', id);
      if (error) {
        console.error('[Campaign Delete Error]', error.message);
        return res.status(500).json({ error: 'Failed to delete campaign' });
      }
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to delete campaign' });
    }
  }

  const data = readCmsData();
  if (data.campaigns) {
    data.campaigns = data.campaigns.filter((c: any) => c.id !== id);
    writeCmsData(data);
  }

  return res.json({ success: true });
});

// POST Send Test Email
app.post('/api/admin/email-campaigns/:id/test', requireAdmin, emailTestLimiter, async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    return res.status(400).json({ success: false, message: 'Invalid campaign ID format' });
  }
  const { testEmail } = req.body;

  if (!testEmail || !testEmail.includes('@')) {
    return res.status(400).json({ success: false, message: 'Valid test email is required' });
  }

  let campaign: any = null;

  if (serverSupabase) {
    try {
      const { data: sbCamp, error: campErr } = await serverSupabase.from('email_campaigns').select('*').eq('id', id).maybeSingle();
      if (campErr) {
        console.error('[Test Email DB Error]', campErr.message);
        return res.status(503).json({ success: false, message: 'Database service unavailable' });
      }
      campaign = sbCamp;
    } catch (e: any) {
      console.error('[Test Email DB Exception]', e);
      return res.status(503).json({ success: false, message: 'Database service unavailable' });
    }
  } else {
    const data = readCmsData();
    campaign = (data.campaigns || []).find((c: any) => c.id === id);
  }

  if (!campaign) {
    return res.status(404).json({ success: false, message: 'Campaign not found' });
  }

  const reqProtocol = req.headers['x-forwarded-proto'] || req.protocol;
  const reqHost = req.headers['x-forwarded-host'] || req.headers.host;
  const unsubToken = generateUnsubscribeToken(testEmail);
  const unsubscribeUrl = `${reqProtocol}://${reqHost}/api/newsletter/unsubscribe?token=${unsubToken}`;

  const result = await campaignEmailService.sendTestEmail({
    testEmail,
    subject: campaign.subject,
    previewText: campaign.preview_text,
    contentHtml: campaign.content,
    unsubscribeUrl
  });

  return res.json(result);
});

// POST Send Bulk Campaign to Active Subscribers
app.post('/api/admin/email-campaigns/:id/send', requireAdmin, emailSendLimiter, async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    return res.status(400).json({ success: false, message: 'Invalid campaign ID format' });
  }

  let campaign: any = null;

  if (serverSupabase) {
    try {
      const { data: sbCamp, error: campErr } = await serverSupabase.from('email_campaigns').select('*').eq('id', id).single();
      if (campErr || !sbCamp) {
        console.error('[Campaign Send Error] Campaign query failed:', campErr?.message);
        return res.status(404).json({ success: false, message: 'Campaign record not found' });
      }
      campaign = sbCamp;
    } catch (e: any) {
      console.error('[Campaign Send Error] DB Exception:', e);
      return res.status(503).json({ success: false, message: 'Database service unavailable' });
    }
  } else {
    const data = readCmsData();
    campaign = (data.campaigns || []).find((c: any) => c.id === id);
  }

  if (!campaign) {
    return res.status(404).json({ success: false, message: 'Campaign record not found' });
  }

  if (!campaignEmailService.isConfigured()) {
    return res.status(400).json({
      success: false,
      error: 'Gmail SMTP is not configured',
      details: 'GMAIL_USER or GMAIL_APP_PASSWORD is missing',
      message: 'GMAIL_APP_PASSWORD is not configured in the server environment.'
    });
  }

  let activeSubscribers: any[] = [];
  if (serverSupabase) {
    try {
      const { data: sbSubs, error: subErr } = await serverSupabase.from('newsletter').select('*').eq('status', 'active');
      if (subErr) {
        console.error('[Campaign Send Error] Active subscribers query failed:', subErr.message);
        return res.status(503).json({ success: false, message: 'Database service unavailable' });
      }
      activeSubscribers = sbSubs || [];
    } catch (e: any) {
      console.error('[Campaign Send Error] Subscribers Exception:', e);
      return res.status(503).json({ success: false, message: 'Database service unavailable' });
    }
  } else {
    const data = readCmsData();
    const subs = data.subscribers || [];
    activeSubscribers = subs.filter((s: any) => s.status === 'active');
  }

  if (activeSubscribers.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No active subscribers found in database to receive this campaign.'
    });
  }

  const reqProtocol = req.headers['x-forwarded-proto'] || req.protocol;
  const reqHost = req.headers['x-forwarded-host'] || req.headers.host;
  const baseUrl = `${reqProtocol}://${reqHost}`;

  let successfulCount = 0;
  let failedCount = 0;
  const recipientsLog: any[] = [];

  for (const subscriber of activeSubscribers) {
    const subEmail = subscriber.email;
    const unsubToken = generateUnsubscribeToken(subEmail);
    const unsubUrl = `${baseUrl}/api/newsletter/unsubscribe?token=${unsubToken}`;

    const sendRes = await campaignEmailService.sendSingleRecipient({
      toEmail: subEmail,
      subject: campaign.subject,
      previewText: campaign.preview_text,
      contentHtml: campaign.content,
      unsubscribeUrl: unsubUrl
    });

    const recipientRecord = {
      id: 'rec-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      campaign_id: campaign.id,
      subscriber_id: subscriber.id,
      email: subEmail,
      status: sendRes.success ? 'sent' : 'failed',
      provider_message_id: sendRes.messageId || null,
      error_message: sendRes.error || null,
      sent_at: new Date().toISOString()
    };

    recipientsLog.push(recipientRecord);

    if (sendRes.success) {
      successfulCount++;
    } else {
      failedCount++;
    }
  }

  const sentAt = new Date().toISOString();
  const finalStatus = failedCount === 0 ? 'sent' : (successfulCount > 0 ? 'partially_sent' : 'failed');

  campaign.status = finalStatus;
  campaign.sent_at = sentAt;
  campaign.total_recipients = activeSubscribers.length;
  campaign.successful_count = successfulCount;
  campaign.failed_count = failedCount;
  campaign.updated_at = sentAt;

  if (serverSupabase) {
    try {
      await serverSupabase.from('email_campaigns').upsert(campaign);
      await serverSupabase.from('email_campaign_recipients').insert(recipientsLog);
    } catch (e) {
      console.warn('[Supabase Campaign Send Update Warning]', e);
    }
  } else {
    const data = readCmsData();
    data.campaigns = data.campaigns || [];
    const cIdx = data.campaigns.findIndex((c: any) => c.id === campaign.id);
    if (cIdx >= 0) data.campaigns[cIdx] = campaign;
    data.campaign_recipients = data.campaign_recipients || [];
    data.campaign_recipients.push(...recipientsLog);
    writeCmsData(data);
  }

  return res.json({
    success: true,
    message: `Campaign broadcast completed! ${successfulCount} sent successfully, ${failedCount} failed out of ${activeSubscribers.length} active subscribers.`,
    campaign
  });
});

// ==================== BUSINESS LEADS & LEAD OUTREACH CAMPAIGNS ====================

// --- Supabase-Backed Production CRM Persistence Engine ---
// Primary storage: Supabase PostgreSQL dedicated tables ('leads', 'lead_campaigns', 'campaign_leads')
// Fallback when tables await migration: Supabase PostgreSQL cloud settings table ('crm_leads', 'crm_lead_campaigns', 'crm_campaign_leads')

let crmLeadsTableMigrated = false;
let crmCampaignsTableMigrated = false;

async function getSupabaseCrmLeads(): Promise<any[]> {
  if (!serverSupabase) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Supabase database client is required in production environment.');
    }
    const data = readCmsData();
    return data.leads || [];
  }

  try {
    const { data: dbLeads, error: tblErr } = await serverSupabase.from('leads').select('*').order('created_at', { ascending: false });
    if (!tblErr && Array.isArray(dbLeads)) {
      // If dedicated table is empty and we haven't checked settings migration yet, check settings
      if (dbLeads.length === 0 && !crmLeadsTableMigrated) {
        crmLeadsTableMigrated = true;
        const { data: row } = await serverSupabase.from('settings').select('value').eq('key', 'crm_leads').maybeSingle();
        const settingsLeads = row?.value?.leads;
        if (Array.isArray(settingsLeads) && settingsLeads.length > 0) {
          console.log(`[CRM Auto-Migrate] Found ${settingsLeads.length} leads in settings table. Migrating to dedicated 'leads' table...`);
          const formatted = settingsLeads.map((l: any) => ({
            id: isValidUuid(l.id) ? l.id : crypto.randomUUID(),
            company_name: l.company_name || 'Unknown Company',
            industry: l.industry || '',
            location: l.location || '',
            contact_person: l.contact_person || '',
            email: (l.email || '').trim().toLowerCase(),
            phone: l.phone || '',
            linkedin: l.linkedin || '',
            powerbi_use_case: l.powerbi_use_case || '',
            lead_priority: ['High', 'Medium', 'Low'].includes(l.lead_priority) ? l.lead_priority : 'Medium',
            status: l.status || 'Not Contacted',
            follow_up_date: l.follow_up_date || null,
            notes: l.notes || '',
            created_at: l.created_at || new Date().toISOString(),
            updated_at: l.updated_at || new Date().toISOString()
          }));
          const { error: insErr } = await serverSupabase.from('leads').insert(formatted);
          if (!insErr) {
            console.log(`[CRM Auto-Migrate] Successfully migrated ${formatted.length} leads to dedicated 'leads' table.`);
            return formatted;
          }
        }
      }
      return dbLeads;
    }

    // Dedicated table not yet created/exposed -> read from Supabase settings cloud table
    const { data: row, error: rowErr } = await serverSupabase.from('settings').select('value').eq('key', 'crm_leads').maybeSingle();
    if (!rowErr && row && Array.isArray(row.value?.leads)) {
      return row.value.leads;
    }
    return [];
  } catch (err: any) {
    console.error('[Supabase CRM Leads Read Exception]', err);
    throw new Error('Supabase CRM database unavailable');
  }
}

async function saveSupabaseCrmLeads(leads: any[]): Promise<void> {
  if (!serverSupabase) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Supabase database client is required in production environment.');
    }
    const data = readCmsData();
    data.leads = leads;
    writeCmsData(data);
    return;
  }

  // Ensure all leads have valid UUIDs
  const normalizedLeads = leads.map(l => ({
    ...l,
    id: isValidUuid(l.id) ? l.id : crypto.randomUUID()
  }));

  // 1. Try upserting to dedicated leads table
  try {
    const { error: tblErr } = await serverSupabase.from('leads').upsert(normalizedLeads);
    if (!tblErr) {
      // Also update settings table as backup
      const now = new Date().toISOString();
      await serverSupabase.from('settings').upsert({
        key: 'crm_leads',
        value: { leads: normalizedLeads, updated_at: now },
        updated_at: now
      });
      return;
    }
  } catch (e) {
    // Fall back to settings table
  }

  // 2. Fallback to Supabase settings cloud table
  const now = new Date().toISOString();
  const { error } = await serverSupabase.from('settings').upsert({
    key: 'crm_leads',
    value: { leads: normalizedLeads, updated_at: now },
    updated_at: now
  });
  if (error) {
    console.error('[Supabase Save CRM Leads to Settings Error]', error.message);
    throw new Error(`Failed to persist leads to Supabase: ${error.message}`);
  }
}

async function getSupabaseCrmCampaigns(): Promise<any[]> {
  if (!serverSupabase) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Supabase database client is required in production environment.');
    }
    const data = readCmsData();
    return data.lead_campaigns || [];
  }

  try {
    const { data: dbCamps, error: tblErr } = await serverSupabase.from('lead_campaigns').select('*').order('created_at', { ascending: false });
    if (!tblErr && Array.isArray(dbCamps)) {
      if (dbCamps.length === 0 && !crmCampaignsTableMigrated) {
        crmCampaignsTableMigrated = true;
        const { data: row } = await serverSupabase.from('settings').select('value').eq('key', 'crm_lead_campaigns').maybeSingle();
        const settingsCamps = row?.value?.campaigns;
        if (Array.isArray(settingsCamps) && settingsCamps.length > 0) {
          console.log(`[CRM Auto-Migrate] Found ${settingsCamps.length} campaigns in settings table. Migrating to dedicated 'lead_campaigns' table...`);
          const formatted = settingsCamps.map((c: any) => ({
            id: isValidUuid(c.id) ? c.id : crypto.randomUUID(),
            name: c.name || 'Untitled Campaign',
            campaign_type: 'lead_outreach',
            subject: c.subject || 'Outreach Subject',
            preheader: c.preheader || '',
            html_content: c.html_content || '',
            status: c.status || 'draft',
            total_recipients: c.total_recipients || 0,
            successful_count: c.successful_count || 0,
            failed_count: c.failed_count || 0,
            sent_at: c.sent_at || null,
            created_at: c.created_at || new Date().toISOString(),
            updated_at: c.updated_at || new Date().toISOString()
          }));
          const { error: insErr } = await serverSupabase.from('lead_campaigns').insert(formatted);
          if (!insErr) {
            console.log(`[CRM Auto-Migrate] Successfully migrated ${formatted.length} campaigns to dedicated table.`);
            return formatted;
          }
        }
      }
      return dbCamps;
    }

    const { data: row, error: rowErr } = await serverSupabase.from('settings').select('value').eq('key', 'crm_lead_campaigns').maybeSingle();
    if (!rowErr && row && Array.isArray(row.value?.campaigns)) {
      return row.value.campaigns;
    }
    return [];
  } catch (err: any) {
    console.error('[Supabase CRM Campaigns Read Exception]', err);
    throw new Error('Supabase CRM database unavailable');
  }
}

async function saveSupabaseCrmCampaigns(campaigns: any[]): Promise<void> {
  if (!serverSupabase) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Supabase database client is required in production environment.');
    }
    const data = readCmsData();
    data.lead_campaigns = campaigns;
    writeCmsData(data);
    return;
  }

  const normalizedCampaigns = campaigns.map(c => ({
    ...c,
    id: isValidUuid(c.id) ? c.id : crypto.randomUUID()
  }));

  try {
    const { error: tblErr } = await serverSupabase.from('lead_campaigns').upsert(normalizedCampaigns);
    if (!tblErr) {
      const now = new Date().toISOString();
      await serverSupabase.from('settings').upsert({
        key: 'crm_lead_campaigns',
        value: { campaigns: normalizedCampaigns, updated_at: now },
        updated_at: now
      });
      return;
    }
  } catch (e) {
    // Fall back to settings
  }

  const now = new Date().toISOString();
  const { error } = await serverSupabase.from('settings').upsert({
    key: 'crm_lead_campaigns',
    value: { campaigns: normalizedCampaigns, updated_at: now },
    updated_at: now
  });
  if (error) {
    console.error('[Supabase Save CRM Campaigns to Settings Error]', error.message);
    throw new Error(`Failed to persist campaigns to Supabase: ${error.message}`);
  }
}

async function getSupabaseCrmRecipients(): Promise<any[]> {
  if (!serverSupabase) {
    if (process.env.NODE_ENV === 'production') {
      return [];
    }
    const data = readCmsData();
    return data.campaign_leads || [];
  }

  try {
    const { data, error } = await serverSupabase.from('campaign_leads').select('*').order('created_at', { ascending: false });
    if (!error && Array.isArray(data)) {
      return data;
    }
    const { data: row, error: rowErr } = await serverSupabase.from('settings').select('value').eq('key', 'crm_campaign_leads').maybeSingle();
    if (!rowErr && row && Array.isArray(row.value?.recipients)) {
      return row.value.recipients;
    }
    return [];
  } catch (err: any) {
    console.error('[Supabase CRM Recipients Read Exception]', err);
    return [];
  }
}

async function appendSupabaseCrmRecipients(newRecipients: any[]): Promise<void> {
  if (!newRecipients || newRecipients.length === 0) return;

  const normalizedRecipients = newRecipients.map(r => ({
    ...r,
    id: isValidUuid(r.id) ? r.id : crypto.randomUUID(),
    lead_id: isValidUuid(r.lead_id) ? r.lead_id : null
  }));

  if (!serverSupabase) {
    if (process.env.NODE_ENV !== 'production') {
      const data = readCmsData();
      data.campaign_leads = data.campaign_leads || [];
      data.campaign_leads.push(...normalizedRecipients);
      writeCmsData(data);
    }
    return;
  }

  try {
    const { error: tblErr } = await serverSupabase.from('campaign_leads').insert(normalizedRecipients);
    if (!tblErr) return;
  } catch (e) {
    // Continue to settings fallback
  }

  const existing = await getSupabaseCrmRecipients();
  const combined = [...existing, ...normalizedRecipients];
  const now = new Date().toISOString();
  await serverSupabase.from('settings').upsert({
    key: 'crm_campaign_leads',
    value: { recipients: combined, updated_at: now },
    updated_at: now
  });
}

// ==================== B2B LEAD SEQUENCES PERSISTENCE HELPERS ====================

async function getSupabaseLeadSequences(): Promise<any[]> {
  if (!serverSupabase) {
    if (process.env.NODE_ENV === 'production') {
      return [];
    }
    const data = readCmsData();
    return data.lead_sequences || [];
  }

  try {
    const { data: dbSeqs, error: tblErr } = await serverSupabase.from('lead_sequences').select('*').order('created_at', { ascending: false });
    if (!tblErr && Array.isArray(dbSeqs) && dbSeqs.length > 0) {
      return dbSeqs;
    }

    const { data: row, error: rowErr } = await serverSupabase.from('settings').select('value').eq('key', 'crm_lead_sequences').maybeSingle();
    if (!rowErr && row && Array.isArray(row.value?.sequences)) {
      return row.value.sequences;
    }
    return [];
  } catch (err: any) {
    console.error('[Supabase Lead Sequences Read Exception]', err);
    return [];
  }
}

async function saveSupabaseLeadSequences(sequences: any[]): Promise<void> {
  if (!serverSupabase) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Supabase database client is required in production environment.');
    }
    const data = readCmsData();
    data.lead_sequences = sequences;
    writeCmsData(data);
    return;
  }

  const normalizedSequences = sequences.map(s => ({
    ...s,
    id: isValidUuid(s.id) ? s.id : crypto.randomUUID()
  }));

  try {
    const { error: tblErr } = await serverSupabase.from('lead_sequences').upsert(normalizedSequences);
    if (!tblErr) {
      const now = new Date().toISOString();
      await serverSupabase.from('settings').upsert({
        key: 'crm_lead_sequences',
        value: { sequences: normalizedSequences, updated_at: now },
        updated_at: now
      });
      return;
    }
  } catch (e) {
    // Fall back to settings
  }

  const now = new Date().toISOString();
  const { error } = await serverSupabase.from('settings').upsert({
    key: 'crm_lead_sequences',
    value: { sequences: normalizedSequences, updated_at: now },
    updated_at: now
  });
  if (error) {
    console.error('[Supabase Save CRM Sequences to Settings Error]', error.message);
    throw new Error(`Failed to persist sequences to Supabase: ${error.message}`);
  }
}

async function getSupabaseSequenceSteps(): Promise<any[]> {
  if (!serverSupabase) {
    if (process.env.NODE_ENV === 'production') {
      return [];
    }
    const data = readCmsData();
    return data.sequence_steps || [];
  }

  try {
    const { data: dbSteps, error: tblErr } = await serverSupabase.from('sequence_steps').select('*').order('step_number', { ascending: true });
    if (!tblErr && Array.isArray(dbSteps) && dbSteps.length > 0) {
      return dbSteps;
    }

    const { data: row, error: rowErr } = await serverSupabase.from('settings').select('value').eq('key', 'crm_sequence_steps').maybeSingle();
    if (!rowErr && row && Array.isArray(row.value?.steps)) {
      return row.value.steps;
    }
    return [];
  } catch (err: any) {
    console.error('[Supabase Sequence Steps Read Exception]', err);
    return [];
  }
}

async function saveSupabaseSequenceSteps(steps: any[]): Promise<void> {
  if (!serverSupabase) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Supabase database client is required in production environment.');
    }
    const data = readCmsData();
    data.sequence_steps = steps;
    writeCmsData(data);
    return;
  }

  const normalizedSteps = steps.map(s => ({
    ...s,
    id: isValidUuid(s.id) ? s.id : crypto.randomUUID(),
    sequence_id: isValidUuid(s.sequence_id) ? s.sequence_id : s.sequence_id
  }));

  try {
    const { error: tblErr } = await serverSupabase.from('sequence_steps').upsert(normalizedSteps);
    if (!tblErr) {
      const now = new Date().toISOString();
      await serverSupabase.from('settings').upsert({
        key: 'crm_sequence_steps',
        value: { steps: normalizedSteps, updated_at: now },
        updated_at: now
      });
      return;
    }
  } catch (e) {
    // Fall back to settings
  }

  const now = new Date().toISOString();
  const { error } = await serverSupabase.from('settings').upsert({
    key: 'crm_sequence_steps',
    value: { steps: normalizedSteps, updated_at: now },
    updated_at: now
  });
  if (error) {
    console.error('[Supabase Save CRM Sequence Steps Error]', error.message);
    throw new Error(`Failed to persist sequence steps to Supabase: ${error.message}`);
  }
}

async function getSupabaseSequenceLeads(): Promise<any[]> {
  if (!serverSupabase) {
    if (process.env.NODE_ENV === 'production') {
      return [];
    }
    const data = readCmsData();
    return data.sequence_leads || [];
  }

  try {
    const { data: dbLeads, error: tblErr } = await serverSupabase.from('sequence_leads').select('*').order('created_at', { ascending: false });
    if (!tblErr && Array.isArray(dbLeads) && dbLeads.length > 0) {
      return dbLeads;
    }

    const { data: row, error: rowErr } = await serverSupabase.from('settings').select('value').eq('key', 'crm_sequence_leads').maybeSingle();
    if (!rowErr && row && Array.isArray(row.value?.sequence_leads)) {
      return row.value.sequence_leads;
    }
    return [];
  } catch (err: any) {
    console.error('[Supabase Sequence Leads Read Exception]', err);
    return [];
  }
}

async function saveSupabaseSequenceLeads(sequenceLeads: any[]): Promise<void> {
  if (!serverSupabase) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Supabase database client is required in production environment.');
    }
    const data = readCmsData();
    data.sequence_leads = sequenceLeads;
    writeCmsData(data);
    return;
  }

  const normalizedSeqLeads = sequenceLeads.map(sl => ({
    ...sl,
    id: isValidUuid(sl.id) ? sl.id : crypto.randomUUID(),
    sequence_id: isValidUuid(sl.sequence_id) ? sl.sequence_id : sl.sequence_id,
    lead_id: isValidUuid(sl.lead_id) ? sl.lead_id : sl.lead_id
  }));

  try {
    const { error: tblErr } = await serverSupabase.from('sequence_leads').upsert(normalizedSeqLeads);
    if (!tblErr) {
      const now = new Date().toISOString();
      await serverSupabase.from('settings').upsert({
        key: 'crm_sequence_leads',
        value: { sequence_leads: normalizedSeqLeads, updated_at: now },
        updated_at: now
      });
      return;
    }
  } catch (e) {
    // Fall back to settings
  }

  const now = new Date().toISOString();
  const { error } = await serverSupabase.from('settings').upsert({
    key: 'crm_sequence_leads',
    value: { sequence_leads: normalizedSeqLeads, updated_at: now },
    updated_at: now
  });
  if (error) {
    console.error('[Supabase Save CRM Sequence Leads Error]', error.message);
    throw new Error(`Failed to persist sequence leads to Supabase: ${error.message}`);
  }
}

async function getSupabaseSequenceDeliveries(): Promise<any[]> {
  if (!serverSupabase) {
    if (process.env.NODE_ENV === 'production') {
      return [];
    }
    const data = readCmsData();
    return data.sequence_deliveries || [];
  }

  try {
    const { data: dbDelivs, error: tblErr } = await serverSupabase.from('sequence_deliveries').select('*').order('sent_at', { ascending: false });
    if (!tblErr && Array.isArray(dbDelivs)) {
      return dbDelivs;
    }

    const { data: row, error: rowErr } = await serverSupabase.from('settings').select('value').eq('key', 'crm_sequence_deliveries').maybeSingle();
    if (!rowErr && row && Array.isArray(row.value?.deliveries)) {
      return row.value.deliveries;
    }
    return [];
  } catch (err: any) {
    console.error('[Supabase Sequence Deliveries Read Exception]', err);
    return [];
  }
}

async function appendSupabaseSequenceDeliveries(newDeliveries: any[]): Promise<void> {
  if (!newDeliveries || newDeliveries.length === 0) return;

  const normalized = newDeliveries.map(d => ({
    ...d,
    id: isValidUuid(d.id) ? d.id : crypto.randomUUID()
  }));

  if (!serverSupabase) {
    if (process.env.NODE_ENV !== 'production') {
      const data = readCmsData();
      data.sequence_deliveries = data.sequence_deliveries || [];
      data.sequence_deliveries.push(...normalized);
      writeCmsData(data);
    }
    return;
  }

  try {
    const { error: tblErr } = await serverSupabase.from('sequence_deliveries').insert(normalized);
    if (!tblErr) return;
  } catch (e) {
    // Continue to settings
  }

  const existing = await getSupabaseSequenceDeliveries();
  const combined = [...existing, ...normalized];
  const now = new Date().toISOString();
  await serverSupabase.from('settings').upsert({
    key: 'crm_sequence_deliveries',
    value: { deliveries: combined, updated_at: now },
    updated_at: now
  });
}

// Ensure default sequence exists on initialization
async function ensureDefaultLeadSequence(): Promise<void> {
  try {
    const sequences = await getSupabaseLeadSequences();
    if (sequences.length === 0) {
      const defaultSequenceId = 'c0000000-0000-0000-0000-000000000001';
      const now = new Date().toISOString();
      const defaultSeq = {
        id: defaultSequenceId,
        name: 'Power BI Outreach — 14 Day',
        description: 'Multi-stage enterprise outreach sequence designed for manufacturing and distribution leaders.',
        status: 'Active',
        created_at: now,
        updated_at: now
      };

      const defaultSteps = [
        {
          id: 'c0000000-0001-0000-0000-000000000001',
          sequence_id: defaultSequenceId,
          step_number: 1,
          delay_days: 0,
          subject: 'Power BI Analytics for {{company_name}}',
          preheader: 'Automate your operational MIS & reporting with Power BI',
          html_content: `<h2>Hello {{contact_person}},</h2>
<p>I noticed <strong>{{company_name}}</strong> operates in the {{industry}} space.</p>
<p>Based on your business scale in {{location}}, a dedicated Power BI dashboard tailored for <strong>{{powerbi_use_case}}</strong> can eliminate manual Excel consolidation and deliver executive clarity in real time.</p>
<p><a href="https://probitian.ai.studio/contact" class="btn-cta">Schedule Power BI Consultation</a></p>
<p>Best regards,<br/><strong>Shivam Baghel</strong><br/>ProBitian Analytics</p>`,
          enabled: true,
          created_at: now,
          updated_at: now
        },
        {
          id: 'c0000000-0001-0000-0000-000000000002',
          sequence_id: defaultSequenceId,
          step_number: 2,
          delay_days: 3,
          subject: 'Following up — Power BI for {{company_name}}',
          preheader: 'Quick follow-up regarding automated analytics for {{company_name}}',
          html_content: `<h2>Hi {{contact_person}},</h2>
<p>Following up on my previous note regarding <strong>{{company_name}}</strong>'s analytics workflow in {{location}}.</p>
<p>We specialize in turning complex multi-source data into real-time Power BI executive dashboards for {{industry}} organizations — specifically around <strong>{{powerbi_use_case}}</strong>.</p>
<p>Would you have 10 minutes this week for a brief walkthrough of live enterprise dashboards?</p>
<p><a href="https://probitian.ai.studio/projects" class="btn-cta">Explore Live Portfolio</a> &nbsp; <a href="https://probitian.ai.studio/contact" class="btn-cta" style="background-color: #0f172a !important;">Book Meeting</a></p>
<p>Regards,<br/><strong>Shivam Baghel</strong><br/>ProBitian Analytics</p>`,
          enabled: true,
          created_at: now,
          updated_at: now
        },
        {
          id: 'c0000000-0001-0000-0000-000000000003',
          sequence_id: defaultSequenceId,
          step_number: 3,
          delay_days: 7,
          subject: 'A quick Power BI idea for {{company_name}}',
          preheader: 'Practical architecture for {{powerbi_use_case}}',
          html_content: `<h2>Hello {{contact_person}},</h2>
<p>I wanted to share a practical insight regarding <strong>{{powerbi_use_case}}</strong> for companies in {{industry}}.</p>
<p>Most leadership teams spend 15+ hours weekly consolidating departmental sheets. Our automated Power BI pipeline connects directly to your databases, ERP, and operations data to deliver instant KPI tracking without manual overhead.</p>
<p><a href="https://probitian.ai.studio/contact" class="btn-cta">Request Custom Demo</a></p>
<p>Best,<br/><strong>Shivam Baghel</strong><br/>ProBitian Analytics</p>`,
          enabled: true,
          created_at: now,
          updated_at: now
        },
        {
          id: 'c0000000-0001-0000-0000-000000000004',
          sequence_id: defaultSequenceId,
          step_number: 4,
          delay_days: 14,
          subject: 'Closing the loop — {{company_name}}',
          preheader: 'Final follow-up regarding Power BI initiatives for {{company_name}}',
          html_content: `<h2>Hi {{contact_person}},</h2>
<p>I understand timing is everything and you are likely focused on other high priorities at <strong>{{company_name}}</strong>.</p>
<p>I will pause outreach for now. Whenever you are ready to explore Power BI solutions or automate <strong>{{powerbi_use_case}}</strong>, feel free to reach out directly.</p>
<p><a href="https://probitian.ai.studio/" style="color:#7c3aed;font-weight:bold;">Visit ProBitian</a> &bull; <a href="https://probitian.ai.studio/contact" style="color:#7c3aed;font-weight:bold;">Contact Shivam</a></p>
<p>Wishing you and the team at {{company_name}} continued success!</p>
<p>Warm regards,<br/><strong>Shivam Baghel</strong><br/>ProBitian Analytics</p>`,
          enabled: true,
          created_at: now,
          updated_at: now
        }
      ];

      await saveSupabaseLeadSequences([defaultSeq]);
      await saveSupabaseSequenceSteps(defaultSteps);
      console.log('[Lead Sequences] Initialized default Power BI Outreach Sequence');
    }
  } catch (err: any) {
    console.warn('[ensureDefaultLeadSequence Warning]', err?.message || err);
  }
}


// GET All Leads with optional search and filters
app.get('/api/admin/leads', requireAdmin, async (req, res) => {
  const { search, status, lead_priority, industry, follow_up } = req.query;

  try {
    let leads: any[] = [];
    if (serverSupabase) {
      // First try dedicated table with SQL filter
      try {
        let query = serverSupabase.from('leads').select('*').order('created_at', { ascending: false });
        if (status && typeof status === 'string' && status !== 'all') {
          query = query.eq('status', status);
        }
        if (lead_priority && typeof lead_priority === 'string' && lead_priority !== 'all') {
          query = query.eq('lead_priority', lead_priority);
        }
        if (industry && typeof industry === 'string' && industry !== 'all') {
          query = query.ilike('industry', `%${industry}%`);
        }
        if (search && typeof search === 'string' && search.trim()) {
          const term = search.trim();
          query = query.or(`company_name.ilike.%${term}%,contact_person.ilike.%${term}%,email.ilike.%${term}%,powerbi_use_case.ilike.%${term}%,location.ilike.%${term}%`);
        }
        const { data, error } = await query;
        if (!error && Array.isArray(data)) {
          leads = data;
        } else {
          leads = await getSupabaseCrmLeads();
        }
      } catch (e) {
        leads = await getSupabaseCrmLeads();
      }
    } else {
      const data = readCmsData();
      leads = data.leads || [];
    }

    // Apply memory/json filters if retrieved via settings or dev cache
    if (status && typeof status === 'string' && status !== 'all') {
      leads = leads.filter((l: any) => l.status === status);
    }
    if (lead_priority && typeof lead_priority === 'string' && lead_priority !== 'all') {
      leads = leads.filter((l: any) => l.lead_priority === lead_priority);
    }
    if (industry && typeof industry === 'string' && industry !== 'all') {
      const ind = industry.toLowerCase();
      leads = leads.filter((l: any) => l.industry && l.industry.toLowerCase().includes(ind));
    }
    if (search && typeof search === 'string' && search.trim()) {
      const s = search.trim().toLowerCase();
      leads = leads.filter((l: any) =>
        (l.company_name && l.company_name.toLowerCase().includes(s)) ||
        (l.contact_person && l.contact_person.toLowerCase().includes(s)) ||
        (l.email && l.email.toLowerCase().includes(s)) ||
        (l.industry && l.industry.toLowerCase().includes(s)) ||
        (l.powerbi_use_case && l.powerbi_use_case.toLowerCase().includes(s)) ||
        (l.location && l.location.toLowerCase().includes(s))
      );
    }

    if (follow_up && typeof follow_up === 'string') {
      const todayStr = new Date().toISOString().split('T')[0];
      if (follow_up === 'today') {
        leads = leads.filter((l: any) => l.follow_up_date === todayStr);
      } else if (follow_up === 'overdue') {
        leads = leads.filter((l: any) => l.follow_up_date && l.follow_up_date < todayStr && l.status !== 'Converted' && l.status !== 'Not Interested');
      } else if (follow_up === 'upcoming') {
        leads = leads.filter((l: any) => l.follow_up_date && l.follow_up_date > todayStr);
      } else if (follow_up === 'none') {
        leads = leads.filter((l: any) => !l.follow_up_date);
      }
    }

    return res.json(leads);
  } catch (err: any) {
    console.error('[GET /api/admin/leads Error]', err);
    return res.status(503).json({ error: 'Database service unavailable' });
  }
});

// GET Single Lead with Outreach History
app.get('/api/admin/leads/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    return res.status(400).json({ error: 'Invalid lead ID format' });
  }

  try {
    let lead: any = null;
    let outreachHistory: any[] = [];

    if (serverSupabase) {
      try {
        const { data: dbLead, error: leadErr } = await serverSupabase.from('leads').select('*').eq('id', id).single();
        if (!leadErr && dbLead) {
          lead = dbLead;
          const { data: hist } = await serverSupabase
            .from('campaign_leads')
            .select('*, lead_campaigns(name, subject, sent_at)')
            .eq('lead_id', id)
            .order('created_at', { ascending: false });
          outreachHistory = hist || [];
        }
      } catch (e) {
        // Fallback to settings
      }
    }

    if (!lead) {
      const allLeads = await getSupabaseCrmLeads();
      lead = allLeads.find((l: any) => l.id === id);
      if (!lead) {
        return res.status(404).json({ error: 'Lead not found' });
      }

      const allRecipients = await getSupabaseCrmRecipients();
      const allCampaigns = await getSupabaseCrmCampaigns();
      const campaignMap = new Map(allCampaigns.map(c => [c.id, { name: c.name, subject: c.subject, sent_at: c.sent_at }]));

      outreachHistory = allRecipients
        .filter((cl: any) => cl.lead_id === id || (cl.lead_email && cl.lead_email.toLowerCase() === lead.email.toLowerCase()))
        .map(cl => ({
          ...cl,
          lead_campaigns: campaignMap.get(cl.campaign_id) || null
        }));
    }

    return res.json({ ...lead, outreach_history: outreachHistory });
  } catch (err: any) {
    console.error('[GET /api/admin/leads/:id Error]', err);
    return res.status(503).json({ error: 'Database service unavailable' });
  }
});

// POST Save / Create / Update Single Lead
app.post('/api/admin/leads', requireAdmin, async (req, res) => {
  const payload = req.body;
  if (!payload || !payload.company_name || !payload.email) {
    return res.status(400).json({ error: 'Company Name and Email are required.' });
  }

  const cleanEmail = payload.email.trim().toLowerCase();
  const now = new Date().toISOString();

  // If this is a new lead (no ID provided), check for existing duplicate email
  if (!payload.id) {
    try {
      const existingLeads = await getSupabaseCrmLeads();
      const duplicate = existingLeads.find((l: any) => l.email && l.email.toLowerCase() === cleanEmail);
      if (duplicate && !payload.allowUpdate) {
        return res.status(400).json({
          error: `A lead with email "${cleanEmail}" already exists (${duplicate.company_name}).`,
          existingLeadId: duplicate.id
        });
      }
    } catch (e) {
      // Continue
    }
  }

  const leadRecord = {
    company_name: payload.company_name.trim(),
    industry: (payload.industry || '').trim(),
    location: (payload.location || '').trim(),
    contact_person: (payload.contact_person || '').trim(),
    email: cleanEmail,
    phone: (payload.phone || '').trim(),
    linkedin: (payload.linkedin || '').trim(),
    powerbi_use_case: (payload.powerbi_use_case || '').trim(),
    lead_priority: ['High', 'Medium', 'Low'].includes(payload.lead_priority) ? payload.lead_priority : 'Medium',
    status: payload.status || 'Not Contacted',
    follow_up_date: payload.follow_up_date || null,
    notes: (payload.notes || '').trim(),
    updated_at: now
  };

  let leadId = isValidUuid(payload.id) ? payload.id : crypto.randomUUID();

  if (serverSupabase) {
    try {
      const dbPayload: any = { ...leadRecord, id: leadId };
      const { data, error } = await serverSupabase.from('leads').upsert(dbPayload).select().single();
      if (!error && data) {
        return res.json({ success: true, lead: data });
      }
    } catch (err: any) {
      // Continue to Supabase settings persistence
    }
  }

  try {
    const leads = await getSupabaseCrmLeads();
    const idx = leads.findIndex((l: any) => l.id === leadId);
    let savedLead: any;
    if (idx >= 0) {
      savedLead = { ...leads[idx], ...leadRecord, id: leadId, updated_at: now };
      leads[idx] = savedLead;
    } else {
      savedLead = { id: leadId, created_at: now, ...leadRecord };
      leads.unshift(savedLead);
    }
    await saveSupabaseCrmLeads(leads);
    return res.json({ success: true, lead: savedLead });
  } catch (err: any) {
    console.error('[POST /api/admin/leads Error]', err);
    return res.status(500).json({ error: 'Failed to persist lead to Supabase database' });
  }
});

// POST Batch Import Leads (CSV Import with Validation & Duplicate Prevention)
app.post('/api/admin/leads/import', requireAdmin, async (req, res) => {
  const { leads, skipDuplicates = true, updateDuplicates = false } = req.body || {};

  if (!Array.isArray(leads) || leads.length === 0) {
    return res.status(400).json({ error: 'No lead records provided for import.' });
  }

  const validStatuses = [
    'Not Contacted', 'Contacted', 'Opened', 'Replied', 'Interested',
    'Demo Requested', 'Proposal Sent', 'Converted', 'Not Interested', 'Bounced', 'Do Not Contact'
  ];
  const validPriorities = ['High', 'Medium', 'Low'];

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const now = new Date().toISOString();

  const validatedLeads: any[] = [];
  const errors: { row: number; reason: string; email?: string }[] = [];
  const seenBatchEmails = new Set<string>();

  for (let i = 0; i < leads.length; i++) {
    const raw = leads[i];
    const rowNum = i + 1;

    const company_name = (raw.company_name || raw['Company Name'] || raw.company || '').trim();
    const rawEmail = (raw.email || raw['Email'] || raw['Contact Email'] || '').trim().toLowerCase();

    if (!company_name) {
      errors.push({ row: rowNum, reason: 'Missing Company Name', email: rawEmail });
      continue;
    }
    if (!rawEmail || !emailRegex.test(rawEmail)) {
      errors.push({ row: rowNum, reason: 'Invalid or missing Email address', email: rawEmail });
      continue;
    }

    if (seenBatchEmails.has(rawEmail)) {
      errors.push({ row: rowNum, reason: 'Duplicate email within import file', email: rawEmail });
      continue;
    }
    seenBatchEmails.add(rawEmail);

    let priority = (raw.lead_priority || raw.priority || raw['Priority'] || raw['Lead Priority'] || 'Medium').trim();
    priority = priority.charAt(0).toUpperCase() + priority.slice(1).toLowerCase();
    if (!validPriorities.includes(priority)) priority = 'Medium';

    let status = (raw.status || raw['Status'] || raw['Lead Status'] || 'Not Contacted').trim();
    if (!validStatuses.includes(status)) status = 'Not Contacted';

    let follow_up_date = raw.follow_up_date || raw['Follow-up Date'] || raw['Followup Date'] || null;
    if (follow_up_date && isNaN(Date.parse(follow_up_date))) {
      follow_up_date = null;
    }

    validatedLeads.push({
      company_name,
      industry: (raw.industry || raw['Industry'] || '').trim(),
      location: (raw.location || raw['Location'] || raw.city || '').trim(),
      contact_person: (raw.contact_person || raw['Contact Person'] || raw['Name'] || raw.name || '').trim(),
      email: rawEmail,
      phone: (raw.phone || raw['Phone'] || raw['Mobile'] || '').trim(),
      linkedin: (raw.linkedin || raw['LinkedIn'] || raw['Linkedin URL'] || '').trim(),
      powerbi_use_case: (raw.powerbi_use_case || raw['Power BI Use Case'] || raw['Use Case'] || '').trim(),
      lead_priority: priority,
      status,
      follow_up_date,
      notes: (raw.notes || raw['Notes'] || '').trim(),
      created_at: now,
      updated_at: now
    });
  }

  let importedCount = 0;
  let skippedCount = 0;
  let updatedCount = 0;

  try {
    const existingLeads = await getSupabaseCrmLeads();
    const existingEmailMap = new Map<string, any>();
    existingLeads.forEach(l => {
      if (l.email) existingEmailMap.set(l.email.toLowerCase(), l);
    });

    const toInsert: any[] = [];
    const updatedList = [...existingLeads];

    for (const lead of validatedLeads) {
      const existing = existingEmailMap.get(lead.email);
      if (existing) {
        if (updateDuplicates) {
          const idx = updatedList.findIndex(l => l.id === existing.id);
          if (idx >= 0) {
            updatedList[idx] = { ...existing, ...lead, id: existing.id, updated_at: now };
          }
          updatedCount++;
        } else if (skipDuplicates) {
          skippedCount++;
        }
      } else {
        const newId = crypto.randomUUID();
        const newLead = { id: newId, ...lead };
        toInsert.push(newLead);
        updatedList.unshift(newLead);
        importedCount++;
      }
    }

    await saveSupabaseCrmLeads(updatedList);

    // Try also persisting to dedicated table if available
    if (serverSupabase && toInsert.length > 0) {
      try {
        await serverSupabase.from('leads').insert(toInsert.map(l => ({ ...l, id: isValidUuid(l.id) ? l.id : crypto.randomUUID() })));
      } catch (e) {
        // Handled in settings
      }
    }

    return res.json({
      success: true,
      totalProvided: leads.length,
      importedCount,
      skippedCount,
      updatedCount,
      invalidCount: errors.length,
      errors: errors.slice(0, 50)
    });
  } catch (err: any) {
    console.error('[POST /api/admin/leads/import Error]', err);
    return res.status(500).json({ error: 'Database error importing leads.' });
  }
});

// PATCH Quick Update Lead Status / Follow-up / Notes
app.patch('/api/admin/leads/:id/status', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status, follow_up_date, notes, lead_priority } = req.body || {};

  if (!isValidId(id)) {
    return res.status(400).json({ error: 'Invalid lead ID format' });
  }

  const updates: any = { updated_at: new Date().toISOString() };
  if (status) updates.status = status;
  if (follow_up_date !== undefined) updates.follow_up_date = follow_up_date || null;
  if (notes !== undefined) updates.notes = notes;
  if (lead_priority) updates.lead_priority = lead_priority;

  if (serverSupabase) {
    try {
      const { data, error } = await serverSupabase.from('leads').update(updates).eq('id', id).select().single();
      if (!error && data) {
        return res.json({ success: true, lead: data });
      }
    } catch (e) {
      // Continue to settings
    }
  }

  try {
    const leads = await getSupabaseCrmLeads();
    const idx = leads.findIndex((l: any) => l.id === id);
    if (idx >= 0) {
      leads[idx] = { ...leads[idx], ...updates };
      await saveSupabaseCrmLeads(leads);
      return res.json({ success: true, lead: leads[idx] });
    }
    return res.status(404).json({ error: 'Lead not found' });
  } catch (err: any) {
    console.error('[PATCH /api/admin/leads/:id/status Error]', err);
    return res.status(500).json({ error: 'Failed to update lead in database' });
  }
});

// DELETE Single Lead
app.delete('/api/admin/leads/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    return res.status(400).json({ error: 'Invalid lead ID format' });
  }

  if (serverSupabase) {
    try {
      await serverSupabase.from('leads').delete().eq('id', id);
    } catch (e) {
      // Handled in settings
    }
  }

  try {
    const leads = await getSupabaseCrmLeads();
    const filtered = leads.filter((l: any) => l.id !== id);
    await saveSupabaseCrmLeads(filtered);
    return res.json({ success: true });
  } catch (err: any) {
    console.error('[DELETE /api/admin/leads/:id Error]', err);
    return res.status(500).json({ error: 'Failed to delete lead from database' });
  }
});

// DELETE Batch Leads
app.post('/api/admin/leads/batch-delete', requireAdmin, async (req, res) => {
  const { ids } = req.body || {};
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Array of lead IDs is required' });
  }

  if (serverSupabase) {
    try {
      await serverSupabase.from('leads').delete().in('id', ids);
    } catch (e) {
      // Handled in settings
    }
  }

  try {
    const leads = await getSupabaseCrmLeads();
    const idSet = new Set(ids);
    const filtered = leads.filter((l: any) => !idSet.has(l.id));
    await saveSupabaseCrmLeads(filtered);
    return res.json({ success: true, deletedCount: ids.length });
  } catch (err: any) {
    console.error('[POST /api/admin/leads/batch-delete Error]', err);
    return res.status(500).json({ error: 'Failed to delete leads from database' });
  }
});

// --- LEAD OUTREACH CAMPAIGNS API ---

// GET All Lead Campaigns
app.get('/api/admin/lead-campaigns', requireAdmin, async (req, res) => {
  try {
    const campaigns = await getSupabaseCrmCampaigns();
    return res.json(campaigns);
  } catch (err: any) {
    console.error('[GET /api/admin/lead-campaigns Error]', err);
    return res.status(503).json({ error: 'Database service unavailable' });
  }
});

// GET Single Lead Campaign with detailed recipient log
app.get('/api/admin/lead-campaigns/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    return res.status(400).json({ error: 'Invalid campaign ID format' });
  }

  try {
    let campaign: any = null;
    let recipients: any[] = [];

    if (serverSupabase) {
      try {
        const { data: dbCamp, error: cErr } = await serverSupabase.from('lead_campaigns').select('*').eq('id', id).single();
        if (!cErr && dbCamp) {
          campaign = dbCamp;
          const { data: rList } = await serverSupabase
            .from('campaign_leads')
            .select('*, leads(company_name, contact_person, email, industry, status, lead_priority)')
            .eq('campaign_id', id)
            .order('created_at', { ascending: false });
          recipients = rList || [];
        }
      } catch (e) {
        // Fallback to settings
      }
    }

    if (!campaign) {
      const allCampaigns = await getSupabaseCrmCampaigns();
      campaign = allCampaigns.find((c: any) => c.id === id);
      if (!campaign) {
        return res.status(404).json({ error: 'Lead campaign not found' });
      }

      const allRecipients = await getSupabaseCrmRecipients();
      const allLeads = await getSupabaseCrmLeads();
      const leadMap = new Map(allLeads.map(l => [l.id, l]));

      recipients = allRecipients
        .filter((cl: any) => cl.campaign_id === id)
        .map(cl => ({
          ...cl,
          leads: leadMap.get(cl.lead_id) || {
            company_name: cl.lead_company,
            email: cl.lead_email
          }
        }));
    }

    return res.json({ ...campaign, recipients });
  } catch (err: any) {
    console.error('[GET /api/admin/lead-campaigns/:id Error]', err);
    return res.status(503).json({ error: 'Database service unavailable' });
  }
});

// POST Save / Create / Update Lead Campaign
app.post('/api/admin/lead-campaigns', requireAdmin, async (req, res) => {
  const payload = req.body;
  if (!payload || !payload.name || !payload.subject || !payload.html_content) {
    return res.status(400).json({ error: 'Campaign Name, Subject line, and Email Content are required.' });
  }

  const now = new Date().toISOString();
  let campaignId = isValidUuid(payload.id) ? payload.id : crypto.randomUUID();
  const campaignRecord: any = {
    name: payload.name.trim(),
    campaign_type: 'lead_outreach',
    subject: payload.subject.trim(),
    preheader: (payload.preheader || '').trim(),
    html_content: payload.html_content,
    status: payload.status || 'draft',
    total_recipients: payload.total_recipients || 0,
    successful_count: payload.successful_count || 0,
    failed_count: payload.failed_count || 0,
    updated_at: now
  };

  if (serverSupabase) {
    try {
      const dbPayload: any = { ...campaignRecord, id: campaignId };
      const { data, error } = await serverSupabase.from('lead_campaigns').upsert(dbPayload).select().single();
      if (!error && data) {
        return res.json({ success: true, campaign: data });
      }
    } catch (err: any) {
      // Continue to settings
    }
  }

  try {
    const campaigns = await getSupabaseCrmCampaigns();
    const idx = campaigns.findIndex((c: any) => c.id === campaignId);
    let savedCampaign: any;
    if (idx >= 0) {
      savedCampaign = { ...campaigns[idx], ...campaignRecord, id: campaignId, updated_at: now };
      campaigns[idx] = savedCampaign;
    } else {
      savedCampaign = { id: campaignId, created_at: now, ...campaignRecord };
      campaigns.unshift(savedCampaign);
    }
    await saveSupabaseCrmCampaigns(campaigns);
    return res.json({ success: true, campaign: savedCampaign });
  } catch (err: any) {
    console.error('[POST /api/admin/lead-campaigns Error]', err);
    return res.status(500).json({ error: 'Failed to persist lead campaign to database' });
  }
});

// DELETE Lead Campaign
app.delete('/api/admin/lead-campaigns/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    return res.status(400).json({ error: 'Invalid campaign ID format' });
  }

  if (serverSupabase) {
    try {
      await serverSupabase.from('lead_campaigns').delete().eq('id', id);
    } catch (e) {
      // Handled in settings
    }
  }

  try {
    const campaigns = await getSupabaseCrmCampaigns();
    const filtered = campaigns.filter((c: any) => c.id !== id);
    await saveSupabaseCrmCampaigns(filtered);
    return res.json({ success: true });
  } catch (err: any) {
    console.error('[DELETE /api/admin/lead-campaigns/:id Error]', err);
    return res.status(500).json({ error: 'Failed to delete campaign from database' });
  }
});

// POST Send Personalized Test Email for Lead Campaign
app.post('/api/admin/lead-campaigns/:id/test', requireAdmin, emailTestLimiter, async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    return res.status(400).json({ success: false, message: 'Invalid campaign ID format' });
  }

  const { testEmail, sampleLeadId, customLeadData } = req.body;
  if (!testEmail || !testEmail.includes('@')) {
    return res.status(400).json({ success: false, message: 'Valid test recipient email is required' });
  }

  try {
    const campaigns = await getSupabaseCrmCampaigns();
    const campaign = campaigns.find((c: any) => c.id === id);

    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Lead campaign not found' });
    }

    // Fetch sample lead if provided
    let leadData: any = customLeadData || null;
    if (!leadData && sampleLeadId) {
      const allLeads = await getSupabaseCrmLeads();
      leadData = allLeads.find((l: any) => l.id === sampleLeadId);
    }

    if (!leadData) {
      leadData = {
        company_name: 'Udaan Manufacturing Ltd',
        industry: 'Automotive & Industrial Parts',
        location: 'Pithampur Industrial Zone, MP',
        contact_person: 'Rajesh Sharma',
        email: testEmail,
        phone: '+91 98260 12345',
        linkedin: 'https://linkedin.com/company/udaan-mfg',
        powerbi_use_case: 'Plant Production MIS & Scrap Costing Dashboard',
        lead_priority: 'High'
      };
    }

    const result = await campaignEmailService.sendLeadTestEmail({
      testEmail,
      subject: campaign.subject,
      preheader: campaign.preheader,
      contentHtml: campaign.html_content,
      lead: leadData
    });

    return res.json(result);
  } catch (err: any) {
    console.error('[POST /api/admin/lead-campaigns/:id/test Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to dispatch test email' });
  }
});

// POST Send Bulk Lead Campaign with Safe Batches and Idempotency
app.post('/api/admin/lead-campaigns/:id/send', requireAdmin, emailSendLimiter, async (req, res) => {
  const { id } = req.params;
  const { leadIds, batchSize = 10, delayMs = 1000 } = req.body || {};

  if (!isValidId(id)) {
    return res.status(400).json({ success: false, message: 'Invalid campaign ID format' });
  }

  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Please select at least one recipient lead for this outreach campaign.'
    });
  }

  try {
    const campaigns = await getSupabaseCrmCampaigns();
    const campaign = campaigns.find((c: any) => c.id === id);

    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Lead campaign not found' });
    }

    if (!campaignEmailService.isConfigured()) {
      return res.status(400).json({
        success: false,
        error: 'Gmail SMTP is not configured',
        details: 'GMAIL_USER or GMAIL_APP_PASSWORD is missing',
        message: 'GMAIL_APP_PASSWORD is not configured in the server environment.'
      });
    }

    // Fetch the selected leads from Supabase CRM store
    const allLeads = await getSupabaseCrmLeads();
    const idSet = new Set(leadIds);
    const selectedLeads = allLeads.filter((l: any) => idSet.has(l.id));

    if (selectedLeads.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid leads found from the provided selection.' });
    }

    // Filter out any "Do Not Contact" or "Bounced" leads to protect sender reputation
    const eligibleLeads = selectedLeads.filter(l => l.status !== 'Do Not Contact' && l.status !== 'Bounced');
    if (eligibleLeads.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'All selected leads have status "Do Not Contact" or "Bounced" and cannot be emailed.'
      });
    }

    // Fetch existing campaign_leads for this campaign to ensure idempotency (skip leads already sent)
    const existingRecipients = await getSupabaseCrmRecipients();
    const alreadySentLeadIds = new Set<string>();
    existingRecipients
      .filter((cl: any) => cl.campaign_id === campaign.id && cl.status === 'sent')
      .forEach((cl: any) => { if (cl.lead_id) alreadySentLeadIds.add(cl.lead_id); });

    const leadsToSend = eligibleLeads.filter(l => !alreadySentLeadIds.has(l.id));
    if (leadsToSend.length === 0) {
      return res.json({
        success: true,
        message: 'All selected leads have already been sent this campaign previously (idempotency check).',
        campaign
      });
    }

    let successfulCount = campaign.successful_count || 0;
    let failedCount = campaign.failed_count || 0;
    const recipientsLog: any[] = [];
    const leadsToUpdateStatus: string[] = [];

    // Safe chunked batch processing
    const chunkSize = Math.max(1, Math.min(Number(batchSize) || 10, 50));
    for (let i = 0; i < leadsToSend.length; i += chunkSize) {
      const chunk = leadsToSend.slice(i, i + chunkSize);

      for (const lead of chunk) {
        try {
          const sendRes = await campaignEmailService.sendLeadSingleRecipient({
            toEmail: lead.email,
            subject: campaign.subject,
            preheader: campaign.preheader,
            contentHtml: campaign.html_content,
            lead: lead
          });

          const logEntry: any = {
            id: crypto.randomUUID(),
            campaign_id: campaign.id,
            lead_id: isValidUuid(lead.id) ? lead.id : null,
            lead_email: lead.email,
            lead_company: lead.company_name,
            status: sendRes.success ? 'sent' : 'failed',
            provider_message_id: sendRes.messageId || null,
            error_message: sendRes.error || null,
            sent_at: sendRes.success ? new Date().toISOString() : null,
            created_at: new Date().toISOString()
          };

          if (sendRes.success) {
            successfulCount++;
            if (lead.status === 'Not Contacted') {
              leadsToUpdateStatus.push(lead.id);
            }
          } else {
            failedCount++;
          }

          recipientsLog.push(logEntry);
        } catch (sendErr: any) {
          failedCount++;
          recipientsLog.push({
            id: crypto.randomUUID(),
            campaign_id: campaign.id,
            lead_id: isValidUuid(lead.id) ? lead.id : null,
            lead_email: lead.email,
            lead_company: lead.company_name,
            status: 'failed',
            error_message: sendErr?.message || 'SMTP Exception',
            created_at: new Date().toISOString()
          });
        }
      }

      // Delay between chunks if there are more chunks to respect SMTP rate limits
      if (i + chunkSize < leadsToSend.length && delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, Math.min(delayMs, 3000)));
      }
    }

    const sentAt = new Date().toISOString();
    const finalStatus = failedCount === 0 ? 'sent' : (successfulCount > 0 ? 'partially_sent' : 'failed');

    campaign.status = finalStatus;
    campaign.sent_at = sentAt;
    campaign.total_recipients = (campaign.total_recipients || 0) + leadsToSend.length;
    campaign.successful_count = successfulCount;
    campaign.failed_count = failedCount;
    campaign.updated_at = sentAt;

    // Persist campaign update to Supabase
    const campIdx = campaigns.findIndex((c: any) => c.id === campaign.id);
    if (campIdx >= 0) campaigns[campIdx] = campaign;
    await saveSupabaseCrmCampaigns(campaigns);

    // Persist outreach history log to Supabase
    if (recipientsLog.length > 0) {
      await appendSupabaseCrmRecipients(recipientsLog);
    }

    // Update lead status to 'Contacted' in Supabase
    if (leadsToUpdateStatus.length > 0) {
      const updateSet = new Set(leadsToUpdateStatus);
      allLeads.forEach((l: any) => {
        if (updateSet.has(l.id)) {
          l.status = 'Contacted';
          l.updated_at = sentAt;
        }
      });
      await saveSupabaseCrmLeads(allLeads);
    }

    return res.json({
      success: true,
      message: `Lead outreach campaign dispatched! ${successfulCount} emails delivered successfully, ${failedCount} failed out of ${leadsToSend.length} processed leads.`,
      campaign,
      leadsProcessed: leadsToSend.length,
      successfulCount,
      failedCount
    });
  } catch (err: any) {
    console.error('[POST /api/admin/lead-campaigns/:id/send Error]', err);
    return res.status(500).json({ error: 'Failed to complete outreach dispatch in database' });
  }
});

// ==================== B2B LEAD SEQUENCES ENGINE & BACKGROUND WORKER ====================

let isProcessingSequences = false;

async function processActiveSequences(): Promise<{ processed: number; sent: number; stopped: number; completed: number; failed: number }> {
  if (isProcessingSequences) {
    return { processed: 0, sent: 0, stopped: 0, completed: 0, failed: 0 };
  }

  isProcessingSequences = true;
  const stats = { processed: 0, sent: 0, stopped: 0, completed: 0, failed: 0 };

  try {
    const sequences = await getSupabaseLeadSequences();
    const activeSequences = sequences.filter((s: any) => s.status === 'Active');
    if (activeSequences.length === 0) {
      return stats;
    }

    const activeSeqIdSet = new Set(activeSequences.map((s: any) => s.id));
    const allSteps = await getSupabaseSequenceSteps();
    const allSeqLeads = await getSupabaseSequenceLeads();
    const allLeads = await getSupabaseCrmLeads();
    const allDeliveries = await getSupabaseSequenceDeliveries();

    const leadsMap = new Map<string, any>();
    allLeads.forEach((l: any) => leadsMap.set(l.id, l));

    const now = new Date();
    const nowIso = now.toISOString();
    const nowTime = now.getTime();

    let seqLeadsUpdated = false;
    let leadsUpdated = false;
    const newDeliveries: any[] = [];
    const newRecipientsLogs: any[] = [];

    for (const seqLead of allSeqLeads) {
      // Must belong to an active sequence
      if (!activeSeqIdSet.has(seqLead.sequence_id)) continue;

      // Must be Active or Pending
      if (seqLead.status !== 'Active' && seqLead.status !== 'Pending') continue;

      // Must be due for sending
      if (seqLead.next_send_at && new Date(seqLead.next_send_at).getTime() > nowTime) {
        continue;
      }

      stats.processed++;

      // Check lead record in CRM
      const lead = leadsMap.get(seqLead.lead_id);
      if (!lead) {
        seqLead.status = 'Stopped';
        seqLead.stop_reason = 'Lead not found in CRM';
        seqLead.stopped_at = nowIso;
        seqLeadsUpdated = true;
        stats.stopped++;
        continue;
      }

      // Safety & Stop Conditions Check
      // Stop sequence immediately if lead has replied, expressed interest, converted, or requested Do Not Contact / Bounced
      const terminalStatuses = ['Replied', 'Interested', 'Demo Requested', 'Converted', 'Do Not Contact', 'Bounced', 'Not Interested'];
      if (terminalStatuses.includes(lead.status)) {
        seqLead.status = 'Stopped';
        seqLead.stop_reason = lead.status;
        seqLead.stopped_at = nowIso;
        seqLeadsUpdated = true;
        stats.stopped++;
        continue;
      }

      // Determine next step
      const currentStepNum = Number(seqLead.current_step) || 0;
      const targetStepNum = currentStepNum + 1;

      // Find target step
      const stepsForSeq = allSteps
        .filter((st: any) => st.sequence_id === seqLead.sequence_id && st.enabled !== false)
        .sort((a: any, b: any) => (a.step_number || 0) - (b.step_number || 0));

      const targetStep = stepsForSeq.find((st: any) => st.step_number === targetStepNum);

      // If no more steps exist, sequence is completed!
      if (!targetStep) {
        seqLead.status = 'Completed';
        seqLead.completed_at = nowIso;
        seqLead.next_send_at = null;
        seqLeadsUpdated = true;
        stats.completed++;
        continue;
      }

      // Idempotency check: verify if step was already sent
      const alreadySent = allDeliveries.some((d: any) =>
        d.sequence_id === seqLead.sequence_id &&
        d.lead_id === lead.id &&
        d.step_number === targetStepNum &&
        d.status === 'sent'
      );

      if (alreadySent) {
        // Step already delivered; advance to next step without re-dispatching
        seqLead.current_step = targetStepNum;
        const nextStepAfter = stepsForSeq.find((st: any) => st.step_number === targetStepNum + 1);
        if (nextStepAfter) {
          const delayDays = Math.max(0, Number(nextStepAfter.delay_days) || 1);
          seqLead.next_send_at = new Date(nowTime + delayDays * 86400000).toISOString();
        } else {
          seqLead.status = 'Completed';
          seqLead.completed_at = nowIso;
          seqLead.next_send_at = null;
        }
        seqLeadsUpdated = true;
        continue;
      }

      // Dispatch Email via campaignEmailService
      try {
        const sendResult = await campaignEmailService.sendLeadSingleRecipient({
          toEmail: lead.email,
          subject: targetStep.subject,
          preheader: targetStep.preheader,
          contentHtml: targetStep.html_content,
          lead
        });

        if (sendResult.success) {
          stats.sent++;
          const deliveryId = crypto.randomUUID();
          newDeliveries.push({
            id: deliveryId,
            sequence_id: seqLead.sequence_id,
            sequence_lead_id: seqLead.id,
            lead_id: lead.id,
            step_number: targetStepNum,
            step_id: targetStep.id,
            email: lead.email,
            status: 'sent',
            sent_at: nowIso
          });

          // Log in campaign_leads for unified CRM history
          newRecipientsLogs.push({
            id: deliveryId,
            campaign_id: seqLead.sequence_id,
            lead_id: isValidUuid(lead.id) ? lead.id : null,
            lead_email: lead.email,
            lead_company: lead.company_name,
            status: 'sent',
            provider_message_id: sendResult.messageId,
            sent_at: nowIso,
            created_at: nowIso
          });

          // Advance step progress
          seqLead.current_step = targetStepNum;
          seqLead.last_sent_at = nowIso;
          seqLead.status = 'Active';

          // Schedule next step or complete sequence
          const nextStepAfter = stepsForSeq.find((st: any) => st.step_number === targetStepNum + 1);
          if (nextStepAfter) {
            const delayDays = Math.max(0, Number(nextStepAfter.delay_days) || 1);
            seqLead.next_send_at = new Date(nowTime + delayDays * 86400000).toISOString();
          } else {
            seqLead.status = 'Completed';
            seqLead.completed_at = nowIso;
            seqLead.next_send_at = null;
          }
          seqLeadsUpdated = true;

          // Update lead status in CRM if it was 'Not Contacted'
          if (lead.status === 'Not Contacted') {
            lead.status = 'Contacted';
            lead.updated_at = nowIso;
            leadsUpdated = true;
          }
        } else {
          stats.failed++;
          newDeliveries.push({
            id: crypto.randomUUID(),
            sequence_id: seqLead.sequence_id,
            sequence_lead_id: seqLead.id,
            lead_id: lead.id,
            step_number: targetStepNum,
            step_id: targetStep.id,
            email: lead.email,
            status: 'failed',
            error_message: sendResult.error || 'SMTP delivery failed',
            sent_at: nowIso
          });
        }
      } catch (err: any) {
        stats.failed++;
        console.error(`[Sequence Send Exception for ${lead.email}]`, err?.message || err);
        newDeliveries.push({
          id: crypto.randomUUID(),
          sequence_id: seqLead.sequence_id,
          sequence_lead_id: seqLead.id,
          lead_id: lead.id,
          step_number: targetStepNum,
          step_id: targetStep.id,
          email: lead.email,
          status: 'failed',
          error_message: err?.message || 'Unexpected worker error',
          sent_at: nowIso
        });
      }
    }

    // Persist all state changes to Supabase
    if (seqLeadsUpdated) {
      await saveSupabaseSequenceLeads(allSeqLeads);
    }
    if (newDeliveries.length > 0) {
      await appendSupabaseSequenceDeliveries(newDeliveries);
    }
    if (newRecipientsLogs.length > 0) {
      await appendSupabaseCrmRecipients(newRecipientsLogs);
    }
    if (leadsUpdated) {
      await saveSupabaseCrmLeads(allLeads);
    }

    return stats;
  } catch (err: any) {
    console.error('[processActiveSequences Error]', err);
    return stats;
  } finally {
    isProcessingSequences = false;
  }
}

// GET All Lead Sequences with summary metrics
app.get('/api/admin/lead-sequences', requireAdmin, async (req, res) => {
  try {
    await ensureDefaultLeadSequence();
    const sequences = await getSupabaseLeadSequences();
    const steps = await getSupabaseSequenceSteps();
    const sequenceLeads = await getSupabaseSequenceLeads();
    const deliveries = await getSupabaseSequenceDeliveries();

    const sequencesWithStats = sequences.map((seq: any) => {
      const seqSteps = steps.filter((st: any) => st.sequence_id === seq.id);
      const enrolled = sequenceLeads.filter((sl: any) => sl.sequence_id === seq.id);
      const seqDeliveries = deliveries.filter((d: any) => d.sequence_id === seq.id);

      const active_leads = enrolled.filter((sl: any) => sl.status === 'Active' || sl.status === 'Pending').length;
      const completed_leads = enrolled.filter((sl: any) => sl.status === 'Completed').length;
      const stopped_leads = enrolled.filter((sl: any) => sl.status === 'Stopped').length;
      const emails_sent = seqDeliveries.filter((d: any) => d.status === 'sent').length;
      const emails_failed = seqDeliveries.filter((d: any) => d.status === 'failed').length;

      return {
        ...seq,
        steps: seqSteps.sort((a: any, b: any) => (a.step_number || 0) - (b.step_number || 0)),
        total_leads: enrolled.length,
        active_leads,
        completed_leads,
        stopped_leads,
        emails_sent,
        emails_failed
      };
    });

    return res.json(sequencesWithStats);
  } catch (err: any) {
    console.error('[GET /api/admin/lead-sequences Error]', err);
    return res.status(500).json({ error: 'Failed to retrieve sequences from database' });
  }
});

// GET Single Lead Sequence Details by ID
app.get('/api/admin/lead-sequences/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    return res.status(400).json({ error: 'Invalid sequence ID format' });
  }

  try {
    await ensureDefaultLeadSequence();
    const sequences = await getSupabaseLeadSequences();
    const sequence = sequences.find((s: any) => s.id === id);
    if (!sequence) {
      return res.status(404).json({ error: 'Lead sequence not found' });
    }

    const allSteps = await getSupabaseSequenceSteps();
    const allSeqLeads = await getSupabaseSequenceLeads();
    const allLeads = await getSupabaseCrmLeads();
    const allDeliveries = await getSupabaseSequenceDeliveries();

    const seqSteps = allSteps
      .filter((st: any) => st.sequence_id === id)
      .sort((a: any, b: any) => (a.step_number || 0) - (b.step_number || 0));

    const leadsMap = new Map<string, any>();
    allLeads.forEach((l: any) => leadsMap.set(l.id, l));

    const seqLeads = allSeqLeads
      .filter((sl: any) => sl.sequence_id === id)
      .map((sl: any) => ({
        ...sl,
        lead: leadsMap.get(sl.lead_id) || null
      }));

    const seqDeliveries = allDeliveries.filter((d: any) => d.sequence_id === id);

    // Compute step-level delivery stats
    const stepsWithStats = seqSteps.map((st: any) => {
      const stepDeliveries = seqDeliveries.filter((d: any) => d.step_number === st.step_number);
      const sent_count = stepDeliveries.filter((d: any) => d.status === 'sent').length;
      const failed_count = stepDeliveries.filter((d: any) => d.status === 'failed').length;
      const pending_count = seqLeads.filter((sl: any) => (sl.status === 'Active' || sl.status === 'Pending') && (sl.current_step || 0) < st.step_number).length;
      return {
        ...st,
        sent_count,
        failed_count,
        pending_count
      };
    });

    const active_leads = seqLeads.filter((sl: any) => sl.status === 'Active' || sl.status === 'Pending').length;
    const completed_leads = seqLeads.filter((sl: any) => sl.status === 'Completed').length;
    const stopped_leads = seqLeads.filter((sl: any) => sl.status === 'Stopped').length;
    const emails_sent = seqDeliveries.filter((d: any) => d.status === 'sent').length;
    const emails_failed = seqDeliveries.filter((d: any) => d.status === 'failed').length;

    return res.json({
      ...sequence,
      steps: stepsWithStats,
      leads: seqLeads,
      deliveries: seqDeliveries,
      total_leads: seqLeads.length,
      active_leads,
      completed_leads,
      stopped_leads,
      emails_sent,
      emails_failed
    });
  } catch (err: any) {
    console.error('[GET /api/admin/lead-sequences/:id Error]', err);
    return res.status(500).json({ error: 'Failed to retrieve sequence details' });
  }
});

// POST Create New Lead Sequence
app.post('/api/admin/lead-sequences', requireAdmin, async (req, res) => {
  const { name, description, steps } = req.body || {};
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Sequence name is required' });
  }

  try {
    const sequenceId = crypto.randomUUID();
    const now = new Date().toISOString();

    const newSequence = {
      id: sequenceId,
      name: name.trim(),
      description: description ? description.trim() : '',
      status: 'Active',
      created_at: now,
      updated_at: now
    };

    const sequences = await getSupabaseLeadSequences();
    sequences.unshift(newSequence);
    await saveSupabaseLeadSequences(sequences);

    // Save initial steps if provided
    let createdSteps: any[] = [];
    if (Array.isArray(steps) && steps.length > 0) {
      createdSteps = steps.map((st: any, idx: number) => ({
        id: isValidUuid(st.id) ? st.id : crypto.randomUUID(),
        sequence_id: sequenceId,
        step_number: idx + 1,
        delay_days: Math.max(0, Number(st.delay_days) || (idx === 0 ? 0 : 3)),
        subject: st.subject || `Follow-up #${idx + 1}`,
        preheader: st.preheader || '',
        html_content: st.html_content || '<p>Hello {{contact_person}},</p>',
        enabled: st.enabled !== false,
        created_at: now,
        updated_at: now
      }));
      const allSteps = await getSupabaseSequenceSteps();
      allSteps.push(...createdSteps);
      await saveSupabaseSequenceSteps(allSteps);
    }

    return res.json({
      success: true,
      sequence: {
        ...newSequence,
        steps: createdSteps,
        total_leads: 0,
        active_leads: 0,
        completed_leads: 0,
        stopped_leads: 0,
        emails_sent: 0,
        emails_failed: 0
      }
    });
  } catch (err: any) {
    console.error('[POST /api/admin/lead-sequences Error]', err);
    return res.status(500).json({ error: 'Failed to create lead sequence in database' });
  }
});

// PATCH Update Lead Sequence Details (Name, Description, Status)
app.patch('/api/admin/lead-sequences/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    return res.status(400).json({ error: 'Invalid sequence ID format' });
  }

  const { name, description, status } = req.body || {};
  try {
    const sequences = await getSupabaseLeadSequences();
    const idx = sequences.findIndex((s: any) => s.id === id);
    if (idx === 0 && sequences.length === 0) {
      return res.status(404).json({ error: 'Sequence not found' });
    }
    if (idx < 0) {
      return res.status(404).json({ error: 'Sequence not found' });
    }

    const now = new Date().toISOString();
    const updated = {
      ...sequences[idx],
      name: name !== undefined ? String(name).trim() : sequences[idx].name,
      description: description !== undefined ? String(description).trim() : sequences[idx].description,
      status: status !== undefined ? status : sequences[idx].status,
      updated_at: now
    };
    sequences[idx] = updated;
    await saveSupabaseLeadSequences(sequences);

    // If resumed, trigger background worker
    if (status === 'Active') {
      setTimeout(() => { processActiveSequences().catch(console.error); }, 100);
    }

    return res.json({ success: true, sequence: updated });
  } catch (err: any) {
    console.error('[PATCH /api/admin/lead-sequences/:id Error]', err);
    return res.status(500).json({ error: 'Failed to update sequence in database' });
  }
});

// DELETE Lead Sequence
app.delete('/api/admin/lead-sequences/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    return res.status(400).json({ error: 'Invalid sequence ID format' });
  }

  try {
    const sequences = await getSupabaseLeadSequences();
    const filteredSeqs = sequences.filter((s: any) => s.id !== id);
    await saveSupabaseLeadSequences(filteredSeqs);

    const steps = await getSupabaseSequenceSteps();
    const filteredSteps = steps.filter((st: any) => st.sequence_id !== id);
    await saveSupabaseSequenceSteps(filteredSteps);

    const seqLeads = await getSupabaseSequenceLeads();
    const filteredLeads = seqLeads.filter((sl: any) => sl.sequence_id !== id);
    await saveSupabaseSequenceLeads(filteredLeads);

    return res.json({ success: true });
  } catch (err: any) {
    console.error('[DELETE /api/admin/lead-sequences/:id Error]', err);
    return res.status(500).json({ error: 'Failed to delete sequence' });
  }
});

// POST Save/Update Steps for a Sequence
app.post('/api/admin/lead-sequences/:id/steps', requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    return res.status(400).json({ error: 'Invalid sequence ID format' });
  }

  const { steps } = req.body || {};
  if (!Array.isArray(steps)) {
    return res.status(400).json({ error: 'Steps must be an array' });
  }

  try {
    const allSteps = await getSupabaseSequenceSteps();
    const otherSteps = allSteps.filter((st: any) => st.sequence_id !== id);

    const now = new Date().toISOString();
    const updatedSeqSteps = steps.map((st: any, idx: number) => ({
      id: isValidUuid(st.id) ? st.id : crypto.randomUUID(),
      sequence_id: id,
      step_number: idx + 1,
      delay_days: Math.max(0, Number(st.delay_days) || (idx === 0 ? 0 : 3)),
      subject: st.subject ? st.subject.trim() : `Step #${idx + 1}`,
      preheader: st.preheader ? st.preheader.trim() : '',
      html_content: st.html_content || '<p>Hello {{contact_person}},</p>',
      enabled: st.enabled !== false,
      created_at: st.created_at || now,
      updated_at: now
    }));

    const combined = [...otherSteps, ...updatedSeqSteps];
    await saveSupabaseSequenceSteps(combined);

    return res.json({ success: true, steps: updatedSeqSteps });
  } catch (err: any) {
    console.error('[POST /api/admin/lead-sequences/:id/steps Error]', err);
    return res.status(500).json({ error: 'Failed to save sequence steps' });
  }
});

// POST Enroll Selected Leads into Sequence with Explicit Targeting & Duplicate Prevention
app.post('/api/admin/lead-sequences/:id/enroll', requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    return res.status(400).json({ error: 'Invalid sequence ID format' });
  }

  const { leadIds } = req.body || {};
  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Please select at least one lead from the CRM table to enroll in this sequence.'
    });
  }

  try {
    const sequences = await getSupabaseLeadSequences();
    const sequence = sequences.find((s: any) => s.id === id);
    if (!sequence) {
      return res.status(404).json({ success: false, message: 'Sequence not found' });
    }

    const allLeads = await getSupabaseCrmLeads();
    const idSet = new Set(leadIds);
    const selectedLeads = allLeads.filter((l: any) => idSet.has(l.id));

    if (selectedLeads.length === 0) {
      return res.status(400).json({ success: false, message: 'No matching leads found for provided IDs.' });
    }

    // Filter out Do Not Contact and Bounced
    const eligibleLeads = selectedLeads.filter((l: any) => l.status !== 'Do Not Contact' && l.status !== 'Bounced');
    if (eligibleLeads.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'All selected leads have "Do Not Contact" or "Bounced" status and cannot be enrolled.'
      });
    }

    // Check existing enrollments to prevent duplicates
    const allSeqLeads = await getSupabaseSequenceLeads();
    const existingForSeq = allSeqLeads.filter((sl: any) => sl.sequence_id === id);
    const enrolledLeadIdSet = new Set(existingForSeq.map((sl: any) => sl.lead_id));

    const now = new Date().toISOString();
    const newEnrollments: any[] = [];
    let skippedCount = 0;

    for (const lead of eligibleLeads) {
      if (enrolledLeadIdSet.has(lead.id)) {
        skippedCount++;
        continue;
      }

      newEnrollments.push({
        id: crypto.randomUUID(),
        sequence_id: id,
        lead_id: lead.id,
        current_step: 0,
        status: 'Active',
        next_send_at: now, // Ready for Step 1 (which has delay 0)
        created_at: now,
        updated_at: now
      });
    }

    if (newEnrollments.length > 0) {
      allSeqLeads.push(...newEnrollments);
      await saveSupabaseSequenceLeads(allSeqLeads);

      // Trigger automatic background worker immediately
      setTimeout(() => {
        processActiveSequences().catch(err => console.error('[Sequence Immediate Worker Error]', err));
      }, 500);
    }

    return res.json({
      success: true,
      message: `Enrolled ${newEnrollments.length} leads into sequence "${sequence.name}". ${skippedCount > 0 ? `(${skippedCount} duplicate leads already enrolled were skipped)` : ''}`,
      enrolledCount: newEnrollments.length,
      skippedCount,
      totalSelected: leadIds.length
    });
  } catch (err: any) {
    console.error('[POST /api/admin/lead-sequences/:id/enroll Error]', err);
    return res.status(500).json({ error: 'Failed to enroll leads in sequence' });
  }
});

// POST Pause Lead Sequence
app.post('/api/admin/lead-sequences/:id/pause', requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const sequences = await getSupabaseLeadSequences();
    const seq = sequences.find((s: any) => s.id === id);
    if (!seq) {
      return res.status(404).json({ error: 'Sequence not found' });
    }

    seq.status = 'Paused';
    seq.updated_at = new Date().toISOString();
    await saveSupabaseLeadSequences(sequences);

    return res.json({ success: true, message: `Sequence "${seq.name}" paused. All active step dispatches are held.` });
  } catch (err: any) {
    console.error('[POST /api/admin/lead-sequences/:id/pause Error]', err);
    return res.status(500).json({ error: 'Failed to pause sequence' });
  }
});

// POST Resume Lead Sequence
app.post('/api/admin/lead-sequences/:id/resume', requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const sequences = await getSupabaseLeadSequences();
    const seq = sequences.find((s: any) => s.id === id);
    if (!seq) {
      return res.status(404).json({ error: 'Sequence not found' });
    }

    seq.status = 'Active';
    seq.updated_at = new Date().toISOString();
    await saveSupabaseLeadSequences(sequences);

    // Trigger worker
    setTimeout(() => {
      processActiveSequences().catch(err => console.error('[Sequence Worker Resume Trigger Error]', err));
    }, 200);

    return res.json({ success: true, message: `Sequence "${seq.name}" resumed.` });
  } catch (err: any) {
    console.error('[POST /api/admin/lead-sequences/:id/resume Error]', err);
    return res.status(500).json({ error: 'Failed to resume sequence' });
  }
});

// POST Stop Single Lead in Sequence
app.post('/api/admin/lead-sequences/:id/stop-lead', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { leadId, reason } = req.body || {};

  if (!leadId) {
    return res.status(400).json({ error: 'leadId is required' });
  }

  try {
    const allSeqLeads = await getSupabaseSequenceLeads();
    const target = allSeqLeads.find((sl: any) => sl.sequence_id === id && sl.lead_id === leadId);

    if (!target) {
      return res.status(404).json({ error: 'Lead is not enrolled in this sequence' });
    }

    const now = new Date().toISOString();
    target.status = 'Stopped';
    target.stop_reason = reason || 'Manual Stop';
    target.stopped_at = now;
    target.updated_at = now;

    await saveSupabaseSequenceLeads(allSeqLeads);
    return res.json({ success: true, message: 'Lead sequence stopped successfully' });
  } catch (err: any) {
    console.error('[POST /api/admin/lead-sequences/:id/stop-lead Error]', err);
    return res.status(500).json({ error: 'Failed to stop lead sequence' });
  }
});

// POST Send Test Email for a Specific Sequence Step
app.post('/api/admin/lead-sequences/:id/test', requireAdmin, emailTestLimiter, async (req, res) => {
  const { id } = req.params;
  const { stepNumber = 1, testEmail, sampleLeadId, customLeadData } = req.body || {};

  if (!testEmail || !testEmail.includes('@')) {
    return res.status(400).json({ success: false, message: 'Valid test recipient email address is required.' });
  }

  try {
    const steps = await getSupabaseSequenceSteps();
    const step = steps.find((st: any) => st.sequence_id === id && st.step_number === Number(stepNumber));

    if (!step) {
      return res.status(404).json({ success: false, message: `Sequence step #${stepNumber} not found.` });
    }

    let leadData = customLeadData || null;
    if (!leadData && sampleLeadId) {
      const allLeads = await getSupabaseCrmLeads();
      leadData = allLeads.find((l: any) => l.id === sampleLeadId);
    }

    if (!leadData) {
      leadData = {
        company_name: 'Udaan Manufacturing Ltd',
        industry: 'Automotive & Industrial Parts',
        location: 'Pithampur Industrial Zone, MP',
        contact_person: 'Rajesh Sharma',
        email: testEmail,
        phone: '+91 98260 12345',
        linkedin: 'https://linkedin.com/company/udaan-mfg',
        powerbi_use_case: 'Plant Production MIS & Scrap Costing Dashboard',
        lead_priority: 'High'
      };
    }

    const result = await campaignEmailService.sendLeadTestEmail({
      testEmail,
      subject: step.subject,
      preheader: step.preheader,
      contentHtml: step.html_content,
      lead: leadData
    });

    return res.json(result);
  } catch (err: any) {
    console.error('[POST /api/admin/lead-sequences/:id/test Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to dispatch test sequence email' });
  }
});

// POST Manual Trigger for Sequence Processing
app.post('/api/admin/lead-sequences/process', requireAdmin, async (req, res) => {
  try {
    const stats = await processActiveSequences();
    return res.json({ success: true, stats });
  } catch (err: any) {
    console.error('[POST /api/admin/lead-sequences/process Error]', err);
    return res.status(500).json({ error: 'Sequence processing cycle failed' });
  }
});

// GET Sequences for a specific Lead (for Lead Details Drawer)
app.get('/api/admin/leads/:id/sequences', requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const allSeqLeads = await getSupabaseSequenceLeads();
    const sequences = await getSupabaseLeadSequences();
    const allSteps = await getSupabaseSequenceSteps();

    const enrolledSeqLeads = allSeqLeads.filter((sl: any) => sl.lead_id === id);
    const result = enrolledSeqLeads.map((sl: any) => {
      const seq = sequences.find((s: any) => s.id === sl.sequence_id);
      const steps = allSteps.filter((st: any) => st.sequence_id === sl.sequence_id);
      return {
        ...sl,
        sequence_name: seq?.name || 'Unknown Sequence',
        sequence_status: seq?.status || 'Unknown',
        total_steps: steps.length
      };
    });

    return res.json(result);
  } catch (err: any) {
    console.error('[GET /api/admin/leads/:id/sequences Error]', err);
    return res.status(500).json({ error: 'Failed to fetch lead sequence memberships' });
  }
});


// ==================== SOCIAL, NAVIGATION, MEDIA, CATEGORIES ====================

// SOCIAL LINKS (PUBLIC READ)
const DEFAULT_SOCIAL_LINKS = [
  { id: '1', platform: 'youtube', url: 'https://youtube.com/@probitian', icon: 'Youtube', is_active: true, display_order: 1 },
  { id: '2', platform: 'instagram', url: 'https://instagram.com/probitian', icon: 'Instagram', is_active: true, display_order: 2 },
  { id: '3', platform: 'facebook', url: 'https://facebook.com/probitian', icon: 'Facebook', is_active: true, display_order: 3 },
  { id: '4', platform: 'github', url: 'https://github.com/probitian', icon: 'Github', is_active: true, display_order: 4 },
  { id: '5', platform: 'email', url: 'mailto:probitianofficial@gmail.com', icon: 'Mail', is_active: true, display_order: 5 },
  { id: '6', platform: 'linkedin', url: 'https://www.linkedin.com/company/probitian/', icon: 'Linkedin', is_active: true, display_order: 6 },
  { id: '7', platform: 'x', url: 'https://x.com/Probitian', icon: 'X', is_active: true, display_order: 7 }
];

app.get('/api/cms/social', async (req, res) => {
  if (serverSupabase) {
    try {
      const { data, error } = await serverSupabase.from('social_links').select('*').order('display_order', { ascending: true });
      if (error) {
        console.error('[Supabase GET Social Error]', error.message);
        return res.status(503).json({ error: 'Database service unavailable' });
      }
      let links = data && data.length > 0 ? data : DEFAULT_SOCIAL_LINKS;
      const hasX = links.some((s: any) => s.platform && (s.platform.toLowerCase() === 'x' || s.platform.toLowerCase() === 'twitter'));
      if (!hasX) {
        const xLink = { platform: 'x', url: 'https://x.com/Probitian', icon: 'X', is_active: true, display_order: 7 };
        try {
          const { data: inserted, error: insertErr } = await serverSupabase.from('social_links').insert(xLink).select();
          if (!insertErr && inserted && inserted.length > 0) {
            links = [...links, inserted[0]];
          } else {
            links = [...links, { id: 'x_default', ...xLink }];
          }
        } catch {
          links = [...links, { id: 'x_default', ...xLink }];
        }
      }
      return res.json(links.sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0)));
    } catch (err) {
      console.error('[Supabase GET Social Exception]', err);
      return res.status(503).json({ error: 'Database service unavailable' });
    }
  }
  const data = readCmsData();
  let links = data.social_links && data.social_links.length > 0 ? data.social_links : DEFAULT_SOCIAL_LINKS;
  const hasX = links.some((s: any) => s.platform && (s.platform.toLowerCase() === 'x' || s.platform.toLowerCase() === 'twitter'));
  if (!hasX) {
    links = [...links, { id: 'x_default', platform: 'x', url: 'https://x.com/Probitian', icon: 'X', is_active: true, display_order: 7 }];
  }
  return res.json(links.sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0)));
});

// SOCIAL LINKS (PROTECTED WRITE)
app.post('/api/cms/social', requireAdmin, async (req, res) => {
  const links = req.body;
  if (!Array.isArray(links)) {
    return res.status(400).json({ error: 'Social links payload must be an array' });
  }

  if (serverSupabase) {
    try {
      for (const link of links) {
        const { error: upsertErr } = await serverSupabase.from('social_links').upsert(link);
        if (upsertErr) {
          console.error('[Supabase POST Social Item Error]', upsertErr.message);
          return res.status(500).json({ error: 'Failed to update social link' });
        }
      }
      return res.json({ success: true, links });
    } catch (err) {
      console.error('[Supabase POST Social Error]', err);
      return res.status(500).json({ error: 'Failed to update social links' });
    }
  }

  const data = readCmsData();
  data.social_links = links;
  writeCmsData(data);

  return res.json({ success: true, links });
});

// NAVIGATION (PUBLIC READ)
app.get('/api/cms/navigation', async (req, res) => {
  if (serverSupabase) {
    try {
      const { data, error } = await serverSupabase.from('navigation').select('*').order('display_order', { ascending: true });
      if (error) {
        console.error('[Supabase GET Navigation Error]', error.message);
        return res.status(503).json({ error: 'Database service unavailable' });
      }
      return res.json(data || []);
    } catch (err) {
      console.error('[Supabase GET Navigation Exception]', err);
      return res.status(503).json({ error: 'Database service unavailable' });
    }
  }
  const data = readCmsData();
  return res.json(data.navigation || []);
});

// NAVIGATION (PROTECTED WRITE)
app.post('/api/cms/navigation', requireAdmin, async (req, res) => {
  const navItems = req.body;
  if (!Array.isArray(navItems)) {
    return res.status(400).json({ error: 'Navigation payload must be an array' });
  }

  if (serverSupabase) {
    try {
      for (const item of navItems) {
        const { error: upsertErr } = await serverSupabase.from('navigation').upsert(item);
        if (upsertErr) {
          console.error('[Supabase POST Navigation Item Error]', upsertErr.message);
          return res.status(500).json({ error: 'Failed to update navigation item' });
        }
      }
      return res.json({ success: true, navigation: navItems });
    } catch (err) {
      console.error('[Supabase POST Navigation Error]', err);
      return res.status(500).json({ error: 'Failed to update navigation' });
    }
  }

  const data = readCmsData();
  data.navigation = navItems;
  writeCmsData(data);

  return res.json({ success: true, navigation: navItems });
});

// MEDIA LIBRARY (PROTECTED READ)
app.get('/api/cms/media', requireAdmin, async (req, res) => {
  if (serverSupabase) {
    try {
      const { data, error } = await serverSupabase.from('media').select('*').order('created_at', { ascending: false });
      if (error) {
        console.error('[Media Read Error]', error.message);
        return res.status(503).json({ error: 'Database service unavailable' });
      }
      return res.json(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('[Media Read Exception]', err);
      return res.status(503).json({ error: 'Database service unavailable' });
    }
  }
  const data = readCmsData();
  return res.json(data.media || []);
});

// MEDIA UPLOAD (PROTECTED WRITE)
app.post(
  '/api/cms/media/upload',
  requireAdmin,
  uploadLimiter,
  express.json({ limit: '20mb' }),
  express.urlencoded({ limit: '20mb', extended: true }),
  async (req, res) => {
  try {
    const { filename, fileData, category, folder, altText } = req.body || {};

    if (!fileData || !filename) {
      return res.status(400).json({ error: 'Missing filename or fileData in upload request payload.' });
    }

    let mimeType = 'image/png';
    let fileBuffer: Buffer;

    if (fileData.startsWith('data:')) {
      const matches = fileData.match(/^data:([^;]+);base64,(.*)$/);
      if (matches) {
        mimeType = matches[1];
        fileBuffer = Buffer.from(matches[2], 'base64');
      } else {
        return res.status(400).json({ error: 'Invalid data URL format for uploaded asset.' });
      }
    } else {
      fileBuffer = Buffer.from(fileData, 'base64');
    }

    const MAX_SIZE = 15 * 1024 * 1024;
    if (fileBuffer.length > MAX_SIZE) {
      return res.status(400).json({ error: 'File size exceeds maximum permitted threshold of 15MB.' });
    }

    const ext = path.extname(filename).toLowerCase();
    const forbiddenExts = ['.exe', '.sh', '.js', '.php', '.bat', '.cmd', '.py', '.html', '.htm', '.dll', '.so'];
    if (forbiddenExts.includes(ext)) {
      return res.status(400).json({ error: 'Security constraint: Executable and script uploads are strictly forbidden.' });
    }

    const allowedMimePrefixes = ['image/', 'application/pdf', 'video/mp4', 'video/webm'];
    const isAllowedType = allowedMimePrefixes.some(p => mimeType.startsWith(p)) || ext === '.svg';
    if (!isAllowedType) {
      return res.status(400).json({ error: `File MIME type "${mimeType}" is not permitted.` });
    }

    // Validate actual file magic bytes / signature against spoofed MIME types
    const sigCheck = validateFileSignature(fileBuffer, mimeType, ext);
    if (!sigCheck.valid) {
      return res.status(400).json({ error: `File validation rejected: ${sigCheck.error || 'Invalid file content'}` });
    }
    if (sigCheck.detectedMime) {
      mimeType = sigCheck.detectedMime;
    }

    if (ext === '.svg' || mimeType === 'image/svg+xml') {
      const rawSvg = fileBuffer.toString('utf-8');
      const cleanSvg = sanitizeSvg(rawSvg);
      fileBuffer = Buffer.from(cleanSvg, 'utf-8');
    }

    const rawCategory = (category || folder || 'general').toLowerCase().replace(/[^a-z0-9_-]/g, '');
    const validFolders = ['media', 'logos', 'banners', 'blog', 'projects', 'courses', 'youtube', 'general'];
    const selectedCategory = validFolders.includes(rawCategory) ? rawCategory : 'general';

    const safeFilename = filename.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const storagePath = `${selectedCategory}/${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${safeFilename}`;

    let publicUrl = '';
    if (serverSupabase) {
      await ensureStorageBucket();
      const { error: uploadErr } = await serverSupabase.storage
        .from(PROBITIAN_MEDIA_BUCKET)
        .upload(storagePath, fileBuffer, {
          contentType: mimeType,
          upsert: true
        });

      if (uploadErr) {
        console.error('[Supabase Storage Upload Failure]', uploadErr);
        return res.status(500).json({ error: 'Failed to upload file to Supabase Storage' });
      }

      const { data: publicUrlData } = serverSupabase.storage.from(PROBITIAN_MEDIA_BUCKET).getPublicUrl(storagePath);
      publicUrl = publicUrlData.publicUrl;
    } else {
      publicUrl = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
    }

    const mediaRecord = {
      id: crypto.randomUUID(),
      filename: safeFilename,
      original_filename: filename,
      storage_path: storagePath,
      public_url: publicUrl,
      url: publicUrl,
      file_size: fileBuffer.length,
      size_bytes: fileBuffer.length,
      mime_type: mimeType,
      alt_text: altText || safeFilename,
      category: selectedCategory,
      folder: selectedCategory,
      uploaded_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (serverSupabase) {
      try {
        let { error: dbErr } = await serverSupabase.from('media').insert(mediaRecord);
        if (dbErr && (dbErr.message.includes('schema cache') || dbErr.message.includes('column') || dbErr.code === 'PGRST204')) {
          const coreRecord = {
            id: mediaRecord.id,
            filename: mediaRecord.filename,
            url: mediaRecord.public_url,
            size_bytes: mediaRecord.size_bytes,
            mime_type: mediaRecord.mime_type,
            folder: mediaRecord.category,
            created_at: mediaRecord.created_at
          };
          const retryRes = await serverSupabase.from('media').insert(coreRecord);
          dbErr = retryRes.error;
        }

        if (dbErr) {
          console.warn('[Supabase Media DB Insert Warning]', dbErr.message);
        }
      } catch (err: any) {
        console.warn('[Supabase Media DB Exception]', err?.message || String(err));
      }
    } else {
      const cmsData = readCmsData();
      cmsData.media = cmsData.media || [];
      cmsData.media.unshift(mediaRecord);
      writeCmsData(cmsData);
    }

    return res.json({ success: true, media: mediaRecord });
  } catch (err: any) {
    console.error('[Media Upload Handler Error]', err);
    return res.status(500).json({ error: 'Server error processing file upload.' });
  }
});

app.post('/api/cms/media', requireAdmin, uploadLimiter, async (req, res) => {
  const mediaItem = req.body;
  if (!mediaItem || (!mediaItem.filename && !mediaItem.url)) {
    return res.status(400).json({ error: 'Invalid media item payload' });
  }

  const cleanFilename = (mediaItem.filename || 'asset').replace(/[^a-zA-Z0-9_.-]/g, '_');
  const validUuid = isValidUuid(mediaItem.id);
  const itemWithId = {
    id: validUuid ? mediaItem.id : crypto.randomUUID(),
    filename: cleanFilename,
    original_filename: mediaItem.original_filename || mediaItem.filename || 'asset',
    storage_path: mediaItem.storage_path || '',
    public_url: mediaItem.public_url || mediaItem.url || '',
    url: mediaItem.url || mediaItem.public_url || '',
    size_bytes: mediaItem.size_bytes || mediaItem.file_size || 0,
    file_size: mediaItem.file_size || mediaItem.size_bytes || 0,
    mime_type: mediaItem.mime_type || 'image/png',
    alt_text: mediaItem.alt_text || cleanFilename,
    category: mediaItem.category || mediaItem.folder || 'general',
    folder: mediaItem.folder || mediaItem.category || 'general',
    uploaded_at: mediaItem.uploaded_at || new Date().toISOString(),
    created_at: mediaItem.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (serverSupabase) {
    try {
      await serverSupabase.from('media').insert(itemWithId);
      return res.json({ success: true, media: itemWithId });
    } catch (err) {
      console.error('[Supabase POST Media Warning]', err);
      return res.status(500).json({ error: 'Failed to save media metadata' });
    }
  }

  const cmsData = readCmsData();
  cmsData.media = cmsData.media || [];
  cmsData.media.unshift(itemWithId);
  writeCmsData(cmsData);

  return res.json({ success: true, media: itemWithId });
});

app.delete('/api/cms/media/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    return res.status(400).json({ error: 'Invalid media ID format' });
  }
  let storagePathToDelete: string | null = null;
  let targetUrl: string | null = null;

  if (serverSupabase && isValidUuid(id)) {
    try {
      const { data: dbItem } = await serverSupabase.from('media').select('*').eq('id', id).maybeSingle();
      if (dbItem) {
        storagePathToDelete = dbItem.storage_path;
        targetUrl = dbItem.public_url || dbItem.url;
      }
    } catch (e) {}
  } else {
    const cmsData = readCmsData();
    const localItem = (cmsData.media || []).find((m: any) => m.id === id);
    storagePathToDelete = localItem?.storage_path;
    targetUrl = localItem?.public_url || localItem?.url;
  }

  if (!storagePathToDelete && targetUrl && targetUrl.includes('/storage/v1/object/public/probitian-media/')) {
    const parts = targetUrl.split('/storage/v1/object/public/probitian-media/');
    if (parts.length > 1) {
      storagePathToDelete = parts[1];
    }
  }

  // Prevent directory traversal or illegal characters in storage deletion path
  if (storagePathToDelete) {
    storagePathToDelete = storagePathToDelete.replace(/^[/\\]+/, '').trim();
    if (storagePathToDelete.includes('..') || storagePathToDelete.includes('\0')) {
      storagePathToDelete = null;
    }
  }

  if (serverSupabase && storagePathToDelete) {
    const { error: storageErr } = await serverSupabase.storage
      .from(PROBITIAN_MEDIA_BUCKET)
      .remove([storagePathToDelete]);

    if (storageErr) {
      console.error('[Supabase Storage Deletion Error]', storageErr);
      return res.status(500).json({ error: 'Failed to delete asset from storage' });
    }
  }

  if (serverSupabase && isValidUuid(id)) {
    try {
      const { error: dbErr } = await serverSupabase.from('media').delete().eq('id', id);
      if (dbErr) {
        console.error('[Supabase DB Delete Media Warning]', dbErr);
        return res.status(500).json({ error: 'Failed to delete media record' });
      }
    } catch (e) {
      return res.status(500).json({ error: 'Failed to delete media record' });
    }
  }

  // Always keep local fallback in sync
  const cmsData = readCmsData();
  if (cmsData.media) {
    cmsData.media = cmsData.media.filter((m: any) => m.id !== id);
    writeCmsData(cmsData);
  }

  return res.json({ success: true });
});

// CATEGORIES (PUBLIC READ)
app.get('/api/cms/categories', async (req, res) => {
  if (serverSupabase) {
    try {
      const { data, error } = await serverSupabase.from('categories').select('*');
      if (error) {
        console.error('[Supabase GET Categories Error]', error.message);
        return res.status(503).json({ error: 'Database service unavailable' });
      }
      return res.json(data || []);
    } catch (err) {
      console.error('[Supabase GET Categories Exception]', err);
      return res.status(503).json({ error: 'Database service unavailable' });
    }
  }
  const data = readCmsData();
  return res.json(data.categories || []);
});

// CATEGORIES (PROTECTED WRITE)
app.post('/api/cms/categories', requireAdmin, async (req, res) => {
  const cat = req.body;
  if (!cat || !cat.id) {
    return res.status(400).json({ error: 'Invalid category payload' });
  }

  if (serverSupabase) {
    try {
      const { error } = await serverSupabase.from('categories').upsert(cat);
      if (error) {
        console.error('[Supabase POST Category Error]', error.message);
        return res.status(500).json({ error: 'Failed to save category' });
      }
      return res.json({ success: true, category: cat });
    } catch (err) {
      console.error('[Supabase POST Category Exception]', err);
      return res.status(500).json({ error: 'Failed to save category' });
    }
  }

  const data = readCmsData();
  data.categories = data.categories || [];
  const idx = data.categories.findIndex((c: any) => c.id === cat.id);
  if (idx >= 0) {
    data.categories[idx] = cat;
  } else {
    data.categories.push(cat);
  }
  writeCmsData(data);

  return res.json({ success: true, category: cat });
});

// CATEGORIES (PROTECTED DELETE)
app.delete('/api/cms/categories/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    return res.status(400).json({ error: 'Invalid category ID format' });
  }

  if (serverSupabase) {
    try {
      const { error } = await serverSupabase.from('categories').delete().eq('id', id);
      if (error) {
        console.error('[Supabase DELETE Category Error]', error.message);
        return res.status(500).json({ error: 'Failed to delete category' });
      }
      return res.json({ success: true });
    } catch (err) {
      console.error('[Supabase DELETE Category Exception]', err);
      return res.status(500).json({ error: 'Failed to delete category' });
    }
  }

  const data = readCmsData();
  if (data.categories) {
    data.categories = data.categories.filter((c: any) => c.id !== id);
    writeCmsData(data);
  }

  return res.json({ success: true });
});

// ==================== PROTECTED ANALYTICS API ENDPOINTS ====================

// Status Check
app.get('/api/analytics/status', requireAdmin, (req, res) => {
  const measurementId = process.env.VITE_GA4_MEASUREMENT_ID || 'G-G3WJXY6THP';
  const propertyId = process.env.GA4_PROPERTY_ID || '549083163';
  const clientEmail = process.env.GA4_CLIENT_EMAIL || '';
  const hasPrivateKey = Boolean(process.env.GA4_PRIVATE_KEY);

  const hasTrackingId = Boolean(measurementId && !measurementId.includes('G-XXXXXXXXXX'));
  const hasReportingCredentials = Boolean(propertyId && clientEmail && hasPrivateKey);

  res.json({
    status: 'ok',
    hasTrackingId,
    hasReportingCredentials,
    measurementId: hasTrackingId ? measurementId : null,
    propertyId: propertyId || null,
  });
});

// Real-time Users Endpoint
app.get('/api/analytics/realtime', requireAdmin, async (req, res) => {
  try {
    const propertyId = process.env.GA4_PROPERTY_ID || '549083163';
    const clientEmail = process.env.GA4_CLIENT_EMAIL;
    const privateKey = process.env.GA4_PRIVATE_KEY;

    if (!propertyId || !clientEmail || !privateKey) {
      return res.status(200).json({
        configured: false,
        activeUsers: 0,
        message: 'GA4 Service Account credentials not configured.',
      });
    }

    const accessToken = await getGA4AccessToken(clientEmail, privateKey);
    const response = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runRealtimeReport`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          metrics: [{ name: 'activeUsers' }],
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      return res.status(200).json({
        configured: false,
        activeUsers: 0,
        error: `GA4 Realtime API Error: ${response.status}`,
      });
    }

    const data = await response.json();
    const activeUsers = parseInt(data.rows?.[0]?.metricValues?.[0]?.value || '0', 10);

    return res.json({
      configured: true,
      activeUsers,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error fetching GA4 realtime data:', error);
    return res.status(200).json({
      configured: false,
      activeUsers: 0,
      error: 'Failed to connect to GA4 Realtime API.',
    });
  }
});

// Complete Report Analytics Endpoint
app.get('/api/analytics/report', requireAdmin, async (req, res) => {
  try {
    const propertyId = process.env.GA4_PROPERTY_ID || '549083163';
    const clientEmail = process.env.GA4_CLIENT_EMAIL;
    const privateKey = process.env.GA4_PRIVATE_KEY;

    if (!propertyId || !clientEmail || !privateKey) {
      return res.status(200).json({
        configured: false,
        message: 'GA4 Service Account credentials not provided in environment variables.',
      });
    }

    const { range = '30d', startDate, endDate } = req.query as {
      range?: string;
      startDate?: string;
      endDate?: string;
    };

    let start = '30daysAgo';
    let end = 'today';

    if (range === 'today') {
      start = 'today';
      end = 'today';
    } else if (range === 'yesterday') {
      start = 'yesterday';
      end = 'yesterday';
    } else if (range === '7d') {
      start = '7daysAgo';
    } else if (range === '30d') {
      start = '30daysAgo';
    } else if (range === '90d') {
      start = '90daysAgo';
    } else if (range === 'custom' && startDate && endDate) {
      start = startDate;
      end = endDate;
    }

    const accessToken = await getGA4AccessToken(clientEmail, privateKey);

    const overviewRes = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateRanges: [{ startDate: start, endDate: end }],
          metrics: [
            { name: 'activeUsers' },
            { name: 'newUsers' },
            { name: 'sessions' },
            { name: 'screenPageViews' },
            { name: 'engagementRate' },
            { name: 'userEngagementDuration' },
          ],
        }),
      }
    );

    const timeframesRes = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateRanges: [
            { startDate: 'today', endDate: 'today', name: 'today' },
            { startDate: '7daysAgo', endDate: 'today', name: '7d' },
            { startDate: '30daysAgo', endDate: 'today', name: '30d' },
          ],
          metrics: [{ name: 'activeUsers' }],
        }),
      }
    );

    const pagesRes = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateRanges: [{ startDate: start, endDate: end }],
          dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
          metrics: [
            { name: 'activeUsers' },
            { name: 'screenPageViews' },
            { name: 'engagementRate' },
            { name: 'userEngagementDuration' },
          ],
          limit: 25,
        }),
      }
    );

    const sourcesRes = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateRanges: [{ startDate: start, endDate: end }],
          dimensions: [{ name: 'sessionSource' }],
          metrics: [{ name: 'activeUsers' }, { name: 'sessions' }],
          limit: 10,
        }),
      }
    );

    const eventsRes = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateRanges: [{ startDate: start, endDate: end }],
          dimensions: [{ name: 'eventName' }],
          metrics: [{ name: 'eventCount' }],
          limit: 25,
        }),
      }
    );

    const devicesRes = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateRanges: [{ startDate: start, endDate: end }],
          dimensions: [{ name: 'deviceCategory' }],
          metrics: [{ name: 'activeUsers' }],
        }),
      }
    );

    const browsersRes = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateRanges: [{ startDate: start, endDate: end }],
          dimensions: [{ name: 'browser' }],
          metrics: [{ name: 'activeUsers' }],
          limit: 10,
        }),
      }
    );

    const geoRes = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateRanges: [{ startDate: start, endDate: end }],
          dimensions: [{ name: 'country' }, { name: 'city' }],
          metrics: [{ name: 'activeUsers' }],
          limit: 15,
        }),
      }
    );

    const overviewData = overviewRes.ok ? await overviewRes.json() : null;
    const timeframesData = timeframesRes.ok ? await timeframesRes.json() : null;
    const pagesData = pagesRes.ok ? await pagesRes.json() : null;
    const sourcesData = sourcesRes.ok ? await sourcesRes.json() : null;
    const eventsData = eventsRes.ok ? await eventsRes.json() : null;
    const devicesData = devicesRes.ok ? await devicesRes.json() : null;
    const browsersData = browsersRes.ok ? await browsersRes.json() : null;
    const geoData = geoRes.ok ? await geoRes.json() : null;

    const activeUsersVal = parseInt(overviewData?.rows?.[0]?.metricValues?.[0]?.value || '0', 10);
    const newUsersVal = parseInt(overviewData?.rows?.[0]?.metricValues?.[1]?.value || '0', 10);
    const returningUsersVal = Math.max(0, activeUsersVal - newUsersVal);

    let usersToday = 0;
    let users7d = 0;
    let users30d = 0;

    if (timeframesData?.rows) {
      for (const r of timeframesData.rows) {
        const dRangeName = r.dimensionValues?.[0]?.value || r.dateRange || '';
        const val = parseInt(r.metricValues?.[0]?.value || '0', 10);
        if (dRangeName === 'today' || r.dateRange === 'date_range_0') usersToday = val;
        if (dRangeName === '7d' || r.dateRange === 'date_range_1') users7d = val;
        if (dRangeName === '30d' || r.dateRange === 'date_range_2') users30d = val;
      }
    }

    const rawPagesList = pagesData?.rows?.map((r: any) => {
      const pagePath = r.dimensionValues?.[0]?.value || '/';
      const rawTitle = r.dimensionValues?.[1]?.value || 'Untitled Page';
      return {
        path: pagePath,
        title: rawTitle,
        users: parseInt(r.metricValues?.[0]?.value || '0', 10),
        views: parseInt(r.metricValues?.[1]?.value || '0', 10),
        engagementRateRaw: parseFloat(r.metricValues?.[2]?.value || '0'),
        engagementDurationRaw: parseFloat(r.metricValues?.[3]?.value || '0'),
      };
    }) || [];

    const pagePathMap = new Map<string, {
      path: string;
      title: string;
      users: number;
      views: number;
      totalRateWeighted: number;
      totalDuration: number;
    }>();

    const titleLookup: Record<string, string> = {
      '/': 'ProBitian - Master Business Intelligence',
      '/learn': 'Learn - Courses & Skill Modules',
      '/projects': 'Projects - Hands-on Portfolios',
      '/blog': 'Blog - Industry Insights & Articles',
      '/about': 'About ProBitian & Vision',
      '/contact': 'Contact Us & General Inquiries',
      '/admin': 'ProBitian Admin Command Center',
    };

    for (const item of rawPagesList) {
      const cleanTitle = titleLookup[item.path] || item.title;
      const existing = pagePathMap.get(item.path);

      if (!existing) {
        pagePathMap.set(item.path, {
          path: item.path,
          title: cleanTitle,
          users: item.users,
          views: item.views,
          totalRateWeighted: item.engagementRateRaw * item.views,
          totalDuration: item.engagementDurationRaw,
        });
      } else {
        existing.users = Math.max(existing.users, item.users);
        existing.views += item.views;
        existing.totalRateWeighted += item.engagementRateRaw * item.views;
        existing.totalDuration += item.engagementDurationRaw;
        if (cleanTitle && cleanTitle !== 'Untitled Page' && cleanTitle.length > existing.title.length) {
          existing.title = cleanTitle;
        }
      }
    }

    const aggregatedPages = Array.from(pagePathMap.values()).map((p) => {
      const avgRate = p.views > 0 ? p.totalRateWeighted / p.views : 0;
      const avgTimeSec = p.views > 0 ? Math.round(p.totalDuration / p.views) : 0;
      return {
        path: p.path,
        title: p.title,
        users: p.users,
        views: p.views,
        engagement: (avgRate * 100).toFixed(1) + '%',
        avgTime: avgTimeSec + 's',
      };
    });

    res.json({
      configured: true,
      timestamp: new Date().toISOString(),
      range: { start, end },
      timeframeUsers: {
        usersToday,
        users7d,
        users30d,
      },
      overview: {
        activeUsers: activeUsersVal,
        newUsers: newUsersVal,
        returningUsers: returningUsersVal,
        sessions: parseInt(overviewData?.rows?.[0]?.metricValues?.[2]?.value || '0', 10),
        pageViews: parseInt(overviewData?.rows?.[0]?.metricValues?.[3]?.value || '0', 10),
        engagementRate: (parseFloat(overviewData?.rows?.[0]?.metricValues?.[4]?.value || '0') * 100).toFixed(1) + '%',
        avgEngagementTime: Math.round(parseFloat(overviewData?.rows?.[0]?.metricValues?.[5]?.value || '0')) + 's',
      },
      pages: aggregatedPages,
      sources: sourcesData?.rows?.map((r: any) => ({
        source: r.dimensionValues?.[0]?.value || 'Direct / None',
        users: parseInt(r.metricValues?.[0]?.value || '0', 10),
        sessions: parseInt(r.metricValues?.[1]?.value || '0', 10),
      })) || [],
      events: eventsData?.rows?.map((r: any) => ({
        eventName: r.dimensionValues?.[0]?.value || 'event',
        count: parseInt(r.metricValues?.[0]?.value || '0', 10),
      })) || [],
      devices: devicesData?.rows?.map((r: any) => ({
        device: r.dimensionValues?.[0]?.value || 'Desktop',
        users: parseInt(r.metricValues?.[0]?.value || '0', 10),
      })) || [],
      browsers: browsersData?.rows?.map((r: any) => ({
        browser: r.dimensionValues?.[0]?.value || 'Chrome',
        users: parseInt(r.metricValues?.[0]?.value || '0', 10),
      })) || [],
      geography: geoData?.rows?.map((r: any) => ({
        country: r.dimensionValues?.[0]?.value || 'Unknown',
        city: r.dimensionValues?.[1]?.value || 'Unknown',
        users: parseInt(r.metricValues?.[0]?.value || '0', 10),
      })) || [],
    });
  } catch (error: any) {
    console.error('Error fetching GA4 report data:', error);
    res.status(200).json({
      configured: false,
      error: 'Failed to query GA4 Data API.',
    });
  }
});

// Global API Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.path.startsWith('/api/') || req.originalUrl.startsWith('/api/')) {
    console.error('[API Error]', err);
    return res.status(err.status || 500).set('Content-Type', 'application/json').json({
      error: 'An internal server error occurred',
      path: req.originalUrl
    });
  }
  next(err);
});

// API 404 Catch-All Handler
app.all('/api/*', (req, res) => {
  res.status(404).set('Content-Type', 'application/json').json({
    error: 'API endpoint not found',
    path: req.originalUrl
  });
});

// SEO Endpoints: robots.txt and sitemap.xml
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send(`User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/

Sitemap: https://probitian.ai.studio/sitemap.xml
`);
});

app.get('/sitemap.xml', async (req, res) => {
  const baseUrl = 'https://probitian.ai.studio';
  const currentDate = new Date().toISOString().split('T')[0];

  let dynamicBlogUrls = `  <url>
    <loc>${baseUrl}/blog/mastering-advanced-dax-calculation-groups</loc>
    <lastmod>2026-08-15</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/blog/essential-sql-window-functions-bi-analysts</loc>
    <lastmod>2026-08-10</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/blog/power-query-m-optimization-dataflows</loc>
    <lastmod>2026-08-04</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`;

  if (serverSupabase) {
    try {
      const { data: blogs } = await serverSupabase
        .from('blogs')
        .select('slug, title, updated_at, created_at, status')
        .eq('status', 'published');

      if (blogs && blogs.length > 0) {
        dynamicBlogUrls = blogs.map((b: any) => {
          const rawSlug = b.slug || b.title?.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '') || 'article';
          const lastmod = (b.updated_at || b.created_at || currentDate).split('T')[0];
          return `  <url>
    <loc>${baseUrl}/blog/${rawSlug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`;
        }).join('\n');
      }
    } catch (e) {
      console.warn('[SEO Sitemap] Error querying database blogs:', e);
    }
  }

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Core Public Pages -->
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/learn</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/projects</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/blog</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/about</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/contact</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/privacy</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.4</priority>
  </url>
  <url>
    <loc>${baseUrl}/terms</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.4</priority>
  </url>

  <!-- Published Technical Blog Posts -->
${dynamicBlogUrls}
</urlset>`;

  res.type('application/xml');
  res.send(sitemapXml);
});

// Serve public directory and documentation assets
app.use('/docs', express.static(path.join(process.cwd(), 'public', 'docs')));
app.use(express.static(path.join(process.cwd(), 'public')));

// Known valid frontend SPA paths
const VALID_SPA_ROUTES = new Set([
  '/',
  '/about',
  '/projects',
  '/blog',
  '/learn',
  '/courses',
  '/contact',
  '/privacy',
  '/privacy-policy',
  '/terms',
  '/terms-of-service',
  '/admin'
]);

function isKnownSpaRoute(urlPath: string): boolean {
  const cleanPath = urlPath.split('?')[0].toLowerCase().replace(/\/+$/, '') || '/';
  if (VALID_SPA_ROUTES.has(cleanPath)) return true;
  if (cleanPath.startsWith('/blog/')) return true;
  return false;
}

// Start Express and Vite server
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);

    app.get('*', async (req, res, next) => {
      const url = req.originalUrl;
      if (url.startsWith('/api/')) {
        return next();
      }

      try {
        const templatePath = path.join(process.cwd(), 'index.html');
        let template = fs.readFileSync(templatePath, 'utf-8');
        template = await vite.transformIndexHtml(url, template);

        const status = isKnownSpaRoute(url) ? 200 : 404;
        res.status(status).set({ 'Content-Type': 'text/html' }).send(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      const url = req.originalUrl;
      const status = isKnownSpaRoute(url) ? 200 : 404;
      res.status(status).sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', async () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    // Initialize default Lead CRM Sequences
    try {
      await ensureDefaultLeadSequence();
    } catch (e) {
      console.warn('[Server Init] Default sequence check:', e);
    }

    // Schedule automated email sequence background worker every 60 seconds
    setInterval(() => {
      processActiveSequences().catch(err => {
        console.error('[Automated Sequence Worker Error]', err);
      });
    }, 60000);
  });
}

startServer();
