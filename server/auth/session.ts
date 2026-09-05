import 'dotenv/config';
import crypto from 'crypto';
import express from 'express';
import { AdminSession, SessionTokenPayload, UserRole } from './types';
import { serverSupabase } from '../services/supabase';

// ============================================================================
// 1. DISTRIBUTED SESSION REVOCATION STORE INTERFACES & IMPLEMENTATIONS
// ============================================================================

export type SessionValidationFailureReason =
  | 'NO_COOKIE'
  | 'REVOKED'
  | 'EXPIRED'
  | 'USER_REVOKED'
  | 'INVALID_FORMAT'
  | 'INVALID_SIGNATURE'
  | 'STORE_UNAVAILABLE'
  | 'REVOCATION_CHECK_FAILED'
  | 'NONE';

export class SessionRevocationError extends Error {
  public readonly code: 'STORE_UNAVAILABLE' | 'WRITE_FAILED' | 'REVOCATION_CHECK_FAILED';
  public readonly cause?: any;

  constructor(
    message: string,
    code: 'STORE_UNAVAILABLE' | 'WRITE_FAILED' | 'REVOCATION_CHECK_FAILED',
    cause?: any
  ) {
    super(message);
    this.name = 'SessionRevocationError';
    this.code = code;
    this.cause = cause;
    Object.setPrototypeOf(this, SessionRevocationError.prototype);
  }
}

export interface RevocationCheckParams {
  tokenHash: string;
  token: string;
  email?: string;
  userId?: string;
  createdAt: number;
}

export interface RevocationCheckResult {
  revoked: boolean;
  reason?: SessionValidationFailureReason;
  verified: boolean;
  error?: string;
}

export interface SessionRevocationStore {
  isRevoked(check: RevocationCheckParams | string): Promise<RevocationCheckResult>;
  revokeToken(token: string, tokenHash?: string, expiresAt?: number, reason?: string): Promise<void>;
  revokeUser(identifier: { email?: string; userId?: string }, reason?: string): Promise<void>;
  revokeAll(reason?: string): Promise<void>;
  getGlobalRevocationTimestamp(): Promise<number>;
  clearLocalState?(): void;
  clearLocalCache?(): void;
}

/**
 * Production-ready PostgreSQL/Supabase-backed distributed revocation store.
 * Ensures authoritative session invalidation across all Cloud Run instances.
 * 
 * FAIL-CLOSED SECURITY GUARANTEES:
 * 1. If Supabase is unavailable, offline, or returns a query error, authentication
 *    FAILS CLOSED (verified: false, revoked: true). Access is rejected with a safe error.
 * 2. Revocation write operations (token, user, all) throw SessionRevocationError on DB failure.
 * 3. Local caches serve ONLY as immutable optimizations for confirmed revocations;
 *    they NEVER override or replace authoritative database state.
 */
export class SupabaseSessionRevocationStore implements SessionRevocationStore {
  private localRevokedHashes = new Set<string>();
  private localUserRevocations = new Map<string, number>();
  private localGlobalRevocationTimestamp: number = 0;
  private client: any;

  constructor(client?: any) {
    // If client is explicitly passed (including null), respect it.
    // Otherwise default to the shared serverSupabase client.
    this.client = client !== undefined ? client : serverSupabase;
  }

  getClient(): any {
    return this.client;
  }

