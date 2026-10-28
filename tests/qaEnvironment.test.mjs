import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyIsolatedConfig } from '../scripts/qa-environment.mjs';

const local = { E2E_ALLOW_STAGING_TESTS: 'true', E2E_API_URL: 'http://127.0.0.1:4400', E2E_FRONTEND_URL: 'http://127.0.0.1:5180', E2E_SUPABASE_URL: 'http://127.0.0.1:54321', E2E_SUPABASE_ANON_KEY: 'synthetic-test-key' };
test('QA environment permits an independently isolated local stack', () => assert.doesNotThrow(() => verifyIsolatedConfig(local, { SUPABASE_URL: 'https://shared.supabase.co' })));
test('QA environment refuses shared Supabase even with an explicit hostname allowlist', () => {
  assert.throws(() => verifyIsolatedConfig({ ...local, E2E_SUPABASE_URL: 'https://shared.supabase.co', E2E_ALLOWED_SUPABASE_HOST: 'shared.supabase.co' }, { SUPABASE_URL: 'https://shared.supabase.co' }), /shared/);
});
test('QA environment refuses missing, disabled, production and path-spoofed targets', () => {
  for (const config of [{}, { ...local, E2E_ALLOW_STAGING_TESTS: 'false' }, { ...local, E2E_API_URL: 'https://linawletra-production-409e.up.railway.app' }, { ...local, E2E_API_URL: 'https://production.example.test/staging' }]) assert.throws(() => verifyIsolatedConfig(config));
});
