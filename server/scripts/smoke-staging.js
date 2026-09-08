require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const enabled = process.env.E2E_ALLOW_STAGING_TESTS === 'true';
if (!enabled) {
  console.log('Staging smoke tests skipped: set E2E_ALLOW_STAGING_TESTS=true to enable.');
  process.exit(0);
}

const apiUrl = String(process.env.E2E_API_URL || '').replace(/\/$/, '');
const frontendUrl = String(process.env.E2E_FRONTEND_URL || '').replace(/\/$/, '');
const supabaseUrl = process.env.E2E_SUPABASE_URL || '';
const anonKey = process.env.E2E_SUPABASE_ANON_KEY || '';
const targets = `${apiUrl} ${frontendUrl} ${supabaseUrl}`.toLowerCase();

if (!apiUrl || !frontendUrl || !supabaseUrl || !anonKey) throw new Error('E2E API, frontend, Supabase URL, and anon key are required.');
if (/linawletra-production|(^|\.)linawletra\.com/.test(targets) || !/staging|localhost|127\.0\.0\.1/.test(targets)) {
  throw new Error('Smoke tests refuse production or non-staging targets.');
}

async function expectStatus(label, request, expected) {
  const response = await request;
  if (response.status !== expected) throw new Error(`${label}: expected ${expected}, received ${response.status}.`);
  console.log(`PASS ${label} (${response.status})`);
  return response;
}

async function roleToken(role) {
  const email = process.env[`E2E_${role.toUpperCase()}_EMAIL`];
  const password = process.env[`E2E_${role.toUpperCase()}_PASSWORD`];
  if (!email || !password) return null;
  const client = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session?.access_token || null;
}

async function main() {
  const health = await expectStatus('API health', fetch(`${apiUrl}/api/health`), 200);
  const healthBody = await health.json();
  if (!healthBody.apiCompatibilityVersion) throw new Error('API health is missing its compatibility version.');
  await expectStatus('protected endpoint rejects anonymous', fetch(`${apiUrl}/api/student/reading-profile`), 401);
  await expectStatus('TTS rejects anonymous', fetch(`${apiUrl}/api/tts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: 'bata' }) }), 401);
  await expectStatus('malformed JSON rejected', fetch(`${apiUrl}/api/student/notify-login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' }), 400);
  const limited = await expectStatus('rate-limit headers available', fetch(`${apiUrl}/api/student/reading-profile`), 401);
  if (!limited.headers.get('ratelimit-policy')) throw new Error('RateLimit-Policy header is missing.');

  for (const path of ['/', '/login', '/privacy', '/robots.txt', '/sitemap.xml']) {
    await expectStatus(`frontend ${path}`, fetch(`${frontendUrl}${path}`), 200);
  }

  const parentToken = await roleToken('parent');
  if (parentToken) {
    await expectStatus('parent rejected by admin API', fetch(`${apiUrl}/api/admin/analytics`, { headers: { Authorization: `Bearer ${parentToken}` } }), 403);
  } else console.log('SKIP invalid-role check: parent staging credentials not configured.');

  const teacherToken = await roleToken('teacher');
  if (teacherToken) {
    const form = new FormData();
    form.append('title', 'Invalid smoke-test file');
    form.append('file', new Blob(['not a pdf'], { type: 'text/plain' }), 'invalid.txt');
    await expectStatus('invalid teacher PDF rejected', fetch(`${apiUrl}/api/teacher/pdf`, { method: 'POST', headers: { Authorization: `Bearer ${teacherToken}` }, body: form }), 400);
  } else console.log('SKIP invalid-PDF check: teacher staging credentials not configured.');
}

main().catch((error) => {
  console.error(`FAIL ${error.message}`);
  process.exitCode = 1;
});