  async isRevoked(checkOrToken: RevocationCheckParams | string): Promise<RevocationCheckResult> {
    let check: RevocationCheckParams;
    if (typeof checkOrToken === 'string') {
      const token = checkOrToken;
      const tokenHash = hashSessionToken(token);
      let email: string | undefined;
      let userId: string | undefined;
      let createdAt = Date.now();
      try {
        const parts = token.split('.');
        if (parts[0]) {
          const payload = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf-8'));
          if (payload.email) email = payload.email.toLowerCase().trim();
          if (payload.userId) userId = payload.userId.trim();
          if (payload.createdAt) createdAt = Number(payload.createdAt);
        }
      } catch {
        // payload parse fallback
      }
      check = { token, tokenHash, email, userId, createdAt };
    } else {
      check = checkOrToken;
    }

    // 1. Process-local fast path for confirmed revocations only (immutable negative cache optimization)
    if (this.localRevokedHashes.has(check.tokenHash) || this.localRevokedHashes.has(check.token)) {
      return { revoked: true, verified: true, reason: 'REVOKED' };
    }
    if (this.localGlobalRevocationTimestamp > 0 && check.createdAt <= this.localGlobalRevocationTimestamp) {
      return { revoked: true, verified: true, reason: 'REVOKED' };
    }
    if (check.email) {
      const emailRevokedAt = this.localUserRevocations.get(`email:${check.email.toLowerCase().trim()}`);
      if (emailRevokedAt && check.createdAt <= emailRevokedAt) {
        return { revoked: true, verified: true, reason: 'USER_REVOKED' };
      }
    }
    if (check.userId) {
      const userRevokedAt = this.localUserRevocations.get(`id:${check.userId.trim()}`);
      if (userRevokedAt && check.createdAt <= userRevokedAt) {
        return { revoked: true, verified: true, reason: 'USER_REVOKED' };
      }
    }

    // 2. Query authoritative Supabase PostgreSQL for distributed state across all instances
    const client = this.getClient();
    if (!client) {
      // FAIL-CLOSED: Database client is missing or unconfigured
      return {
        revoked: true,
        verified: false,
        reason: 'STORE_UNAVAILABLE',
        error: 'Authoritative database client is not configured or unavailable'
      };
    }

    try {
      const targets: string[] = [check.tokenHash, 'GLOBAL'];
      if (check.email) {
        targets.push(`user:email:${check.email.toLowerCase().trim()}`);
      }
      if (check.userId) {
        targets.push(`user:id:${check.userId.trim()}`);
      }

      const { data, error } = await client
        .from('admin_session_revocations')
        .select('target, revocation_type, revoked_at')
        .in('target', targets);

      if (error) {
        // FAIL-CLOSED: Query error MUST NOT fall back to allowed/not-revoked!
        return {
          revoked: true,
          verified: false,
          reason: 'REVOCATION_CHECK_FAILED',
          error: `Authoritative revocation query failed: ${error.message || String(error)}`
        };
      }

      if (data && data.length > 0) {
        for (const row of data) {
          const revokedAt = Number(row.revoked_at);
          if (row.target === check.tokenHash) {
            this.localRevokedHashes.add(check.tokenHash);
            return { revoked: true, verified: true, reason: 'REVOKED' };
          }
          if (row.target === 'GLOBAL') {
            this.localGlobalRevocationTimestamp = Math.max(this.localGlobalRevocationTimestamp, revokedAt);
            if (check.createdAt <= revokedAt) {
              return { revoked: true, verified: true, reason: 'REVOKED' };
            }
          }
          if (row.target.startsWith('user:email:')) {
            const email = row.target.replace('user:email:', '');
            this.localUserRevocations.set(`email:${email}`, Math.max(this.localUserRevocations.get(`email:${email}`) || 0, revokedAt));
            if (check.createdAt <= revokedAt) {
              return { revoked: true, verified: true, reason: 'USER_REVOKED' };
            }
          }
          if (row.target.startsWith('user:id:')) {
            const userId = row.target.replace('user:id:', '');
            this.localUserRevocations.set(`id:${userId}`, Math.max(this.localUserRevocations.get(`id:${userId}`) || 0, revokedAt));
            if (check.createdAt <= revokedAt) {
              return { revoked: true, verified: true, reason: 'USER_REVOKED' };
            }
          }
        }
      }

      // Authoritative database confirms no matching revocation record
      return { revoked: false, verified: true, reason: 'NONE' };
    } catch (err: any) {
      // FAIL-CLOSED: Exception while querying database
      return {
        revoked: true,
        verified: false,
        reason: 'REVOCATION_CHECK_FAILED',
        error: `Unexpected error during revocation check: ${err?.message || String(err)}`
      };
    }
  }

