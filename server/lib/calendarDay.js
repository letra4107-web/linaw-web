const manilaDay = (date) => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(date);

function wordOfDayStreak(progress = {}, now = new Date()) {
  const today = manilaDay(now);
  const yesterday = manilaDay(new Date(now.getTime() - 86400000));
  const previous = progress.streak ?? 0;
  const streak = progress.last_practice_date === today ? Math.max(previous, 1)
    : progress.last_practice_date === yesterday ? previous + 1 : 1;
  return { streak, longest_streak: Math.max(progress.longest_streak ?? 0, streak), last_practice_date: today };
}

module.exports = { manilaDay, wordOfDayStreak };
