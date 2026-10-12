import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import http from 'node:http';
import { csrfDefenseMiddleware } from '../server/security/csrf';
import { corsMiddleware } from '../server/security/cors';
import { requireAuth, requireRole, requirePermission } from '../server/auth/rbac';
import { UserRole, Permission } from '../server/auth/types';
import {
  createSignedSessionToken,
  setRevocationStore,
  resetRevocationStore,
  MemorySessionRevocationStore,
  parseCookies
} from '../server/auth/session';

test('CSRF and RBAC regression guards', async (t) => {
  let server: http.Server;
  let baseUrl = '';
  let revocationStore: MemorySessionRevocationStore;

  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).cookies = parseCookies(req);
    next();
  });
  app.use(corsMiddleware);
  app.use(csrfDefenseMiddleware);
  app.post('/api/admin/system/settings', requireAuth, requireRole(UserRole.ADMIN), (_req, res) => res.json({ success: true }));
  app.post('/api/cms/publish', requireAuth, requirePermission(Permission.PUBLISH_CONTENT), (_req, res) => res.json({ success: true }));
  app.post('/api/crm/leads', requireAuth, requirePermission(Permission.MANAGE_CRM), (_req, res) => res.json({ success: true }));

  before(async () => {
    revocationStore = new MemorySessionRevocationStore();
    setRevocationStore(revocationStore);
    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        baseUrl = `http://127.0.0.1:${(server.address() as any).port}`;
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

  const adminCookie = () => `admin_session=${createSignedSessionToken('admin@probitian.com', UserRole.ADMIN)}`;

  await t.test('trusted origin plus valid admin session succeeds', async () => {
    const res = await fetch(`${baseUrl}/api/admin/system/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://probitian.ai.studio', Cookie: adminCookie() },
      body: JSON.stringify({ theme: 'dark' })
    });
    assert.equal(res.status, 200);
  });

  await t.test('untrusted cross-origin state-changing request is rejected', async () => {
    const res = await fetch(`${baseUrl}/api/admin/system/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://evil-attacker-website.com', Cookie: adminCookie() },
      body: JSON.stringify({ theme: 'malicious' })
    });
    assert.equal(res.status, 403);
  });

  await t.test('untrusted Referer without Origin is rejected', async () => {
    const res = await fetch(`${baseUrl}/api/admin/system/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Referer: 'https://attacker.evil.com/phishing-page', Cookie: adminCookie() },
      body: JSON.stringify({ theme: 'malicious' })
    });
    assert.equal(res.status, 403);
  });

  await t.test('missing session is rejected by protected endpoint', async () => {
    const res = await fetch(`${baseUrl}/api/admin/system/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://probitian.ai.studio' },
      body: JSON.stringify({ theme: 'dark' })
    });
    assert.equal(res.status, 401);
  });

  await t.test('non-admin session cannot change admin settings', async () => {
    const editorCookie = `admin_session=${createSignedSessionToken('editor@probitian.com', UserRole.EDITOR)}`;
    const res = await fetch(`${baseUrl}/api/admin/system/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://probitian.ai.studio', Cookie: editorCookie },
      body: JSON.stringify({ theme: 'dark' })
    });
    assert.equal(res.status, 403);
  });
});