  async revokeToken(
    token: string,
    tokenHashOrReason?: string,
    expiresAtOrReason?: number | string,
    reasonParam: string = 'REVOKED'
  ): Promise<void> {
    const client = this.getClient();
    if (!client) {
      throw new SessionRevocationError(
        'Cannot revoke session: authoritative database client is unavailable',
        'STORE_UNAVAILABLE'
      );
    }

    const isHash = typeof tokenHashOrReason === 'string' && /^[a-f0-9]{64}$/i.test(tokenHashOrReason);
    const effectiveHash = isHash ? tokenHashOrReason : hashSessionToken(token);
    const effectiveReason = isHash
      ? (typeof expiresAtOrReason === 'string' ? expiresAtOrReason : reasonParam)
      : (tokenHashOrReason || 'REVOKED');
    const effectiveExpiresAt = typeof expiresAtOrReason === 'number' ? expiresAtOrReason : undefined;

    const now = Date.now();
    const { error } = await client
      .from('admin_session_revocations')
      .upsert({
        revocation_type: 'SESSION',
        target: effectiveHash,
        revoked_at: now,
        expires_at: effectiveExpiresAt || null,
        reason: effectiveReason,
        created_at: new Date().toISOString()
      }, { onConflict: 'target' });

    if (error) {
      throw new SessionRevocationError(
        `Failed to record session revocation in database: ${error.message || String(error)}`,
        'WRITE_FAILED',
        error
      );
    }

    // Update local cache ONLY AFTER authoritative DB write succeeds
    this.localRevokedHashes.add(effectiveHash);
    this.localRevokedHashes.add(token);
  }

  async revokeUser(identifier: { email?: string; userId?: string }, reason: string = 'USER_REVOKED'): Promise<void> {
    const client = this.getClient();
    if (!client) {
      throw new SessionRevocationError(
        'Cannot revoke user sessions: authoritative database client is unavailable',
        'STORE_UNAVAILABLE'
      );
    }

    const now = Date.now();
    const rows: Array<{
      revocation_type: 'USER';
      target: string;
      revoked_at: number;
      reason: string;
      created_at: string;
    }> = [];

    if (identifier.email) {
      const cleanEmail = identifier.email.toLowerCase().trim();
      rows.push({
        revocation_type: 'USER',
        target: `user:email:${cleanEmail}`,
        revoked_at: now,
        reason,
        created_at: new Date().toISOString()
      });
    }

    if (identifier.userId) {
      const cleanId = identifier.userId.trim();
      rows.push({
        revocation_type: 'USER',
        target: `user:id:${cleanId}`,
        revoked_at: now,
        reason,
        created_at: new Date().toISOString()
      });
    }

    if (rows.length === 0) {
      return;
    }

    const { error } = await client
      .from('admin_session_revocations')
      .upsert(rows, { onConflict: 'target' });

    if (error) {
      throw new SessionRevocationError(
        `Failed to record user revocation in database: ${error.message || String(error)}`,
        'WRITE_FAILED',
        error
      );
    }

    // Update local cache on successful write
    if (identifier.email) {
      this.localUserRevocations.set(`email:${identifier.email.toLowerCase().trim()}`, now);
    }
    if (identifier.userId) {
      this.localUserRevocations.set(`id:${identifier.userId.trim()}`, now);
    }
  }

  async revokeAll(reason: string = 'GLOBAL_REVOCATION'): Promise<void> {
    const client = this.getClient();
    if (!client) {
      throw new SessionRevocationError(
        'Cannot revoke all sessions: authoritative database client is unavailable',
        'STORE_UNAVAILABLE'
      );
    }

    const now = Date.now();
    const { error } = await client
      .from('admin_session_revocations')
      .upsert({
        revocation_type: 'GLOBAL',
        target: 'GLOBAL',
        revoked_at: now,
        reason,
        created_at: new Date().toISOString()
      }, { onConflict: 'target' });

    if (error) {
      throw new SessionRevocationError(
        `Failed to record global revocation in database: ${error.message || String(error)}`,
        'WRITE_FAILED',
        error
      );
    }

    // Update local cache on successful write
    this.localGlobalRevocationTimestamp = now;
  }

