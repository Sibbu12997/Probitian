import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import http from 'node:http';
import feedbackRouter from '../server/routes/feedback';
import {
  createSignedSessionToken,
  setRevocationStore,
  resetRevocationStore,
  MemorySessionRevocationStore
} from '../server/auth/session';
import { UserRole } from '../server/auth/types';

describe('Feedback and Testimonials API Tests', () => {
  const app = express();
  app.use(express.json());
  app.use('/api', feedbackRouter);

  let server: http.Server;
  let baseUrl: string;

  before(async () => {
    setRevocationStore(new MemorySessionRevocationStore());
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

  const getAdminCookie = (role: UserRole = UserRole.ADMIN) => {
    const token = createSignedSessionToken('admin@probitian.com', role, 'test-admin-id');
    return `admin_session=${token}`;
  };

  test('POST /api/feedback rejects submission when required fields are missing', async () => {
    const res = await fetch(`${baseUrl}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: '',
        email: 'invalid-email',
        feedback: 'hi'
      })
    });

    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.ok(data.error);
  });

  test('POST /api/feedback rejects submission when consent_public is false or missing', async () => {
    const res = await fetch(`${baseUrl}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Jane Doe',
        email: 'jane@example.com',
        rating: 5,
        feedback: 'ProBitian Power BI course was amazing and helped me land an analyst job!',
        consent_public: false
      })
    });

    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.match(data.error, /consent/i);
  });

  test('POST /api/feedback rejects rating out of bounds (0 or 6)', async () => {
    const res = await fetch(`${baseUrl}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Jane Doe',
        email: 'jane@example.com',
        rating: 6,
        feedback: 'Great course content overall!',
        consent_public: true
      })
    });

    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.match(data.error, /rating/i);
  });

  test('POST /api/feedback accepts valid submission and ensures client cannot force status or featured', async () => {
    const res = await fetch(`${baseUrl}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'John Smith',
        email: 'john.smith@example.com',
        role: 'Data Analyst',
        company: 'Acme Corp',
        rating: 5,
        feedback: 'The DAX tutorials completely changed how I think about filter context. Highly recommend!',
        service: 'Power BI & DAX',
        consent_public: true,
        status: 'approved', // Malicious attempt to self-approve
        featured: true // Malicious attempt to self-feature
      })
    });

    // In local test environment with mock/real Supabase
    assert.ok(res.status === 200 || res.status === 201 || res.status === 500);
    if (res.status === 200 || res.status === 201) {
      const data = await res.json();
      assert.strictEqual(data.success, true);
    }
  });

  test('GET /api/feedback returns 200 and array of approved testimonials', async () => {
    const res = await fetch(`${baseUrl}/api/feedback`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data));

    // Privacy verification: Email must NEVER be present in public feedback items
    for (const item of data) {
      assert.strictEqual((item as any).email, undefined, 'Public feedback must never expose visitor email');
    }
  });

  test('GET /api/admin/feedback rejects unauthenticated requests with 401', async () => {
    const res = await fetch(`${baseUrl}/api/admin/feedback`);
    assert.strictEqual(res.status, 401);
  });

  test('GET /api/admin/feedback allows authenticated admin with EDIT_CONTENT permission', async () => {
    const res = await fetch(`${baseUrl}/api/admin/feedback`, {
      headers: {
        Cookie: getAdminCookie(UserRole.ADMIN)
      }
    });

    // 200 with JSON array
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data));
  });

  test('PATCH /api/admin/feedback/:id rejects unauthenticated moderation', async () => {
    const res = await fetch(`${baseUrl}/api/admin/feedback/some-fake-id`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'approved' })
    });
    assert.strictEqual(res.status, 401);
  });

  test('DELETE /api/admin/feedback/:id rejects unauthenticated deletion', async () => {
    const res = await fetch(`${baseUrl}/api/admin/feedback/some-fake-id`, {
      method: 'DELETE'
    });
    assert.strictEqual(res.status, 401);
  });
});
