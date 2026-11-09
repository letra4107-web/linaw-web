// Metadata only: no application rows, RPC execution, or database writes.
const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const base = process.env.SUPABASE_URL;
  if (!key || !base) throw new Error('Missing server Supabase configuration.');
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  const response = await fetch(`${base}/rest/v1/`, { headers, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Metadata lookup failed: HTTP ${response.status}`);
  const schema = await response.json();
  const args = schema.paths?.['/rpc/record_web_word_of_day_attempt']?.post?.parameters
    ?.find(parameter => parameter.name === 'args')?.schema;
  const expected = ['p_student_id', 'p_log_id', 'p_expected_word', 'p_attempt_number', 'p_accuracy', 'p_is_correct'];
  const rpcAvailable = expected.every(name => args?.required?.includes(name));
  // An empty SELECT measures visibility/columns without reading a student's data.
  const receipt = await fetch(`${base}/rest/v1/word_of_day_web_attempt_receipts?select=log_id,attempt_number,student_id,response,created_at&limit=0`, { headers, signal: AbortSignal.timeout(15000) });
  const receiptAvailable = receipt.ok;
  console.log(JSON.stringify({ rpcAvailable, receiptAvailable,
    ready: rpcAvailable && receiptAvailable,
    action: rpcAvailable && receiptAvailable ? 'Database dependency installed; run a synthetic end-to-end attempt in staging.' : 'Install migrations/051_atomic_word_of_day_attempt.sql in the matching Supabase project.' }, null, 2));
  if (!rpcAvailable || !receiptAvailable) process.exitCode = 1;
}
main().catch(() => { console.error('Word of the Day metadata verification failed. Check server configuration and connectivity.'); process.exitCode = 1; });
