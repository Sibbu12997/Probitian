import 'dotenv/config';
import crypto from 'crypto';
import express from 'express';
import { AdminSession, SessionTokenPayload, UserRole } from './types';

export const adminSessions = new Map<string, AdminSession>();
export const revokedSessions = new Set<string>();
export const userRevocationTimestamps = new Map<string, number>();
export let globalRevocationTimestamp: number = Date.now();

export function revokeAllSessions(): void {
  globalRevocationTimestamp = Date.now();
  for (const [token] of adminSessions.entries()) {
    revokedSessions.add(token);
  }
  adminSessions.clear();
}

export function parseCookies(req: express.Request): Record<string, string> {
  const list: Record<string, string> = {};
  const rc = req.headers?.cookie;
  if (rc) {
    const rawCookies = Array.isArray(rc) ? rc.join('; ') : rc;
    rawCookies.split(';').forEach(cookie => {
      const parts = cookie.split('=');
      if (parts.length >= 2) {
        const key = parts.shift()!.trim();
        let val = parts.join('=');
        try {
          val = decodeURIComponent(val);
        } catch {
          // Fall back to raw string if decodeURIComponent fails on malformed encoding
        }
        list[key] = val;
      }
    });
  }
  return list;
}

export function validateSessionSecretConfig(): void {
  const isProd = process.env.NODE_ENV === 'production';
  const secret = process.env.SESSION_SECRET?.trim();
  if (isProd) {
    if (!secret || secret.length < 32) {
      throw new Error('SESSION_SECRET must be configured with a strong value (minimum 32 characters) in production.');
    }
  }
}

export function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET?.trim();
  if (secret && secret.length >= 32) {
    return secret;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET must be configured with a strong value (minimum 32 characters) in production.');
  }
  return secret || 'probitian-dev-local-session-secret-2026-only-for-dev';
}

