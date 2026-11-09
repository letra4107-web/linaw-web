const test = require('node:test');
const assert = require('node:assert/strict');
const { createStudentLessonsService } = require('../services/studentLessons');

function fixture({ child = { id: 'student', grade_level: 2 }, errorAt = null } = {}) {
  const calls = [];
  const rows = [
    { id: 'current', title: 'Patinig', grade_level: '2', is_published: true },
    { id: 'draft', grade_level: '2', is_published: false },
    { id: 'other-grade', grade_level: '3', is_published: true },
  ];
  const client = { from(table) {
    const filters = []; const call = { table, filters }; calls.push(call);
    const execute = single => {
      const matches = table === 'children' ? child ? [child] : [] : rows.filter(row => filters.every(([key, value]) => row[key] === value));
      return { data: single ? matches[0] || null : matches, error: errorAt === table ? new Error('Database unavailable') : null };
    };
    const query = {
      select(fields) { call.fields = fields; return query; },
      eq(key, value) { filters.push([key, value]); return query; },
      order(key, options) { call.order = [key, options]; return query; },
      maybeSingle: async () => execute(true),
      then: (resolve, reject) => Promise.resolve(execute(false)).then(resolve, reject),
    };
    return query;
  } };
  return { service: createStudentLessonsService(client), calls };
}

test('teacher uploads appear for the authenticated student grade, excluding drafts and other grades', async () => {
  const f = fixture();
  assert.deepEqual((await f.service.list('signed-in-student')).map(row => row.id), ['current']);
  assert.deepEqual(f.calls[0].filters, [['auth_uid', 'signed-in-student']]);
  assert.deepEqual(f.calls[1].filters, [['is_published', true], ['grade_level', '2']]);
  assert.deepEqual(f.calls[1].order, ['created_at', { ascending: false }]);
  assert.ok(!f.calls[1].fields.includes('pdf_url'));
});

test('PDF access applies the same grade and publication rules as the library', async () => {
  const f = fixture();
  assert.equal((await f.service.find('student-auth', 'current')).id, 'current');
  assert.equal(await f.service.find('student-auth', 'draft'), null);
  assert.equal(await f.service.find('student-auth', 'other-grade'), null);
});

test('missing student or grade cannot return unfiltered teacher uploads', async () => {
  await assert.rejects(fixture({ child: null }).service.list('unknown'), { status: 404 });
  const f = fixture({ child: { id: 'student', grade_level: null } });
  assert.deepEqual(await f.service.list('student-auth'), []);
  assert.equal(await f.service.find('student-auth', 'current'), null);
  assert.ok(f.calls.every(call => call.table === 'children'));
});

test('lesson persistence failures reach the caller instead of looking like an empty library', async () => {
  for (const errorAt of ['children', 'lessons']) await assert.rejects(fixture({ errorAt }).service.list('student-auth'), /Database unavailable/);
});
