import express from 'express';
import { 
  OFFICIAL_ADMIN_EMAIL, 
  CONFIGURED_ADMIN_EMAILS, 
  constantTimeCompare 
} from '../config/constants';
import { 
  createSignedSessionToken, 
  createAdminSession, 
  getAdminSession, 
  invalidateAdminSession, 
  invalidateUserSessions,
  revokeAllSessions,
  getAdminCookieHeader,
  parseCookies 
} from '../auth/session';
import { 
  requireAuth, 
  requireRole, 
  resolveUserRole, 
  hasPermission 
} from '../auth/rbac';
import { UserRole, Permission } from '../auth/types';
import { loginLimiter } from '../middleware/rateLimiters';
import { serverSupabase, supabaseUrl, serverSecretKey } from '../services/supabase';
import { recordAuditLog } from '../services/audit';

const router = express.Router();

// POST /api/admin/verify-passkey
router.post('/admin/verify-passkey', loginLimiter, (req, res) => {
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
    const adminEmail = OFFICIAL_ADMIN_EMAIL;
    const role = UserRole.ADMIN;
    const session = createAdminSession(adminEmail, role);

    recordAuditLog(req, {
      actor: adminEmail,
      role,
      action: 'LOGIN_PASSKEY',
      resource: 'auth',
      result: 'SUCCESS',
      metadata: { method: 'passkey' }
    });

    res.setHeader('Set-Cookie', getAdminCookieHeader(session.token, req));
    return res.json({ 
      success: true, 
      email: adminEmail, 
      role
    });
  }

  recordAuditLog(req, {
    actor: 'anonymous',
    role: 'USER',
    action: 'LOGIN_PASSKEY_FAILED',
    resource: 'auth',
    result: 'FAILURE',
    metadata: { reason: 'Invalid credentials' }
  });

  return res.status(401).json({ error: 'Invalid credentials' });
});

// POST /api/admin/verify-supabase-session
router.post('/admin/verify-supabase-session', loginLimiter, async (req, res) => {
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

    // Server-Authoritative RBAC resolution
    const role = await resolveUserRole(verifiedUser.id, userEmail, verifiedUser.app_metadata);

    // Only allow Admin or Editor into admin control center
    if (role !== UserRole.ADMIN && role !== UserRole.EDITOR) {
      console.warn(`[SECURITY RBAC] Unauthorized Supabase user attempted admin login: ${userEmail} (${verifiedUser.id}) with role "${role}"`);
      recordAuditLog(req, {
        actor: userEmail,
        role,
        action: 'LOGIN_SUPABASE_DENIED',
        resource: 'auth',
        result: 'DENIED',
        metadata: { reason: 'Insufficient privileges' }
      });
      return res.status(403).json({ error: 'Forbidden: Account does not have editor or administrator privileges' });
    }

    const session = createAdminSession(userEmail, role, verifiedUser.id);

    recordAuditLog(req, {
      actor: userEmail,
      role,
      action: 'LOGIN_SUPABASE',
      resource: 'auth',
      resource_id: verifiedUser.id,
      result: 'SUCCESS',
      metadata: { method: 'supabase' }
    });

    res.setHeader('Set-Cookie', getAdminCookieHeader(session.token, req));
    return res.json({ 
      success: true, 
      email: userEmail, 
      role
    });
  } catch (err) {
    console.error('[Admin Supabase Session Verification Error]', err);
    return res.status(500).json({ error: 'Failed to verify Supabase session' });
  }
});

// GET /api/admin/session
router.get('/admin/session', async (req, res) => {
  const session = await getAdminSession(req);
  if (session) {
    return res.json({ 
      authenticated: true, 
      email: session.email, 
      role: session.role,
      userId: session.userId
    });
  }
  return res.json({ authenticated: false });
});

// POST /api/admin/logout
router.post('/admin/logout', async (req, res) => {
  const session = await getAdminSession(req);
  const cookies = parseCookies(req);
  const token = cookies['admin_session'];

  if (session) {
    recordAuditLog(req, {
      actor: session.email,
      role: session.role,
      action: 'LOGOUT',
      resource: 'auth',
      result: 'SUCCESS'
    });
  }

  if (token) {
    await invalidateAdminSession(token, 'LOGOUT');
  }
  res.setHeader('Set-Cookie', getAdminCookieHeader('', req, 0));
  return res.json({ success: true });
});

// GET /api/admin/audit-logs - Query audit history (Admin only)
router.get('/admin/audit-logs', requireAuth, requireRole(UserRole.ADMIN), async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string, 10) || 50, 200);
  const offset = Math.max(parseInt(req.query.offset as string, 10) || 0, 0);

  if (serverSupabase) {
    try {
      const { data, error, count } = await serverSupabase
        .from('audit_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (!error && Array.isArray(data)) {
        return res.json({ success: true, logs: data, total: count || data.length });
      }
    } catch (err) {
      console.warn('[Audit Logs Query Error]', err);
    }
  }

  return res.json({ success: true, logs: [], total: 0 });
});

