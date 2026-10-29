import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './helpers/load-ts.mjs';

const { earnedStudentBadges, studentBadgeDate, studentJourneyLabel, studentLevelLabel } = loadTs('src/lib/studentProfile.ts');

test('student profile preserves current award IDs and actual unlock dates without counting duplicates', () => {
  const badges = earnedStudentBadges([{ id: 'unang_araw', unlockedAt: '2026-10-26T04:00:00Z' }, 'unang_bigkas', null, {}, { id: 'unang_araw', unlocked_at: '2026-10-26T04:00:00Z' }]);
  assert.deepEqual(Array.from(badges, (badge) => badge.id), ['unang_araw', 'unang_bigkas']);
  assert.equal(badges[0].unlockedAt, '2026-10-26T04:00:00Z');
  assert.equal(badges[1].unlockedAt, undefined);
});

test('student profile accepts legacy keyed achievements while excluding explicitly unearned entries', () => {
  const badges = earnedStudentBadges({ unang_araw: { unlockedAt: '2026-10-26T04:00:00Z' }, unang_bigkas: true, unavailable: false, missing: null });
  assert.deepEqual(Array.from(badges, (badge) => badge.id), ['unang_araw', 'unang_bigkas']);
  for (const value of [null, undefined, 0, 'invalid']) assert.equal(earnedStudentBadges(value).length, 0);
});

test('student profile never invents a badge unlock date', () => {
  for (const value of [undefined, '', 'not a date']) assert.equal(studentBadgeDate(value), null);
  const badges = earnedStudentBadges([{ id: 'unang_araw', unlockedAt: 'not a date' }]);
  assert.equal(badges[0].unlockedAt, undefined);
  assert.equal(typeof studentBadgeDate('2026-10-26T04:00:00Z'), 'string');
});

test('student profile labels translate server levels without changing unknown source values', () => {
  assert.equal(studentLevelLabel('Beginner'), 'Baguhan');
  assert.equal(studentLevelLabel('Intermediate'), 'Katamtaman');
  assert.equal(studentJourneyLabel('Advanced Reader'), 'Bihasang Mambabasa');
  assert.equal(studentJourneyLabel('Custom learner stage'), 'Custom learner stage');
});
