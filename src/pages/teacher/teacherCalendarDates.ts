/** Calendar arithmetic uses UTC date-only values; displayed times remain Manila time. */
export function shiftCalendarMonth(month: string, amount: number): string {
  const [year, number] = month.split('-').map(Number);
  return new Date(Date.UTC(year, number - 1 + amount, 1)).toISOString().slice(0, 7);
}

export function calendarMonthDays(month: string): string[] {
  const [year, number] = month.split('-').map(Number);
  const first = new Date(Date.UTC(year, number - 1, 1));
  const days = new Date(Date.UTC(year, number, 0)).getUTCDate();
  const count = Math.ceil((first.getUTCDay() + days) / 7) * 7;
  return Array.from({ length: count }, (_, index) =>
    new Date(Date.UTC(year, number - 1, index - first.getUTCDay() + 1)).toISOString().slice(0, 10));
}

export function calendarDateLabel(value: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('fil-PH', { ...options, timeZone: 'UTC' }).format(new Date(value + 'T00:00:00Z'));
}
