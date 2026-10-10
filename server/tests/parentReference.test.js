const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const express = require('express');
const { createAuthMiddleware } = require('../middleware/authCore');
const { createMaterialAccessService } = require('../services/materialAccess');

const CHILD = '11111111-1111-4111-8111-111111111111';
const OTHER_CHILD = '22222222-2222-4222-8222-222222222222';
const ASSIGNMENT = '33333333-3333-4333-8333-333333333333';
const OTHER_ASSIGNMENT = '44444444-4444-4444-8444-444444444444';
const ARCHIVED_ASSIGNMENT = '55555555-5555-4555-8555-555555555555';
const MATERIAL = '66666666-6666-4666-8666-666666666666';
const ARCHIVED_MATERIAL = '77777777-7777-4777-8777-777777777777';

// Load the actual router in an isolated CommonJS context. Its database and
// mail integrations are replaced; route logic, validation, authorization,
// bearer/role middleware, and URL creation remain the production code.
function createHarness({ signed = true, failTable = null } = {}) {
  const calls = { queries: [], rpc: [], signedUrls: [] };
  const learningPath = { configured: true, effective_level: 'Beginner', modules: [{ id: 'module-1', title: 'Unang mga Titik', module_number: 1, state: 'unlocked', content_item_count: 13, completed_content_item_count: 3 }] };
  const tables = {
    users: [{ id: 'parent-a', role: 'parent' }, { id: 'parent-b', role: 'parent' }, { id: 'teacher-a', role: 'teacher' }],
    children: [{ id: CHILD, parent_id: 'parent-a', name: 'Ana', auth_uid: 'student-a' }, { id: OTHER_CHILD, parent_id: 'parent-b', name: 'Ben', auth_uid: 'student-b' }],
    pdf_materials: [
      { id: MATERIAL, title: 'Reading Practice', grade_level: 2, level: 'Beginner', archived_at: null, storage_bucket: 'migrated-reading-materials', storage_path: 'teacher/practice.pdf', file_url: '', legacy_public_url: 'https://legacy.example/practice.pdf', extracted_text: 'Private teaching content' },
      { id: ARCHIVED_MATERIAL, title: 'Archived Practice', grade_level: 2, level: 'Beginner', archived_at: '2026-10-01', storage_bucket: 'reading-materials', storage_path: 'teacher/archived.pdf', file_url: 'https://legacy.example/archived.pdf' },
    ],
    pdf_assignments: [
      { id: ASSIGNMENT, pdf_material_id: MATERIAL, student_id: CHILD, status: 'assigned', assigned_at: '2026-10-03', due_date: '2026-10-12' },
      { id: OTHER_ASSIGNMENT, pdf_material_id: MATERIAL, student_id: OTHER_CHILD, status: 'in_progress', assigned_at: '2026-10-04', due_date: null },
      { id: ARCHIVED_ASSIGNMENT, pdf_material_id: ARCHIVED_MATERIAL, student_id: CHILD, status: 'completed', assigned_at: '2026-10-01', due_date: null },
    ],
  };
  function project(row, selection) {
    const nested = selection.match(/pdf_materials\(([^)]*)\)/);
    const fields = selection.replace(/,?pdf_materials\([^)]*\)/, '').split(',').map((value) => value.trim()).filter(Boolean);
    const result = Object.fromEntries(fields.map((field) => [field, row[field]]));
    if (nested) {
      const material = tables.pdf_materials.find((item) => item.id === row.pdf_material_id);
      result.pdf_materials = material ? project(material, nested[1]) : null;
    }
    return result;
  }
  const client = {
    auth: { getUser: async (token) => ({ data: { user: tables.users.some((item) => item.id === token) ? { id: token } : null }, error: null }) },
    from(table) {
      const query = { table, selection: '*', filters: [], sort: null };
      calls.queries.push(query);
      function result(single = false) {
        if (table === failTable) return { data: null, error: new Error('Database private diagnostic') };
        let rows = (tables[table] || []).filter((row) => query.filters.every(([column, value]) => row[column] === value));
        if (query.sort) rows = [...rows].sort((a, b) => String(b[query.sort]).localeCompare(String(a[query.sort])));
        const data = rows.map((row) => query.selection === '*' ? { ...row } : project(row, query.selection));
        return { data: single ? data[0] || null : data, error: null };
      }
      const builder = {
        select(selection) { query.selection = selection; return builder; },
        eq(column, value) { query.filters.push([column, value]); return builder; },
        is(column, value) { query.filters.push([column, value]); return builder; },
        order(column) { query.sort = column; return builder; },
        maybeSingle() { return Promise.resolve(result(true)); },
        then(resolve, reject) { return Promise.resolve(result()).then(resolve, reject); },
      };
      return builder;
    },
    rpc: async (name, params) => { calls.rpc.push({ name, params: { ...params } }); return { data: learningPath, error: null }; },
    storage: { from: (bucket) => ({ createSignedUrl: async (storagePath, expiresIn) => { calls.signedUrls.push({ bucket, storagePath, expiresIn }); return { data: { signedUrl: `https://signed.example/${bucket}/${storagePath}?ttl=${expiresIn}` }, error: null }; } }) },
  };
  const filename = path.resolve(__dirname, '../routes/parent.js');
  const actualRequire = createRequire(filename);
  const module = { exports: {} };
  const routeRequire = (name) => {
    if (name === '../config/supabase') return { supabaseAdmin: client };
    if (name === '../config/mailer') return { sendMail: async () => {} };
    if (name === '../middleware/auth') return createAuthMiddleware(client);
    if (name === '../services/materialAccess') return { createMaterialAccessService: (input) => createMaterialAccessService(input, { signedUrlsEnabled: signed }) };
    return actualRequire(name);
  };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), { module, exports: module.exports, require: routeRequire, console: { error() {} } }, { filename });
  return { router: module.exports, calls, learningPath };
}

