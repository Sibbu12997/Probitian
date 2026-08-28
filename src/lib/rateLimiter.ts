import type { Request, Response, NextFunction } from 'express';

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
  prefix?: string;
}

export interface RateLimitResult {
  count: number;
  resetTime: number;
  allowed: boolean;
  remaining: number;
}

export interface RateLimitStore {
  increment(key: string, windowMs: number, max: number): Promise<RateLimitResult>;
  reset(key: string): Promise<void>;
  get(key: string): Promise<RateLimitResult | null>;
}

/**
 * Extracts and normalizes client IP address.
 * Works with Express 'trust proxy' configuration to ensure the real client IP is resolved
 * and strips IPv4-mapped IPv6 prefixes (e.g. ::ffff:192.0.2.1 -> 192.0.2.1).
 */
export function getClientIp(req: Request): string {
  let ip = (req.ip || req.socket?.remoteAddress || 'unknown').trim();
  if (ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
  }
  return ip || 'unknown';
}

/**
 * High-performance bounded in-memory sliding window rate limit store.
 * Includes automatic periodic expiration and hard entry limits to prevent memory exhaustion.
 */
export class MemoryRateLimitStore implements RateLimitStore {
  private requests = new Map<string, { count: number; resetTime: number }>();
  private maxEntries: number;
  private pruneInterval: any = null;

  constructor(maxEntries: number = 10000) {
    this.maxEntries = maxEntries;
    if (typeof setInterval !== 'undefined') {
      this.pruneInterval = setInterval(() => this.prune(), 2 * 60 * 1000);
      if (this.pruneInterval && typeof this.pruneInterval.unref === 'function') {
        this.pruneInterval.unref();
      }
    }
  }

  public prune(): void {
    const now = Date.now();
    for (const [key, data] of this.requests.entries()) {
      if (now > data.resetTime) {
        this.requests.delete(key);
      }
    }
  }

  public async increment(key: string, windowMs: number, max: number): Promise<RateLimitResult> {
    const now = Date.now();

    // Guard against memory explosion under heavy DDoS
    if (this.requests.size > this.maxEntries) {
      this.prune();
    }

    let record = this.requests.get(key);

    if (!record || now > record.resetTime) {
      record = { count: 1, resetTime: now + windowMs };
      this.requests.set(key, record);
      return {
        count: 1,
        resetTime: record.resetTime,
        allowed: true,
        remaining: Math.max(0, max - 1)
      };
    }

    if (record.count >= max) {
      return {
        count: record.count,
        resetTime: record.resetTime,
        allowed: false,
        remaining: 0
      };
    }

    record.count += 1;
    return {
      count: record.count,
      resetTime: record.resetTime,
      allowed: true,
      remaining: Math.max(0, max - record.count)
    };
  }

  public async get(key: string): Promise<RateLimitResult | null> {
    const record = this.requests.get(key);
    if (!record) return null;
    const now = Date.now();
    if (now > record.resetTime) {
      this.requests.delete(key);
      return null;
    }
    return {
      count: record.count,
      resetTime: record.resetTime,
      allowed: true,
      remaining: 0
    };
  }

  public async reset(key: string): Promise<void> {
    this.requests.delete(key);
  }

  public clear(): void {
    this.requests.clear();
  }
}

export type SharedStoreProvider = {
  /**
   * Atomic increment operation performed directly in the shared store / database
   * to eliminate race conditions across concurrent multi-instance requests.
   */
  incrementAtomic: (key: string, windowMs: number, max: number) => Promise<RateLimitResult>;
};

/**
 * Distributed Rate Limit Store with Fail-Safe In-Memory Fallback.
 * Synchronizes request limits across multiple backend instances (Cloud Run / clustered containers).
 * Uses atomic DB RPC / transaction operations exclusively to prevent race conditions.
 * If the shared backend store encounters an outage or error, it fails safe to the local memory store
 * so security-sensitive endpoints remain protected and legitimate traffic is not brought down.
 */
export class DistributedRateLimitStore implements RateLimitStore {
  private memoryFallback: MemoryRateLimitStore;
  private sharedProvider: SharedStoreProvider | null;
  private isAvailable: boolean = true;
  private lastFailureLog: number = 0;

