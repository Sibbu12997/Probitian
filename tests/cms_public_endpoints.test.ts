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
    // Should pass auth/RBAC and reach handleUpload, returning 400 Bad Request
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /fileData.*required/i);
  });

  test('Valid PNG upload is accepted with HTTP 200', async () => {
    const editorToken = createSignedSessionToken('editor@probitian.com', UserRole.EDITOR);
    // 1x1 valid PNG base64
    const validPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const res = await fetch(`${baseUrl}/api/cms/media/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `admin_session=${editorToken}`
      },
      body: JSON.stringify({
        fileName: 'valid.png',
        contentType: 'image/png',
        fileData: `data:image/png;base64,${validPngBase64}`
      })
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.media.mime_type, 'image/png');
    assert.ok(body.media.storage_path.startsWith('uploads/'));
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

  test('Valid JPEG upload is accepted with HTTP 200', async () => {
    const editorToken = createSignedSessionToken('editor@probitian.com', UserRole.EDITOR);
    // Minimal valid JPEG header + bytes: FF D8 FF E0 00 10 4A 46 49 46
    const validJpeg = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xD9]);
    const res = await fetch(`${baseUrl}/api/cms/media/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `admin_session=${editorToken}`
      },
      body: JSON.stringify({
        fileName: 'photo.jpg',
        contentType: 'image/jpeg',
        fileData: `data:image/jpeg;base64,${validJpeg.toString('base64')}`
      })
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.media.mime_type, 'image/jpeg');
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

  test('Valid WebP upload is accepted with HTTP 200', async () => {
    const editorToken = createSignedSessionToken('editor@probitian.com', UserRole.EDITOR);
    // RIFF....WEBP header
    const validWebP = Buffer.concat([
      Buffer.from('RIFF', 'ascii'),
      Buffer.from([0x20, 0x00, 0x00, 0x00]),
      Buffer.from('WEBP', 'ascii'),
      Buffer.from('VP8 ', 'ascii'),
      Buffer.from([0x14, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])
    ]);
    const res = await fetch(`${baseUrl}/api/cms/media/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `admin_session=${editorToken}`
      },
      body: JSON.stringify({
        fileName: 'image.webp',
        contentType: 'image/webp',
        fileData: `data:image/webp;base64,${validWebP.toString('base64')}`
      })
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.media.mime_type, 'image/webp');
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

  test('SVG containing <script> or event handlers is sanitized before storage', async () => {
    const editorToken = createSignedSessionToken('editor@probitian.com', UserRole.EDITOR);
    const dirtySvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="40" fill="red" onload="alert('XSS')" onclick="fetch('/steal')" />
      <script>alert('pwned')</script>
      <a href="javascript:alert(1)"><text x="10" y="20">Click</text></a>
    </svg>`;
    const res = await fetch(`${baseUrl}/api/cms/media/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `admin_session=${editorToken}`
      },
      body: JSON.stringify({
        fileName: 'graphic.svg',
        contentType: 'image/svg+xml',
        fileData: `data:image/svg+xml;base64,${Buffer.from(dirtySvg, 'utf-8').toString('base64')}`
      })
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    
    // Check returned data URI or content
    if (body.url.startsWith('data:')) {
      const decoded = Buffer.from(body.url.split(',')[1], 'base64').toString('utf-8');
      assert.ok(!decoded.includes('<script'));
      assert.ok(!decoded.includes('onload='));
      assert.ok(!decoded.includes('onclick='));
      assert.ok(!decoded.includes('javascript:'));
      assert.ok(decoded.includes('<svg'));
      assert.ok(decoded.includes('<circle'));
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

  test('Path traversal in fileName (../../../etc/passwd) is sanitized to a safe storage path', async () => {
    const editorToken = createSignedSessionToken('editor@probitian.com', UserRole.EDITOR);
    const validPng = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const res = await fetch(`${baseUrl}/api/cms/media/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `admin_session=${editorToken}`
      },
      body: JSON.stringify({
        fileName: '../../../../etc/passwd.png',
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
  });

});
