import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './helpers/load-ts.mjs';

const { updateOwnedLesson, deleteOwnedLesson } = loadTs('src/lib/lessons/manage.ts');
function fixture(result = { data: { id: 'lesson-1' }, error: null }) {
  const calls = [];
  const query = {
    update(values) { calls.push(['update', values]); return this; },
    delete() { calls.push(['delete']); return this; },
    eq(key, value) { calls.push(['eq', key, value]); return this; },
    select(fields) { calls.push(['select', fields]); return this; },
    async maybeSingle() { return result; },
  };
  return { calls, client: { from(table) { assert.equal(table, 'lessons'); return query; } } };
}
for (const [label, mutate, values] of [
  ['make a draft', updateOwnedLesson, { is_published: false }],
  ['publish a draft', updateOwnedLesson, { is_published: true }],
  ['edit a lesson', updateOwnedLesson, { title: 'Patinig', description: 'Pagbasa', grade_level: '1' }],
  ['remove a lesson', deleteOwnedLesson, undefined],
]) {
  test(`${label} confirms the affected lesson and keeps the owner filter`, async () => {
    const f = fixture();
    await mutate(f.client, 'teacher-1', 'lesson-1', values);
    assert.deepEqual(f.calls, [values ? ['update', values] : ['delete'], ['eq', 'id', 'lesson-1'], ['eq', 'teacher_id', 'teacher-1'], ['select', 'id']]);
  });
  test(`${label} fails when RLS or a stale ID affects no lesson`, async () => {
    const f = fixture({ data: null, error: null });
    await assert.rejects(mutate(f.client, 'teacher-1', 'lesson-1', values), /Hindi nakumpirma/);
  });
  test(`${label} preserves a database rejection`, async () => {
    const error = { code: '42501', message: 'row-level security' };
    const f = fixture({ data: null, error });
    await assert.rejects(mutate(f.client, 'teacher-1', 'lesson-1', values), actual => actual === error);
  });
  test(`${label} requires a signed-in teacher before writing`, async () => {
    const f = fixture();
    await assert.rejects(mutate(f.client, undefined, 'lesson-1', values), /Mag-login/);
    assert.equal(f.calls.length, 0);
  });
}
