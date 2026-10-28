const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const express = require('express');
const { createAuthMiddleware } = require('../middleware/authCore');
const { isAccuracy, isGrade } = require('../lib/validation');

const response = () => ({ code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });
test('QA numeric validators reject coercible non-numbers', () => {
  for (const value of [null, true, false, '', ' ', [], [1], {}]) assert.equal(isAccuracy(value), false, JSON.stringify(value));
  for (const value of [true, [1], [6], '']) assert.equal(isGrade(value), false, JSON.stringify(value));
  for (const value of [0, 100, '80.5']) assert.equal(isAccuracy(value), true);
  for (const value of [1, 6, '3']) assert.equal(isGrade(value), true);
});
test('QA authentication handles an upstream rejection with a safe response', async () => {
  const middleware = createAuthMiddleware({ auth: { getUser: async () => { throw new Error('private diagnostic'); } } });
  const res = response();
  await middleware.requireAuth({ headers: { authorization: 'Bearer test' } }, res, () => assert.fail('must not continue'));
  assert.equal(res.code, 503);
  assert.doesNotMatch(JSON.stringify(res.body), /private diagnostic/);
});
test('QA authorization handles a rejected role query with a safe response', async () => {
  const middleware = createAuthMiddleware({ from() { throw new Error('private diagnostic'); } });
  const res = response();
  await middleware.requireRole('admin')({ user: { id: 'test' } }, res, () => assert.fail('must not continue'));
  assert.equal(res.code, 503);
  assert.doesNotMatch(JSON.stringify(res.body), /private diagnostic/);
});
for (const profile of [{ role: 'admin', account_status: 'disabled' }, { role: 'admin', account_status: 'archived' }, { role: 'teacher', is_active: false }]) {
  test(`QA role authorization rejects inactive account ${JSON.stringify(profile)}`, async () => {
    const client = { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: profile, error: null }) }) }) }) };
    const res = response();
    await createAuthMiddleware(client).requireRole(profile.role)({ user: { id: 'test' } }, res, () => assert.fail('inactive account must not continue'));
    assert.equal(res.code, 403);
  });
}

const MATERIAL = '11111111-1111-4111-8111-111111111111';
// Route-unit tests: actual router/validation, an explicit fake persistence boundary.
function routeHarness(name, { published = false } = {}) {
  const mutations = [];
  const client = { from(table) {
    const result = { data: table === 'pdf_materials' ? { id: MATERIAL, teacher_id: 'test-teacher', drill_status: published ? 'published' : 'pending_review' } : { id: 'test-child' }, error: null };
    const builder = new Proxy({}, { get(_target, key) {
      if (key === 'then') return (resolve, reject) => Promise.resolve(result).then(resolve, reject);
      return (...args) => {
        if (['delete', 'insert', 'update'].includes(key)) mutations.push({ table, action: key, value: args[0] });
        if (key === 'maybeSingle' || key === 'single') return Promise.resolve(result);
        return builder;
      };
    } });
    return builder;
  } };
  const filename = path.resolve(__dirname, `../routes/${name}.js`);
  const actualRequire = createRequire(filename);
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), { module, exports: module.exports, console: { error() {}, warn() {} }, require(dependency) {
    if (dependency === '../config/supabase') return { supabaseAdmin: client };
    if (dependency === '../middleware/auth') return { requireAuth: (req, _res, next) => { req.user = { id: 'test-teacher' }; next(); }, requireRole: () => (_req, _res, next) => next() };
    return actualRequire(dependency);
  } }, { filename });
  return { router: module.exports, mutations };
}
async function requestRoute(harness, route, body) {
  const app = express();
  app.use(express.json(), harness.router);
  const server = await new Promise((resolve) => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
  try {
    const res = await fetch(`http://127.0.0.1:${server.address().port}${route}`, { method: route.includes('/assessment/') ? 'POST' : 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return { status: res.status, body: await res.json() };
  } finally { await new Promise((resolve) => server.close(resolve)); }
}
for (const [label, body] of [
  ['missing items', {}], ['non-array items', { items: {} }], ['null item', { items: [null] }],
  ['zero XP violates SQL constraint', { items: [{ syllable_pattern: 'ba-ta', word: 'bata', xp_value: 0 }] }],
  ['invalid ordering', { items: [{ syllable_pattern: 'ba-ta', word: 'bata', item_order: 'bad' }] }],
]) {
  test(`QA drill update rejects ${label} before any mutation`, async () => {
    const harness = routeHarness('teacher');
    const res = await requestRoute(harness, `/pdf-drill/${MATERIAL}/items`, body);
    assert.equal(res.status, 400);
    assert.equal(harness.mutations.length, 0);
  });
}
test('QA assessment null responses produce a validation error instead of 500', async () => {
  const res = await requestRoute(routeHarness('student'), `/learn/assessment/${MATERIAL}/submit`, { responses: [null] });
  assert.equal(res.status, 400);
});
test('QA replacing a published drill cannot cascade-delete student attempt history', async () => {
  const harness = routeHarness('teacher', { published: true });
  const res = await requestRoute(harness, `/pdf-drill/${MATERIAL}/items`, { items: [{ word: 'bata', syllable_pattern: 'ba-ta', xp_value: 25 }] });
  assert.equal(res.status, 409);
  assert.equal(harness.mutations.length, 0);
});
