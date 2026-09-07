import express from 'express';
import { serverSupabase, isServerSupabaseConfigured } from '../services/supabase';

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
  prefix?: string;
  statusCode?: number;
  sensitive?: boolean;
}

export interface SharedStoreProvider {
  incrementAtomic(key: string, windowMs: number, max: number): Promise<{
    count: number;
    resetTime: number;
    allowed: boolean;
    remaining: number;
  }>;
}

export class DistributedRateLimitStore {
  private localHits = new Map<string, { count: number; resetTime: number }>();
  private provider: SharedStoreProvider | null = null;
  private providerUnavailableUntil = 0;
  private hasLoggedProviderError = false;

  constructor(provider: SharedStoreProvider | null = null) {
    if (provider) {
      this.provider = provider;
    }
  }

  setProvider(provider: SharedStoreProvider | null) {
    this.provider = provider;
  }

  getProvider(): SharedStoreProvider | null {
    return this.provider;
  }

  isProviderHealthy(): boolean {
    return Boolean(this.provider && Date.now() >= this.providerUnavailableUntil);
  }

  isUsingFallback(): boolean {
    return !this.isProviderHealthy();
  }

  resetProviderHealth(): void {
    this.providerUnavailableUntil = 0;
    this.hasLoggedProviderError = false;
  }

  getProviderUnavailableUntil(): number {
    return this.providerUnavailableUntil;
  }

  async increment(key: string, windowMs: number, max: number, sensitive: boolean = false): Promise<{
    count: number;
    resetTime: number;
    allowed: boolean;
    remaining: number;
  }> {
    const now = Date.now();

    // FAIL-CLOSED for sensitive endpoints in production if distributed provider is missing or down
    if (sensitive && process.env.NODE_ENV === 'production') {
      if (!this.provider || now < this.providerUnavailableUntil) {
        console.error('[RateLimit Diagnostic]', {
          errorCode: !this.provider ? 'NO_PROVIDER' : 'PROVIDER_UNAVAILABLE',
          errorMessage: !this.provider
            ? 'Distributed rate limit provider is not configured for sensitive endpoint in production'
            : `Distributed rate limit provider is temporarily marked unavailable until ${new Date(this.providerUnavailableUntil).toISOString()}`,
          httpStatus: 503,
          providerConfigured: Boolean(this.provider)
        });
        throw new Error('Distributed rate limit store is unavailable for sensitive endpoint');
      }
    }

    if (this.provider && now >= this.providerUnavailableUntil) {
      try {
        const result = await this.provider.incrementAtomic(key, windowMs, max);
        this.hasLoggedProviderError = false;
        return result;
      } catch (err: any) {
        const isMissingFunction = err?.code === 'PGRST202' || err?.code === '42883' || String(err?.message || '').includes('schema cache');
        // Backoff for 30s so DBA applying migration can auto-recover without permanent server downtime
        this.providerUnavailableUntil = isMissingFunction ? now + 30 * 1000 : now + 5 * 60 * 1000;

        console.error('[RateLimit Diagnostic]', {
          errorCode: err?.code || null,
          errorMessage: err?.message || String(err),
          httpStatus: err?.status || null,
          providerConfigured: Boolean(this.provider)
        });

        if (!this.hasLoggedProviderError) {
          this.hasLoggedProviderError = true;
          if (isMissingFunction) {
            console.info('[RateLimitStore] Remote RPC function public.increment_rate_limit is not provisioned in Supabase schema cache.');
          } else {
            const msg = err?.message || err?.code || 'Remote provider error';
            console.info(`[RateLimitStore] Remote rate limit store unavailable (${msg}).`);
          }
        }

        if (sensitive && process.env.NODE_ENV === 'production') {
          throw new Error(`Authoritative rate limit verification failed: [${err?.code || 'UNKNOWN'}] ${err?.message || String(err)}`);
        }
      }
    }

    const existing = this.localHits.get(key);

    if (!existing || now > existing.resetTime) {
      const resetTime = now + windowMs;
      this.localHits.set(key, { count: 1, resetTime });
      return { count: 1, resetTime, allowed: true, remaining: max - 1 };
    }

    existing.count += 1;
    const allowed = existing.count <= max;
    const remaining = Math.max(0, max - existing.count);
    return { count: existing.count, resetTime: existing.resetTime, allowed, remaining };
  }
}

export function createDistributedRateLimiter(options: RateLimitOptions, store: DistributedRateLimitStore) {
  const {
    windowMs,
    max,
    message = 'Too many requests, please try again later.',
    prefix = 'rl',
    statusCode = 429,
    sensitive = false
  } = options;

  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const clientIp = (
        req.ip ||
        (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
        req.socket.remoteAddress ||
        '127.0.0.1'
      ).trim();

      const key = `${prefix}:${clientIp}`;
      const result = await store.increment(key, windowMs, max, sensitive);

      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000));

      if (!result.allowed) {
        res.setHeader('Retry-After', Math.max(1, Math.ceil((result.resetTime - Date.now()) / 1000)));
        return res.status(statusCode).json({ error: message });
      }

      next();
    } catch (err: any) {
      if (sensitive && process.env.NODE_ENV === 'production') {
        console.error('[RateLimit Diagnostic]', {
          errorCode: err?.code || 'SENSITIVE_503',
          errorMessage: err?.message || 'Rate limit verification failed',
          httpStatus: 503,
          providerConfigured: store.isProviderHealthy()
        });
        return res.status(503).json({ error: 'Security service temporarily unavailable. Rate limit verification failed.' });
      }
      console.warn('[RateLimiter Error - FailOpen NonSensitive]', {
        message: err?.message || String(err),
        code: err?.code || null
      });
      next(); // Fail open for non-sensitive endpoints during transient internal error
    }
  };
}

