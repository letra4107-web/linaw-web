const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
function harness({ users = [{ id: 'student-1', role: 'student', account_status: 'active', is_active: true }], deliveries = [], databaseError = false } = {}) {
  const writes = [], reads = [];
  const client = { from(table) {
    const filters = []; let start = 0, end = 999;
    const chain = {
      select() { return chain; }, eq(key, value) { filters.push(row => row[key] === value); return chain; }, in(key, values) { filters.push(row => values.includes(row[key])); return chain; }, order() { return chain; }, range(a, b) { start = a; end = b; return chain; },
      insert(rows) { writes.push({ table, rows }); return Promise.resolve({ error: databaseError ? { message: 'private database detail' } : null }); },
      then(resolve, reject) { reads.push({ table, start, end }); return Promise.resolve({ data: (table === 'users' ? users : deliveries).filter(row => filters.every(filter => filter(row))).slice(start, end + 1), error: databaseError ? { message: 'private database detail' } : null }).then(resolve, reject); },
    }; return chain;
  } };
  const filename = path.resolve(__dirname, '../routes/admin.js'), realRequire = createRequire(filename), module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), { module, exports: module.exports, console: { error() {} }, require(name) {
    if (name === '../config/supabase') return { supabaseAdmin: client };
    if (name === '../middleware/auth') return { requireAuth(req, res, next) { if (!req.user) return res.status(401).json({ error: 'Authentication required' }); next(); }, requireRole: role => (req, res, next) => req.user.role === role ? next() : res.status(403).json({ error: 'Forbidden' }) };
    return realRequire(name);
  } }, { filename });
  return { writes, reads, request: (method, body, role = 'admin') => new Promise((resolve, reject) => {
    const res = { statusCode: 200, status(value) { this.statusCode = value; return this; }, json(body) { resolve({ status: this.statusCode, body }); } };
    module.exports.handle({ method, url: '/announcements', headers: {}, user: role ? { id: 'admin-1', role } : null, body }, res, reject);
  }) };
}
const valid = { title: ' Class update ', message: ' Read a story today. ', roles: ['student'] };
test('announcement routes enforce authentication and admin access before database work', async () => {
  for (const role of [null, 'student', 'parent', 'teacher']) for (const method of ['GET', 'POST']) { const h = harness(); assert.equal((await h.request(method, valid, role)).status, role ? 403 : 401); assert.equal(h.writes.length, 0); assert.equal(h.reads.length, 0); }
});
test('announcements reject malformed content and recipient roles before any writes', async () => {
  for (const body of [{ ...valid, title: ' ' }, { ...valid, message: '' }, { ...valid, title: 'x'.repeat(161) }, { ...valid, message: 'x'.repeat(4001) }, { ...valid, roles: [] }, { ...valid, roles: ['admin'] }, { ...valid, roles: 'student' }, { ...valid, roles: [null] }]) { const h = harness(); assert.equal((await h.request('POST', body)).status, 400); assert.equal(h.writes.length, 0); }
});
test('announcements target selected active accounts and persist one atomic delivery insert', async () => {
  const h = harness({ users: [{ id: 'a', role: 'student', account_status: 'active', is_active: true }, { id: 'b', role: 'student', account_status: 'disabled', is_active: true }, { id: 'c', role: 'parent', account_status: 'active', is_active: true }, { id: 'd', role: 'student', account_status: 'active', is_active: false }] });
  const result = await h.request('POST', valid); assert.equal(result.status, 201); assert.equal(result.body.delivered, 1); assert.equal(h.writes.length, 1);
  const row = h.writes[0].rows[0]; assert.equal(row.user_id, 'a'); assert.equal(row.title, 'Class update'); assert.equal(row.body, 'Read a story today.'); assert.equal(row.message, row.body); assert.equal(row.type, 'admin_announcement'); assert.equal(row.is_read, false); assert.equal(row.read, false);
});
test('announcements paginate recipients beyond the service response window without partial writes', async () => {
  const h = harness({ users: Array.from({ length: 1001 }, (_, index) => ({ id: `student-${index}`, role: 'student', account_status: 'active', is_active: true })) });
  const result = await h.request('POST', valid); assert.equal(result.body.delivered, 1001); assert.equal(h.writes.length, 1); assert.equal(h.writes[0].rows.length, 1001); assert.equal(new Set(h.writes[0].rows.map(row => row.created_at)).size, 1);
});
test('announcements with no eligible recipients do not claim delivery', async () => { const h = harness({ users: [] }); assert.equal((await h.request('POST', valid)).status, 400); assert.equal(h.writes.length, 0); });
test('announcement failures hide database diagnostics', async () => { for (const method of ['GET', 'POST']) { const result = await harness({ databaseError: true }).request(method, valid); assert.equal(result.status, 500); assert.doesNotMatch(JSON.stringify(result.body), /private database detail/); } });
test('announcement history groups deliveries into one sent notification with role counts', async () => {
  const h = harness({ users: [{ id: 'a', role: 'student' }, { id: 'b', role: 'parent' }], deliveries: [{ id: 'delivery-a', user_id: 'a', title: 'Welcome', body: 'Hello', created_at: '2026-11-07T08:00:00Z', type: 'admin_announcement' }, { id: 'delivery-b', user_id: 'b', title: 'Welcome', body: 'Hello', created_at: '2026-11-07T08:00:00Z', type: 'admin_announcement' }] });
  const result = await h.request('GET'); assert.equal(result.status, 200); assert.equal(result.body.announcements.length, 1); assert.equal(result.body.announcements[0].delivered, 2); assert.equal(result.body.announcements[0].recipients.student, 1); assert.equal(result.body.announcements[0].recipients.parent, 1);
});
