import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import cmsRouter from '../server/routes/cms';

describe('CMS Settings and Endpoints Verification', () => {
  const app = express();
  app.use(express.json());
  app.use('/api', cmsRouter);

  test('GET /api/cms/settings/home returns 200 JSON (or null default) and never 404', async () => {
    const server = app.listen(0);
    const port = (server.address() as any).port;
    try {
      const res = await fetch(`http://localhost:${port}/api/cms/settings/home`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.ok(data !== undefined);
    } finally {
      server.close();
    }
  });

  test('GET /api/cms/settings/seo returns 200 JSON', async () => {
    const server = app.listen(0);
    const port = (server.address() as any).port;
    try {
      const res = await fetch(`http://localhost:${port}/api/cms/settings/seo`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.ok(data !== undefined);
    } finally {
      server.close();
    }
  });

  test('GET /api/cms/settings/general returns 200 JSON', async () => {
    const server = app.listen(0);
    const port = (server.address() as any).port;
    try {
      const res = await fetch(`http://localhost:${port}/api/cms/settings/general`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.ok(data !== undefined);
    } finally {
      server.close();
    }
  });

  test('GET /api/cms/projects returns 200 array', async () => {
    const server = app.listen(0);
    const port = (server.address() as any).port;
    try {
      const res = await fetch(`http://localhost:${port}/api/cms/projects`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.ok(Array.isArray(data));
    } finally {
      server.close();
    }
  });

  test('GET /api/cms/social returns 200 array', async () => {
    const server = app.listen(0);
    const port = (server.address() as any).port;
    try {
      const res = await fetch(`http://localhost:${port}/api/cms/social`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.ok(Array.isArray(data));
    } finally {
      server.close();
    }
  });

  test('GET /api/cms/navigation returns 200 array', async () => {
    const server = app.listen(0);
    const port = (server.address() as any).port;
    try {
      const res = await fetch(`http://localhost:${port}/api/cms/navigation`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.ok(Array.isArray(data));
    } finally {
      server.close();
    }
  });

  test('GET /api/cms/media returns 200 array', async () => {
    const server = app.listen(0);
    const port = (server.address() as any).port;
    try {
      const res = await fetch(`http://localhost:${port}/api/cms/media`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.ok(Array.isArray(data));
    } finally {
      server.close();
    }
  });
});
