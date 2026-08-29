import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import http from 'node:http';
import cmsRouter from '../server/routes/cms';

describe('Public CMS Endpoints Resiliency & Production Regression Tests', () => {
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

  test('GET /api/cms/social returns HTTP 200 with JSON array', async () => {
    const res = await fetch(`${baseUrl}/api/cms/social`);
    assert.strictEqual(res.status, 200);
    assert.match(res.headers.get('content-type') || '', /application\/json/);
    const data = await res.json();
    assert.ok(Array.isArray(data));
  });

  test('GET /api/cms/navigation returns HTTP 200 with JSON array', async () => {
    const res = await fetch(`${baseUrl}/api/cms/navigation`);
    assert.strictEqual(res.status, 200);
    assert.match(res.headers.get('content-type') || '', /application\/json/);
    const data = await res.json();
    assert.ok(Array.isArray(data));
  });

  test('GET /api/cms/media returns HTTP 200 with JSON array', async () => {
    const res = await fetch(`${baseUrl}/api/cms/media`);
    assert.strictEqual(res.status, 200);
    assert.match(res.headers.get('content-type') || '', /application\/json/);
    const data = await res.json();
    assert.ok(Array.isArray(data));
  });

  test('GET /api/cms/projects returns HTTP 200 with JSON array', async () => {
    const res = await fetch(`${baseUrl}/api/cms/projects`);
    assert.strictEqual(res.status, 200);
    assert.match(res.headers.get('content-type') || '', /application\/json/);
    const data = await res.json();
    assert.ok(Array.isArray(data));
  });

  test('GET /api/cms/blogs returns HTTP 200 with JSON array', async () => {
    const res = await fetch(`${baseUrl}/api/cms/blogs`);
    assert.strictEqual(res.status, 200);
    assert.match(res.headers.get('content-type') || '', /application\/json/);
    const data = await res.json();
    assert.ok(Array.isArray(data));
  });

  test('GET /api/cms/courses returns HTTP 200 with JSON array', async () => {
    const res = await fetch(`${baseUrl}/api/cms/courses`);
    assert.strictEqual(res.status, 200);
    assert.match(res.headers.get('content-type') || '', /application\/json/);
    const data = await res.json();
    assert.ok(Array.isArray(data));
  });

  test('GET /api/cms/videos returns HTTP 200 with JSON array', async () => {
    const res = await fetch(`${baseUrl}/api/cms/videos`);
    assert.strictEqual(res.status, 200);
    assert.match(res.headers.get('content-type') || '', /application\/json/);
    const data = await res.json();
    assert.ok(Array.isArray(data));
  });

  test('GET /api/cms/categories returns HTTP 200 with JSON array', async () => {
    const res = await fetch(`${baseUrl}/api/cms/categories`);
    assert.strictEqual(res.status, 200);
    assert.match(res.headers.get('content-type') || '', /application\/json/);
    const data = await res.json();
    assert.ok(Array.isArray(data));
  });

  test('GET /api/cms/settings/home returns HTTP 200 with valid JSON or null', async () => {
    const res = await fetch(`${baseUrl}/api/cms/settings/home`);
    assert.strictEqual(res.status, 200);
    assert.match(res.headers.get('content-type') || '', /application\/json/);
    const data = await res.json();
    assert.ok(data !== undefined);
  });
});
