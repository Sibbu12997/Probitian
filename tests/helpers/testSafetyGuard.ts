import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const KNOWN_PRODUCTION_PROJECT_ID = 'dlaehchzzkjsrarktfsf';

export interface TestSupabaseConfig {
  url: string;
  key: string;
  projectId: string;
}

/**
 * Validates whether the current environment is explicitly configured and safe
 * for write-capable integration tests.
 * 
 * Rules:
 * 1. RUN_SUPABASE_INTEGRATION_TESTS must be explicitly set to 'true'.
 * 2. Supabase URL and key must be provided (either via TEST_SUPABASE_* or non-production SUPABASE_*).
 * 3. The target project MUST NOT match the known production project ID (dlaehchzzkjsrarktfsf).
 * 4. Fails closed with a descriptive Error if any safety check fails.
 */
export function validateIntegrationTestEnvironment(): { isAllowed: boolean; reason?: string; config?: TestSupabaseConfig } {
  const optIn = process.env.RUN_SUPABASE_INTEGRATION_TESTS === 'true';
  if (!optIn) {
    return {
      isAllowed: false,
      reason: 'Integration tests with live Supabase are disabled by default. Set RUN_SUPABASE_INTEGRATION_TESTS=true to enable against a dedicated non-production project.'
    };
  }

  // Look for dedicated test credentials first, then fallback to general env
  const testUrl = (process.env.TEST_SUPABASE_URL || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  const testKey = (process.env.TEST_SUPABASE_SERVICE_ROLE_KEY || process.env.TEST_SUPABASE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

  if (!testUrl || !testKey) {
    return {
      isAllowed: false,
      reason: 'Live integration tests require explicitly configured Supabase credentials (TEST_SUPABASE_URL and TEST_SUPABASE_KEY).'
    };
  }

  // Extract project id or hostname
  let projectId = '';
  try {
    const parsed = new URL(testUrl);
    projectId = parsed.hostname.split('.')[0];
  } catch {
    projectId = testUrl;
  }

  if (projectId === KNOWN_PRODUCTION_PROJECT_ID || testUrl.includes(KNOWN_PRODUCTION_PROJECT_ID)) {
    throw new Error(
      `[SECURITY REJECTION] Write-capable integration test rejected: Target URL matches the known production Supabase project ID (${KNOWN_PRODUCTION_PROJECT_ID}). Running integration tests against production is strictly prohibited.`
    );
  }

  return {
    isAllowed: true,
    config: {
      url: testUrl,
      key: testKey,
      projectId
    }
  };
}

/**
 * Throws immediately if write operations against Supabase are attempted without a verified safe test environment.
 */
export function assertSafeIntegrationEnvironment(): TestSupabaseConfig {
  const result = validateIntegrationTestEnvironment();
  if (!result.isAllowed) {
    throw new Error(result.reason || 'Integration environment is not authorized for write operations.');
  }
  return result.config!;
}

/**
 * Creates an isolated test client ONLY if the environment has been proven safe and non-production.
 */
export function createSafeTestClient(): SupabaseClient | null {
  const result = validateIntegrationTestEnvironment();
  if (!result.isAllowed || !result.config) {
    return null;
  }
  return createClient(result.config.url, result.config.key, {
    auth: { persistSession: false }
  });
}
