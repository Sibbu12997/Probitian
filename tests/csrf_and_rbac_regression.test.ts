import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import http from 'node:http';
import { csrfDefenseMiddleware } from '../server/security/csrf';
import { corsMiddleware } from '../server/security/cors';
import { requireAuth, requireRole } from '../server/auth/rbac';
import { UserRole } from '../server/auth/types';
import { createSignedSessionToken, setRevocationStore, resetRevocationStore, MemorySessionRevocationStore, parseCookies } from '../server/auth/session';

test('CSRF and RBAC regression guards', async (t) => {
  let server: http.Server;
  let baseUrl = '';
  let revocationStore: MemorySessionRevocationStore;
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { (req as any).cookies = parseCookies(req); next(); });
  app.use(corsMiddleware);
  app.use(csrfDefenseMiddleware);
  app.post('/api/admin/system/settings', requireAuth, requireRole(UserRole.ADMIN), (_req, res) => res.json({ success: true }));
  app.post('/api/cron/process-sequences', (_req, res) => res.json({ success: true }));

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
  const cookie = (role: UserRole) => `admin_session=${createSignedSessionToken(`${role.toLowerCase()}@probitian.com`, role)}`;

  await t.test('trusted origin and admin session succeed', async () => {
    const res = await fetch(`${baseUrl}/api/admin/system/settings`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://probitian.ai.studio', Cookie: cookie(UserRole.ADMIN) }, body: JSON.stringify({ theme: 'dark' }) });
    assert.equal(res.status, 200);
  });
  await t.test('untrusted Origin is rejected', async () => {
    const res = await fetch(`${baseUrl}/api/admin/system/settings`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://evil-attacker-website.com', Cookie: cookie(UserRole.ADMIN) }, body: JSON.stringify({ theme: 'malicious' }) });
    assert.equal(res.status, 403);
  });
  await t.test('untrusted Referer without Origin is rejected', async () => {
    const res = await fetch(`${baseUrl}/api/admin/system/settings`, { method: 'POST', headers: { 'Content-Type': 'application/json', Referer: 'https://attacker.evil.com/phishing-page', Cookie: cookie(UserRole.ADMIN) }, body: JSON.stringify({ theme: 'malicious' }) });
    assert.equal(res.status, 403);
  });
  await t.test('session-authenticated cron endpoint rejects an untrusted Origin', async () => {
    const res = await fetch(`${baseUrl}/api/cron/process-sequences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://evil-attacker-website.com', Cookie: cookie(UserRole.ADMIN) },
      body: JSON.stringify({})
    });
    assert.equal(res.status, 403);
  });
  await t.test('scheduler secret headers may pass CSRF middleware for server-to-server auth', async () => {
    const res = await fetch(`${baseUrl}/api/cron/process-sequences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-cron-key': 'test-scheduler-secret' },
      body: JSON.stringify({})
    });
    assert.equal(res.status, 200);
  });
  await t.test('missing session is rejected', async () => {
    const res = await fetch(`${baseUrl}/api/admin/system/settings`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://probitian.ai.studio' }, body: JSON.stringify({ theme: 'dark' }) });
    assert.equal(res.status, 401);
  });
  await t.test('non-admin session cannot update admin settings', async () => {
    const res = await fetch(`${baseUrl}/api/admin/system/settings`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://probitian.ai.studio', Cookie: cookie(UserRole.EDITOR) }, body: JSON.stringify({ theme: 'dark' }) });
    assert.equal(res.status, 403);
  });
});
