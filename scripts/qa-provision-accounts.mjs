import fs from 'node:fs';
import path from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { loadIsolatedConfig } from './qa-environment.mjs';

// This script never reads shared service credentials as a fallback.
const require = createRequire(import.meta.url);
const { createClient } = require('../server/node_modules/@supabase/supabase-js');
const manifest = { scope: 'Dedicated Supabase test accounts only; no shared environment mutations', status: 'BLOCKED' };
try {
  const config = loadIsolatedConfig();
  if (config.E2E_ALLOW_FIXTURE_WRITES !== 'true' || config.E2E_SCHEMA_BASELINE_CONFIRMED !== 'true') throw new Error('Disposable fixture writes and the complete schema baseline must be explicitly enabled in .qa/staging.env.');
  if (!config.E2E_SUPABASE_SERVICE_ROLE_KEY) throw new Error('Dedicated test-project service role configuration is missing.');
  const file = path.resolve(config.E2E_ACCOUNT_FILE || '.qa/test-accounts.json');
  const directory = path.resolve('.qa') + path.sep;
  if (!file.startsWith(directory)) throw new Error('Account credentials must be stored inside ignored .qa/.');
  if (fs.existsSync(file)) throw new Error('A fixture credential file already exists; refusing to overwrite or create duplicate accounts.');
  const client = createClient(config.E2E_SUPABASE_URL, config.E2E_SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const run = randomUUID();
  const accounts = {};
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ run, supabaseOrigin: new URL(config.E2E_SUPABASE_URL).origin, accounts }, null, 2), { flag: 'wx', mode: 0o600 });
  // Keep a recovery manifest after each successful creation, so even a failed
  // setup is limited to known disposable identities and can be inspected.
  for (const role of ['admin', 'teacher', 'parent', 'student', 'other_parent', 'other_teacher', 'other_student']) {
    const actualRole = role.replace('other_', '');
    const email = `qa-${run}-${role}@example.test`;
    const password = `Qa9!${randomBytes(24).toString('base64url')}`;
    const { data, error } = await client.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: `QA ${role}`, role: actualRole, qa_run: run } });
    if (error) throw new Error(`Test ${role} account could not be created (${error.status || 'service error'}). Inspect the private fixture manifest before retrying.`);
    accounts[role] = { id: data.user.id, email, password };
    fs.writeFileSync(file, JSON.stringify({ run, supabaseOrigin: new URL(config.E2E_SUPABASE_URL).origin, accounts }, null, 2), { mode: 0o600 });
    const { error: profileError } = await client.from('users').upsert({ id: data.user.id, email, name: `QA ${role}`, role: actualRole, email_verified: true, account_status: 'active', is_active: true });
    if (profileError) throw new Error(`Test ${role} profile could not be written; the private recovery manifest is preserved.`);
  }
  manifest.status = 'PASS';
  manifest.actual = 'Seven dedicated Auth identities/profile fixtures created; credentials stored only in ignored .qa/. Child/roster/curriculum fixture validation remains required.';
} catch (error) {
  manifest.actual = error.message;
  process.exitCode = 1;
}
fs.mkdirSync('docs/qa/evidence/phase2', { recursive: true });
fs.writeFileSync('docs/qa/evidence/phase2/provisioning.json', JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify(manifest));
