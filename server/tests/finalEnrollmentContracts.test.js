const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');

// Real route handler; account, database, hashing and email boundaries are mocks.
async function enrollment({ cleanup = '', duplicate = false, invalid = false, mailFailure = false, success = false } = {}) {
  const calls = [], uid = '00000000-0000-4000-8000-000000000004';
  const client = {
    auth: { admin: {
      async createUser() { calls.push('auth:create'); return { data: { user: { id: uid } }, error: null }; },
      async deleteUser(id) { assert.equal(id, uid); calls.push('auth:delete'); if (cleanup === 'auth-throw') throw new Error('synthetic auth cleanup outage'); return { error: null }; },
    } },
    from(table) {
      let method = 'select', query;
      const execute = async () => {
        if (method === 'delete') {
          calls.push(`${table}:delete`);
          if (table === 'children' && cleanup === 'throw') throw new Error('synthetic child cleanup outage');
          return { error: table === 'children' && cleanup === 'returned-error' ? { message: 'synthetic cleanup rejection' } : null };
        }
        if (method === 'select') return { data: table === 'teacher_profiles' ? [] : duplicate ? { id: 'existing' } : null, error: null };
        calls.push(`${table}:${method}`);
        return { data: table === 'children' ? { id: 'synthetic-child' } : null, error: table === 'users' && !success ? { message: 'synthetic private profile diagnostic' } : null };
      };
      query = new Proxy({}, { get(_target, key) {
        if (key === 'then') return (resolve, reject) => execute().then(resolve, reject);
        if (key === 'single' || key === 'maybeSingle') return execute;
        return () => { if (['insert', 'upsert', 'delete'].includes(key)) method = key; return query; };
      } }); return query;
    },
  };
  const filename = path.resolve(__dirname, '../routes/parent.js'), actualRequire = createRequire(filename), module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), { module, exports: module.exports, console: { error() {} }, require(name) {
    if (name === '../config/supabase') return { supabaseAdmin: client };
    if (name === '../config/mailer') return { sendMail: async () => { calls.push('mail'); if (mailFailure) throw new Error('synthetic delivery outage'); } };
    if (name === 'bcryptjs') return { hash: async () => 'synthetic-hash' };
    if (name === '../lib/temporaryPassword') return { temporaryPassword: () => 'synthetic-one-time-password' };
    if (name === '../middleware/auth') return { requireAuth() {}, requireRole: () => () => {} };
    return actualRequire(name);
  } }, { filename });
  const handler = module.exports.stack.find((layer) => layer.route?.path === '/children' && layer.route.methods.post).route.stack[0].handle;
  const response = { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  await handler({ user: { id: 'synthetic-parent', email: 'qa-parent@example.invalid' }, body: { childName: invalid ? '' : 'Synthetic Learner', gradeLevel: 1 } }, response);
  return { calls, response };
}
for (const cleanup of ['throw', 'returned-error', 'auth-throw']) test(`final enrollment: ${cleanup} cleanup failure cannot prevent remaining cleanup or safe response`, async () => {
  const { calls, response } = await enrollment({ cleanup });
  assert.equal(response.code, 500); assert.equal(response.body.error, 'Hindi na-enroll ang bata.');
  assert.deepEqual(calls.slice(-3), ['children:delete', 'users:delete', 'auth:delete']);
});
test('final enrollment: invalid input makes no account or database mutation', async () => {
  const { calls, response } = await enrollment({ invalid: true }); assert.equal(response.code, 400); assert.deepEqual(calls, []);
});
test('final enrollment: duplicate child does not create an account', async () => {
  const { calls, response } = await enrollment({ duplicate: true }); assert.equal(response.code, 409); assert.deepEqual(calls, []);
});
for (const mailFailure of [false, true]) test(`final enrollment: successful account survives email failure=${mailFailure}`, async () => {
  const { calls, response } = await enrollment({ success: true, mailFailure });
  assert.equal(response.code, 200); assert.equal(response.body.success, true); assert.ok(calls.includes('mail')); assert.ok(!calls.some((call) => call.endsWith(':delete')));
});
