// Real Express + loopback HTTP with explicit failing persistence boundaries.
// Role middleware itself is covered by auditRoleMatrix/auditInactiveAccounts.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const express = require('express');
process.env.SUPABASE_URL = 'http://127.0.0.1:9';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'isolated-final-api-contract';
const USER = '00000000-0000-4000-8000-000000000001';
const diagnostic = 'isolated internal persistence diagnostic';
const apps = new Map();
function routerFor(area, client) {
  const filename = path.resolve(__dirname, `../routes/${area}.js`), actualRequire = createRequire(filename), module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), { module, exports: module.exports, console: { error() {}, warn() {} }, Buffer, process,
    require(name) {
      if (name === '../config/supabase') return { supabaseAdmin: client };
      if (name === '../config/mailer') return { sendMail: async () => assert.fail('External delivery is forbidden') };
      if (name === '../middleware/auth') return { requireAuth(req, _res, next) { req.user = { id: USER }; next(); }, requireRole() { return (_req, _res, next) => next(); } };
      return actualRequire(name);
    },
  }, { filename });
  return module.exports;
}
const fault = { data: null, error: { code: 'XX001', message: diagnostic } };
const failingClient = {
  from() {
    let query;
    query = new Proxy({}, { get(_target, key) { if (key === 'then') return (resolve, reject) => Promise.resolve(fault).then(resolve, reject); return () => query; } });
    return query;
  },
  rpc: async () => fault,
};
test.before(async () => {
  for (const area of ['admin', 'teacher', 'parent', 'student', 'notifications']) {
    const app = express(); app.use(express.json(), routerFor(area, failingClient));
    const server = await new Promise((resolve) => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
    apps.set(area, { server, base: `http://127.0.0.1:${server.address().port}` });
  }
});
test.after(async () => { for (const { server } of apps.values()) await new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }); });
for (const area of ['admin', 'teacher', 'parent', 'student', 'notifications']) {
  const source = fs.readFileSync(path.resolve(__dirname, `../routes/${area}.js`), 'utf8');
  for (const [, endpoint] of source.matchAll(/router\.get\('([^']+)'/g)) {
    test(`final API ${area} GET ${endpoint}: persistence outage returns a sanitized server error over real HTTP`, async () => {
      const url = endpoint.replace(/:[A-Za-z]+/g, USER) + (endpoint === '/monitoring/users' ? '?role=student' : '');
      const response = await fetch(apps.get(area).base + url);
      const body = await response.json();
      assert.equal(response.status, 500);
      assert.equal(typeof body.error, 'string');
      assert.ok(!JSON.stringify(body).includes(diagnostic));
      assert.equal(body.success, undefined);
    });
  }
}

for (const failedTable of ['children', 'users', 'child_progress', 'pronunciation_practice_sessions']) {
  test(`final API analytics refuses partial totals when ${failedTable} fails`, async () => {
    const client = { from(table) { let builder; builder = new Proxy({}, { get(_target, key) { if (key === 'then') return (resolve, reject) => Promise.resolve(table === failedTable ? fault : { data: [], error: null }).then(resolve, reject); return () => builder; } }); return builder; } };
    const app = express(); app.use(routerFor('admin', client));
    const server = await new Promise((resolve) => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
    try {
      const response = await fetch(`http://127.0.0.1:${server.address().port}/analytics`);
      assert.equal(response.status, 500);
      const body = await response.json();
      assert.equal(body.totals, undefined);
      assert.equal(body.error, 'Unable to load analytics.');
    } finally { await new Promise((resolve) => server.close(resolve)); }
  });
}

test('final API parent children combines grade fallback, stored progress and active override correctly', async () => {
  const rows = {
    children: [1, 3, 6].map((grade_level, index) => ({ id: `child-${index}`, name: `Synthetic ${index}`, grade_level })),
    child_progress: [{ child_id: 'child-1', level: 'Advanced', xp: 50, streak: 2, activities_completed: 3, accuracy_sum: 240, total_attempts: 3 }],
    student_reading_level_overrides: [{ student_id: 'child-1', override_level: 'Beginner' }],
  };
  const client = { from(table) { let builder; builder = new Proxy({}, { get(_target, key) { if (key === 'then') return (resolve, reject) => Promise.resolve({ data: rows[table], error: null }).then(resolve, reject); return () => builder; } }); return builder; } };
  const app = express(); app.use(routerFor('parent', client));
  const server = await new Promise((resolve) => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/children`);
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.deepEqual(result.children.map((row) => row.level), ['Beginner', 'Beginner', 'Advanced']);
    assert.equal(result.children[1].xp, 50);
    assert.equal(result.children[0].total_attempts, 0);
    assert.equal(result.children[1].accuracy_sum, 240);
  } finally { await new Promise((resolve) => server.close(resolve)); }
});
