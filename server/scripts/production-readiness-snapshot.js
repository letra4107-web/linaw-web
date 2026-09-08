/*
 * Read-only, aggregate-only companion to the protected Supabase backup.
 * It never selects row content or credentials, and never prints configuration.
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { supabaseAdmin } = require('../config/supabase');

const tables = [
  ['children', 'id'], ['child_credentials', 'child_id'], ['child_progress', 'child_id'], ['pdf_assignments', 'id'],
  ['student_content_attempts', 'id'], ['pdf_reading_attempts', 'id'], ['notifications', 'id'],
  ['student_badge_awards', 'student_id'], ['badges', 'id'], ['lessons', 'id'], ['pdf_materials', 'id'], ['teacher_uploads', 'id'],
];

async function countRows(table, key = 'id', filter) {
  let query = supabaseAdmin.from(table).select(key, { count: 'exact', head: true });
  if (filter) query = filter(query);
  const { count, error } = await query;
  return error ? { available: false, error: 'query failed' } : { available: true, count: count || 0 };
}

async function main() {
  if (process.env.SNAPSHOT_ALLOW_PRODUCTION_READONLY !== 'true') {
    throw new Error('Refusing to run: set SNAPSHOT_ALLOW_PRODUCTION_READONLY=true after creating the protected backup.');
  }
  const outputFile = process.env.SNAPSHOT_OUTPUT_FILE;
  if (!outputFile || !path.isAbsolute(outputFile)) {
    throw new Error('Set SNAPSHOT_OUTPUT_FILE to an approved absolute protected-location path.');
  }

  const tableCounts = {};
  for (const [table, key] of tables) tableCounts[table] = await countRows(table, key);
  const [legacyPlaintext, retiredPlaintext, buckets] = await Promise.all([
    countRows('child_credentials', 'child_id', (query) => query.not('plain_password', 'is', null)),
    countRows('child_credentials', 'child_id', (query) => query.not('plaintext_retired_at', 'is', null)),
    supabaseAdmin.storage.listBuckets(),
  ]);

  const report = {
    format: 'linawletra-production-readiness-snapshot/v1',
    capturedAt: new Date().toISOString(),
    readOnly: true,
    containsRowData: false,
    containsCredentials: false,
    tableCounts,
    credentialAggregates: { legacyPlaintext, retiredPlaintext },
    storageBuckets: (buckets.data || []).map((bucket) => ({
      id: bucket.id,
      name: bucket.name,
      public: Boolean(bucket.public),
      fileSizeLimit: bucket.file_size_limit ?? null,
      allowedMimeTypes: bucket.allowed_mime_types ?? null,
    })),
    storageBucketQueryAvailable: !buckets.error,
    requiredManualCapture: [
      'encrypted Supabase managed/database backup containing protected row data',
      'SQL export of deployed RLS policies, function definitions, SECURITY DEFINER settings, and grants',
      'storage object metadata export from a protected operator location',
    ],
  };
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
  process.stdout.write(`Wrote aggregate-only readiness snapshot to ${outputFile}\n`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
