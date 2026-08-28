import { serverSupabase } from './supabase';
import { PROBITIAN_MEDIA_BUCKET } from '../config/constants';

export async function ensureStorageBucket(): Promise<void> {
  if (!serverSupabase) return;
  try {
    const { data: bucket, error } = await serverSupabase.storage.getBucket(PROBITIAN_MEDIA_BUCKET);
    if (error || !bucket) {
      await serverSupabase.storage.createBucket(PROBITIAN_MEDIA_BUCKET, { public: true });
      console.log(`[Supabase Storage] Created bucket "${PROBITIAN_MEDIA_BUCKET}" successfully.`);
    }
  } catch (err) {
    console.warn('[Supabase Storage Bucket Notice]', err);
  }
}

// Initial check
ensureStorageBucket();
