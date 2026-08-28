import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

export const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
export const serverSecretKey = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

export const isServerSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    serverSecretKey &&
    !supabaseUrl.includes('your-supabase-project') &&
    !supabaseUrl.includes('placeholder-project')
  );
};

export const serverSupabase: SupabaseClient | null = isServerSupabaseConfigured()
  ? createClient(supabaseUrl, serverSecretKey, { auth: { persistSession: false } })
  : null;

// Local storage files for offline / unconfigured dev environment ONLY (NODE_ENV !== 'production' or AI Studio preview)
const CMS_DATA_FILE = path.join(process.cwd(), 'data', 'cms_settings.json');

export function readCmsData(): Record<string, any> {
  if (process.env.NODE_ENV === 'production' && !process.env.AI_STUDIO_APPLET_ID) {
    throw new Error('Local JSON fallback is strictly disabled in production. Supabase PostgreSQL is the required source of truth.');
  }
  try {
    if (fs.existsSync(CMS_DATA_FILE)) {
      const content = fs.readFileSync(CMS_DATA_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.warn('Notice: Error reading local CMS cache in dev:', err);
  }
  return {};
}

export function writeCmsData(data: Record<string, any>): void {
  if (process.env.NODE_ENV === 'production' && !process.env.AI_STUDIO_APPLET_ID) {
    throw new Error('Local JSON fallback is strictly disabled in production. Supabase PostgreSQL is the required source of truth.');
  }
  try {
    const dir = path.dirname(CMS_DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CMS_DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Notice: Error writing CMS data cache in dev:', err);
  }
}