  async getGlobalRevocationTimestamp(): Promise<number> {
    const client = this.getClient();
    if (client) {
      try {
        const { data, error } = await client
          .from('admin_session_revocations')
          .select('revoked_at')
          .eq('target', 'GLOBAL')
          .maybeSingle();

        if (!error && data?.revoked_at) {
          this.localGlobalRevocationTimestamp = Math.max(this.localGlobalRevocationTimestamp, Number(data.revoked_at));
        }
      } catch {
        // Return cached
      }
    }
    return this.localGlobalRevocationTimestamp;
  }

  clearLocalState(): void {
    this.localRevokedHashes.clear();
    this.localUserRevocations.clear();
    this.localGlobalRevocationTimestamp = 0;
  }

  clearLocalCache(): void {
    this.clearLocalState();
  }
}

/**
 * In-memory revocation store used in unit tests, local development without DB,
 * or for simulated multi-instance test harnesses.
 */
export class MemorySessionRevocationStore implements SessionRevocationStore {
  private revokedTokens = new Set<string>();
  private userRevocations = new Map<string, number>();
  private globalRevocationTimestamp: number = 0;

  async isRevoked(checkOrToken: RevocationCheckParams | string): Promise<RevocationCheckResult> {
    let check: RevocationCheckParams;
    if (typeof checkOrToken === 'string') {
      const token = checkOrToken;
      const tokenHash = hashSessionToken(token);
      let email: string | undefined;
      let userId: string | undefined;
      let createdAt = Date.now();
      try {
        const parts = token.split('.');
        if (parts[0]) {
          const payload = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf-8'));
          if (payload.email) email = payload.email.toLowerCase().trim();
          if (payload.userId) userId = payload.userId.trim();
          if (payload.createdAt) createdAt = Number(payload.createdAt);
        }
      } catch {
        // payload parse fallback
      }
      check = { token, tokenHash, email, userId, createdAt };
    } else {
      check = checkOrToken;
    }

    if (this.revokedTokens.has(check.tokenHash) || this.revokedTokens.has(check.token)) {
      return { revoked: true, verified: true, reason: 'REVOKED' };
    }
    if (this.globalRevocationTimestamp > 0 && check.createdAt <= this.globalRevocationTimestamp) {
      return { revoked: true, verified: true, reason: 'REVOKED' };
    }
    if (check.email) {
      const emailRevokedAt = this.userRevocations.get(`email:${check.email.toLowerCase().trim()}`);
      if (emailRevokedAt && check.createdAt <= emailRevokedAt) {
        return { revoked: true, verified: true, reason: 'USER_REVOKED' };
      }
    }
    if (check.userId) {
      const userRevokedAt = this.userRevocations.get(`id:${check.userId.trim()}`);
      if (userRevokedAt && check.createdAt <= userRevokedAt) {
        return { revoked: true, verified: true, reason: 'USER_REVOKED' };
      }
    }
    return { revoked: false, verified: true, reason: 'NONE' };
  }

  async revokeToken(
    token: string,
    tokenHashOrReason?: string,
    expiresAtOrReason?: number | string,
    reasonParam: string = 'REVOKED'
  ): Promise<void> {
    const isHash = typeof tokenHashOrReason === 'string' && /^[a-f0-9]{64}$/i.test(tokenHashOrReason);
    const effectiveHash = isHash ? tokenHashOrReason : hashSessionToken(token);
    this.revokedTokens.add(effectiveHash);
    this.revokedTokens.add(token);
  }

