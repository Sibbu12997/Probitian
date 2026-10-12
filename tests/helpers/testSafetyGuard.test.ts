import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { 
  validateIntegrationTestEnvironment, 
  assertSafeIntegrationEnvironment,
  KNOWN_PRODUCTION_PROJECT_ID 
} from './testSafetyGuard';

describe('Production Safety Guard for Integration Tests', () => {
  const originalEnv = { ...process.env };

  function restoreEnv() {
    process.env = { ...originalEnv };
  }

  test('Rejects integration tests when RUN_SUPABASE_INTEGRATION_TESTS is absent or false', () => {
    restoreEnv();
    delete process.env.RUN_SUPABASE_INTEGRATION_TESTS;
    
    const result = validateIntegrationTestEnvironment();
    assert.strictEqual(result.isAllowed, false);
    assert.match(result.reason || '', /disabled by default/);

    assert.throws(() => {
      assertSafeIntegrationEnvironment();
    }, /Integration tests with live Supabase are disabled by default/);
  });

  test('Rejects when opt-in is true but target is known production project ID', () => {
    restoreEnv();
    process.env.RUN_SUPABASE_INTEGRATION_TESTS = 'true';
    process.env.TEST_SUPABASE_URL = `https://${KNOWN_PRODUCTION_PROJECT_ID}.supabase.co`;
    process.env.TEST_SUPABASE_KEY = 'sb_secret_dummy_test_key';

    assert.throws(() => {
      validateIntegrationTestEnvironment();
    }, (err: any) => {
      return err.message.includes('[SECURITY REJECTION]') && err.message.includes(KNOWN_PRODUCTION_PROJECT_ID);
    });
  });

  test('Rejects when opt-in is true but credentials are completely missing', () => {
    restoreEnv();
    process.env.RUN_SUPABASE_INTEGRATION_TESTS = 'true';
    delete process.env.TEST_SUPABASE_URL;
    delete process.env.TEST_SUPABASE_KEY;
    delete process.env.SUPABASE_URL;
    delete process.env.VITE_SUPABASE_URL;
    delete process.env.SUPABASE_SECRET_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const result = validateIntegrationTestEnvironment();
    assert.strictEqual(result.isAllowed, false);
    assert.match(result.reason || '', /require explicitly configured/);
  });

  test('Accepts valid non-production target when opt-in is true', () => {
    restoreEnv();
    process.env.RUN_SUPABASE_INTEGRATION_TESTS = 'true';
    process.env.TEST_SUPABASE_URL = 'https://my-test-staging-proj.supabase.co';
    process.env.TEST_SUPABASE_KEY = 'sb_secret_staging_test_key_123';

    const result = validateIntegrationTestEnvironment();
    assert.strictEqual(result.isAllowed, true);
    assert.strictEqual(result.config?.projectId, 'my-test-staging-proj');
    assert.strictEqual(result.config?.url, 'https://my-test-staging-proj.supabase.co');

    const config = assertSafeIntegrationEnvironment();
    assert.strictEqual(config.projectId, 'my-test-staging-proj');
  });

  // Restore env after all tests
  test('Cleans up environment modifications', () => {
    restoreEnv();
    assert.ok(true);
  });
});
