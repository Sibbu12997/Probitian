import { serverSupabase } from './supabase';
import { PROBITIAN_MEDIA_BUCKET } from '../config/constants';

export interface StorageUploadResult {
  path: string;
  publicUrl: string;
}

export interface MediaRecord {
  id: string;
  filename: string;
  original_filename: string;
  storage_path: string;
  public_url: string;
  url: string;
  size_bytes: number;
  file_size: number;
  mime_type: string;
  alt_text: string;
  category: string;
  folder: string;
  uploaded_at: string;
  created_at: string;
}

export interface StorageService {
  uploadFile(
    storagePath: string,
    buffer: Buffer,
    contentType: string
  ): Promise<StorageUploadResult>;
  removeFile(storagePath: string): Promise<boolean>;
  saveMediaRecord(record: MediaRecord): Promise<MediaRecord>;
  deleteMediaRecord(id: string): Promise<boolean>;
}

export class DefaultStorageService implements StorageService {
  constructor(private readonly client: typeof serverSupabase = serverSupabase) {}
  async uploadFile(
    storagePath: string,
    buffer: Buffer,
    contentType: string
  ): Promise<StorageUploadResult> {
    if (this.client) {
      const { data: uploadData, error: uploadErr } = await this.client.storage
        .from(PROBITIAN_MEDIA_BUCKET)
        .upload(storagePath, buffer, {
          contentType,
          cacheControl: '3600',
          upsert: true
        });

      if (uploadErr) {
        throw new Error(`Upload failed: ${uploadErr.message}`);
      }

      const { data: publicUrlData } = this.client.storage
        .from(PROBITIAN_MEDIA_BUCKET)
        .getPublicUrl(uploadData.path);

      return {
        path: uploadData.path,
        publicUrl: publicUrlData.publicUrl
      };
    }

    return {
      path: storagePath,
      publicUrl: `data:${contentType};base64,${buffer.toString('base64')}`
    };
  }

  async removeFile(storagePath: string): Promise<boolean> {
    if (this.client) {
      const { error } = await this.client.storage
        .from(PROBITIAN_MEDIA_BUCKET)
        .remove([storagePath]);
      return !error;
    }
    return true;
  }

  async saveMediaRecord(record: MediaRecord): Promise<MediaRecord> {
    if (this.client) {
      const { error } = await this.client.from('media').upsert(record);
      if (error) {
        throw new Error(`Media metadata persistence failed: ${error.message}`);
      }
      return record;
    }
    return record;
  }

  async deleteMediaRecord(id: string): Promise<boolean> {
    if (this.client) {
      const { error } = await this.client.from('media').delete().eq('id', id);
      return !error;
    }
    return true;
  }
}

let activeStorageService: StorageService = new DefaultStorageService();

export function getStorageService(): StorageService {
  return activeStorageService;
}

export function setStorageService(service: StorageService): void {
  activeStorageService = service;
}

export function resetStorageService(): void {
  activeStorageService = new DefaultStorageService();
}

export async function ensureStorageBucket(): Promise<void> {
  if (!serverSupabase) return;
  try {
    const { data: bucket, error } = await this.client.storage.getBucket(PROBITIAN_MEDIA_BUCKET);
    if (error || !bucket) {
      await this.client.storage.createBucket(PROBITIAN_MEDIA_BUCKET, { public: true });
      console.log(`[Supabase Storage] Created bucket "${PROBITIAN_MEDIA_BUCKET}" successfully.`);
    }
  } catch (err) {
    console.warn('[Supabase Storage Bucket Notice]', err);
  }
}

// Initial check
ensureStorageBucket();
