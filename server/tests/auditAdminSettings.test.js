const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');

function settingsHarness({ databaseError = false } = {}) {
  const writes = [];
  const client = { from(table) {
    const result = { data: null, error: databaseError ? { message: 'private persistence diagnostic', code: 'XX001' } : null };
    const chain = { upsert(value) { writes.push({ table, value }); return chain; }, insert() { return chain; }, select() { return chain; }, single: async () => result, then(resolve, reject) { return Promise.resolve(result).then(resolve, reject); } };
    return chain;
  } };
  const filename = path.resolve(__dirname, '../routes/admin.js'), actualRequire = createRequire(filename), module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), { module, exports: module.exports, console: { error() {} },
    require(name) {
      if (name === '../config/supabase') return { supabaseAdmin: client };
      if (name === '../middleware/auth') return { requireAuth(req, _res, next) { req.user = { id: 'qa-admin' }; next(); }, requireRole: () => (_req, _res, next) => next() };
      return actualRequire(name);
    },
  }, { filename });
  return { writes, request: body => new Promise((resolve, reject) => {
    const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(data) { resolve({ status: this.statusCode, body: data }); } };
    module.exports.handle({ method: 'PATCH', url: '/system-settings', headers: {}, body }, res, reject);
  }) };
}
test('audit admin settings reject nonboolean toggles without persistence', async () => {
  for (const body of [{ maintenanceMode: 'false' }, { enableBadges: null }, { readOnlyMode: 1 }]) {
    const h = settingsHarness();
    assert.equal((await h.request(body)).status, 400);
    assert.equal(h.writes.length, 0);
  }
});
test('audit admin settings return server failure for database errors without leaking diagnostics', async () => {
  const result = await settingsHarness({ databaseError: true }).request({ systemName: 'QA school' });
  assert.equal(result.status, 500);
  assert.doesNotMatch(JSON.stringify(result.body), /private persistence diagnostic|XX001/);
});
test('audit admin settings preserve valid false toggles and supported defaults', async () => {
  const h = settingsHarness();
  const result = await h.request({ systemName: 'QA school', enableBadges: false, passingScore: 0 });
  assert.equal(result.status, 200);
  assert.equal(h.writes[0].value.settings.enableBadges, false);
  assert.equal(h.writes[0].value.settings.passingScore, 0);
});
