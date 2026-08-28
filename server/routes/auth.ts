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
    let adminEmail = OFFICIAL_ADMIN_EMAIL;
    if (typeof email === 'string' && email.trim()) {
      const cleanEmail = email.trim().toLowerCase();
      if (CONFIGURED_ADMIN_EMAILS.includes(cleanEmail)) {
        adminEmail = cleanEmail;
      } else {
        console.warn(`[SECURITY AUDIT] Unauthorized email override attempt '${cleanEmail}' during passkey login. Defaulted to official admin identity.`);
      }
    }

    const role = UserRole.ADMIN;
    const session = createAdminSession(adminEmail, role);

    res.setHeader('Set-Cookie', getAdminCookieHeader(session.token, req));
    return res.json({ 
      success: true, 
      email: adminEmail, 
      role,
      token: session.token 
    });
  }

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
      return res.status(403).json({ error: 'Forbidden: Account does not have editor or administrator privileges' });
    }

    const session = createAdminSession(userEmail, role, verifiedUser.id);

    res.setHeader('Set-Cookie', getAdminCookieHeader(session.token, req));
    return res.json({ 
      success: true, 
      email: userEmail, 
      role,
      token: session.token 
    });
  } catch (err) {
    console.error('[Admin Supabase Session Verification Error]', err);
    return res.status(500).json({ error: 'Failed to verify Supabase session' });
  }
});

// GET /api/admin/session
router.get('/admin/session', (req, res) => {
  const session = getAdminSession(req);
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
router.post('/admin/logout', (req, res) => {
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

  if (token) {
    invalidateAdminSession(token);
  }
  res.setHeader('Set-Cookie', getAdminCookieHeader('', req, 0));
  return res.json({ success: true });
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

      return res.json({ success: true, profile: data });
    } catch (err: any) {
      console.error('[Role Assignment Exception]', err);
      return res.status(500).json({ error: 'Database service unavailable' });
    }
  }

  return res.json({ success: true, message: `Role ${role} simulated for ${userId || email}` });
});

export default router;