  async revokeUser(identifier: { email?: string; userId?: string }): Promise<void> {
    const now = Date.now();
    if (identifier.email) {
      this.userRevocations.set(`email:${identifier.email.toLowerCase().trim()}`, now);
    }
    if (identifier.userId) {
      this.userRevocations.set(`id:${identifier.userId.trim()}`, now);
    }
  }

  async revokeAll(): Promise<void> {
    this.globalRevocationTimestamp = Date.now();
  }

  async getGlobalRevocationTimestamp(): Promise<number> {
    return this.globalRevocationTimestamp;
  }

  clearLocalState(): void {
    this.revokedTokens.clear();
    this.userRevocations.clear();
    this.globalRevocationTimestamp = 0;
  }
}

export interface MockSupabaseOptions {
  queryError?: { message: string; code?: string } | Error | null;
  writeError?: { message: string; code?: string } | Error | null;
  initialRecords?: Array<{
    target: string;
    revocation_type: string;
    revoked_at: number;
    expires_at?: number | null;
    reason?: string;
  }>;
}

/**
 * Creates a mock Supabase client backed by an in-memory table store.
 * Allows simulating database unavailable, query failures, write failures, and multi-instance sharing.
 */
export function createMockSupabaseClient(options: MockSupabaseOptions = {}): any {
  const store = new Map<string, {
    target: string;
    revocation_type: string;
    revoked_at: number;
    expires_at?: number | null;
    reason?: string;
  }>();

  if (options.initialRecords) {
    for (const rec of options.initialRecords) {
      store.set(rec.target, { ...rec });
    }
  }

  let queryError = options.queryError || null;
  let writeError = options.writeError || null;

  return {
    _store: store,
    setQueryError(err: any) { queryError = err; },
    setWriteError(err: any) { writeError = err; },
    from(tableName: string) {
      return {
        select(cols?: string) {
          return {
            in(columnName: string, values: string[]) {
              if (queryError) {
                return Promise.resolve({ data: null, error: queryError });
              }
              const matching: any[] = [];
              for (const val of values) {
                const rec = store.get(val);
                if (rec) {
                  matching.push({ ...rec });
                }
              }
              return Promise.resolve({ data: matching, error: null });
            },
            eq(columnName: string, val: any) {
              return {
                maybeSingle() {
                  if (queryError) {
                    return Promise.resolve({ data: null, error: queryError });
                  }
                  const rec = store.get(val);
                  return Promise.resolve({ data: rec ? { ...rec } : null, error: null });
                }
              };
            }
          };
        },
        upsert(records: any, upsertOpts?: any) {
          if (writeError) {
            return Promise.resolve({ data: null, error: writeError });
          }
          const recArray = Array.isArray(records) ? records : [records];
          for (const r of recArray) {
            store.set(r.target, {
              target: r.target,
              revocation_type: r.revocation_type,
              revoked_at: Number(r.revoked_at),
              expires_at: r.expires_at || null,
              reason: r.reason || ''
            });
          }
          return Promise.resolve({ data: recArray, error: null });
        }
      };
    }
  };
}

// Active singleton store instance (defaults to Supabase-backed store)
let activeRevocationStore: SessionRevocationStore = new SupabaseSessionRevocationStore();

export function setRevocationStore(store: SessionRevocationStore): void {
  activeRevocationStore = store;
}

export function getRevocationStore(): SessionRevocationStore {
  return activeRevocationStore;
}

export function resetRevocationStore(): void {
  activeRevocationStore = new SupabaseSessionRevocationStore();
}

// Backwards-compatible exported maps and sets
export const adminSessions = new Map<string, AdminSession>();
export const revokedSessions = new Set<string>();
export const userRevocationTimestamps = new Map<string, number>();

// CRITICAL FIX: On container boot, globalRevocationTimestamp MUST be 0.
// Initializing to Date.now() previously invalidated valid sessions created by other instances!
export let globalRevocationTimestamp: number = 0;

