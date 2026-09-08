const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('credential lockdown migration removes client read policy without deleting legacy rows', () => {
  const sql = fs.readFileSync(path.resolve(__dirname, '../../migrations/024_lock_down_student_credentials.sql'), 'utf8');
  assert.match(sql, /ENABLE ROW LEVEL SECURITY/i);
  assert.match(sql, /DROP POLICY IF EXISTS "parents_read_child_credentials"/i);
  assert.match(sql, /BEFORE INSERT OR UPDATE/i);
  assert.doesNotMatch(sql, /UPDATE\s+public\.child_credentials\s+SET\s+plain_password\s*=\s*NULL/i);
  assert.doesNotMatch(sql, /DROP\s+COLUMN\s+plain_password/i);
});

test('storage transition migration preserves public URL columns and never privatizes buckets', () => {
  const sql = fs.readFileSync(path.resolve(__dirname, '../../migrations/025_storage_path_transition.sql'), 'utf8');
  assert.match(sql, /legacy_public_url/i);
  assert.match(sql, /storage_path/i);
  assert.doesNotMatch(sql, /DROP\s+COLUMN\s+(file_url|pdf_url|path)/i);
  assert.doesNotMatch(sql, /UPDATE\s+storage\.buckets/i);
});

test('badge reward migration uses a database uniqueness boundary and service-role RPC', () => {
  const sql = fs.readFileSync(path.resolve(__dirname, '../../migrations/026_atomic_badge_awards.sql'), 'utf8');
  assert.match(sql, /PRIMARY KEY \(student_id, badge_id\)/i);
  assert.match(sql, /ON CONFLICT DO NOTHING/i);
  assert.match(sql, /FOR UPDATE/i);
  assert.match(sql, /REVOKE ALL ON FUNCTION[^;]+authenticated/is);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION[^;]+service_role/is);
});
