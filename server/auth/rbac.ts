import express from 'express';
import { Permission, UserRole, AdminSession } from './types';
import { getAdminSession, getAdminSessionWithDiagnostic } from './session';
import { CONFIGURED_ADMIN_EMAILS } from '../config/constants';
import { serverSupabase } from '../services/supabase';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.USER]: [
    Permission.CONTENT_READ
  ],
  [UserRole.EDITOR]: [
    Permission.CONTENT_READ,
    Permission.CONTENT_WRITE,
    Permission.EDIT_CONTENT,
    Permission.MEDIA_UPLOAD,
    Permission.MEDIA_DELETE,
    Permission.VIEW_ANALYTICS
  ],
  [UserRole.ADMIN]: [
    Permission.CONTENT_READ,
    Permission.CONTENT_WRITE,
    Permission.EDIT_CONTENT,
    Permission.PUBLISH_CONTENT,
    Permission.MEDIA_UPLOAD,
    Permission.MEDIA_DELETE,
    Permission.VIEW_ANALYTICS,
    Permission.MANAGE_CRM,
    Permission.MANAGE_SYSTEM
  ]
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

export async function resolveUserRole(
  userId: string,
  userEmail: string,
  appMetadata?: any
): Promise<UserRole> {
  const cleanEmail = (userEmail || '').toLowerCase().trim();

  // 1. Explicit allowlist check
  if (CONFIGURED_ADMIN_EMAILS.includes(cleanEmail)) {
    return UserRole.ADMIN;
  }

  // 2. Query Supabase profiles table
  if (serverSupabase && userId) {
    try {
      const { data: profile, error: profErr } = await serverSupabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle();

      if (!profErr && profile?.role) {
        if (profile.role === 'admin') return UserRole.ADMIN;
        if (profile.role === 'editor') return UserRole.EDITOR;
      }
    } catch (profCheckErr) {
      console.warn('[Admin Authorization Profile Check Warning]', profCheckErr);
    }
  }

  // 3. Check Supabase app_metadata role
  const appRole = appMetadata?.role;
  if (appRole === 'admin') return UserRole.ADMIN;
  if (appRole === 'editor') return UserRole.EDITOR;

  return UserRole.USER;
}

export async function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const { session, reason, hasCookie } = await getAdminSessionWithDiagnostic(req);
  if (!session) {
    if (reason === 'STORE_UNAVAILABLE' || reason === 'REVOCATION_CHECK_FAILED') {
      console.error(`[AUTH] Fail-closed 500 on ${req.method} ${req.path} - revocation store unverified (${reason})`);
      return res.status(500).json({
        error: 'Authentication service unavailable: session revocation status could not be verified',
        code: 'REVOCATION_STORE_ERROR'
      });
    }
    console.warn(`[AUTH] requireAuth 401 on ${req.method} ${req.path} - admin_session present: ${hasCookie}, reason: ${reason}`);
    return res.status(401).json({ error: 'Unauthorized: Authentication required' });
  }
  (req as any).adminSession = session;
  (req as any).userRole = session.role;
  next();
}

export function requireRole(minimumRole: UserRole) {
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const { session, reason, hasCookie } = await getAdminSessionWithDiagnostic(req);
    if (!session) {
      if (reason === 'STORE_UNAVAILABLE' || reason === 'REVOCATION_CHECK_FAILED') {
        console.error(`[AUTH] Fail-closed 500 on ${req.method} ${req.path} - revocation store unverified (${reason})`);
        return res.status(500).json({
          error: 'Authentication service unavailable: session revocation status could not be verified',
          code: 'REVOCATION_STORE_ERROR'
        });
      }
      console.warn(`[AUTH] requireRole 401 on ${req.method} ${req.path} - admin_session present: ${hasCookie}, reason: ${reason}`);
      return res.status(401).json({ error: 'Unauthorized: Authentication required' });
    }

    if (minimumRole === UserRole.ADMIN && session.role !== UserRole.ADMIN) {
      return res.status(403).json({ error: 'Forbidden: Administrator privilege required' });
    }

    if (minimumRole === UserRole.EDITOR && session.role !== UserRole.ADMIN && session.role !== UserRole.EDITOR) {
      return res.status(403).json({ error: 'Forbidden: Editor or Administrator privilege required' });
    }

    (req as any).adminSession = session;
    (req as any).userRole = session.role;
    next();
  };
}

export function requirePermission(permission: Permission) {
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const { session, reason, hasCookie } = await getAdminSessionWithDiagnostic(req);
    if (!session) {
      if (reason === 'STORE_UNAVAILABLE' || reason === 'REVOCATION_CHECK_FAILED') {
        console.error(`[AUTH] Fail-closed 500 on ${req.method} ${req.path} - revocation store unverified (${reason})`);
        return res.status(500).json({
          error: 'Authentication service unavailable: session revocation status could not be verified',
          code: 'REVOCATION_STORE_ERROR'
        });
      }
      console.warn(`[AUTH] requirePermission 401 on ${req.method} ${req.path} - admin_session present: ${hasCookie}, reason: ${reason}`);
      return res.status(401).json({ error: 'Unauthorized: Authentication required' });
    }

    if (!hasPermission(session.role, permission)) {
      return res.status(403).json({ 
        error: `Forbidden: Insufficient permissions (${permission} required for role "${session.role}")` 
      });
    }

    (req as any).adminSession = session;
    (req as any).userRole = session.role;
    next();
  };
}

// Backwards-compatible aliases
export const requireAdmin = requireRole(UserRole.ADMIN);
export const requireEditor = requireRole(UserRole.EDITOR);
