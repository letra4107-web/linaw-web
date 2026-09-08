const test = require('node:test');
const assert = require('node:assert/strict');
const { createClient } = require('@supabase/supabase-js');

const enabled = process.env.E2E_ALLOW_STAGING_TESTS === 'true';
const apiUrl = String(process.env.E2E_API_URL || '').replace(/\/$/, '');
const supabaseUrl = process.env.E2E_SUPABASE_URL || '';
const supabaseAnonKey = process.env.E2E_SUPABASE_ANON_KEY || '';

function assertSafeStagingTarget() {
  assert.ok(apiUrl && supabaseUrl && supabaseAnonKey, 'Staging API and Supabase environment variables are required.');
  const combined = `${apiUrl} ${supabaseUrl}`.toLowerCase();
  assert.doesNotMatch(combined, /linawletra-production|linawletra\.com/, 'E2E tests refuse known production targets.');
  assert.match(combined, /staging|localhost|127\.0\.0\.1/, 'E2E target must explicitly identify itself as staging or local.');
}

async function signIn(role) {
  const client = await signInClient(role);
  const { data } = await client.auth.getSession();
  return data.session.access_token;
}

async function signInClient(role) {
  const email = process.env[`E2E_${role.toUpperCase()}_EMAIL`];
  const password = process.env[`E2E_${role.toUpperCase()}_PASSWORD`];
  assert.ok(email && password, `${role} staging credentials are required.`);
  const client = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  assert.ifError(error);
  assert.ok(data.session?.access_token);
  return client;
}

async function apiGet(path, token) {
  return fetch(`${apiUrl}${path}`, { headers: { Authorization: `Bearer ${token}` } });
}

test('staging role smoke checks', { skip: !enabled }, async (t) => {
  assertSafeStagingTarget();
  const paths = {
    student: '/api/student/reading-profile',
    admin: '/api/admin/analytics',
  };
  for (const [role, path] of Object.entries(paths)) {
    await t.test(`${role} can reach its own protected API`, async () => {
      const response = await apiGet(path, await signIn(role));
      assert.equal(response.status, 200);
    });
  }

  await t.test('a parent cannot enter an admin API', async () => {
    const response = await apiGet('/api/admin/analytics', await signIn('parent'));
    assert.equal(response.status, 403);
  });
  await t.test('a teacher cannot enter a parent API', async () => {
    const response = await apiGet('/api/parent/children/00000000-0000-4000-8000-000000000000/reading-profile', await signIn('teacher'));
    assert.equal(response.status, 403);
  });
});

test('staging Supabase RLS isolation checks', { skip: !enabled }, async (t) => {
  assertSafeStagingTarget();

  await t.test('anonymous and authenticated clients cannot read credential rows', async () => {
    const anonymous = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
    const anonResult = await anonymous.from('child_credentials').select('child_id').limit(1);
    assert.equal((anonResult.data || []).length, 0);
    const parent = await signInClient('parent');
    const parentResult = await parent.from('child_credentials').select('child_id').limit(1);
    assert.equal((parentResult.data || []).length, 0);
  });

  await t.test('parent cannot read another parent child', { skip: !process.env.E2E_OTHER_CHILD_ID }, async () => {
    const parent = await signInClient('parent');
    const { data, error } = await parent.from('children').select('id').eq('id', process.env.E2E_OTHER_CHILD_ID);
    assert.ifError(error);
    assert.equal(data.length, 0);
  });

  await t.test('student cannot read another student progress', { skip: !process.env.E2E_OTHER_STUDENT_ID }, async () => {
    const student = await signInClient('student');
    const { data, error } = await student.from('child_progress').select('child_id').eq('child_id', process.env.E2E_OTHER_STUDENT_ID);
    assert.ifError(error);
    assert.equal(data.length, 0);
  });

  await t.test('teacher cannot read an unassigned student', { skip: !process.env.E2E_UNASSIGNED_STUDENT_ID }, async () => {
    const teacher = await signInClient('teacher');
    const { data, error } = await teacher.from('children').select('id').eq('id', process.env.E2E_UNASSIGNED_STUDENT_ID);
    assert.ifError(error);
    assert.equal(data.length, 0);
  });
});