// Helper to compute SHA-256 hash of tokens for DB storage & indexed lookups
export function hashSessionToken(token: string): string {
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}

// ============================================================================
// 2. COOKIE PARSING & SECRET CONFIGURATION
// ============================================================================

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

// ============================================================================
// 3. CRYPTOGRAPHIC SESSION TOKEN CREATION & VERIFICATION
// ============================================================================

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

/**
 * Synchronous session verification against cryptographic signature, expiry,
 * and local cache.
 */
export function verifySignedSessionToken(token: string): AdminSession | null {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;

  const tokenHash = hashSessionToken(token);
  if (revokedSessions.has(token) || revokedSessions.has(tokenHash)) return null;

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

    if ((globalRevocationTimestamp > 0 && createdAt <= globalRevocationTimestamp) ||
        (emailRevokedAt && createdAt <= emailRevokedAt) ||
        (userRevokedAt && createdAt <= userRevokedAt)) {
      revokedSessions.add(token);
      revokedSessions.add(tokenHash);
      return null;
    }

    const validatedRole: UserRole =
      payload.role === UserRole.ADMIN || payload.role === UserRole.EDITOR ? payload.role : UserRole.USER;

    return {
      token,
      email: payload.email,
      role: validatedRole,
      userId: payload.userId,
      createdAt,
      expiresAt: payload.expiresAt
    };
  } catch {
    return null;
  }
}

/**
 * Asynchronous distributed session token verification.
 * Checks crypto signature and expiration, then queries the shared PostgreSQL revocation store.
 */
export async function verifySignedSessionTokenAsync(token: string): Promise<AdminSession | null> {
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

    const payload = JSON.parse(Buffer.from(payloadStr, 'base64url').toString('utf-8')) as SessionTokenPayload;
    if (!payload || !payload.email || !payload.expiresAt) return null;
    if (Date.now() > payload.expiresAt) return null;

    const tokenHash = hashSessionToken(token);
    const cleanEmail = payload.email.toLowerCase().trim();
    const userId = payload.userId ? payload.userId.trim() : undefined;
    const createdAt = payload.createdAt || Date.now();

    const result = await activeRevocationStore.isRevoked({
      tokenHash,
      token,
      email: cleanEmail,
      userId,
      createdAt
    });

    // Fail-closed: If revocation cannot be authoritatively verified, fail closed!
    if (result.revoked || result.verified === false) {
      if (result.revoked && result.verified) {
        revokedSessions.add(token);
        revokedSessions.add(tokenHash);
      }
      return null;
    }

    const validatedRole: UserRole =
      payload.role === UserRole.ADMIN || payload.role === UserRole.EDITOR ? payload.role : UserRole.USER;

    return {
      token,
      email: payload.email,
      role: validatedRole,
      userId: payload.userId,
      createdAt,
      expiresAt: payload.expiresAt
    };
  } catch {
    return null;
  }
}

// ============================================================================
// 4. COOKIE HEADER & SAMESITE DETERMINATION
// ============================================================================

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

// ============================================================================
// 5. SESSION EXTRACTION & DIAGNOSTIC VALIDATION
// ============================================================================

/**
 * Primary asynchronous session inspection for Express middleware and routes.
 * Completely eliminates process-local session locking and verifies revocation across all instances.
 */
