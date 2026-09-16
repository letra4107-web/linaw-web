const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const migration = fs.readFileSync(path.join(root, 'migrations', '031_direct_mutation_audit.sql'), 'utf8');
const infrastructure = fs.readFileSync(path.join(root, 'migrations', '030_admin_audit_logs.sql'), 'utf8');

test('audit migrations are ordered, append-only, and redact direct-write secrets', () => {
  assert.match(infrastructure, /CREATE TABLE IF NOT EXISTS public\.audit_logs/);
  assert.match(infrastructure, /BEFORE UPDATE OR DELETE ON public\.audit_logs/);
  assert.match(migration, /SECURITY DEFINER/);
  assert.match(migration, /auth\.role\(\) <> 'authenticated'/);
  assert.match(migration, /AFTER INSERT OR UPDATE OR DELETE/);
  for (const field of ['hashed_password', 'access_token', 'refresh_token', 'transcript', 'raw_audio']) assert.match(migration, new RegExp(`'${field}'`));
  assert.doesNotMatch(migration, /audit_logs'.*FOREACH/s);
});
