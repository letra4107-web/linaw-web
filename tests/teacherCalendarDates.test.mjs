import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './helpers/load-ts.mjs';
const { calendarMonthDays, shiftCalendarMonth, calendarDateLabel } = loadTs('src/pages/teacher/teacherCalendarDates.ts', {}, { Date, Intl });

test('month navigation crosses year and leap-year boundaries', () => {
  assert.equal(shiftCalendarMonth('2026-12', 1), '2027-01');
  assert.equal(shiftCalendarMonth('2027-01', -1), '2026-12');
  assert.equal(shiftCalendarMonth('2024-03', -1), '2024-02');
});

test('month cells contain complete Sunday-to-Saturday weeks and every real date', () => {
  for (const [month, count] of [['2024-02', 29], ['2026-02', 28], ['2026-08', 31], ['2026-11', 30]]) {
    const dates = Array.from(calendarMonthDays(month));
    assert.equal(dates.length % 7, 0);
    assert.equal(new Date(dates[0] + 'T00:00:00Z').getUTCDay(), 0);
    assert.equal(new Date(dates.at(-1) + 'T00:00:00Z').getUTCDay(), 6);
    assert.equal(dates.filter(day => day.startsWith(month)).length, count);
    assert.equal(new Set(dates).size, dates.length);
    for (let i = 1; i < dates.length; i++) assert.equal(Date.parse(dates[i]) - Date.parse(dates[i - 1]), 86_400_000);
  }
});

test('a selected date keeps its date-only label without a timezone day shift', () => {
  assert.equal(calendarDateLabel('2026-12-01', { day: 'numeric' }), '1');
  assert.equal(calendarDateLabel('2026-12-01', { year: 'numeric' }), '2026');
});
