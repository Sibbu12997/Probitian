import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import http from 'node:http';
import cmsRouter from '../server/routes/cms';
import { 
  parseCookies, 
  createAdminSession, 
  getAdminCookieHeader,
  setRevocationStore,
  resetRevocationStore,
  MemorySessionRevocationStore
} from '../server/auth/session';
import { UserRole } from '../server/auth/types';
import { readCmsData, writeCmsData } from '../server/services/supabase';
import { findMediaReferences, getMediaSearchTokens } from '../server/services/mediaReferenceService';
import { getAuditLogs } from '../server/services/audit';

describe('Admin Media Library Management & Reference Protection', () => {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use((req, res, next) => {
    (req as any).cookies = parseCookies(req);
    next();
  });
  app.use('/api', cmsRouter);

  let server: http.Server;
  let baseUrl: string;
  let adminCookie: string;
  let viewerCookie: string;

  before(async () => {
    setRevocationStore(new MemorySessionRevocationStore());

    // Create admin session
    const adminSession = createAdminSession(
      'probitianofficial@gmail.com',
      UserRole.ADMIN
    );
    adminCookie = `admin_session=${adminSession.token}`;

    // Create non-privileged session (lacks EDIT_CONTENT permission)
    const viewerSession = createAdminSession(
      'user@probitian.com',
      UserRole.USER
    );
    viewerCookie = `admin_session=${viewerSession.token}`;

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

  // Reset test data in cmsData before tests
  const testUsedMediaId = '11111111-2222-3333-4444-555555555555';
  const testUnusedMediaId1 = '66666666-7777-8888-9999-aaaaaaaaaaaa';
  const testUnusedMediaId2 = 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff';

  beforeEach(() => {
    const data = readCmsData();
    data.media = data.media || [];

    // Filter out previous test items
    data.media = data.media.filter(
      (m: any) =>
        m.id !== testUsedMediaId &&
        m.id !== testUnusedMediaId1 &&
        m.id !== testUnusedMediaId2
    );

    // Add referenced media item
    data.media.push({
      id: testUsedMediaId,
      filename: 'active_hero_banner.png',
      url: 'https://example.com/storage/media/active_hero_banner.png',
      public_url: 'https://example.com/storage/media/active_hero_banner.png',
      storage_path: 'media/active_hero_banner.png',
      size_bytes: 45000,
      mime_type: 'image/png',
      folder: 'branding'
    });

    // Add unused media item 1
    data.media.push({
      id: testUnusedMediaId1,
      filename: 'temporary_draft_chart.png',
      url: 'https://example.com/storage/media/temporary_draft_chart.png',
      public_url: 'https://example.com/storage/media/temporary_draft_chart.png',
      storage_path: 'media/temporary_draft_chart.png',
      size_bytes: 18000,
      mime_type: 'image/png',
      folder: 'general'
    });

    // Add unused media item 2
    data.media.push({
      id: testUnusedMediaId2,
      filename: 'old_unreferenced_icon.svg',
      url: 'https://example.com/storage/media/old_unreferenced_icon.svg',
      public_url: 'https://example.com/storage/media/old_unreferenced_icon.svg',
      storage_path: 'media/old_unreferenced_icon.svg',
      size_bytes: 3500,
      mime_type: 'image/svg+xml',
      folder: 'branding'
    });

    // Ensure a blog references the testUsedMediaId
    data.blogs = data.blogs || [];
    const blogIndex = data.blogs.findIndex((b: any) => b.id === 'test-blog-ref');
    if (blogIndex >= 0) {
      data.blogs[blogIndex].featured_image = 'https://example.com/storage/media/active_hero_banner.png';
    } else {
      data.blogs.push({
        id: 'test-blog-ref',
        title: 'Mastering Power BI DAX Patterns',
        slug: 'mastering-power-bi-dax-patterns',
        excerpt: 'Comprehensive guide to advanced DAX formulas',
        content: 'Article content mentioning the banner.',
        featured_image: 'https://example.com/storage/media/active_hero_banner.png',
        category: 'Power BI',
        author: 'Shivam Singh'
      });
    }

    writeCmsData(data);
  });

  test('1. Security: Unauthorized requests are rejected with 401', async () => {
    // Delete without cookie
    const res = await fetch(`${baseUrl}/api/cms/media/${testUnusedMediaId1}`, {
      method: 'DELETE'
    });
    assert.strictEqual(res.status, 401);

    // Bulk delete without cookie
    const bulkRes = await fetch(`${baseUrl}/api/cms/media/bulk-delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [testUnusedMediaId1] })
    });
    assert.strictEqual(bulkRes.status, 401);
  });

  test('2. RBAC: Insufficient permissions (VIEWER) rejected with 403', async () => {
    const res = await fetch(`${baseUrl}/api/cms/media/${testUnusedMediaId1}`, {
      method: 'DELETE',
      headers: { Cookie: viewerCookie }
    });
    assert.strictEqual(res.status, 403);
  });

  test('3. Media Reference Scanning: Correctly identifies referenced files', async () => {
    const references = await findMediaReferences({
      id: testUsedMediaId,
      url: 'https://example.com/storage/media/active_hero_banner.png'
    });

    assert.ok(references.length > 0, 'Should find at least 1 active reference');
    const blogRef = references.find((r) => r.type === 'blog_cover');
    assert.ok(blogRef, 'Should find blog_cover reference');
    assert.ok(blogRef.location.includes('Mastering Power BI DAX Patterns'));
  });

  test('4. GET /api/cms/media/:id/references: Returns reference list for active media', async () => {
    const res = await fetch(`${baseUrl}/api/cms/media/${testUsedMediaId}/references`, {
      headers: { Cookie: adminCookie }
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.in_use, true);
    assert.ok(data.reference_count >= 1);
    assert.ok(Array.isArray(data.references));
  });

  test('5. Single Delete Protection: Blocks deletion of media in active use with HTTP 409', async () => {
    const res = await fetch(`${baseUrl}/api/cms/media/${testUsedMediaId}`, {
      method: 'DELETE',
      headers: { Cookie: adminCookie }
    });

    assert.strictEqual(res.status, 409, 'Must return 409 Conflict when media is in use');
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.strictEqual(data.in_use, true);
    assert.ok(data.error.includes('currently in use'));
    assert.ok(Array.isArray(data.references) && data.references.length > 0);

    // Verify item still exists in database/cache
    const currentData = readCmsData();
    const stillExists = currentData.media.some((m: any) => m.id === testUsedMediaId);
    assert.strictEqual(stillExists, true, 'Active media file must not be deleted');
  });

  test('6. Single Delete Success: Successfully deletes unused media file', async () => {
    const res = await fetch(`${baseUrl}/api/cms/media/${testUnusedMediaId1}`, {
      method: 'DELETE',
      headers: { Cookie: adminCookie }
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);

    // Verify removed from database/cache
    const currentData = readCmsData();
    const stillExists = currentData.media.some((m: any) => m.id === testUnusedMediaId1);
    assert.strictEqual(stillExists, false, 'Unused media file must be removed from database');
  });

  test('7. Delete Failure: Gracefully handles non-existent media IDs', async () => {
    const nonExistentId = '00000000-0000-0000-0000-000000000000';
    const res = await fetch(`${baseUrl}/api/cms/media/${nonExistentId}`, {
      method: 'DELETE',
      headers: { Cookie: adminCookie }
    });

    assert.strictEqual(res.status, 404);
    const data = await res.json();
    assert.ok(data.error.includes('not found'));
  });

  test('8. Mixed Bulk Deletion: Safely deletes unused and skips referenced assets', async () => {
    // Request bulk delete for both used and unused items
    const res = await fetch(`${baseUrl}/api/cms/media/bulk-delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie
      },
      body: JSON.stringify({
        ids: [testUsedMediaId, testUnusedMediaId2]
      })
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.total_requested, 2);
    assert.strictEqual(data.deleted_count, 1, 'Exactly 1 unused asset should be deleted');
    assert.strictEqual(data.skipped_count, 1, 'Exactly 1 in-use asset should be skipped/protected');

    // Verify deleted item is testUnusedMediaId2
    assert.strictEqual(data.deleted[0].id, testUnusedMediaId2);

    // Verify skipped item is testUsedMediaId with reasons
    assert.strictEqual(data.skipped[0].id, testUsedMediaId);
    assert.ok(data.skipped[0].references.length > 0);

    // Verify database state: used item remains, unused is deleted
    const currentData = readCmsData();
    assert.strictEqual(
      currentData.media.some((m: any) => m.id === testUsedMediaId),
      true,
      'Referenced item must still be present'
    );
    assert.strictEqual(
      currentData.media.some((m: any) => m.id === testUnusedMediaId2),
      false,
      'Unused item must be deleted'
    );
  });

  test('9. Upload Failure: Rejects invalid or malicious media payload', async () => {
    // Missing fileData
    const res = await fetch(`${baseUrl}/api/cms/media/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie
      },
      body: JSON.stringify({
        filename: 'test.png',
        fileData: ''
      })
    });

    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.ok(data.error);
  });

  test('10. Audit Logging: Destructive actions and blocks are audited', async () => {
    // Attempt a blocked delete to produce an audit record
    await fetch(`${baseUrl}/api/cms/media/${testUsedMediaId}`, {
      method: 'DELETE',
      headers: { Cookie: adminCookie }
    });

    const logs = await getAuditLogs({ action: 'MEDIA_DELETE' });
    assert.ok(logs.length > 0, 'Should have audit log entries for MEDIA_DELETE');
    const deniedLog = logs.find((l) => l.result === 'DENIED');
    assert.ok(deniedLog, 'Should have recorded a DENIED audit log for blocked in-use deletion');
  });

  test('11. Search Token Extraction: Generates comprehensive tokens', () => {
    const tokens = getMediaSearchTokens({
      id: 'abc-123-uuid',
      filename: 'hero.png',
      storage_path: 'uploads/2026/09/special_asset_hero.png',
      public_url: 'https://example.com/storage/special_asset_hero.png'
    });

    assert.ok(tokens.includes('abc-123-uuid'));
    assert.ok(tokens.includes('special_asset_hero.png'));
    assert.ok(tokens.includes('https://example.com/storage/special_asset_hero.png'));
  });
});
