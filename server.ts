import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import { emailService } from './src/services/emailService';
import { campaignEmailService } from './src/services/campaignEmailService';

dotenv.config();

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
    const reqHost = ((req.headers['x-forwarded-host'] as string) || req.headers.host || '').toLowerCase();

    // Direct host match (same domain/port)
    if (host === reqHost) return true;

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

const adminSessions = new Map<string, AdminSession>();

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
  const token = cookies['admin_session'];

  if (!token) return null;

  const session = adminSessions.get(token);
  if (!session) return null;

  if (Date.now() > session.expiresAt) {
    adminSessions.delete(token);
    return null;
  }

  return session;
}

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const session = getAdminSession(req);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized: Admin authentication required' });
  }
  (req as any).adminSession = session;
  next();
}

// ==================== RATE LIMITING MIDDLEWARE ====================
interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
}

function createRateLimiter(options: RateLimitOptions) {
  const requests = new Map<string, { count: number; resetTime: number }>();

  setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of requests.entries()) {
      if (now > data.resetTime) requests.delete(ip);
    }
  }, 5 * 60 * 1000);

  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip = (req.ip || (req.socket && req.socket.remoteAddress) || 'unknown').trim();
    const now = Date.now();
    const record = requests.get(ip);

    if (!record || now > record.resetTime) {
      requests.set(ip, { count: 1, resetTime: now + options.windowMs });
      return next();
    }

    if (record.count >= options.max) {
      return res.status(429).json({
        error: options.message || 'Too many requests. Please try again later.'
      });
    }

    record.count += 1;
    next();
  };
}

const loginLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 10, message: 'Too many login attempts. Please try again in 15 minutes.' });
const newsletterLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 10, message: 'Too many subscription attempts. Please try again later.' });
const unsubscribeLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 20, message: 'Too many unsubscribe requests. Please try again later.' });
const contactLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 10, message: 'Too many contact messages sent. Please try again later.' });
const uploadLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 30, message: 'Too many upload requests. Please try again later.' });
const emailTestLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 10, message: 'Too many test emails sent. Please try again later.' });
const emailSendLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 5, message: 'Too many campaign broadcasts requested. Please try again later.' });