export async function getAdminSessionWithDiagnostic(req: express.Request): Promise<{
  session: AdminSession | null;
  reason: SessionValidationFailureReason;
  hasCookie: boolean;
}> {
  const parsedCookies = parseCookies(req);
  const token = (req as any).cookies?.admin_session || parsedCookies['admin_session'];

  if (!token) {
    return { session: null, reason: 'NO_COOKIE', hasCookie: false };
  }

  if (!token.includes('.')) {
    return { session: null, reason: 'INVALID_FORMAT', hasCookie: true };
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    return { session: null, reason: 'INVALID_FORMAT', hasCookie: true };
  }

  const [payloadStr, sig] = parts;
  if (!payloadStr || !sig) {
    return { session: null, reason: 'INVALID_FORMAT', hasCookie: true };
  }

  try {
    const hmac = crypto.createHmac('sha256', getSessionSecret());
    hmac.update(payloadStr);
    const expectedSig = hmac.digest('base64url');

    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return { session: null, reason: 'INVALID_SIGNATURE', hasCookie: true };
    }

    const payload = JSON.parse(Buffer.from(payloadStr, 'base64url').toString('utf-8')) as SessionTokenPayload;
    if (!payload || !payload.email || !payload.expiresAt) {
      return { session: null, reason: 'INVALID_FORMAT', hasCookie: true };
    }

    if (Date.now() > payload.expiresAt) {
      return { session: null, reason: 'EXPIRED', hasCookie: true };
    }

    const tokenHash = hashSessionToken(token);
    const cleanEmail = payload.email.toLowerCase().trim();
    const userId = payload.userId ? payload.userId.trim() : undefined;
    const createdAt = payload.createdAt || Date.now();

    // Check shared revocation state in PostgreSQL
    const checkResult = await activeRevocationStore.isRevoked({
      tokenHash,
      token,
      email: cleanEmail,
      userId,
      createdAt
    });

    // FAIL-CLOSED: If the authoritative store cannot be contacted or queried, reject with failure reason
    if (checkResult.verified === false) {
      return {
        session: null,
        reason: checkResult.reason || 'STORE_UNAVAILABLE',
        hasCookie: true
      };
    }

    if (checkResult.revoked) {
      revokedSessions.add(token);
      revokedSessions.add(tokenHash);
      return { session: null, reason: checkResult.reason || 'REVOKED', hasCookie: true };
    }

    const validatedRole: UserRole =
      payload.role === UserRole.ADMIN || payload.role === UserRole.EDITOR ? payload.role : UserRole.USER;

    const session: AdminSession = {
      token,
      email: payload.email,
      role: validatedRole,
      userId: payload.userId,
      createdAt,
      expiresAt: payload.expiresAt
    };

    return { session, reason: 'NONE', hasCookie: true };
  } catch {
    return { session: null, reason: 'INVALID_FORMAT', hasCookie: true };
  }
}

/**
 * Synchronous diagnostic inspection for environments or tests requiring sync execution.
 */
export function getAdminSessionWithDiagnosticSync(req: express.Request): {
  session: AdminSession | null;
  reason: SessionValidationFailureReason;
  hasCookie: boolean;
} {
  const parsedCookies = parseCookies(req);
  const token = (req as any).cookies?.admin_session || parsedCookies['admin_session'];

  if (!token) {
    return { session: null, reason: 'NO_COOKIE', hasCookie: false };
  }

  const tokenHash = hashSessionToken(token);
  if (revokedSessions.has(token) || revokedSessions.has(tokenHash)) {
    return { session: null, reason: 'REVOKED', hasCookie: true };
  }

  if (!token.includes('.')) {
    return { session: null, reason: 'INVALID_FORMAT', hasCookie: true };
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    return { session: null, reason: 'INVALID_FORMAT', hasCookie: true };
  }

  const [payloadStr, sig] = parts;
  if (!payloadStr || !sig) {
    return { session: null, reason: 'INVALID_FORMAT', hasCookie: true };
  }

  try {
    const hmac = crypto.createHmac('sha256', getSessionSecret());
    hmac.update(payloadStr);
    const expectedSig = hmac.digest('base64url');

    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return { session: null, reason: 'INVALID_SIGNATURE', hasCookie: true };
    }

    const payload = JSON.parse(Buffer.from(payloadStr, 'base64url').toString('utf-8')) as SessionTokenPayload;
    if (!payload || !payload.email || !payload.expiresAt) {
      return { session: null, reason: 'INVALID_FORMAT', hasCookie: true };
    }

    if (Date.now() > payload.expiresAt) {
      return { session: null, reason: 'EXPIRED', hasCookie: true };
    }

    const cleanEmail = payload.email.toLowerCase().trim();
    const emailRevokedAt = userRevocationTimestamps.get(cleanEmail);
    const userRevokedAt = payload.userId ? userRevocationTimestamps.get(payload.userId) : undefined;
    const createdAt = payload.createdAt || Date.now();

    if ((globalRevocationTimestamp > 0 && createdAt <= globalRevocationTimestamp) ||
        (emailRevokedAt && createdAt <= emailRevokedAt) ||
        (userRevokedAt && createdAt <= userRevokedAt)) {
      revokedSessions.add(token);
      revokedSessions.add(tokenHash);
      return { session: null, reason: 'USER_REVOKED', hasCookie: true };
    }

    const validatedRole: UserRole =
      payload.role === UserRole.ADMIN || payload.role === UserRole.EDITOR ? payload.role : UserRole.USER;

    return {
      session: {
        token,
        email: payload.email,
        role: validatedRole,
        userId: payload.userId,
        createdAt,
        expiresAt: payload.expiresAt
      },
      reason: 'NONE',
      hasCookie: true
    };
  } catch {
    return { session: null, reason: 'INVALID_FORMAT', hasCookie: true };
  }
}

