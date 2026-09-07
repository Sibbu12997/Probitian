// Ensure test environment is set before importing server modules
process.env.NODE_ENV = 'test';

import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import app, { serverReady } from '../server';
import {
  globalDistributedRateLimitStore,
  SharedStoreProvider
} from '../server/middleware/rateLimiters';

describe('25. Sensitive Rate Limiter Production & RPC Health', () => {
  let server: http.Server;
  let baseUrl: string;
  let originalProvider: SharedStoreProvider | null = null;
  let originalNodeEnv = 'test';

  const adminPasskey =
    process.env.CI_ADMIN_PASSKEY ||
    process.env.TEST_ADMIN_PASSKEY ||
    process.env.ADMIN_PASSKEY ||
    'ci-test-dedicated-admin-passkey-never-used-in-production';

  process.env.ADMIN_PASSKEY = adminPasskey;

  before(async () => {
    if (serverReady) {
      await serverReady;
    }
    originalProvider = globalDistributedRateLimitStore.getProvider();
    originalNodeEnv = process.env.NODE_ENV;

    await new Promise<void>((resolve) => {
      server = http.createServer(app);
      server.listen(0, '127.0.0.1', () => {
        const addr: any = server.address();
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  after(async () => {
    process.env.NODE_ENV = originalNodeEnv;
    globalDistributedRateLimitStore.setProvider(originalProvider);
    globalDistributedRateLimitStore.resetProviderHealth();
    if (server) {
      server.closeAllConnections?.();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  beforeEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    globalDistributedRateLimitStore.resetProviderHealth();
  });

  // Test A: Healthy RPC -> login proceeds
  test('A. Healthy RPC -> login proceeds (HTTP 200 and Set-Cookie)', async () => {
    let atomicCalled = false;
    const healthyProvider: SharedStoreProvider = {
      async incrementAtomic(key: string, windowMs: number, max: number) {
        atomicCalled = true;
        return {
          count: 1,
          resetTime: Date.now() + windowMs,
          allowed: true,
          remaining: max - 1
        };
      }
    };

    globalDistributedRateLimitStore.setProvider(healthyProvider);
    globalDistributedRateLimitStore.resetProviderHealth();

    const res = await fetch(`${baseUrl}/api/admin/verify-passkey`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '198.51.100.101'
      },
      body: JSON.stringify({ passkey: adminPasskey })
    });

    assert.strictEqual(res.status, 200, 'Healthy RPC must allow login to proceed with HTTP 200');
    assert.strictEqual(atomicCalled, true, 'Healthy RPC incrementAtomic must be called');

    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.role, 'admin');

    const setCookie = res.headers.get('set-cookie');
    assert.ok(setCookie && setCookie.includes('admin_session='), 'Response must include admin session cookie');
    assert.ok(res.headers.get('x-ratelimit-limit'), 'Rate limit headers must be present');
  });

  // Test B: Rate limit exceeded -> 429
  test('B. Rate limit exceeded in RPC -> returns HTTP 429 and Retry-After', async () => {
    const exceededProvider: SharedStoreProvider = {
      async incrementAtomic(key: string, windowMs: number, max: number) {
        return {
          count: max + 1,
          resetTime: Date.now() + 60000,
          allowed: false,
          remaining: 0
        };
      }
    };

    globalDistributedRateLimitStore.setProvider(exceededProvider);
    globalDistributedRateLimitStore.resetProviderHealth();

    const res = await fetch(`${baseUrl}/api/admin/verify-passkey`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '198.51.100.102'
      },
      body: JSON.stringify({ passkey: adminPasskey })
    });

    assert.strictEqual(res.status, 429, 'Exceeded rate limit must return HTTP 429');
    const data = await res.json();
    assert.ok(data.error.includes('Too many'), 'Error message must reflect rate limit');
    assert.ok(res.headers.get('retry-after'), 'Retry-After header must be set');
  });

  // Test C: RPC unavailable on sensitive endpoint in production -> 503
  test('C. RPC unavailable on sensitive endpoint in production -> returns HTTP 503 (Fail Closed)', async () => {
    process.env.NODE_ENV = 'production';

    const failingProvider: SharedStoreProvider = {
      async incrementAtomic() {
        const error: any = new Error("Could not find the function public.increment_rate_limit in the schema cache");
        error.code = 'PGRST202';
        error.status = 404;
        throw error;
      }
    };

    globalDistributedRateLimitStore.setProvider(failingProvider);
    globalDistributedRateLimitStore.resetProviderHealth();

    const res = await fetch(`${baseUrl}/api/admin/verify-passkey`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '198.51.100.103'
      },
      body: JSON.stringify({ passkey: adminPasskey })
    });

    assert.strictEqual(res.status, 503, 'Sensitive endpoint in production must return HTTP 503 when RPC fails');
    const data = await res.json();
    assert.strictEqual(
      data.error,
      'Security service temporarily unavailable. Rate limit verification failed.'
    );

    // Also verify when provider is completely absent in production
    globalDistributedRateLimitStore.setProvider(null);
    const resNoProvider = await fetch(`${baseUrl}/api/admin/verify-passkey`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '198.51.100.104'
      },
      body: JSON.stringify({ passkey: adminPasskey })
    });
    assert.strictEqual(resNoProvider.status, 503, 'Missing provider in production must return HTTP 503');
  });

  // Test D: No secrets are exposed in logs
  test('D. No secrets are exposed in logs during rate limiting or failures', async () => {
    process.env.NODE_ENV = 'production';

    const capturedErrors: any[] = [];
    const capturedLogs: any[] = [];

    const originalConsoleError = console.error;
    const originalConsoleLog = console.log;

    console.error = (...args: any[]) => {
      capturedErrors.push(args);
    };
    console.log = (...args: any[]) => {
      capturedLogs.push(args);
    };

    try {
      const failingProvider: SharedStoreProvider = {
        async incrementAtomic() {
          const error: any = new Error("Could not find the function public.increment_rate_limit in the schema cache");
          error.code = 'PGRST202';
          error.status = 404;
          throw error;
        }
      };

      globalDistributedRateLimitStore.setProvider(failingProvider);
      globalDistributedRateLimitStore.resetProviderHealth();

      const sensitiveCookie = 'admin_session=test_secret_cookie_token_99999';
      await fetch(`${baseUrl}/api/admin/verify-passkey`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': sensitiveCookie,
          'x-forwarded-for': '198.51.100.105'
        },
        body: JSON.stringify({ passkey: adminPasskey })
      });

      // Format all captured logs to string
      const fullLogOutput = JSON.stringify({ capturedErrors, capturedLogs });

      // Verify diagnostic log was generated
      assert.ok(
        fullLogOutput.includes('[RateLimit Diagnostic]'),
        'Diagnostic log prefix must be present in output'
      );
      assert.ok(
        fullLogOutput.includes('PGRST202'),
        'Diagnostic log must record the error code PGRST202'
      );

      // Verify that secrets are NEVER in log output
      if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        assert.strictEqual(
          fullLogOutput.includes(process.env.SUPABASE_SERVICE_ROLE_KEY),
          false,
          'SUPABASE_SERVICE_ROLE_KEY must never be logged'
        );
      }
      if (process.env.SUPABASE_SECRET_KEY) {
        assert.strictEqual(
          fullLogOutput.includes(process.env.SUPABASE_SECRET_KEY),
          false,
          'SUPABASE_SECRET_KEY must never be logged'
        );
      }
      if (process.env.SESSION_SECRET) {
        assert.strictEqual(
          fullLogOutput.includes(process.env.SESSION_SECRET),
          false,
          'SESSION_SECRET must never be logged'
        );
      }
      assert.strictEqual(
        fullLogOutput.includes(adminPasskey),
        false,
        'ADMIN_PASSKEY must never be logged'
      );
      assert.strictEqual(
        fullLogOutput.includes(sensitiveCookie),
        false,
        'Sensitive cookie value must never be logged'
      );
      assert.strictEqual(
        fullLogOutput.includes('test_secret_cookie_token_99999'),
        false,
        'Session token must never be logged'
      );
    } finally {
      console.error = originalConsoleError;
      console.log = originalConsoleLog;
    }
  });
});
