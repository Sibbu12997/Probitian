import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import http from 'node:http';
import newsletterRouter from '../server/routes/newsletter';
import { generateUnsubscribeToken } from '../server/security/tokens';
import { getCanonicalAppUrl } from '../server/config/constants';
import { createSignedSessionToken, MemorySessionRevocationStore, resetRevocationStore, setRevocationStore } from '../server/auth/session';
import { UserRole } from '../server/auth/types';

test('newsletter unsubscribe GET only renders confirmation; it does not report completion', async (t) => {
  const previousEnv = process.env.NODE_ENV;
  const previousSecret = process.env.UNSUBSCRIBE_SECRET;
  process.env.NODE_ENV = 'test';
  process.env.UNSUBSCRIBE_SECRET = '0123456789abcdef0123456789abcdef';

  const app = express();
  app.set('trust proxy', 1);
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use('/api', newsletterRouter);

  let server: http.Server | undefined;
  let baseUrl = '';
  try {
    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        baseUrl = `http://127.0.0.1:${(server!.address() as any).port}`;
        resolve();
      });
    });

    await t.test('valid GET link asks for explicit confirmation and is not cacheable', async () => {
      const token = generateUnsubscribeToken('audit-test@example.invalid');
      const response = await fetch(`${baseUrl}/api/newsletter/unsubscribe?token=${encodeURIComponent(token)}`);
      const body = await response.text();

      assert.equal(response.status, 200);
      assert.match(body, /Confirm unsubscribe/);
      assert.match(body, /method="post"/);
      assert.ok(body.includes(`value="${token}"`));
      assert.doesNotMatch(body, /audit-test@example\.invalid/);
      assert.doesNotMatch(body, /Unsubscribed successfully/i);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
    });

    await t.test('invalid GET link cannot trigger an unsubscribe', async () => {
      const response = await fetch(`${baseUrl}/api/newsletter/unsubscribe?token=invalid`);
      const body = await response.text();

      assert.equal(response.status, 400);
      assert.match(body, /Invalid or expired unsubscribe link/);
      assert.doesNotMatch(body, /Unsubscribed successfully/i);
    });

    await t.test('POST does not accept an unsubscribe token from the query string', async () => {
      const token = generateUnsubscribeToken('audit-test@example.invalid');
      const response = await fetch(`${baseUrl}/api/newsletter/unsubscribe?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: ''
      });

      assert.equal(response.status, 400);
      assert.match(await response.text(), /Invalid or expired unsubscribe link/);
    });

    await t.test('GET unsubscribe requests are rate limited', async () => {
      const clientIp = '198.51.100.37';
      let lastResponse: Response | undefined;
      for (let i = 0; i < 21; i++) {
        lastResponse = await fetch(`${baseUrl}/api/newsletter/unsubscribe?token=invalid`, {
          headers: { 'X-Forwarded-For': clientIp }
        });
      }

      assert.equal(lastResponse?.status, 429);
      assert.ok(lastResponse?.headers.has('ratelimit'));
    });
  } finally {
    if (server) {
      if ((server as any).closeAllConnections) (server as any).closeAllConnections();
      await new Promise<void>((resolve) => server!.close(() => resolve()));
    }
    if (previousEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousEnv;
    if (previousSecret === undefined) delete process.env.UNSUBSCRIBE_SECRET;
    else process.env.UNSUBSCRIBE_SECRET = previousSecret;
  }
});

test('admin subscriber listing is rate limited after authorization', async () => {
  setRevocationStore(new MemorySessionRevocationStore());
  const app = express();
  app.set('trust proxy', 1);
  app.use('/api', newsletterRouter);

  let server: http.Server | undefined;
  let baseUrl = '';
  try {
    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        baseUrl = `http://127.0.0.1:${(server!.address() as any).port}`;
        resolve();
      });
    });

    const sessionToken = createSignedSessionToken('audit-admin@probitian.invalid', UserRole.ADMIN);
    let lastResponse: Response | undefined;
    for (let i = 0; i < 61; i++) {
      lastResponse = await fetch(`${baseUrl}/api/admin/subscribers`, {
        headers: {
          Cookie: `admin_session=${sessionToken}`,
          'X-Forwarded-For': '198.51.100.38'
        }
      });
    }

    assert.equal(lastResponse?.status, 429);
    assert.ok(lastResponse?.headers.has('ratelimit'));
  } finally {
    resetRevocationStore();
    if (server) {
      if ((server as any).closeAllConnections) (server as any).closeAllConnections();
      await new Promise<void>((resolve) => server!.close(() => resolve()));
    }
  }
});

test('canonical public origin ignores non-HTTPS origins in production', () => {
  const previousEnv = process.env.NODE_ENV;
  const previousAppUrl = process.env.APP_URL;
  const previousPublicUrl = process.env.PUBLIC_URL;
  const previousSiteUrl = process.env.VITE_SITE_URL;

  try {
    process.env.NODE_ENV = 'production';
    process.env.APP_URL = 'http://untrusted.example';
    process.env.PUBLIC_URL = 'https://probitian.ai.studio/path?discard=yes';
    delete process.env.VITE_SITE_URL;

    assert.equal(getCanonicalAppUrl(), 'https://probitian.ai.studio');
  } finally {
    if (previousEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousEnv;
    if (previousAppUrl === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = previousAppUrl;
    if (previousPublicUrl === undefined) delete process.env.PUBLIC_URL;
    else process.env.PUBLIC_URL = previousPublicUrl;
    if (previousSiteUrl === undefined) delete process.env.VITE_SITE_URL;
    else process.env.VITE_SITE_URL = previousSiteUrl;
  }
});

