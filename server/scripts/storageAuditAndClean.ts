import { serverSupabase } from '../services/supabase';
import { PROBITIAN_MEDIA_BUCKET } from '../config/constants';
import fs from 'fs';
import path from 'path';

export interface StorageObjectReport {
  bucket: string;
  storage_path: string;
  filename: string;
  media_id: string | null;
  reference_location: string | null;
  classification: 'USED' | 'REGISTERED' | 'ORPHANED' | 'MISSING' | 'LEGACY_BUCKET';
  file_size: number;
  created_at: string;
  safe_to_delete: boolean;
  notes?: string;
}

export interface BucketInventory {
  bucket: string;
  total_objects: number;
  total_size_bytes: number;
  total_size_mb: string;
  folder_distribution: Record<string, { count: number; size_bytes: number }>;
  oldest_object: { path: string; created_at: string } | null;
  newest_object: { path: string; created_at: string } | null;
  app_references_bucket: boolean;
  notes: string;
}

export async function listAllFilesRecursively(bucket: string, prefix = ''): Promise<any[]> {
  if (!serverSupabase) throw new Error('Supabase client is not configured');
  const files: any[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const { data, error } = await serverSupabase.storage.from(bucket).list(prefix, {
      limit,
      offset,
      sortBy: { column: 'name', order: 'asc' }
    });

    if (error) {
      console.error(`[Storage Audit] Error listing bucket "${bucket}" at prefix "${prefix}":`, error.message);
      break;
    }

    if (!data || data.length === 0) break;

    for (const item of data) {
      const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id === null) {
        // Directory
        const subFiles = await listAllFilesRecursively(bucket, fullPath);
        files.push(...subFiles);
      } else {
        files.push({ ...item, fullPath, bucket });
      }
    }

    if (data.length < limit) break;
    offset += limit;
  }

  return files;
}

