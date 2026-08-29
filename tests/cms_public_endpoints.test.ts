import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import http from 'node:http';
import cmsRouter from '../server/routes/cms';
import { createSignedSessionToken } from '../server/auth/session';
import { UserRole } from '../server/auth/types';

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

  test('Unauthenticated POST /api/cms/media/upload is blocked with HTTP 401', async () => {
    const res = await fetch(`${baseUrl}/api/cms/media/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: 'malicious.png',
        fileData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
      })
    });
    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.match(body.error, /Unauthorized/i);
  });

  test('Unauthenticated POST /api/cms/upload is blocked with HTTP 401', async () => {
    const res = await fetch(`${baseUrl}/api/cms/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: 'malicious.png',
        fileData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
      })
    });
    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.match(body.error, /Unauthorized/i);
  });

  test('Authenticated user with standard USER role is blocked with HTTP 403 Forbidden', async () => {
    const userToken = createSignedSessionToken('regularuser@probitian.com', UserRole.USER);
    const res = await fetch(`${baseUrl}/api/cms/media/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify({
        fileName: 'image.png',
        fileData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
      })
    });
    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.match(body.error, /Forbidden: Insufficient permissions/i);
  });

  test('Authenticated EDITOR passes authorization check on POST /api/cms/media/upload', async () => {
    const editorToken = createSignedSessionToken('editor@probitian.com', UserRole.EDITOR);
    const res = await fetch(`${baseUrl}/api/cms/media/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${editorToken}`
      },
      body: JSON.stringify({}) // Missing required fields -> hits body validation in handleUpload
    });
    // Should pass auth/RBAC and reach handleUpload, returning 400 Bad Request
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /fileData.*required/i);
  });
});
