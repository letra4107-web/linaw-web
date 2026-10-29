const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');

process.env.SUPABASE_URL = 'http://127.0.0.1:9';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'isolated-profile-contract';
const AUTH_ID = '00000000-0000-4000-8000-000000000001';
const CHILD_ID = '00000000-0000-4000-8000-000000000002';

// Invoke the real PATCH handler with a substituted persistence boundary. The
// existing role-matrix suite covers the router's authentication middleware.
function harness({ linked = true, lookupError = null, updateError = null, updateMissing = false } = {}) {
  const calls = [];
  const client = {
    from(table) {
      const call = { table, filters: [], update: null };
      calls.push(call);
      const query = {
        select() { return query; },
        eq(key, value) { call.filters.push([key, value]); return query; },
        update(value) { call.update = value; return query; },
        async maybeSingle() {
          return call.update
            ? { data: updateMissing ? null : { id: CHILD_ID, name: call.update.name, grade_level: 1, username: 'learner' }, error: updateError }
            : { data: linked ? { id: CHILD_ID } : null, error: lookupError };
        },
      };
      return query;
    },
  };
  const filename = path.resolve(__dirname, '../routes/student.js');
  const actualRequire = createRequire(filename);
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), {
    module, exports: module.exports, process, Buffer,
    console: { error() {}, warn() {} },
    require(name) {
      if (name === '../config/supabase') return { supabaseAdmin: client };
      if (name === '../middleware/auth') return { requireAuth: (_req, _res, next) => next(), requireRole: () => (_req, _res, next) => next() };
      return actualRequire(name);
    },
  }, { filename });
  const route = module.exports.stack.find((layer) => layer.route?.path === '/profile' && layer.route.methods.patch);
  assert.ok(route, 'The student profile PATCH endpoint must exist');
  return {
    calls,
    async patch(body) {
      const response = { statusCode: 200, body: null, status(value) { this.statusCode = value; return this; }, json(value) { this.body = value; return this; } };
      await route.route.stack.at(-1).handle({ user: { id: AUTH_ID }, body }, response);
      return response;
    },
  };
}

test('student profile update derives ownership from authenticated identity and changes only the display name', async () => {
  const app = harness();
  const response = await app.patch({ name: '  María   Santos  ' });
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.child.name, 'María Santos');
  assert.equal(response.body.child.id, CHILD_ID);
  assert.deepEqual(app.calls[0].filters, [['auth_uid', AUTH_ID]]);
  assert.deepEqual(app.calls[1].filters, [['id', CHILD_ID], ['auth_uid', AUTH_ID]]);
  assert.deepEqual(Object.keys(app.calls[1].update), ['name']);
});

test('student profile rejects grade, username, XP and ownership changes before persistence', async () => {
  for (const field of ['grade_level', 'username', 'xp', 'id', 'auth_uid', 'parent_id']) {
    const app = harness();
    const response = await app.patch({ name: 'Mika Santos', [field]: 'other' });
    assert.equal(response.statusCode, 400, field);
    assert.equal(app.calls.length, 0, field);
  }
});

test('student profile rejects empty, unbounded or control-character names without writes', async () => {
  for (const body of [null, [], {}, { name: '' }, { name: ' ' }, { name: 'A' }, { name: 'A'.repeat(101) }, { name: 'Mika\nSantos' }, { name: 123 }]) {
    const app = harness();
    assert.equal((await app.patch(body)).statusCode, 400);
    assert.equal(app.calls.length, 0);
  }
});

test('student profile missing link and lost ownership never produce a successful update', async () => {
  const missing = harness({ linked: false });
  assert.equal((await missing.patch({ name: 'Mika Santos' })).statusCode, 404);
  assert.equal(missing.calls.length, 1);
  assert.equal((await harness({ updateMissing: true }).patch({ name: 'Mika Santos' })).statusCode, 404);
});

test('student profile persistence outages are sanitized and do not claim a save succeeded', async () => {
  const diagnostic = 'private persistence diagnostics';
  for (const fault of [{ lookupError: { message: diagnostic } }, { updateError: { message: diagnostic } }]) {
    const response = await harness(fault).patch({ name: 'Mika Santos' });
    assert.equal(response.statusCode, 500);
    assert.equal(response.body.success, undefined);
    assert.ok(!JSON.stringify(response.body).includes(diagnostic));
  }
});