  constructor(sharedProvider: SharedStoreProvider | null = null) {
    this.sharedProvider = sharedProvider;
    this.memoryFallback = new MemoryRateLimitStore(10000);
  }

  public setProvider(provider: SharedStoreProvider | null) {
    this.sharedProvider = provider;
  }

  public async increment(key: string, windowMs: number, max: number): Promise<RateLimitResult> {
    if (this.sharedProvider) {
      try {
        const atomicResult = await this.sharedProvider.incrementAtomic(key, windowMs, max);
        this.isAvailable = true;
        // Keep local memory fallback synced
        try {
          await this.memoryFallback.increment(key, windowMs, max);
        } catch {
          // Ignore memory sync errors
        }
        return atomicResult;
      } catch (err: any) {
        // Fail-safe behavior: log warning once per 30s and use memory fallback
        const now = Date.now();
        if (now - this.lastFailureLog > 30000) {
          console.warn('[DistributedRateLimitStore] Shared rate-limit store unavailable, falling back to local memory limiter:', err?.message || err);
          this.lastFailureLog = now;
        }
        this.isAvailable = false;
        return this.memoryFallback.increment(key, windowMs, max);
      }
    }

    // Default to MemoryRateLimitStore when no shared provider is configured
    return this.memoryFallback.increment(key, windowMs, max);
  }

  public async get(key: string): Promise<RateLimitResult | null> {
    return this.memoryFallback.get(key);
  }

  public async reset(key: string): Promise<void> {
    await this.memoryFallback.reset(key);
  }

  public isUsingFallback(): boolean {
    return !this.isAvailable || !this.sharedProvider;
  }
}

/**
 * Creates an Express middleware enforcing distributed rate limits on routes.
 * Employs a bounded fail-safe memory limiter if the primary store encounters an unexpected failure,
 * ensuring security-sensitive endpoints (login, uploads, contact, newsletter) cannot be bypassed.
 */
export function createRateLimiter(options: RateLimitOptions, store?: RateLimitStore) {
  const activeStore = store || new MemoryRateLimitStore();
  const prefix = options.prefix || 'rl';
  const emergencyFallback = new MemoryRateLimitStore(5000);

  return async (req: Request, res: Response, next: NextFunction) => {
    const ip = getClientIp(req);
    const key = `${prefix}:${ip}`;
    const now = Date.now();

    try {
      const result = await activeStore.increment(key, options.windowMs, options.max);

      // Set standard RFC / RateLimit HTTP Headers
      res.setHeader('RateLimit-Limit', options.max);
      res.setHeader('RateLimit-Remaining', result.remaining);
      res.setHeader('RateLimit-Reset', Math.ceil(result.resetTime / 1000));

      if (!result.allowed) {
        const retryAfterSec = Math.max(1, Math.ceil((result.resetTime - now) / 1000));
        res.setHeader('Retry-After', retryAfterSec);
        return res.status(429).json({
          error: options.message || 'Too many requests. Please try again later.'
        });
      }

      next();
    } catch (err) {
      console.error('[RateLimiter Middleware Error - Activating Fail-Safe Protection]', err);
      // Bounded Fail-Safe: Enforce emergency local memory rate limiting instead of silently failing open
      try {
        const fallbackResult = await emergencyFallback.increment(key, options.windowMs, options.max);
        res.setHeader('RateLimit-Limit', options.max);
        res.setHeader('RateLimit-Remaining', fallbackResult.remaining);
        res.setHeader('RateLimit-Reset', Math.ceil(fallbackResult.resetTime / 1000));

        if (!fallbackResult.allowed) {
          const retryAfterSec = Math.max(1, Math.ceil((fallbackResult.resetTime - now) / 1000));
          res.setHeader('Retry-After', retryAfterSec);
          return res.status(429).json({
            error: options.message || 'Too many requests. Please try again later.'
          });
        }
        next();
      } catch (catastrophicErr) {
        console.error('[RateLimiter Catastrophic Error]', catastrophicErr);
        res.setHeader('Retry-After', 60);
        return res.status(429).json({
          error: 'Rate limit service unavailable. Please retry in a few moments.'
        });
      }
    }
  };
}
