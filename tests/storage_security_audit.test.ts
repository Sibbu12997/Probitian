import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const anonKey = (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '').trim();

const isConfigured = Boolean(
  url &&
  anonKey &&
  !url.includes('placeholder-project') &&
  !url.includes('your-supabase-project')
);

describe('Supabase Storage Object RLS & Security Boundary Verification', () => {
  if (!isConfigured) {
    test('Notice: Supabase live credentials not configured; skipping live storage tests', () => {
      assert.ok(true);
    });
    return;
  }

  const anonClient = createClient(url, anonKey, {
    auth: { persistSession: false }
  });

  test('1. Anonymous listing of probitian-media root returns 0 objects (enumeration blocked)', async () => {
    const { data, error } = await anonClient.storage.from('probitian-media').list('');
    assert.strictEqual(error, null);
    assert.ok(Array.isArray(data));
    assert.strictEqual(data.length, 0, 'Anonymous client must not enumerate storage objects');
  });

  test('2. Anonymous listing of probitian-media/uploads returns 0 objects (folder enumeration blocked)', async () => {
    const { data, error } = await anonClient.storage.from('probitian-media').list('uploads');
    assert.strictEqual(error, null);
    assert.ok(Array.isArray(data));
    assert.strictEqual(data.length, 0, 'Anonymous client must not enumerate uploads folder');
  });

  test('3. Anonymous direct upload to probitian-media is rejected by RLS', async () => {
    const probeName = `probe_anon_test_${Date.now()}.txt`;
    const { data, error } = await anonClient.storage
      .from('probitian-media')
      .upload(probeName, Buffer.from('unauthorized'), { contentType: 'text/plain' });

    assert.strictEqual(data, null, 'Upload must return null data on RLS failure');
    assert.ok(error, 'Upload attempt must produce an error');
    assert.ok(
      error.message?.toLowerCase().includes('violates row-level security policy') ||
      (error as any).statusCode === '403' ||
      (error as any).status === 403,
      `Expected RLS violation, got: ${error.message}`
    );
  });

  test('4. Anonymous direct deletion from probitian-media is blocked (returns 0 deleted items)', async () => {
    // SECURITY COMPLIANCE: Never target a real production asset.
    // Create an isolated disposable probe via privileged client first.
    const probePath = `uploads/audit_disposable_probe_${Date.now()}.txt`;
    const serviceKey = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
    if (serviceKey) {
      const adminClient = createClient(url, serviceKey, { auth: { persistSession: false } });
      await adminClient.storage.from('probitian-media').upload(probePath, Buffer.from('test-probe'), { contentType: 'text/plain' });
    }

    try {
      const { data, error } = await anonClient.storage
        .from('probitian-media')
        .remove([probePath]);

      assert.strictEqual(error, null);
      assert.ok(Array.isArray(data));
      assert.strictEqual(data.length, 0, 'Anonymous client must not delete storage objects');
    } finally {
      // Safe cleanup of probe
      if (serviceKey) {
        const adminClient = createClient(url, serviceKey, { auth: { persistSession: false } });
        await adminClient.storage.from('probitian-media').remove([probePath]);
      }
    }
  });

  test('5. Legacy buckets (blogs, media, projects, settings) block anonymous direct uploads via RLS', async () => {
    for (const bucket of ['blogs', 'media', 'projects', 'settings']) {
      const { data, error } = await anonClient.storage
        .from(bucket)
        .upload('probe.txt', Buffer.from('x'), { contentType: 'text/plain' });

      assert.strictEqual(data, null);
      assert.ok(error, `Expected upload error for legacy bucket: ${bucket}`);
      assert.ok(
        error.message?.toLowerCase().includes('violates row-level security policy') ||
        (error as any).statusCode === '403' ||
        (error as any).status === 403,
        `Expected RLS error on ${bucket}, got: ${error.message}`
      );
    }
  });

  test('6. Public object delivery via CDN URL returns HTTP 200 with valid Content-Type and data', async () => {
    const logoUrl = `${url}/storage/v1/object/public/probitian-media/general/1786857432327-d4d5d41a-probitian_logo.svg`;
    const res = await fetch(logoUrl);
    assert.strictEqual(res.status, 200, 'Public CDN URL must return 200 OK');
    const contentType = res.headers.get('content-type') || '';
    assert.ok(contentType.includes('image/svg+xml'), `Expected SVG content type, got: ${contentType}`);
    const body = await res.text();
    assert.ok(body.includes('<svg'), 'Downloaded asset must contain valid SVG root tag');
  });
});
