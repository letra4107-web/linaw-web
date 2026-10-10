import test from 'node:test';
import assert from 'node:assert/strict';
import { paginateModules } from '../src/pages/parent/parentModulePagination.ts';

const modules = Array.from({ length: 13 }, (_, index) => ({ id: index + 1 }));

test('module table defaults to five rows with a correct visible range', () => {
  const result = paginateModules(modules, 1);
  assert.deepEqual(result.rows, modules.slice(0, 5));
  assert.equal(result.page, 1);
  assert.equal(result.pageCount, 3);
  assert.equal(result.start, 1);
  assert.equal(result.end, 5);
});

test('next and last pages show distinct rows and the partial final range', () => {
  const middle = paginateModules(modules, 2);
  const last = paginateModules(modules, 3);
  assert.deepEqual(middle.rows, modules.slice(5, 10));
  assert.deepEqual(last.rows, modules.slice(10));
  assert.equal(last.start, 11);
  assert.equal(last.end, 13);
});

test('changing page size shows the selected number of modules', () => {
  const result = paginateModules(modules, 1, 10);
  assert.deepEqual(result.rows, modules.slice(0, 10));
  assert.equal(result.pageCount, 2);
  assert.equal(result.end, 10);
});

test('a shrinking report clamps the page instead of producing an empty page', () => {
  const result = paginateModules(modules.slice(0, 6), 3);
  assert.equal(result.page, 2);
  assert.equal(result.pageCount, 2);
  assert.deepEqual(result.rows, [modules[5]]);
  assert.equal(result.start, 6);
  assert.equal(result.end, 6);
});

test('empty reports and invalid page requests remain in a valid state', () => {
  const empty = paginateModules([], 4);
  assert.equal(empty.page, 1);
  assert.equal(empty.pageCount, 1);
  assert.deepEqual(empty.rows, []);
  assert.equal(empty.start, 0);
  assert.equal(empty.end, 0);
  assert.equal(paginateModules(modules, -1).page, 1);
  assert.equal(paginateModules(modules, Infinity).page, 1);
  assert.equal(paginateModules(modules, 100).page, 3);
  assert.equal(paginateModules(modules, 1, NaN).end, 5);
});

test('large reports retain first, last, and adjacent page buttons', () => {
  const rows = Array.from({ length: 500 }, (_, index) => index);
  assert.deepEqual(paginateModules(rows, 50).pages, [1, 49, 50, 51, 100]);
  assert.deepEqual(paginateModules(rows, 1).pages, [1, 2, 100]);
  assert.deepEqual(paginateModules(rows, 100).pages, [1, 99, 100]);
});