// GET /api/admin/roles - List all users and roles (Admin only)
router.get('/admin/roles', requireAuth, requireRole(UserRole.ADMIN), async (req, res) => {
  if (serverSupabase) {
    try {
      const { data, error } = await serverSupabase
        .from('profiles')
        .select('id, email, full_name, role, created_at, updated_at')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        return res.json({ success: true, profiles: data });
      }
    } catch (err) {
      console.warn('[Admin Roles Query Error]', err);
    }
  }

  // Fallback list based on configured admins
  const defaultProfiles = CONFIGURED_ADMIN_EMAILS.map(email => ({
    id: email,
    email,
    full_name: 'Configured Administrator',
    role: UserRole.ADMIN,
    created_at: new Date().toISOString()
  }));

  return res.json({ success: true, profiles: defaultProfiles });
});

// POST /api/admin/roles/assign - Assign role to user (Admin only)
router.post('/admin/roles/assign', requireAuth, requireRole(UserRole.ADMIN), async (req, res) => {
  const currentSession = (req as any).adminSession || (await getAdminSession(req));
  const { userId, email, role } = req.body || {};

  if (!role || !Object.values(UserRole).includes(role)) {
    return res.status(400).json({ error: `Invalid role specified. Must be one of: ${Object.values(UserRole).join(', ')}` });
  }

  if (!userId && !email) {
    return res.status(400).json({ error: 'Either userId or email must be provided.' });
  }

  if (serverSupabase) {
    try {
      let query = serverSupabase.from('profiles').update({ role, updated_at: new Date().toISOString() });
      if (userId) {
        query = query.eq('id', userId);
      } else if (email) {
        query = query.eq('email', email.toLowerCase().trim());
      }

      const { data, error } = await query.select().single();
      if (error) {
        console.error('[Role Assignment DB Error]', error.message);
        return res.status(500).json({ error: 'Failed to update user role in database' });
      }

      // Record audit event
      recordAuditLog(req, {
        actor: currentSession?.email || 'admin',
        role: currentSession?.role || UserRole.ADMIN,
        action: 'ROLE_ASSIGNED',
        resource: 'profiles',
        resource_id: data?.id || userId,
        result: 'SUCCESS',
        metadata: { target_email: data?.email || email, new_role: role }
      });

      // Immediately invalidate any active sessions belonging to the modified user
      await invalidateUserSessions({ userId: data?.id || userId, email: data?.email || email }, 'ROLE_CHANGED');

      return res.json({ success: true, profile: data });
    } catch (err: any) {
      console.error('[Role Assignment Exception]', err);
      return res.status(500).json({ error: 'Database service unavailable' });
    }
  }

  // Fallback mode: invalidate any active sessions for this user
  await invalidateUserSessions({ userId, email }, 'ROLE_CHANGED');
  return res.json({ success: true, message: `Role ${role} simulated for ${userId || email}` });
});

// POST /api/admin/revoke-session - Revoke specific session or current caller session across all instances
router.post('/admin/revoke-session', requireAuth, requireRole(UserRole.ADMIN), async (req, res) => {
  const currentSession = (req as any).adminSession || (await getAdminSession(req));
  const { token } = req.body || {};
  const tokenToRevoke = token || currentSession?.token;

  if (!tokenToRevoke || typeof tokenToRevoke !== 'string') {
    return res.status(400).json({ error: 'Valid session token is required to revoke' });
  }

  await invalidateAdminSession(tokenToRevoke, 'ADMIN_MANUAL_REVOCATION');

  recordAuditLog(req, {
    actor: currentSession?.email || 'admin',
    role: currentSession?.role || UserRole.ADMIN,
    action: 'SESSION_REVOKED',
    resource: 'auth',
    result: 'SUCCESS',
    metadata: {
      targetTokenPrefix: tokenToRevoke.slice(0, 10) + '...'
    }
  });

  return res.json({ success: true, message: 'Session revoked successfully across all instances' });
});

// POST /api/admin/revoke-user-sessions - Revoke all sessions for a specific user across all instances
router.post('/admin/revoke-user-sessions', requireAuth, requireRole(UserRole.ADMIN), async (req, res) => {
  const currentSession = (req as any).adminSession || (await getAdminSession(req));
  const { email, userId } = req.body || {};

  if (!email && !userId) {
    return res.status(400).json({ error: 'Must provide either email or userId to revoke sessions' });
  }

  await invalidateUserSessions({ email, userId }, 'ADMIN_USER_REVOCATION');

  recordAuditLog(req, {
    actor: currentSession?.email || 'admin',
    role: currentSession?.role || UserRole.ADMIN,
    action: 'USER_SESSIONS_REVOKED',
    resource: 'auth',
    result: 'SUCCESS',
    metadata: { target_email: email, target_user_id: userId }
  });

  return res.json({ success: true, message: 'User sessions revoked successfully across all instances' });
});

// POST /api/admin/revoke-all-sessions - Invalidate all active admin sessions globally across all instances
router.post('/admin/revoke-all-sessions', requireAuth, requireRole(UserRole.ADMIN), async (req, res) => {
  const currentSession = (req as any).adminSession || (await getAdminSession(req));

  await revokeAllSessions('ADMIN_GLOBAL_REVOCATION');

  recordAuditLog(req, {
    actor: currentSession?.email || 'admin',
    role: currentSession?.role || UserRole.ADMIN,
    action: 'ALL_SESSIONS_REVOKED',
    resource: 'auth',
    result: 'SUCCESS'
  });

  return res.json({ success: true, message: 'All active admin sessions revoked successfully across all instances' });
});

export default router;
