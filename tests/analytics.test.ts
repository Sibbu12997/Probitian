import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import http from 'node:http';
import analyticsRouter from '../server/routes/analytics';
import { 
  createSignedSessionToken, 
  setRevocationStore, 
  resetRevocationStore, 
  MemorySessionRevocationStore 
} from '../server/auth/session';
import { UserRole } from '../server/auth/types';

describe('Analytics API Routes Verification', () => {
  const app = express();
  app.use(express.json());
  app.use('/api', analyticsRouter);

  let server: http.Server;
  let baseUrl: string;
  let authCookie: string;

  before(async () => {
    setRevocationStore(new MemorySessionRevocationStore());
    const token = createSignedSessionToken('admin@probitian.com', UserRole.ADMIN);
    authCookie = `admin_session=${token}`;

    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const port = (server.address() as any).port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    resetRevocationStore();
    if (server) {
      if ((server as any).closeAllConnections) (server as any).closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  test('GET /api/analytics/status returns 200 JSON with configuration flags', async () => {
    const res = await fetch(`${baseUrl}/api/analytics/status`, {
      headers: { Cookie: authCookie }
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.status, 'ok');
    assert.ok(typeof data.hasTrackingId === 'boolean');
    assert.ok(typeof data.hasReportingCredentials === 'boolean');
  });

  test('GET /api/analytics/realtime returns 200 JSON', async () => {
    const res = await fetch(`${baseUrl}/api/analytics/realtime`, {
      headers: { Cookie: authCookie }
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(typeof data.activeUsers === 'number');
  });

  test('GET /api/analytics/report returns 200 JSON with complete report schema', async () => {
    const res = await fetch(`${baseUrl}/api/analytics/report?range=30d`, {
      headers: { Cookie: authCookie }
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data !== null && typeof data === 'object');
    assert.ok(typeof data.configured === 'boolean');
    assert.ok(data.overview !== undefined);
    assert.ok(Array.isArray(data.pages));
    assert.ok(Array.isArray(data.events));
    assert.ok(Array.isArray(data.sources));
    assert.ok(Array.isArray(data.devices));
  });
});
