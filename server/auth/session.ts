import crypto from 'crypto';
import express from 'express';
import { EPHEMERAL_SERVER_KEY } from '../config/constants';
import { AdminSession, SessionTokenPayload, UserRole } from './types';

export const adminSessions = new Map<string, AdminSession>();
export const revokedSessions = new Set<string>();
export const userRevocationTimestamps = new Map<string, number>();

export function parseCookies(req: express.Request): Record<string, string> {
  const list: Record<string, string> = {};
  const rc = req.headers.cookie;
  if (rc) {
    rc.split(';').forEach(cookie => {
      const parts = cookie.split('=');
      if (parts.length >= 2) {
        list[parts.shift()!.trim()] = decodeURIComponent(parts.join('='));
      }
    });
  }
  return list;
}

export function getSessionSecret(): string {
  return (process.env.ADMIN_PASSKEY || process.env.SUPABASE_SECRET_KEY || process.env.SESSION_SECRET || EPHEMERAL_SERVER_KEY).trim();
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

    if ((emailRevokedAt && createdAt <= emailRevokedAt) || (userRevokedAt && createdAt <= userRevokedAt)) {
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

export function getAdminCookieHeader(token: string, req: express.Request, maxAgeSeconds: number = 86400): string {
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

export function getAdminSession(req: express.Request): AdminSession | null {
  const cookies = parseCookies(req);
  let token = cookies['admin_session'];

  if (!token) {
    const authHeader = req.headers['authorization'];
    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    } else if (req.headers['x-admin-token'] && typeof req.headers['x-admin-token'] === 'string') {
      token = (req.headers['x-admin-token'] as string).trim();
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

    const cleanEmail = session.email.toLowerCase().trim();
    const emailRevokedAt = userRevocationTimestamps.get(cleanEmail);
    const userRevokedAt = session.userId ? userRevocationTimestamps.get(session.userId) : undefined;
    if ((emailRevokedAt && session.createdAt <= emailRevokedAt) || (userRevokedAt && session.createdAt <= userRevokedAt)) {
      adminSessions.delete(token);
      revokedSessions.add(token);
      return null;
    }

    return session;
  }

  // Stateless cryptographic fallback for multi-instance deployments
  const verified = verifySignedSessionToken(token);
  if (verified) {
    adminSessions.set(token, verified);
    return verified;
  }

  return null;
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
