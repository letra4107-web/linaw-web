import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeEarnedBadgeIds } from '../src/pages/parent/parentBadgeData.ts';

test('parent badges accept current atomic award records', () => {
  assert.deepEqual(normalizeEarnedBadgeIds([{ id: 'unang_hakbang', unlockedAt: '2026-10-10' }, { id: 'unang_bigkas' }]), ['unang_hakbang', 'unang_bigkas']);
});

test('parent badges accept legacy keyed achievements', () => {
  assert.deepEqual(normalizeEarnedBadgeIds({ unang_hakbang: { unlockedAt: '2026-10-10' }, tuloy_tuloy: true }), ['unang_hakbang', 'tuloy_tuloy']);
});

test('parent badges merge legacy strings without duplicate unlocks', () => {
  assert.deepEqual(normalizeEarnedBadgeIds(['unang_hakbang', 'unang_bigkas'], [{ id: 'unang_hakbang' }]), ['unang_hakbang', 'unang_bigkas']);
});

test('parent badges ignore absent or malformed records', () => {
  assert.deepEqual(normalizeEarnedBadgeIds(null, undefined, 3, '', [null, {}, { id: 1 }, ' ', { id: '' }]), []);
});
