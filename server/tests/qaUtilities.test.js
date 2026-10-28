const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { manilaDay, wordOfDayStreak } = require('../lib/calendarDay');
const { temporaryPassword } = require('../lib/temporaryPassword');
const { assertStagingTargets } = require('../lib/stagingTarget');
const { createAuthorizationService } = require('../services/authorization');

test('QA word-of-day streak uses the Manila day around midnight and year changes', () => {
  assert.equal(manilaDay(new Date('2026-10-16T15:59:59Z')), '2026-10-16');
  assert.equal(manilaDay(new Date('2026-10-16T16:00:00Z')), '2026-10-17');
  const now = new Date('2026-12-31T16:01:00Z');
  assert.deepEqual(wordOfDayStreak({ streak: 4, longest_streak: 4, last_practice_date: '2026-12-31' }, now), { streak: 5, longest_streak: 5, last_practice_date: '2027-01-01' });
  assert.equal(wordOfDayStreak({ streak: 4, last_practice_date: '2027-01-01' }, now).streak, 4);
  assert.equal(wordOfDayStreak({ streak: 4, longest_streak: 9, last_practice_date: '2026-12-29' }, now).longest_streak, 9);
  assert.equal(wordOfDayStreak({}, now).streak, 1);
});
test('QA temporary passwords always have twelve allowed characters, uppercase, and a digit', () => {
  const values = new Set();
  for (let index = 0; index < 100; index++) {
    const value = temporaryPassword();
    assert.match(value, /^[ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789]{12}$/);
    assert.match(value, /[A-Z]/);
    assert.match(value, /[2-9]/);
    values.add(value);
  }
  assert.equal(values.size, 100);
});
test('QA missing SMTP never logs credential email contents or reports delivery success', async () => {
  const filename = path.resolve(__dirname, '../config/mailer.js');
  const module = { exports: {} };
  const logs = [];
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), { module, exports: module.exports, require: () => ({}), process: { env: {} }, console: { warn: (...args) => logs.push(args) } }, { filename });
  await assert.rejects(module.exports.sendMail({ to: 'private@example.test', subject: 'Credentials', text: 'sensitive-test-password' }), /not configured/);
  assert.equal(logs.length, 0);
});
test('QA staging guard validates each host and refuses query/path/username tricks', () => {
  assert.doesNotThrow(() => assertStagingTargets({ api: 'http://localhost:4000', frontend: 'https://app-staging.example.test', supabase: 'https://project.supabase.co' }, { allowedSupabaseHost: 'project.supabase.co' }));
  for (const api of ['https://production.example.test', 'https://production.example.test/staging', 'https://production.example.test?staging=true', 'https://staging@production.example.test', 'https://localhost.evil.test', 'http://app-staging.example.test', 'https://linawletra-production-409e.up.railway.app', 'https://linawletra.com']) {
    assert.throws(() => assertStagingTargets({ api, frontend: 'http://localhost:5173' }), /staging|local/);
  }
  assert.throws(() => assertStagingTargets({ supabase: 'https://unknown.supabase.co' }, { allowedSupabaseHost: 'project.supabase.co' }));
});

test('QA archived assignment access is denied even to the assigned student', async () => {
  const authorization = createAuthorizationService({ findAssignment: async (id) => ({ id, student_id: 'student-a', pdf_materials: { archived_at: id === 'archived' ? '2026-10-17' : null } }) });
  assert.equal(await authorization.studentAssignment('student-a', 'archived'), null);
  assert.ok(await authorization.studentAssignment('student-a', 'active'));
  assert.equal(await authorization.studentAssignment('student-b', 'active'), null);
});
