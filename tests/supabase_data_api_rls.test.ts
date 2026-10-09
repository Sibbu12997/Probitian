import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '').trim();

const isConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('placeholder-project') &&
  !supabaseUrl.includes('your-supabase-project')
);

const PUBLIC_ALLOWLIST = new Set([
  'general',
  'seo',
  'legal',
  'home',
  'founder_message',
  'founder',
  'social_links',
  'navigation_items'
]);

describe('Supabase Data API Anonymous PostgREST & Settings RLS Boundary', () => {
  if (!isConfigured) {
    test('Notice: Supabase live credentials not configured in local environment; skipping direct live PostgREST test', () => {
      assert.ok(true, 'Skipped due to unconfigured live database environment');
    });
    return;
  }

  const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false }
  });

  test('1. Anonymous SELECT * from public.settings returns only allowlisted public configuration rows', async () => {
    const { data, error } = await anonClient.from('settings').select('key');
    assert.strictEqual(error, null, `Query error: ${error?.message}`);
    assert.ok(Array.isArray(data), 'Expected array response from settings table');

    for (const row of data) {
      assert.ok(
        PUBLIC_ALLOWLIST.has(row.key),
        `Violation: anonymous query returned non-allowlisted key: "${row.key}"`
      );
    }
  });

  test('2. Public configuration key "general" is accessible via anonymous PostgREST client', async () => {
    const { data, error } = await anonClient.from('settings').select('key').eq('key', 'general');
    assert.strictEqual(error, null);
    assert.ok(Array.isArray(data));
    assert.strictEqual(data.length, 1, 'Expected public "general" key to be accessible');
    assert.strictEqual(data[0].key, 'general');
  });

  test('3. Private CRM key "crm_leads" is completely inaccessible via anonymous Data API (returns 0 rows)', async () => {
    const { data, error } = await anonClient.from('settings').select('key').eq('key', 'crm_leads');
    assert.strictEqual(error, null);
    assert.ok(Array.isArray(data));
    assert.strictEqual(data.length, 0, 'Private crm_leads must return 0 rows for anonymous client');
  });

  test('4. Private CRM key "crm_sequence_steps" is completely inaccessible via anonymous Data API (returns 0 rows)', async () => {
    const { data, error } = await anonClient.from('settings').select('key').eq('key', 'crm_sequence_steps');
    assert.strictEqual(error, null);
    assert.ok(Array.isArray(data));
    assert.strictEqual(data.length, 0, 'Private crm_sequence_steps must return 0 rows for anonymous client');
  });

  test('5. Private CRM key "crm_sequence_leads" is completely inaccessible via anonymous Data API (returns 0 rows)', async () => {
    const { data, error } = await anonClient.from('settings').select('key').eq('key', 'crm_sequence_leads');
    assert.strictEqual(error, null);
    assert.ok(Array.isArray(data));
    assert.strictEqual(data.length, 0, 'Private crm_sequence_leads must return 0 rows for anonymous client');
  });

  test('6. Private CRM key "crm_campaign_leads" is completely inaccessible via anonymous Data API (returns 0 rows)', async () => {
    const { data, error } = await anonClient.from('settings').select('key').eq('key', 'crm_campaign_leads');
    assert.strictEqual(error, null);
    assert.ok(Array.isArray(data));
    assert.strictEqual(data.length, 0, 'Private crm_campaign_leads must return 0 rows for anonymous client');
  });
});