export async function getAdminSession(req: express.Request): Promise<AdminSession | null> {
  const diagnostic = await getAdminSessionWithDiagnostic(req);
  return diagnostic.session;
}

export function getAdminSessionSync(req: express.Request): AdminSession | null {
  return getAdminSessionWithDiagnosticSync(req).session;
}

// ============================================================================
// 6. SESSION INVALIDATION & REVOCATION ACTIONS
// ============================================================================

export async function invalidateAdminSession(token: string, reason: string = 'LOGOUT'): Promise<void> {
  if (!token || typeof token !== 'string') return;
  const tokenHash = hashSessionToken(token);

  let expiresAt: number | undefined;
  if (token.includes('.')) {
    try {
      const payloadStr = token.split('.')[0];
      const payload = JSON.parse(Buffer.from(payloadStr, 'base64url').toString('utf-8'));
      expiresAt = payload.expiresAt;
    } catch {
      // ignore
    }
  }

  // Authoritative write to shared database FIRST (propagates error if DB write fails)
  await activeRevocationStore.revokeToken(token, tokenHash, expiresAt, reason);

  // Update process-local cache only after authoritative write succeeds
  revokedSessions.add(token);
  revokedSessions.add(tokenHash);
  adminSessions.delete(token);
}

export async function invalidateUserSessions(
  identifier: { email?: string; userId?: string },
  reason: string = 'USER_REVOKED'
): Promise<void> {
  const cleanEmail = identifier.email ? identifier.email.toLowerCase().trim() : undefined;
  const userId = identifier.userId ? identifier.userId.trim() : undefined;

  // Authoritative write to shared database FIRST (propagates error if DB write fails)
  await activeRevocationStore.revokeUser(identifier, reason);

  // Update process-local cache only after authoritative write succeeds
  const now = Date.now();
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
      const tokenHash = hashSessionToken(token);
      revokedSessions.add(token);
      revokedSessions.add(tokenHash);
      adminSessions.delete(token);
    }
  }
}

export async function revokeAllSessions(reason: string = 'ALL_SESSIONS_REVOKED'): Promise<void> {
  // Authoritative write to shared database FIRST (propagates error if DB write fails)
  await activeRevocationStore.revokeAll(reason);

  // Update process-local cache only after authoritative write succeeds
  const now = Date.now();
  globalRevocationTimestamp = now;

  for (const [token] of adminSessions.entries()) {
    const tokenHash = hashSessionToken(token);
    revokedSessions.add(token);
    revokedSessions.add(tokenHash);
  }
  adminSessions.clear();
}

export const revokeSession = invalidateAdminSession;

// ============================================================================
// 7. CLEANUP TIMER
// ============================================================================

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
