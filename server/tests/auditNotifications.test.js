const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const express = require('express');

function harness({ failUpdate = false, failChildren = false } = {}) {
  const rows = Array.from({ length: 75 }, (_, i) => ({ id: `notice-${i}`, user_id: 'qa-parent', is_read: false, read: false }));
  rows.push({ id: 'unrelated', user_id: 'other-parent', is_read: false, read: false });
  const mutations = [];
  const client = { from(table) {
    let limit = Infinity, updates, ids, scope;
    const builder = {
      select() { return builder; }, eq() { return builder; }, order() { return builder; },
      or(value) { scope = value; return builder; }, limit(value) { limit = value; return builder; },
      update(value) { updates = value; return builder; }, in(_column, value) { ids = value; return builder; },
      then(resolve, reject) {
        let result;
        if (table === 'children') result = { data: [], error: failChildren ? new Error('private diagnostic') : null };
        else if (updates) {
          mutations.push({ ids, scope, updates });
          assert.equal(scope, 'parent_id.eq.qa-parent,user_id.eq.qa-parent');
          if (!failUpdate) rows.filter(row => row.user_id === 'qa-parent').forEach(row => Object.assign(row, updates));
          result = { error: failUpdate ? new Error('private diagnostic') : null };
        } else result = { data: rows.filter(row => row.user_id === 'qa-parent').slice(0, limit), error: null };
        return Promise.resolve(result).then(resolve, reject);
      },
    };
    return builder;
  } };
  const filename = path.resolve(__dirname, '../routes/notifications.js');
  const actualRequire = createRequire(filename), module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), {
    module, exports: module.exports, console: { error() {} },
    require(name) {
      if (name === '../config/supabase') return { supabaseAdmin: client };
      if (name === '../middleware/auth') return { requireAuth(req, _res, next) { req.user = { id: 'qa-parent' }; next(); }, requireRole: () => (_req, _res, next) => next() };
      return actualRequire(name);
    },
  }, { filename });
  return { router: module.exports, rows, mutations };
}

async function request(h, route = '/read-all', method = 'POST') {
  const app = express(); app.use(h.router);
  const server = await new Promise(resolve => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}${route}`, { method });
    return { status: response.status, body: await response.json() };
  } finally { await new Promise(resolve => server.close(resolve)); }
}

test('audit read-all marks notifications beyond the 50-row display limit without touching another user', async () => {
  const h = harness();
  assert.equal((await request(h, '/', 'GET')).body.notifications.length, 50);
  assert.equal((await request(h)).status, 200);
  assert.equal(h.rows.filter(row => row.user_id === 'qa-parent' && !row.is_read).length, 0);
  assert.equal(h.rows.find(row => row.id === 'unrelated').is_read, false);
});
test('audit read-all fails safely on persistence errors', async () => {
  const h = harness({ failUpdate: true });
  const result = await request(h);
  assert.equal(result.status, 500);
  assert.equal(result.body.success, undefined);
  assert.doesNotMatch(JSON.stringify(result.body), /private diagnostic/);
  assert.equal(h.rows.filter(row => row.is_read).length, 0);
});
test('audit read-all never updates when ownership lookup fails', async () => {
  const h = harness({ failChildren: true });
  assert.equal((await request(h)).status, 500);
  assert.equal(h.mutations.length, 0);
});
