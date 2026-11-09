import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './helpers/load-ts.mjs';
const { homeworkCategory, homeworkDeadline, homeworkSubmitLabel, groupHomework } = loadTs('src/lib/homeworkPresentation.ts');
const now = Date.parse('2026-11-09T15:59:00Z');
const task = (id, due_at) => ({ id, title:id, due_at, created_at:'2026-11-01T00:00:00Z', status:'open' });
test('only confirmed submissions are completed; deadlines include the exact boundary', () => {
  const past = task('past','2026-11-09T15:59:00Z');
  for (const status of ['draft','returned']) assert.equal(homeworkCategory(past,{status},now),'late');
  for (const status of ['submitted','reviewed']) assert.equal(homeworkCategory(past,{status},now),'done');
  assert.equal(homeworkCategory(past,undefined,now-1),'upcoming');
  assert.equal(homeworkCategory(task('none',null),undefined,now),'upcoming');
});
test('deadline groups use Manila dates across UTC midnight, soonest first, with no deadline last', () => {
  const rows = [task('none',null),task('later','2026-11-11T15:00:00Z'),task('same-day','2026-11-10T00:01:00Z'),task('earlier','2026-11-09T16:01:00Z')];
  const groups = groupHomework(rows,[],'upcoming',now);
  assert.equal(groups.length,3);
  assert.deepEqual(Array.from(groups[0].items,item=>item.assignment.id),['earlier','same-day']);
  assert.equal(groups[1].items[0].assignment.id,'later');
  assert.equal(groups[2].key,'no-deadline');
  assert.equal(rows[0].id,'none','grouping must not mutate query data');
  assert.match(homeworkDeadline('2026-11-09T16:01:00Z'),/10/);
  assert.equal(homeworkDeadline(null),'Walang takdang araw');
});
test('completed work remains in completed, and returned work offers resubmission', () => {
  const rows = [task('new','2026-11-10T00:01:00Z'),task('old','2026-11-08T00:01:00Z')];
  const answers = rows.map(row=>({assignment_id:row.id,status:'reviewed'}));
  const groups = groupHomework(rows,answers,'done',now);
  assert.equal(groups[0].items[0].assignment.id,'new');
  assert.equal(groups[1].items[0].answer.status,'reviewed');
  assert.equal(homeworkSubmitLabel(rows[1],undefined,now),'Ipasa Kahit Huli');
  assert.equal(homeworkSubmitLabel(rows[1],{status:'returned',revision:1},now),'Ipasa Muli ang Sagot');
});
