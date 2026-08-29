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

  test('GET /api/cms/settings/home returns 200 JSON (or null default) and never 404', async () => {
    const res = await fetch(`${baseUrl}/api/cms/settings/home`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data !== undefined);
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
});
