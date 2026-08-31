import { Request } from 'express';
import { serverSupabase } from './supabase';
import { UserRole } from '../auth/types';

export interface AuditLogEntry {
  actor: string;
  role: UserRole | string;
  action: string;
  resource: string;
  resource_id?: string;
  ip_address?: string;
  user_agent?: string;
  result?: 'SUCCESS' | 'FAILURE' | 'DENIED';
  metadata?: Record<string, any>;
}

/**
 * Strips sensitive fields (passwords, tokens, secrets) before audit recording
 */
function sanitizeMetadata(meta?: Record<string, any>): Record<string, any> {
  if (!meta || typeof meta !== 'object') return {};
  const cleaned: Record<string, any> = {};
  const sensitiveKeys = new Set([
    'password', 'passkey', 'token', 'secret', 'accessToken', 'apiKey',
    'authorization', 'cookie', 'smtp_pass', 'service_role'
  ]);

  for (const [key, value] of Object.entries(meta)) {
    if (sensitiveKeys.has(key.toLowerCase())) {
      cleaned[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      cleaned[key] = sanitizeMetadata(value);
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

/**
 * Records an administrative audit trail event in the Supabase audit_logs table.
 * Fails gracefully to never disrupt core application requests if database is offline.
 */
export async function recordAuditLog(
  req: Request | null,
  entry: AuditLogEntry
): Promise<void> {
  try {
    const ip = req
      ? (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.ip || '127.0.0.1'
      : entry.ip_address || '127.0.0.1';

    const userAgent = req ? req.headers['user-agent'] || 'Unknown' : entry.user_agent || 'System';

    const logRecord = {
      actor: entry.actor || 'anonymous',
      role: entry.role || 'USER',
      action: entry.action,
      resource: entry.resource,
      resource_id: entry.resource_id || null,
      ip_address: ip,
      user_agent: userAgent.slice(0, 500),
      result: entry.result || 'SUCCESS',
      metadata: sanitizeMetadata(entry.metadata),
      created_at: new Date().toISOString()
    };

    if (serverSupabase) {
      await serverSupabase.from('audit_logs').insert(logRecord);
    }
  } catch (err) {
    // Non-blocking observability warning
    console.warn('[Audit Log Warning] Failed to persist audit trail entry:', (err as any)?.message || err);
  }
}
