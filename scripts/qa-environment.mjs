import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { assertStagingTargets } = require('../server/lib/stagingTarget.js');
export function parseEnv(file) {
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(fs.readFileSync(file, 'utf8').split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*)$/);
    return match ? [[match[1], match[2].trim().replace(/^['"]|['"]$/g, '')]] : [];
  }));
}
export function verifyIsolatedConfig(config, shared = {}) {
  const missing = ['E2E_API_URL', 'E2E_FRONTEND_URL', 'E2E_SUPABASE_URL', 'E2E_SUPABASE_ANON_KEY'].filter((name) => !config[name]);
  if (missing.length) throw new Error(`Missing isolated configuration: ${missing.join(', ')}`);
  assertStagingTargets({ api: config.E2E_API_URL, frontend: config.E2E_FRONTEND_URL, supabase: config.E2E_SUPABASE_URL }, { allowedSupabaseHost: config.E2E_ALLOWED_SUPABASE_HOST });
  const origin = (value) => { try { return new URL(value).origin; } catch { return ''; } };
  for (const target of [config.E2E_SUPABASE_URL, config.E2E_API_URL]) {
    if ([shared.SUPABASE_URL, shared.VITE_SUPABASE_URL, shared.VITE_API_URL].some((value) => value && origin(value) === origin(target))) {
      throw new Error('The test target matches the shared application environment; writes and authenticated testing are refused.');
    }
  }
  if (config.E2E_ALLOW_STAGING_TESTS !== 'true') throw new Error('Isolated staging tests are not enabled.');
}
export function loadIsolatedConfig() {
  const file = path.resolve('.qa/staging.env');
  const config = parseEnv(file);
  verifyIsolatedConfig(config, { ...parseEnv('.env.production'), ...parseEnv('server/.env') });
  return config;
}