async function withRouter(harness, run) {
  const app = express();
  app.use('/api/parent', harness.router);
  const server = await new Promise((resolve) => { const listening = app.listen(0, '127.0.0.1', () => resolve(listening)); });
  const request = async (route, token = 'parent-a') => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/parent${route}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    return { status: response.status, body: await response.json() };
  };
  try { await run(request); } finally { await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
}

test('parent reference endpoints reject missing authentication and non-parent accounts', async () => {
  const harness = createHarness();
  await withRouter(harness, async (request) => {
    for (const route of [`/children/${CHILD}/learning-path`, `/children/${CHILD}/materials`, `/children/${CHILD}/materials/${ASSIGNMENT}/access-url`]) {
      assert.equal((await request(route, null)).status, 401);
      assert.equal((await request(route, 'teacher-a')).status, 403);
    }
  });
  assert.equal(harness.calls.rpc.length, 0);
  assert.equal(harness.calls.signedUrls.length, 0);
  assert.ok(harness.calls.queries.every((query) => query.table === 'users'));
});

test('parent learning path returns authoritative curriculum counts for an owned child', async () => {
  const harness = createHarness();
  await withRouter(harness, async (request) => {
    const result = await request(`/children/${CHILD}/learning-path`);
    assert.equal(result.status, 200);
    assert.deepEqual(result.body, harness.learningPath);
  });
  assert.deepEqual(harness.calls.rpc, [{ name: 'get_student_module_path', params: { p_student_id: CHILD } }]);
});

test('parent reference endpoints deny another parent before curriculum or material access', async () => {
  const harness = createHarness();
  await withRouter(harness, async (request) => {
    for (const route of [`/children/${CHILD}/learning-path`, `/children/${CHILD}/materials`, `/children/${CHILD}/materials/${ASSIGNMENT}/access-url`]) {
      assert.equal((await request(route, 'parent-b')).status, 404);
    }
  });
  assert.equal(harness.calls.rpc.length, 0);
  assert.equal(harness.calls.signedUrls.length, 0);
  assert.ok(harness.calls.queries.every((query) => ['users', 'children'].includes(query.table)));
});

test('parent materials contain only owned, active assignment metadata', async () => {
  const harness = createHarness();
  await withRouter(harness, async (request) => {
    const result = await request(`/children/${CHILD}/materials`);
    assert.equal(result.status, 200);
    assert.equal(result.body.assignments.length, 1);
    assert.equal(result.body.assignments[0].id, ASSIGNMENT);
    assert.equal(result.body.assignments[0].pdf_materials.title, 'Reading Practice');
    assert.equal(result.body.assignments[0].pdf_materials.file_url, undefined);
    assert.equal(result.body.assignments[0].pdf_materials.storage_path, undefined);
    assert.equal(result.body.assignments[0].pdf_materials.extracted_text, undefined);
  });
  assert.equal(harness.calls.signedUrls.length, 0);
});

test('parent signed material access honors storage metadata and rejects unrelated or archived assignments', async () => {
  const harness = createHarness();
  await withRouter(harness, async (request) => {
    assert.equal((await request(`/children/${CHILD}/materials/${OTHER_ASSIGNMENT}/access-url`)).status, 404);
    assert.equal((await request(`/children/${CHILD}/materials/${ARCHIVED_ASSIGNMENT}/access-url`)).status, 404);
    const result = await request(`/children/${CHILD}/materials/${ASSIGNMENT}/access-url`);
    assert.equal(result.status, 200);
    assert.equal(result.body.mode, 'signed');
    assert.equal(result.body.expiresIn, 300);
    assert.match(result.body.url, /migrated-reading-materials\/teacher\/practice\.pdf/);
  });
  assert.deepEqual(harness.calls.signedUrls, [{ bucket: 'migrated-reading-materials', storagePath: 'teacher/practice.pdf', expiresIn: 300 }]);
});

test('parent legacy material access keeps the existing URL fallback', async () => {
  const harness = createHarness({ signed: false });
  await withRouter(harness, async (request) => {
    const result = await request(`/children/${CHILD}/materials/${ASSIGNMENT}/access-url`);
    assert.equal(result.status, 200);
    assert.deepEqual(result.body, { url: 'https://legacy.example/practice.pdf', expiresIn: null, mode: 'legacy-public' });
  });
  assert.equal(harness.calls.signedUrls.length, 0);
});

test('parent reference routes validate child and assignment UUIDs before database access', async () => {
  const harness = createHarness();
  await withRouter(harness, async (request) => {
    assert.equal((await request('/children/not-a-uuid/learning-path')).status, 400);
    assert.equal((await request('/children/not-a-uuid/materials')).status, 400);
    assert.equal((await request(`/children/${CHILD}/materials/not-a-uuid/access-url`)).status, 400);
  });
  assert.ok(harness.calls.queries.every((query) => query.table === 'users'));
  assert.equal(harness.calls.rpc.length, 0);
  assert.equal(harness.calls.signedUrls.length, 0);
});

test('parent material failures return a safe error without a partial result', async () => {
  const harness = createHarness({ failTable: 'pdf_assignments' });
  await withRouter(harness, async (request) => {
    for (const route of [`/children/${CHILD}/materials`, `/children/${CHILD}/materials/${ASSIGNMENT}/access-url`]) {
      const result = await request(route);
      assert.equal(result.status, 500);
      assert.equal(result.body.assignments, undefined);
      assert.doesNotMatch(JSON.stringify(result.body), /Database private diagnostic/);
    }
  });
  assert.equal(harness.calls.signedUrls.length, 0);
});