export const globalDistributedRateLimitStore = new DistributedRateLimitStore();

if (serverSupabase) {
  const supabaseRateLimitProvider: SharedStoreProvider = {
    async incrementAtomic(key: string, windowMs: number, max: number) {
      const { data, error, status } = await serverSupabase.rpc('increment_rate_limit', {
        p_key: key,
        p_window_ms: windowMs,
        p_max: max
      });

      if (error) {
        console.error('[RateLimit Diagnostic]', {
          errorCode: error.code || null,
          errorMessage: error.message || 'Supabase RPC error',
          httpStatus: status || (error as any).status || null,
          providerConfigured: isServerSupabaseConfigured()
        });

        const rpcError = new Error(error.message || 'RPC increment_rate_limit failed');
        (rpcError as any).code = error.code;
        (rpcError as any).status = status;
        (rpcError as any).details = error.details;
        throw rpcError;
      }

      if (Array.isArray(data) && data.length > 0) {
        const row = data[0];
        return {
          count: Number(row.count),
          resetTime: Number(row.reset_time ?? row.resetTime),
          allowed: Boolean(row.allowed),
          remaining: Number(row.remaining)
        };
      } else if (data && typeof data === 'object') {
        const row = data as any;
        return {
          count: Number(row.count),
          resetTime: Number(row.reset_time ?? row.resetTime),
          allowed: Boolean(row.allowed),
          remaining: Number(row.remaining)
        };
      }

      console.error('[RateLimit Diagnostic]', {
        errorCode: 'INVALID_SIGNATURE',
        errorMessage: 'Unexpected return signature from increment_rate_limit RPC',
        httpStatus: status || null,
        providerConfigured: isServerSupabaseConfigured()
      });
      throw new Error('Unexpected return signature from increment_rate_limit RPC');
    }
  };
  globalDistributedRateLimitStore.setProvider(supabaseRateLimitProvider);
}

export const loginLimiter = createDistributedRateLimiter({ windowMs: 15 * 60 * 1000, max: 15, prefix: 'login', sensitive: true, message: 'Too many login attempts. Please try again in 15 minutes.' }, globalDistributedRateLimitStore);
export const passkeyLimiter = createDistributedRateLimiter({ windowMs: 15 * 60 * 1000, max: 15, prefix: 'passkey', sensitive: true, message: 'Too many passkey attempts. Please try again in 15 minutes.' }, globalDistributedRateLimitStore);
export const adminSessionLimiter = createDistributedRateLimiter({ windowMs: 1 * 60 * 1000, max: 60, prefix: 'admin-sess', sensitive: false, message: 'Too many session checks. Please slow down.' }, globalDistributedRateLimitStore);
export const adminRevokeLimiter = createDistributedRateLimiter({ windowMs: 15 * 60 * 1000, max: 30, prefix: 'admin-revoke', sensitive: true, message: 'Too many session revocation requests. Please try again later.' }, globalDistributedRateLimitStore);
export const newsletterLimiter = createDistributedRateLimiter({ windowMs: 15 * 60 * 1000, max: 15, prefix: 'newsletter', message: 'Too many subscription attempts. Please try again later.' }, globalDistributedRateLimitStore);
export const unsubscribeLimiter = createDistributedRateLimiter({ windowMs: 15 * 60 * 1000, max: 20, prefix: 'unsub', message: 'Too many unsubscribe requests. Please try again later.' }, globalDistributedRateLimitStore);
export const contactLimiter = createDistributedRateLimiter({ windowMs: 15 * 60 * 1000, max: 15, prefix: 'contact', message: 'Too many contact messages sent. Please try again later.' }, globalDistributedRateLimitStore);
export const crmLeadLimiter = createDistributedRateLimiter({ windowMs: 15 * 60 * 1000, max: 60, prefix: 'crm-lead', sensitive: true, message: 'Too many CRM operations requested. Please try again later.' }, globalDistributedRateLimitStore);
export const uploadLimiter = createDistributedRateLimiter({ windowMs: 15 * 60 * 1000, max: 30, prefix: 'upload', sensitive: true, message: 'Too many upload requests. Please try again later.' }, globalDistributedRateLimitStore);
export const mediaDeleteLimiter = createDistributedRateLimiter({ windowMs: 15 * 60 * 1000, max: 30, prefix: 'media-del', sensitive: true, message: 'Too many media deletion requests. Please try again later.' }, globalDistributedRateLimitStore);
export const emailTestLimiter = createDistributedRateLimiter({ windowMs: 15 * 60 * 1000, max: 10, prefix: 'email-test', sensitive: true, message: 'Too many test emails sent. Please try again later.' }, globalDistributedRateLimitStore);
export const emailSendLimiter = createDistributedRateLimiter({ windowMs: 15 * 60 * 1000, max: 5, prefix: 'email-send', sensitive: true, message: 'Too many campaign broadcasts requested. Please try again later.' }, globalDistributedRateLimitStore);
