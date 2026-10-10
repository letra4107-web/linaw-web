import test from 'node:test';
import assert from 'node:assert/strict';
import { progressMonth, progressNavigation } from '../src/pages/parent/parentProgressNavigation.ts';

test('opening a module preserves child and selected month', () => {
  const original = new URLSearchParams('child=child-1&month=2026-09&tab=activities&session=record-1');
  const next = progressNavigation(original, 'modules', { module: 'module-3' });
  assert.equal(next.get('child'), 'child-1');
  assert.equal(next.get('month'), '2026-09');
  assert.equal(next.get('module'), 'module-3');
  assert.equal(next.get('tab'), 'modules');
  assert.equal(next.has('session'), false);
  assert.equal(original.get('tab'), 'activities');
});

test('returning to the module list clears only detail state', () => {
  const next = progressNavigation(new URLSearchParams('child=child-1&month=2026-10&module=module-3'), 'modules');
  assert.equal(next.get('child'), 'child-1');
  assert.equal(next.get('month'), '2026-10');
  assert.equal(next.has('module'), false);
});

test('report tabs cannot accidentally retain a module filter', () => {
  const next = progressNavigation(new URLSearchParams('module=module-3&session=record-1'), 'results', { module: 'module-3', session: 'record-1' }, 'child-2');
  assert.equal(next.get('child'), 'child-2');
  assert.equal(next.get('tab'), 'results');
  assert.equal(next.has('module'), false);
  assert.equal(next.has('session'), false);
});

test('practice record navigation retains its intended record', () => {
  const next = progressNavigation(new URLSearchParams('month=2026-10'), 'activities', { session: 'record-1' });
  assert.equal(next.get('session'), 'record-1');
  assert.equal(next.get('month'), '2026-10');
});

test('month selection accepts valid values and safely defaults malformed query dates', () => {
  const today = new Date(2026, 9, 10);
  assert.equal(progressMonth(new URLSearchParams('month=2026-02'), today), '2026-02');
  for (const value of ['', '2026-00', '2026-13', '0000-01', '2026-1', 'nope']) {
    assert.equal(progressMonth(new URLSearchParams({ month: value }), today), '2026-10');
  }
});
