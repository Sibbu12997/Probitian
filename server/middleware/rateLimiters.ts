import express from 'express';
import { serverSupabase } from '../services/supabase';

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
  prefix?: string;
  statusCode?: number;
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

  setProvider(provider: SharedStoreProvider) {
    this.provider = provider;
  }

  async increment(key: string, windowMs: number, max: number): Promise<{
    count: number;
    resetTime: number;
    allowed: boolean;
    remaining: number;
  }> {
    if (this.provider) {
      try {
        return await this.provider.incrementAtomic(key, windowMs, max);
      } catch (err) {
        console.warn(`[RateLimitStore] Remote provider failed for key ${key}, using in-memory store.`, err);
      }
    }

    const now = Date.now();
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
    statusCode = 429
  } = options;

  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const clientIp = (
        (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
        req.socket.remoteAddress ||
        '127.0.0.1'
      ).trim();

      const key = `${prefix}:${clientIp}`;
      const result = await store.increment(key, windowMs, max);

      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000));

      if (!result.allowed) {
        res.setHeader('Retry-After', Math.max(1, Math.ceil((result.resetTime - Date.now()) / 1000)));
        return res.status(statusCode).json({ error: message });
      }

      next();
    } catch (err) {
      console.error('[RateLimiter Error]', err);
      next(); // Fail open if rate limiting subsystem experiences internal error
    }
  };
}

export const globalDistributedRateLimitStore = new DistributedRateLimitStore();

if (serverSupabase) {
  const supabaseRateLimitProvider: SharedStoreProvider = {
    async incrementAtomic(key: string, windowMs: number, max: number) {
      const { data, error } = await serverSupabase.rpc('increment_rate_limit', {
        p_key: key,
        p_window_ms: windowMs,
        p_max: max
      });

      if (error) throw error;

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
    }
  };
  globalDistributedRateLimitStore.setProvider(supabaseRateLimitProvider);
}

export const loginLimiter = createDistributedRateLimiter({ windowMs: 15 * 60 * 1000, max: 15, prefix: 'login', message: 'Too many login attempts. Please try again in 15 minutes.' }, globalDistributedRateLimitStore);
export const newsletterLimiter = createDistributedRateLimiter({ windowMs: 15 * 60 * 1000, max: 15, prefix: 'newsletter', message: 'Too many subscription attempts. Please try again later.' }, globalDistributedRateLimitStore);
export const unsubscribeLimiter = createDistributedRateLimiter({ windowMs: 15 * 60 * 1000, max: 20, prefix: 'unsub', message: 'Too many unsubscribe requests. Please try again later.' }, globalDistributedRateLimitStore);
export const contactLimiter = createDistributedRateLimiter({ windowMs: 15 * 60 * 1000, max: 15, prefix: 'contact', message: 'Too many contact messages sent. Please try again later.' }, globalDistributedRateLimitStore);
export const uploadLimiter = createDistributedRateLimiter({ windowMs: 15 * 60 * 1000, max: 30, prefix: 'upload', message: 'Too many upload requests. Please try again later.' }, globalDistributedRateLimitStore);
export const emailTestLimiter = createDistributedRateLimiter({ windowMs: 15 * 60 * 1000, max: 10, prefix: 'email-test', message: 'Too many test emails sent. Please try again later.' }, globalDistributedRateLimitStore);
export const emailSendLimiter = createDistributedRateLimiter({ windowMs: 15 * 60 * 1000, max: 5, prefix: 'email-send', message: 'Too many campaign broadcasts requested. Please try again later.' }, globalDistributedRateLimitStore);