// ==================== SIGNED UNSUBSCRIBE TOKENS ====================
// Ephemeral fallback key generated per server process instance if no explicit secret key is set in environment
const EPHEMERAL_SERVER_KEY = crypto.randomBytes(32).toString('hex');

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
  
  // Strip all executable script tags and contents
  clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Strip dangerous embedded content tags
  const dangerousTags = ['iframe', 'object', 'embed', 'foreignObject', 'applet', 'meta', 'link', 'form', 'base', 'frame', 'frameset'];
  for (const tag of dangerousTags) {
    clean = clean.replace(new RegExp(`<${tag}\\b[^<]*(?:(?!<\\/${tag}>)<[^<]*)*<\\/${tag}>`, 'gi'), '');
    clean = clean.replace(new RegExp(`<${tag}\\b[^>]*\\/?>`, 'gi'), '');
  }

  // Strip all inline DOM event handlers (onload, onerror, onclick, onmouseover, etc.)
  clean = clean.replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');

  // Strip dangerous URL schemes in attributes (javascript:, data:text/html, vbscript:)
  clean = clean.replace(/(href|src|xlink:href|action|data)\s*=\s*(?:"\s*(?:javascript|vbscript|data:text\/html)[^"]*"|'\s*(?:javascript|vbscript|data:text\/html)[^']*')/gi, '$1="#"');
  clean = clean.replace(/(href|src|xlink:href|action|data)\s*=\s*(?:javascript|vbscript|data:text\/html)[^\s>]+/gi, '$1="#"');

  return clean;
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

// Local storage files for offline / unconfigured dev environment
const CMS_DATA_FILE = path.join(process.cwd(), 'data', 'cms_settings.json');

function readCmsData() {
  try {
    if (fs.existsSync(CMS_DATA_FILE)) {
      const content = fs.readFileSync(CMS_DATA_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Error reading CMS data file:', err);
  }
  return {};
}

function writeCmsData(data: any) {
  try {
    const dir = path.dirname(CMS_DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CMS_DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing CMS data file:', err);
  }
}

// Helper to acquire Google OAuth2 Access Token for GA4 Data API via Service Account
async function getGA4AccessToken(clientEmail: string, privateKey: string): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claimSet = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now - 60,
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
    let adminEmail = 'admin@probitian.com';
    if (typeof email === 'string' && email.trim()) {
      const cleanEmail = email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(cleanEmail)) {
        adminEmail = cleanEmail;
      }
    }

    const token = crypto.randomBytes(32).toString('hex');
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

    // 3. Check Supabase app_metadata / user_metadata role
    if (!isAuthorizedAdmin) {
      const appRole = verifiedUser.app_metadata?.role;
      const userRole = verifiedUser.user_metadata?.role;
      if (appRole === 'admin' || userRole === 'admin') {
        isAuthorizedAdmin = true;
      }
    }

    if (!isAuthorizedAdmin) {
      console.warn(`[SECURITY] Unauthorized Supabase user attempted admin login: ${userEmail} (${verifiedUser.id})`);
      return res.status(403).json({ error: 'Forbidden: Account does not have administrator privileges' });
    }

    const token = crypto.randomBytes(32).toString('hex');
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
  const token = cookies['admin_session'];
  if (token) {
    adminSessions.delete(token);
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
      const { data, error } = await serverSupabase.from('settings').select('value').eq('key', 'general').single();
      if (!error && data?.value) {
        return res.json(data.value);
      }
      if (error && error.code !== 'PGRST116') {
        console.warn('[CMS Settings General Read Warning]', error.message);
      }
    } catch (err: any) {
      console.warn('[CMS Settings General Read Exception]', err?.message || err);
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
      const { data, error } = await serverSupabase.from('settings').select('value').eq('key', 'seo').single();
      if (!error && data?.value) {
        return res.json(data.value);
      }
      if (error && error.code !== 'PGRST116') {
        console.warn('[CMS SEO Read Warning]', error.message);
      }
    } catch (err: any) {
      console.warn('[CMS SEO Read Exception]', err?.message || err);
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
      const { data, error } = await serverSupabase.from('settings').select('value').eq('key', 'legal_policies').single();
      if (!error && data?.value) {
        return res.json(data.value);
      }
      if (error && error.code !== 'PGRST116') {
        console.warn('[CMS Legal Read Warning]', error.message);
      }
    } catch (err: any) {
      console.warn('[CMS Legal Read Exception]', err?.message || err);
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
      const { data, error } = await serverSupabase.from('pages').select('*').eq('page_key', 'home').single();
      if (!error && data) {
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
      if (error && error.code !== 'PGRST116') {
        console.warn('[CMS Home Config Read Warning]', error.message);
      }
    } catch (err: any) {
      console.warn('[CMS Home Config Read Exception]', err?.message || err);
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
      if (!error && Array.isArray(data) && data.length > 0) {
        return res.json(data);
      }
      if (error) {
        console.warn('[CMS Projects Read Warning]', error.message);
      }
    } catch (err: any) {
      console.warn('[CMS Projects Read Exception]', err?.message || err);
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
      if (!error && Array.isArray(data) && data.length > 0) {
        return res.json(data);
      }
      if (error) {
        console.warn('[CMS Blogs Read Warning]', error.message);
      }
    } catch (err: any) {
      console.warn('[CMS Blogs Read Exception]', err?.message || err);
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
      if (!error && Array.isArray(data) && data.length > 0) {
        return res.json(data);
      }
      if (error) {
        console.warn('[CMS Courses Read Warning]', error.message);
      }
    } catch (err: any) {
      console.warn('[CMS Courses Read Exception]', err?.message || err);
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
      if (!error && Array.isArray(data) && data.length > 0) {
        return res.json(data);
      }
      if (error) {
        console.warn('[CMS Videos Read Warning]', error.message);
      }
    } catch (err: any) {
      console.warn('[CMS Videos Read Exception]', err?.message || err);
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
      if (!error && Array.isArray(data)) {
        return res.json(data);
      }
      if (error) {
        console.warn('[CMS Messages Read Warning]', error.message);
      }
    } catch (err: any) {
      console.warn('[CMS Messages Read Exception]', err?.message || err);
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
      if (!error && Array.isArray(data)) {
        return res.json(data);
      }
      if (error) {
        console.warn('[Subscribers Read Warning]', error.message);
      }
    } catch (err: any) {
      console.warn('[Subscribers Read Exception]', err?.message || err);
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
      const { data: sbCamp } = await serverSupabase.from('email_campaigns').select('*').eq('id', id).single();
      if (sbCamp) campaign = sbCamp;
    } catch (e) {}
  }

  if (!campaign) {
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

// ==================== SOCIAL, NAVIGATION, MEDIA, CATEGORIES ====================

// SOCIAL LINKS (PUBLIC READ)
app.get('/api/cms/social', async (req, res) => {
  if (serverSupabase) {
    try {
      const { data, error } = await serverSupabase.from('social_links').select('*').order('display_order', { ascending: true });
      if (!error && data) {
        return res.json(data);
      }
    } catch (err) {
      console.warn('[Supabase GET Social Warning]', err);
    }
  }
  const data = readCmsData();
  return res.json(data.social_links || []);
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
        await serverSupabase.from('social_links').upsert(link);
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
      if (!error && data) {
        return res.json(data);
      }
    } catch (err) {
      console.warn('[Supabase GET Navigation Warning]', err);
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
        await serverSupabase.from('navigation').upsert(item);
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
      if (!error && Array.isArray(data)) {
        return res.json(data);
      }
      if (error) {
        console.warn('[Media Read Warning]', error.message);
      }
    } catch (err: any) {
      console.warn('[Media Read Exception]', err?.message || err);
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
      id: 'm-' + Date.now() + '-' + crypto.randomBytes(3).toString('hex'),
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
  const itemWithId = {
    id: mediaItem.id || ('m-' + Date.now()),
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

  if (serverSupabase) {
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

  if (serverSupabase) {
    try {
      const { error: dbErr } = await serverSupabase.from('media').delete().eq('id', id);
      if (dbErr) {
        console.error('[Supabase DB Delete Media Warning]', dbErr);
        return res.status(500).json({ error: 'Failed to delete media record' });
      }
    } catch (e) {
      return res.status(500).json({ error: 'Failed to delete media record' });
    }
  } else {
    const cmsData = readCmsData();
    if (cmsData.media) {
      cmsData.media = cmsData.media.filter((m: any) => m.id !== id);
      writeCmsData(cmsData);
    }
  }

  return res.json({ success: true });
});

// CATEGORIES (PUBLIC READ)
app.get('/api/cms/categories', async (req, res) => {
  if (serverSupabase) {
    try {
      const { data, error } = await serverSupabase.from('categories').select('*');
      if (!error && data) {
        return res.json(data);
      }
    } catch (err) {
      console.warn('[Supabase GET Categories Warning]', err);
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
      await serverSupabase.from('categories').upsert(cat);
      return res.json({ success: true, category: cat });
    } catch (err) {
      console.error('[Supabase POST Category Error]', err);
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
      await serverSupabase.from('categories').delete().eq('id', id);
      return res.json({ success: true });
    } catch (err) {
      console.error('[Supabase DELETE Category Error]', err);
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

// Serve public directory and documentation assets
app.use('/docs', express.static(path.join(process.cwd(), 'public', 'docs')));
app.use(express.static(path.join(process.cwd(), 'public')));

// Start Express and Vite server
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