export function createSignedSessionToken(
  email: string,
  role: UserRole = UserRole.ADMIN,
  userId?: string,
  maxAgeMs: number = 24 * 60 * 60 * 1000
): string {
  const cleanEmail = (email || 'admin@probitian.com').toLowerCase().trim();
  const payload: SessionTokenPayload = {
    email: cleanEmail,
    role,
    userId,
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

export function createAdminSession(
  email: string,
  role: UserRole = UserRole.ADMIN,
  userId?: string,
  maxAgeMs: number = 24 * 60 * 60 * 1000
): AdminSession {
  const token = createSignedSessionToken(email, role, userId, maxAgeMs);
  const session: AdminSession = {
    token,
    email: (email || 'admin@probitian.com').toLowerCase().trim(),
    role,
    userId,
    createdAt: Date.now(),
    expiresAt: Date.now() + maxAgeMs
  };
  adminSessions.set(token, session);
  return session;
}

export function verifySignedSessionToken(token: string): AdminSession | null {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  if (revokedSessions.has(token)) return null;
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

    const payload = JSON.parse(Buffer.from(payloadStr, 'base64url').toString('utf-8')) as SessionTokenPayload;
    if (!payload || !payload.email || !payload.expiresAt) return null;
    if (Date.now() > payload.expiresAt) return null;

    const cleanEmail = payload.email.toLowerCase().trim();
    const emailRevokedAt = userRevocationTimestamps.get(cleanEmail);
    const userRevokedAt = payload.userId ? userRevocationTimestamps.get(payload.userId) : undefined;
    const createdAt = payload.createdAt || Date.now();

    if (createdAt <= globalRevocationTimestamp || (emailRevokedAt && createdAt <= emailRevokedAt) || (userRevokedAt && createdAt <= userRevokedAt)) {
      revokedSessions.add(token);
      return null;
    }

    const validatedRole: UserRole = payload.role === UserRole.ADMIN || payload.role === UserRole.EDITOR ? payload.role : UserRole.USER;

    return {
      token,
      email: payload.email,
      role: validatedRole,
      userId: payload.userId,
      createdAt,
      expiresAt: payload.expiresAt
    };
  } catch (e) {
    return null;
  }
}

export function isRequestHttps(req: express.Request): boolean {
  if (req.secure) return true;
  const protoHeader = req.headers['x-forwarded-proto'];
  if (typeof protoHeader === 'string') {
    const firstProto = protoHeader.split(',')[0].trim().toLowerCase();
    if (firstProto === 'https') return true;
  }
  if (req.headers['x-forwarded-ssl'] === 'on') return true;
  if (Boolean(process.env.AIS_APPLET_ID) || Boolean(process.env.AI_STUDIO_APPLET_ID)) return true;
  if (process.env.NODE_ENV === 'production') return true;
  return false;
}

export function determineSameSiteDirective(req: express.Request, isHttps: boolean): string {
  // If explicitly overridden via environment variable
  if (process.env.COOKIE_SAMESITE === 'none' && isHttps) {
    return 'SameSite=None; Partitioned';
  }
  if (process.env.COOKIE_SAMESITE === 'lax') {
    return 'SameSite=Lax';
  }

  // Never use SameSite=None on insecure HTTP (browsers reject SameSite=None without Secure)
  if (!isHttps) {
    return 'SameSite=Lax';
  }

  const rawHost = (
    (typeof req.get === 'function' ? (req.get('x-forwarded-host') || req.get('host')) : null) ||
    req.headers?.['x-forwarded-host'] ||
    req.headers?.['host'] ||
    ''
  );
  const host = (Array.isArray(rawHost) ? rawHost[0] : String(rawHost)).toLowerCase().trim();

  // Production ProBitian domains: always enforce standard first-party SameSite=Lax
  if (host === 'probitian.com' || host === 'www.probitian.com' || host.endsWith('.probitian.com')) {
    return 'SameSite=Lax';
  }

  // Unit tests and local development without remote container host: default to SameSite=Lax
  if (!host || host === 'localhost' || host === '127.0.0.1' || host.startsWith('localhost:') || host.startsWith('127.0.0.1:')) {
    return 'SameSite=Lax';
  }

  // Cloud Run / AI Studio preview environment: requires SameSite=None; Partitioned for embedded iframe
  const origin = (typeof req.get === 'function' ? req.get('origin') : req.headers?.['origin']) || '';
  const referer = (typeof req.get === 'function' ? req.get('referer') : req.headers?.['referer']) || '';
  const isPreview = host.endsWith('.run.app') || 
                    host.includes('aistudio') || 
                    host.endsWith('.ai.studio') || 
                    origin.includes('.run.app') || 
                    referer.includes('.run.app') ||
                    (Boolean(process.env.APP_URL) && process.env.APP_URL.includes('.run.app'));

  if (isPreview) {
    return 'SameSite=None; Partitioned';
  }

  return 'SameSite=Lax';
}

export function getAdminCookieHeader(token: string, req: express.Request, maxAgeSeconds: number = 86400): string {
  const isHttps = isRequestHttps(req);
  const secureFlag = isHttps ? '; Secure' : '';
  const sameSiteDirective = determineSameSiteDirective(req, isHttps);

  if (maxAgeSeconds === 0) {
    return `admin_session=; HttpOnly; Path=/; ${sameSiteDirective}${secureFlag}; Max-Age=0`;
  }

  return `admin_session=${token}; HttpOnly; Path=/; ${sameSiteDirective}${secureFlag}; Max-Age=${maxAgeSeconds}`;
}

export type SessionValidationFailureReason =
  | 'NO_COOKIE'
  | 'REVOKED'
  | 'EXPIRED'
  | 'USER_REVOKED'
  | 'INVALID_FORMAT'
  | 'INVALID_SIGNATURE'
  | 'NONE';

export function getAdminSessionWithDiagnostic(req: express.Request): {
  session: AdminSession | null;
  reason: SessionValidationFailureReason;
  hasCookie: boolean;
} {
  const parsedCookies = parseCookies(req);
  const token = (req as any).cookies?.admin_session || parsedCookies['admin_session'];

  if (!token) {
    return { session: null, reason: 'NO_COOKIE', hasCookie: false };
  }

  if (revokedSessions.has(token)) {
    return { session: null, reason: 'REVOKED', hasCookie: true };
  }

  const inMemory = adminSessions.get(token);
  if (inMemory) {
    if (Date.now() > inMemory.expiresAt) {
      adminSessions.delete(token);
      return { session: null, reason: 'EXPIRED', hasCookie: true };
    }

    const cleanEmail = inMemory.email.toLowerCase().trim();
    const emailRevokedAt = userRevocationTimestamps.get(cleanEmail);
    const userRevokedAt = inMemory.userId ? userRevocationTimestamps.get(inMemory.userId) : undefined;
    if (inMemory.createdAt <= globalRevocationTimestamp || (emailRevokedAt && inMemory.createdAt <= emailRevokedAt) || (userRevokedAt && inMemory.createdAt <= userRevokedAt)) {
      adminSessions.delete(token);
      revokedSessions.add(token);
      return { session: null, reason: 'USER_REVOKED', hasCookie: true };
    }

    return { session: inMemory, reason: 'NONE', hasCookie: true };
  }

  // Stateless cryptographic fallback for multi-instance deployments
  if (!token.includes('.')) {
    return { session: null, reason: 'INVALID_FORMAT', hasCookie: true };
  }

  const verified = verifySignedSessionToken(token);
  if (verified) {
    adminSessions.set(token, verified);
    return { session: verified, reason: 'NONE', hasCookie: true };
  }

  return { session: null, reason: 'INVALID_SIGNATURE', hasCookie: true };
}

export function getAdminSession(req: express.Request): AdminSession | null {
  return getAdminSessionWithDiagnostic(req).session;
}

export function invalidateAdminSession(token: string): void {
  revokedSessions.add(token);
  adminSessions.delete(token);
}

export function invalidateUserSessions(identifier: { email?: string; userId?: string }): void {
  const now = Date.now();
  const cleanEmail = identifier.email ? identifier.email.toLowerCase().trim() : undefined;
  const userId = identifier.userId ? identifier.userId.trim() : undefined;

  if (cleanEmail) {
    userRevocationTimestamps.set(cleanEmail, now);
  }
  if (userId) {
    userRevocationTimestamps.set(userId, now);
  }

  for (const [token, session] of adminSessions.entries()) {
    const matchEmail = cleanEmail && session.email.toLowerCase().trim() === cleanEmail;
    const matchUser = userId && session.userId === userId;
    if (matchEmail || matchUser) {
      revokedSessions.add(token);
      adminSessions.delete(token);
    }
  }
}

export const revokeSession = invalidateAdminSession;

// Expired session cleanup interval (every 15 minutes)
const sessionCleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [token, session] of adminSessions.entries()) {
    if (now > session.expiresAt) {
      adminSessions.delete(token);
    }
  }
}, 15 * 60 * 1000);

if (sessionCleanupTimer && typeof sessionCleanupTimer.unref === 'function') {
  sessionCleanupTimer.unref();
}