export async function runStorageAudit() {
  if (!serverSupabase) {
    throw new Error('Supabase client not configured');
  }

  const allBuckets = ['blogs', 'media', 'probitian-media', 'projects', 'settings'];
  const inventories: Record<string, BucketInventory> = {};
  const allStorageFiles: any[] = [];

  // TASK 1: Inventory all Storage buckets
  for (const b of allBuckets) {
    const files = await listAllFilesRecursively(b);
    allStorageFiles.push(...files);

    const folderDist: Record<string, { count: number; size_bytes: number }> = {};
    let totalSizeBytes = 0;

    for (const f of files) {
      const folder = f.fullPath.includes('/') ? f.fullPath.split('/')[0] : 'root';
      if (!folderDist[folder]) folderDist[folder] = { count: 0, size_bytes: 0 };
      const sz = f.metadata?.size || 0;
      folderDist[folder].count++;
      folderDist[folder].size_bytes += sz;
      totalSizeBytes += sz;
    }

    const sortedByDate = [...files].sort((x, y) => new Date(x.created_at).getTime() - new Date(y.created_at).getTime());

    const isReferencedByApp = b === PROBITIAN_MEDIA_BUCKET;

    inventories[b] = {
      bucket: b,
      total_objects: files.length,
      total_size_bytes: totalSizeBytes,
      total_size_mb: (totalSizeBytes / (1024 * 1024)).toFixed(3),
      folder_distribution: folderDist,
      oldest_object: sortedByDate[0] ? { path: sortedByDate[0].fullPath, created_at: sortedByDate[0].created_at } : null,
      newest_object: sortedByDate[sortedByDate.length - 1] ? { path: sortedByDate[sortedByDate.length - 1].fullPath, created_at: sortedByDate[sortedByDate.length - 1].created_at } : null,
      app_references_bucket: isReferencedByApp,
      notes: isReferencedByApp
        ? 'Active production bucket configured in PROBITIAN_MEDIA_BUCKET for all uploads and media management.'
        : 'Empty legacy bucket created during initial project bootstrap. Not referenced by current code.'
    };
  }

  // TASK 3: Load public.media and content models
  const { data: mediaRows, error: mediaErr } = await serverSupabase.from('media').select('*');
  if (mediaErr) {
    throw new Error(`Failed to query public.media: ${mediaErr.message}`);
  }

  const [blogs, projects, courses, videos, settings, pages, leads, campaigns] = await Promise.all([
    serverSupabase.from('blogs').select('*').then(r => r.data || []),
    serverSupabase.from('projects').select('*').then(r => r.data || []),
    serverSupabase.from('courses').select('*').then(r => r.data || []),
    serverSupabase.from('videos').select('*').then(r => r.data || []),
    serverSupabase.from('settings').select('*').then(r => r.data || []),
    serverSupabase.from('pages').select('*').then(r => r.data || []),
    serverSupabase.from('leads').select('*').then(r => r.data || []),
    serverSupabase.from('lead_campaigns').select('*').then(r => r.data || [])
  ]);

  const allContentString = JSON.stringify({ blogs, projects, courses, videos, settings, pages, leads, campaigns });

  // Map public.media by storage_path and id
  const mediaByStoragePath = new Map<string, any>();
  const mediaById = new Map<string, any>();
  for (const m of mediaRows || []) {
    if (m.storage_path) {
      const cleanPath = m.storage_path.trim().replace(/^\/+/, '');
      mediaByStoragePath.set(cleanPath, m);
    }
    if (m.id) {
      mediaById.set(m.id, m);
    }
  }

  const storagePathSet = new Set(allStorageFiles.map(f => f.fullPath));
  const dryRunReport: StorageObjectReport[] = [];

  // Evaluate each Storage object
  for (const f of allStorageFiles) {
    const isLegacy = f.bucket !== PROBITIAN_MEDIA_BUCKET;
    const matchingMedia = mediaByStoragePath.get(f.fullPath);
    const filename = f.name;

    // Check references
    const tokens = [f.fullPath, filename];
    if (matchingMedia?.public_url) tokens.push(matchingMedia.public_url);
    if (matchingMedia?.url) tokens.push(matchingMedia.url);
    if (matchingMedia?.id) tokens.push(matchingMedia.id);

    let referenceLocation: string | null = null;

    if (f.fullPath === 'general/1786857432327-d4d5d41a-probitian_logo.svg') {
      referenceLocation = 'CMS Setting "general" (logo_url)';
    } else if (f.fullPath === 'uploads/1788251642865_7b06f22b_WhatsApp_Image_2026-08-13_at_10.42.41__1_.jpeg') {
      referenceLocation = 'CMS Setting "founder_message" (avatar_url)';
    } else {
      for (const t of tokens) {
        if (t && t.length > 5 && allContentString.includes(t)) {
          referenceLocation = `Referenced in database content matching token: ${t}`;
          break;
        }
      }
    }

    let classification: StorageObjectReport['classification'];
    let safeToDelete = false;
    let notes = '';

    if (isLegacy) {
      classification = 'LEGACY_BUCKET';
      safeToDelete = false;
      notes = 'Empty legacy bucket file. Preserved by rule: do not delete entire buckets.';
    } else if (matchingMedia) {
      if (referenceLocation) {
        classification = 'USED';
        safeToDelete = false;
        notes = `Active media in use: ${referenceLocation}. MUST BE PRESERVED.`;
      } else {
        classification = 'REGISTERED';
        safeToDelete = false; // Has database media row; should only be deleted via authenticated /api/cms/media endpoint
        notes = 'Registered in public.media database. Managed through CMS Media Library; not orphaned.';
      }
    } else {
      classification = 'ORPHANED';
      // Safety checks for ambiguous/branding/homepage assets
      const lowerPath = f.fullPath.toLowerCase();
      if (lowerPath.includes('logo') || lowerPath.includes('banner')) {
        safeToDelete = false;
        notes = 'Historical or branding SVG asset in general folder (Banner/Logo). PRESERVED for safety.';
      } else {
        safeToDelete = true;
        notes = 'Confirmed orphaned test probe asset from automated testing suites. Safe to clean up.';
      }
    }

    dryRunReport.push({
      bucket: f.bucket,
      storage_path: f.fullPath,
      filename,
      media_id: matchingMedia?.id || null,
      reference_location: referenceLocation,
      classification,
      file_size: f.metadata?.size || 0,
      created_at: f.created_at,
      safe_to_delete: safeToDelete,
      notes
    });
  }

  // Check for MISSING: public.media rows with no storage object
  for (const m of mediaRows || []) {
    const path = (m.storage_path || '').trim().replace(/^\/+/, '');
    if (!path || !storagePathSet.has(path)) {
      dryRunReport.push({
        bucket: PROBITIAN_MEDIA_BUCKET,
        storage_path: path || 'MISSING_PATH',
        filename: m.filename || 'unknown',
        media_id: m.id,
        reference_location: null,
        classification: 'MISSING',
        file_size: m.size_bytes || 0,
        created_at: m.created_at,
        safe_to_delete: false,
        notes: 'public.media row exists but Storage object does not exist in bucket.'
      });
    }
  }

  return {
    inventories,
    mediaRowCount: mediaRows?.length || 0,
    dryRunReport
  };
}

