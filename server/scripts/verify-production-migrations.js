/* Read-only production migration evidence. This does not execute RPCs or write rows. */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { supabaseAdmin } = require('../config/supabase');

async function probe(name, action) {
  try {
    await action();
    return { name, verified: true };
  } catch {
    return { name, verified: false };
  }
}

async function main() {
  if (process.env.MIGRATION_VERIFY_READONLY !== 'true') {
    throw new Error('Refusing to run: set MIGRATION_VERIFY_READONLY=true.');
  }
  const results = await Promise.all([
    probe('023 credential retirement columns', async () => {
      const { error } = await supabaseAdmin.from('child_credentials')
        .select('plain_password, password_rotated_at, plaintext_retired_at', { head: true }).limit(1);
      if (error) throw error;
    }),
    probe('025 additive storage columns', async () => {
      const { error } = await supabaseAdmin.from('lessons')
        .select('storage_bucket, storage_path, legacy_public_url', { head: true }).limit(1);
      if (error) throw error;
    }),
    probe('026 atomic badge award table', async () => {
      const { error } = await supabaseAdmin.from('student_badge_awards').select('student_id, badge_id', { head: true }).limit(1);
      if (error) throw error;
    }),
  ]);
  async function aggregate(name, query) {
    const { count, error } = await query;
    return error ? { name, available: false } : { name, available: true, count: count || 0 };
  }
  const aggregates = await Promise.all([
    aggregate('totalStudents', supabaseAdmin.from('children').select('id', { count: 'exact', head: true })),
    aggregate('credentialRows', supabaseAdmin.from('child_credentials').select('child_id', { count: 'exact', head: true })),
    aggregate('legacyPlaintext', supabaseAdmin.from('child_credentials').select('child_id', { count: 'exact', head: true }).not('plain_password', 'is', null)),
    aggregate('retired', supabaseAdmin.from('child_credentials').select('child_id', { count: 'exact', head: true }).not('plaintext_retired_at', 'is', null)),
  ]);
  const value = (name) => aggregates.find((entry) => entry.name === name)?.count || 0;

  process.stdout.write(`${JSON.stringify({
    readOnly: true,
    migrationEvidence: results,
    credentialAggregates: {
      totalStudents: value('totalStudents'),
      credentialRows: value('credentialRows'),
      legacyPlaintext: value('legacyPlaintext'),
      retired: value('retired'),
      missingCredentialMetadata: Math.max(0, value('totalStudents') - value('credentialRows')),
      unavailableChecks: aggregates.filter((entry) => !entry.available).map((entry) => entry.name),
    },
    manualEvidenceStillRequired: [
      '024 trigger/policy behavior and client credential-read denial',
      '026 award RPC duplicate-award behavior',
      'deployed RLS policy/function/grant inventory and role-isolation tests',
    ],
  }, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
