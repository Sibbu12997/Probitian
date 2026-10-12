import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import http from 'node:http';
import cmsRouter from '../server/routes/cms';
import { 
  createSignedSessionToken,
  setRevocationStore,
  resetRevocationStore,
  MemorySessionRevocationStore
} from '../server/auth/session';
import { UserRole } from '../server/auth/types';
import { serverSupabase, readCmsData, writeCmsData } from '../server/services/supabase';

describe('Public CMS Endpoints Resiliency & Production Regression Tests', () => {
  const app = express();
  app.use(express.json({ limit: '15mb' }));
  app.use('/api', cmsRouter);

  let server: http.Server;
  let baseUrl: string;
  const uploadedAssetsToClean: Array<{ id: string; storage_path: string }> = [];

  async function safelyCleanAsset(id?: string, storagePath?: string) {
    if (!id && !storagePath) return;
    try {
      if (serverSupabase && storagePath) {
        await serverSupabase.storage.from('probitian-media').remove([storagePath]);
      }
    } catch (e) {
      // ignore in test cleanup
    }
    try {
      if (serverSupabase && id) {
        await serverSupabase.from('media').delete().eq('id', id);
      }
    } catch (e) {
      // ignore in test cleanup
    }
    try {
      const localData = readCmsData();
      if (localData.media && Array.isArray(localData.media)) {
        localData.media = localData.media.filter((m: any) => m.id !== id && m.storage_path !== storagePath);
        writeCmsData(localData);
      }
    } catch (e) {
      // ignore
    }
  }

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

    // Secondary fail-safe cleanup of all disposable test probe files registered during this run
    if (uploadedAssetsToClean.length > 0) {
      for (const asset of uploadedAssetsToClean) {
        await safelyCleanAsset(asset.id, asset.storage_path);
      }
    }

    if (server) {
      if ((server as any).closeAllConnections) (server as any).closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  // =========================================================================
  // 1. PUBLIC ENDPOINTS ACCESS & FILTERING TESTS
  // =========================================================================

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

  test('GET /api/cms/projects returns HTTP 200 with published projects only for anonymous users', async () => {
    const res = await fetch(`${baseUrl}/api/cms/projects`);
    assert.strictEqual(res.status, 200);
    assert.match(res.headers.get('content-type') || '', /application\/json/);
    const data = await res.json();
    assert.ok(Array.isArray(data));
    for (const project of data) {
      assert.strictEqual(project.published !== false, true, 'Draft/unpublished projects must not be public');
    }
  });

  test('GET /api/cms/blogs returns HTTP 200 with published blogs only for anonymous users', async () => {
    const res = await fetch(`${baseUrl}/api/cms/blogs`);
    assert.strictEqual(res.status, 200);
    assert.match(res.headers.get('content-type') || '', /application\/json/);
    const data = await res.json();
    assert.ok(Array.isArray(data));
    for (const blog of data) {
      assert.strictEqual(blog.status, 'published', 'Only published blogs may be returned to anonymous users');
    }
  });

  test('GET /api/cms/courses returns HTTP 200 with published courses only for anonymous users', async () => {
    const res = await fetch(`${baseUrl}/api/cms/courses`);
    assert.strictEqual(res.status, 200);
    assert.match(res.headers.get('content-type') || '', /application\/json/);
    const data = await res.json();
    assert.ok(Array.isArray(data));
    for (const course of data) {
      assert.strictEqual(course.published !== false, true, 'Draft/unpublished courses must not be public');
    }
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

  test('GET /api/cms/settings/home returns HTTP 200 with valid public setting', async () => {
    const res = await fetch(`${baseUrl}/api/cms/settings/home`);
    assert.strictEqual(res.status, 200);
    assert.match(res.headers.get('content-type') || '', /application\/json/);
    const data = await res.json();
    assert.ok(data !== undefined);
  });

  test('GET /api/cms/settings/general returns HTTP 200 with valid public setting', async () => {
    const res = await fetch(`${baseUrl}/api/cms/settings/general`);
    assert.strictEqual(res.status, 200);
    assert.match(res.headers.get('content-type') || '', /application\/json/);
    const data = await res.json();
    assert.ok(data !== undefined);
  });

  test('GET /api/cms/settings/seo returns HTTP 200 with valid public setting', async () => {
    const res = await fetch(`${baseUrl}/api/cms/settings/seo`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data !== undefined);
  });

  test('GET /api/cms/settings returns HTTP 200 with allowlisted public settings only', async () => {
    const res = await fetch(`${baseUrl}/api/cms/settings`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data));
    const allowed = new Set(['general', 'seo', 'legal', 'home', 'founder_message', 'founder', 'social_links', 'navigation_items']);
    for (const item of data) {
      assert.ok(allowed.has(item.key), `Non-public settings key "${item.key}" leaked in public settings list`);
    }
  });

  test('GET /api/cms/settings/crm_leads is blocked with HTTP 404 for unauthenticated callers', async () => {
    const res = await fetch(`${baseUrl}/api/cms/settings/crm_leads`);
    assert.strictEqual(res.status, 404);
    const body = await res.json();
    assert.match(body.error, /not found/i);
  });

  test('GET /api/cms/settings/rate_limits is blocked with HTTP 404 for unauthenticated callers', async () => {
    const res = await fetch(`${baseUrl}/api/cms/settings/rate_limits`);
    assert.strictEqual(res.status, 404);
  });

  test('GET /api/cms/settings/audit_logs is blocked with HTTP 404 for unauthenticated callers', async () => {
    const res = await fetch(`${baseUrl}/api/cms/settings/audit_logs`);
    assert.strictEqual(res.status, 404);
  });

  // =========================================================================
  // 2. ADMINISTRATIVE & PROTECTED ENDPOINTS AUTHORIZATION (RBAC)
  // =========================================================================

  test('Unauthenticated GET /api/cms/media is blocked with HTTP 401 Unauthorized', async () => {
    const res = await fetch(`${baseUrl}/api/cms/media`);
    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.match(body.error, /Unauthorized/i);
  });

  test('Authenticated non-admin USER GET /api/cms/media is allowed for CONTENT_READ', async () => {
    const userToken = createSignedSessionToken('viewer@probitian.com', UserRole.USER);
    const res = await fetch(`${baseUrl}/api/cms/media`, {
      headers: { Cookie: `admin_session=${userToken}` }
    });
    // USER role has CONTENT_READ permission
    assert.strictEqual(res.status, 200);
  });

  test('Authenticated EDITOR GET /api/cms/media returns HTTP 200 with JSON array', async () => {
    const editorToken = createSignedSessionToken('editor@probitian.com', UserRole.EDITOR);
    const res = await fetch(`${baseUrl}/api/cms/media`, {
      headers: { Cookie: `admin_session=${editorToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.match(res.headers.get('content-type') || '', /application\/json/);
    const data = await res.json();
    assert.ok(Array.isArray(data));
  });

  test('Unauthenticated GET /api/cms/messages is blocked with HTTP 401', async () => {
    const res = await fetch(`${baseUrl}/api/cms/messages`);
    assert.strictEqual(res.status, 401);
  });

  test('Authenticated USER without VIEW_ANALYTICS is blocked from GET /api/cms/messages with HTTP 403', async () => {
    const userToken = createSignedSessionToken('user@probitian.com', UserRole.USER);
    const res = await fetch(`${baseUrl}/api/cms/messages`, {
      headers: { Cookie: `admin_session=${userToken}` }
    });
    assert.strictEqual(res.status, 403);
  });

  test('Unauthenticated GET /api/cms/subscribers is blocked with HTTP 401', async () => {
    const res = await fetch(`${baseUrl}/api/cms/subscribers`);
    assert.strictEqual(res.status, 401);
  });

  test('Authenticated USER without VIEW_ANALYTICS is blocked from GET /api/cms/subscribers with HTTP 403', async () => {
    const userToken = createSignedSessionToken('user@probitian.com', UserRole.USER);
    const res = await fetch(`${baseUrl}/api/cms/subscribers`, {
      headers: { Cookie: `admin_session=${userToken}` }
    });
    assert.strictEqual(res.status, 403);
  });

  test('Unauthenticated POST /api/cms/projects is blocked with HTTP 401', async () => {
    const res = await fetch(`${baseUrl}/api/cms/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Unauthorized Project' })
    });
    assert.strictEqual(res.status, 401);
  });

  test('Authenticated USER without EDIT_CONTENT is blocked from POST /api/cms/projects with HTTP 403', async () => {
    const userToken = createSignedSessionToken('user@probitian.com', UserRole.USER);
    const res = await fetch(`${baseUrl}/api/cms/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `admin_session=${userToken}`
      },
      body: JSON.stringify({ title: 'Unauthorized Project' })
    });
    assert.strictEqual(res.status, 403);
  });

  test('Unauthenticated POST /api/cms/settings is blocked with HTTP 401', async () => {
    const res = await fetch(`${baseUrl}/api/cms/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'general', value: {} })
    });
    assert.strictEqual(res.status, 401);
  });

  test('Authenticated USER is blocked from POST /api/cms/settings with HTTP 403', async () => {
    const userToken = createSignedSessionToken('user@probitian.com', UserRole.USER);
    const res = await fetch(`${baseUrl}/api/cms/settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `admin_session=${userToken}`
      },
      body: JSON.stringify({ key: 'general', value: {} })
    });
    assert.strictEqual(res.status, 403);
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

  test('Authenticated USER without EDIT_CONTENT is blocked from POST /api/cms/media/upload with HTTP 403', async () => {
    const userToken = createSignedSessionToken('regularuser@probitian.com', UserRole.USER);
    const res = await fetch(`${baseUrl}/api/cms/media/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `admin_session=${userToken}`
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
        'Cookie': `admin_session=${editorToken}`
      },
      body: JSON.stringify({}) // Missing required fields -> hits body validation in handleUpload
    });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /fileData.*required/i);
  });

  // =========================================================================
  // 3. MEDIA UPLOAD VALIDATION & GUARANTEED DISPOSABLE CLEANUP
  // =========================================================================

  test('Valid PNG upload is accepted with HTTP 200 and immediately cleaned up', async () => {
    const editorToken = createSignedSessionToken('editor@probitian.com', UserRole.EDITOR);
    const validPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const testFileName = `test_probe_${Date.now()}_valid.png`;

    const res = await fetch(`${baseUrl}/api/cms/media/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `admin_session=${editorToken}`
      },
      body: JSON.stringify({
        fileName: testFileName,
        contentType: 'image/png',
        fileData: `data:image/png;base64,${validPngBase64}`
      })
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.media.mime_type, 'image/png');
    assert.ok(body.media.storage_path.startsWith('uploads/'));

    // Register asset and guarantee immediate cleanup
    uploadedAssetsToClean.push({ id: body.media.id, storage_path: body.media.storage_path });
    try {
      assert.ok(body.media.id);
    } finally {
      await safelyCleanAsset(body.media.id, body.media.storage_path);
    }
  });

  test('Non-PNG payload renamed to .png is rejected with HTTP 400', async () => {
    const editorToken = createSignedSessionToken('editor@probitian.com', UserRole.EDITOR);
    const fakePngData = Buffer.from('NOT A REAL PNG FILE').toString('base64');
    const res = await fetch(`${baseUrl}/api/cms/media/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `admin_session=${editorToken}`
      },
      body: JSON.stringify({
        fileName: 'fake.png',
        contentType: 'image/png',
        fileData: `data:image/png;base64,${fakePngData}`
      })
    });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /signature|validation|mismatch|unsupported/i);
  });

  test('Valid JPEG upload is accepted with HTTP 200 and immediately cleaned up', async () => {
    const editorToken = createSignedSessionToken('editor@probitian.com', UserRole.EDITOR);
    const validJpeg = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xD9]);
    const testFileName = `test_probe_${Date.now()}_photo.jpg`;

    const res = await fetch(`${baseUrl}/api/cms/media/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `admin_session=${editorToken}`
      },
      body: JSON.stringify({
        fileName: testFileName,
        contentType: 'image/jpeg',
        fileData: `data:image/jpeg;base64,${validJpeg.toString('base64')}`
      })
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.media.mime_type, 'image/jpeg');

    uploadedAssetsToClean.push({ id: body.media.id, storage_path: body.media.storage_path });
    try {
      assert.ok(body.media.id);
    } finally {
      await safelyCleanAsset(body.media.id, body.media.storage_path);
    }
  });

  test('Non-JPEG payload renamed to .jpg is rejected with HTTP 400', async () => {
    const editorToken = createSignedSessionToken('editor@probitian.com', UserRole.EDITOR);
    const fakeJpeg = Buffer.from('FAKE JPEG CONTENT').toString('base64');
    const res = await fetch(`${baseUrl}/api/cms/media/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `admin_session=${editorToken}`
      },
      body: JSON.stringify({
        fileName: 'spoofed.jpg',
        contentType: 'image/jpeg',
        fileData: `data:image/jpeg;base64,${fakeJpeg}`
      })
    });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /signature|validation|mismatch|unsupported/i);
  });

  test('Valid WebP upload is accepted with HTTP 200 and immediately cleaned up', async () => {
    const editorToken = createSignedSessionToken('editor@probitian.com', UserRole.EDITOR);
    const validWebP = Buffer.concat([
      Buffer.from('RIFF', 'ascii'),
      Buffer.from([0x20, 0x00, 0x00, 0x00]),
      Buffer.from('WEBP', 'ascii'),
      Buffer.from('VP8 ', 'ascii'),
      Buffer.from([0x14, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])
    ]);
    const testFileName = `test_probe_${Date.now()}_image.webp`;

    const res = await fetch(`${baseUrl}/api/cms/media/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `admin_session=${editorToken}`
      },
      body: JSON.stringify({
        fileName: testFileName,
        contentType: 'image/webp',
        fileData: `data:image/webp;base64,${validWebP.toString('base64')}`
      })
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.media.mime_type, 'image/webp');

    uploadedAssetsToClean.push({ id: body.media.id, storage_path: body.media.storage_path });
    try {
      assert.ok(body.media.id);
    } finally {
      await safelyCleanAsset(body.media.id, body.media.storage_path);
    }
  });

  test('Invalid payload renamed to .webp is rejected with HTTP 400', async () => {
    const editorToken = createSignedSessionToken('editor@probitian.com', UserRole.EDITOR);
    const fakeWebp = Buffer.from('FAKE WEBP BUFFER').toString('base64');
    const res = await fetch(`${baseUrl}/api/cms/media/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `admin_session=${editorToken}`
      },
      body: JSON.stringify({
        fileName: 'invalid.webp',
        contentType: 'image/webp',
        fileData: `data:image/webp;base64,${fakeWebp}`
      })
    });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /signature|validation|mismatch|unsupported/i);
  });

  test('SVG containing <script> or event handlers is sanitized before storage and immediately cleaned up', async () => {
    const editorToken = createSignedSessionToken('editor@probitian.com', UserRole.EDITOR);
    const dirtySvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="40" fill="red" onload="alert('XSS')" onclick="fetch('/steal')" />
      <script>alert('pwned')</script>
      <a href="javascript:alert(1)"><text x="10" y="20">Click</text></a>
    </svg>`;
    const testFileName = `test_probe_${Date.now()}_graphic.svg`;

    const res = await fetch(`${baseUrl}/api/cms/media/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `admin_session=${editorToken}`
      },
      body: JSON.stringify({
        fileName: testFileName,
        contentType: 'image/svg+xml',
        fileData: `data:image/svg+xml;base64,${Buffer.from(dirtySvg, 'utf-8').toString('base64')}`
      })
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);

    uploadedAssetsToClean.push({ id: body.media.id, storage_path: body.media.storage_path });
    try {
      if (body.url && body.url.startsWith('data:')) {
        const decoded = Buffer.from(body.url.split(',')[1], 'base64').toString('utf-8');
        assert.ok(!decoded.includes('<script'));
        assert.ok(!decoded.includes('onload='));
        assert.ok(!decoded.includes('onclick='));
        assert.ok(!decoded.includes('javascript:'));
        assert.ok(decoded.includes('<svg'));
        assert.ok(decoded.includes('<circle'));
      }
    } finally {
      await safelyCleanAsset(body.media.id, body.media.storage_path);
    }
  });

  test('Executable PE MZ binary is strictly rejected with HTTP 400', async () => {
    const editorToken = createSignedSessionToken('editor@probitian.com', UserRole.EDITOR);
    const peExe = Buffer.from([0x4D, 0x5A, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]);
    const res = await fetch(`${baseUrl}/api/cms/media/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `admin_session=${editorToken}`
      },
      body: JSON.stringify({
        fileName: 'malware.exe',
        contentType: 'image/png',
        fileData: `data:image/png;base64,${peExe.toString('base64')}`
      })
    });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /prohibited|forbidden|invalid|signature/i);
  });

  test('Executable ELF binary is strictly rejected with HTTP 400', async () => {
    const editorToken = createSignedSessionToken('editor@probitian.com', UserRole.EDITOR);
    const elfBin = Buffer.from([0x7F, 0x45, 0x4C, 0x46, 0x02, 0x01, 0x01, 0x00]);
    const res = await fetch(`${baseUrl}/api/cms/media/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `admin_session=${editorToken}`
      },
      body: JSON.stringify({
        fileName: 'payload.elf',
        contentType: 'image/png',
        fileData: `data:image/png;base64,${elfBin.toString('base64')}`
      })
    });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /prohibited|forbidden|invalid|signature/i);
  });

  test('Shell script is strictly rejected with HTTP 400', async () => {
    const editorToken = createSignedSessionToken('editor@probitian.com', UserRole.EDITOR);
    const shScript = Buffer.from('#!/bin/bash\necho "exploit"\n');
    const res = await fetch(`${baseUrl}/api/cms/media/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `admin_session=${editorToken}`
      },
      body: JSON.stringify({
        fileName: 'script.sh',
        contentType: 'image/png',
        fileData: `data:image/png;base64,${shScript.toString('base64')}`
      })
    });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /prohibited|forbidden|invalid|signature/i);
  });

  test('PHP script is strictly rejected with HTTP 400', async () => {
    const editorToken = createSignedSessionToken('editor@probitian.com', UserRole.EDITOR);
    const phpScript = Buffer.from('<?php echo "backdoor"; ?>');
    const res = await fetch(`${baseUrl}/api/cms/media/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `admin_session=${editorToken}`
      },
      body: JSON.stringify({
        fileName: 'shell.php',
        contentType: 'image/png',
        fileData: `data:image/png;base64,${phpScript.toString('base64')}`
      })
    });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /prohibited|forbidden|invalid|signature/i);
  });

  test('Path traversal in fileName (../../../etc/passwd.png) is sanitized to safe path and immediately cleaned up', async () => {
    const editorToken = createSignedSessionToken('editor@probitian.com', UserRole.EDITOR);
    const validPng = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const testFileName = `../../../../etc/test_probe_${Date.now()}_passwd.png`;

    const res = await fetch(`${baseUrl}/api/cms/media/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `admin_session=${editorToken}`
      },
      body: JSON.stringify({
        fileName: testFileName,
        contentType: 'image/png',
        fileData: `data:image/png;base64,${validPng}`
      })
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(!body.media.storage_path.includes('../'));
    assert.ok(!body.media.storage_path.includes('/etc/'));
    assert.ok(body.media.storage_path.startsWith('uploads/'));
    assert.ok(body.media.filename.endsWith('passwd.png'));

    uploadedAssetsToClean.push({ id: body.media.id, storage_path: body.media.storage_path });
    try {
      assert.ok(body.media.id);
    } finally {
      await safelyCleanAsset(body.media.id, body.media.storage_path);
    }
  });

  test('Upload exceeding MAX_UPLOAD_BYTES (15MB) is rejected with HTTP 413 Payload Too Large', async () => {
    const editorToken = createSignedSessionToken('editor@probitian.com', UserRole.EDITOR);
    // Create base64 payload representing 15.5 MB (16,252,928 bytes)
    const sixteenMbBuffer = Buffer.alloc(16 * 1024 * 1024);
    const sixteenMbBase64 = sixteenMbBuffer.toString('base64');

    const res = await fetch(`${baseUrl}/api/cms/media/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `admin_session=${editorToken}`
      },
      body: JSON.stringify({
        fileName: 'oversized.png',
        contentType: 'image/png',
        fileData: `data:image/png;base64,${sixteenMbBase64}`
      })
    });
    // Can be 413 Payload Too Large (from express body-parser limit of 15mb or from handleUpload check)
    assert.ok(res.status === 413 || res.status === 400, `Expected 413 or 400 for oversized payload, got ${res.status}`);
  });
});