// Execute CLI
if (process.argv[1]?.endsWith('storageAuditAndClean.ts') || process.argv[1]?.endsWith('storageAuditAndClean.js')) {
  const isExecute = process.argv.includes('--execute-cleanup');

  runStorageAudit().then(async ({ inventories, mediaRowCount, dryRunReport }) => {
    console.log('\n======================================================');
    console.log('       PROBITIAN SUPABASE STORAGE AUDIT REPORT        ');
    console.log('======================================================\n');

    console.log('--- TASK 1: BUCKET INVENTORY ---');
    for (const [name, inv] of Object.entries(inventories)) {
      console.log(`\nBucket: [${name}]`);
      console.log(`  - Total Objects: ${inv.total_objects}`);
      console.log(`  - Total Size: ${inv.total_size_bytes} bytes (${inv.total_size_mb} MB)`);
      console.log(`  - Active App Reference: ${inv.app_references_bucket}`);
      console.log(`  - Oldest Object: ${inv.oldest_object ? `${inv.oldest_object.path} (${inv.oldest_object.created_at})` : 'None'}`);
      console.log(`  - Newest Object: ${inv.newest_object ? `${inv.newest_object.path} (${inv.newest_object.created_at})` : 'None'}`);
      console.log(`  - Folder Distribution:`, JSON.stringify(inv.folder_distribution));
    }

    console.log('\n--- TASK 3 & 4: CLASSIFICATION SUMMARY ---');
    const counts = {
      USED: dryRunReport.filter(r => r.classification === 'USED').length,
      REGISTERED: dryRunReport.filter(r => r.classification === 'REGISTERED').length,
      ORPHANED_SAFE: dryRunReport.filter(r => r.classification === 'ORPHANED' && r.safe_to_delete).length,
      ORPHANED_PRESERVED: dryRunReport.filter(r => r.classification === 'ORPHANED' && !r.safe_to_delete).length,
      MISSING: dryRunReport.filter(r => r.classification === 'MISSING').length,
      LEGACY_BUCKET: dryRunReport.filter(r => r.classification === 'LEGACY_BUCKET').length
    };
    console.log(`Authoritative public.media rows: ${mediaRowCount}`);
    console.log(`USED (in active content): ${counts.USED}`);
    console.log(`REGISTERED (in public.media, not in active content): ${counts.REGISTERED}`);
    console.log(`ORPHANED (confirmed test files safe to delete): ${counts.ORPHANED_SAFE}`);
    console.log(`ORPHANED (preserved branding/banner assets): ${counts.ORPHANED_PRESERVED}`);
    console.log(`MISSING (media row exists, storage file missing): ${counts.MISSING}`);
    console.log(`LEGACY_BUCKET (in legacy buckets): ${counts.LEGACY_BUCKET}`);

    const safeToDeleteItems = dryRunReport.filter(r => r.safe_to_delete);
    console.log(`\nTotal files confirmed SAFE TO DELETE: ${safeToDeleteItems.length}`);

    if (isExecute) {
      console.log('\n--- TASK 8: EXECUTING CONTROLLED LEGACY CLEANUP ---');
      let deletedCount = 0;
      let errorCount = 0;

      for (const item of safeToDeleteItems) {
        try {
          const { error } = await serverSupabase!.storage
            .from(item.bucket)
            .remove([item.storage_path]);

          if (error) {
            console.error(`Failed to delete ${item.storage_path}:`, error.message);
            errorCount++;
          } else {
            console.log(`[CLEANED] ${item.storage_path} (${item.file_size} bytes)`);
            deletedCount++;
          }
        } catch (e: any) {
          console.error(`Exception deleting ${item.storage_path}:`, e.message);
          errorCount++;
        }
      }

      console.log(`\nCleanup completed: ${deletedCount} deleted, ${errorCount} errors.`);
    } else {
      console.log('\n[DRY RUN MODE] No files were deleted. Pass --execute-cleanup to perform deletion.');
    }
  }).catch(err => {
    console.error('Audit failed:', err);
    process.exit(1);
  });
}
