import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import http from 'node:http';
import cmsRouter from '../server/routes/cms';

describe('CMS Settings and Endpoints Verification', () => {
  const app = express();
  app.use(express.json());
  app.use('/api', cmsRouter);

  let server: http.Server;
  let baseUrl: string;

  before(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const port = (server.address() as any).port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      if ((server as any).closeAllConnections) (server as any).closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  test('GET /api/cms/settings/home returns 200 JSON with home configuration schema and never 404', async () => {
    const res = await fetch(`${baseUrl}/api/cms/settings/home`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data !== null && typeof data === 'object');
    assert.ok(typeof data.hero_heading === 'string');
    assert.ok(Array.isArray(data.buttons));
    assert.ok(Array.isArray(data.statistics));
  });

  test('GET /api/cms/settings/seo returns 200 JSON', async () => {
    const res = await fetch(`${baseUrl}/api/cms/settings/seo`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data !== undefined);
  });

  test('GET /api/cms/settings/general returns 200 JSON', async () => {
    const res = await fetch(`${baseUrl}/api/cms/settings/general`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data !== undefined);
  });

  test('GET /api/cms/projects returns 200 array', async () => {
    const res = await fetch(`${baseUrl}/api/cms/projects`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data));
  });

  test('GET /api/cms/social returns 200 array', async () => {
    const res = await fetch(`${baseUrl}/api/cms/social`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data));
  });

  test('GET /api/cms/navigation returns 200 array', async () => {
    const res = await fetch(`${baseUrl}/api/cms/navigation`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data));
  });

  test('GET /api/cms/media returns 200 array', async () => {
    const res = await fetch(`${baseUrl}/api/cms/media`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data));
  });

  test('GET /api/cms/settings/:key blocks non-allowlisted CRM keys with HTTP 404', async () => {
    const sensitiveKeys = ['crm_leads', 'crm_lead_sequences', 'crm_sequence_steps', 'crm_sequence_leads', 'crm_campaign_leads', 'admin_sessions'];
    for (const key of sensitiveKeys) {
      const res = await fetch(`${baseUrl}/api/cms/settings/${key}`);
      assert.strictEqual(res.status, 404, `Expected 404 for sensitive key: ${key}`);
      const body = await res.json();
      assert.strictEqual(body.error, 'Setting not found');
    }
  });

  test('GET /api/cms/settings returns array filtered strictly to allowlisted public keys', async () => {
    const res = await fetch(`${baseUrl}/api/cms/settings`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data));
    const allowed = new Set(['general', 'seo', 'legal', 'home', 'founder_message', 'founder']);
    for (const item of data) {
      assert.ok(allowed.has(item.key), `Unexpected non-public key in settings: ${item.key}`);
    }
  });

  test('Unauthenticated POST /api/cms/settings/general is blocked with HTTP 401', async () => {
    const res = await fetch(`${baseUrl}/api/cms/settings/general`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ site_name: 'Malicious Overwrite' })
    });
    assert.strictEqual(res.status, 401);
  });
});

