import { supabase } from './supabaseClient';

export function getAsiaManilaDate(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export interface WordOfDayLog {
  id: string;
  child_id: string;
  word: string;
  date: string;
  correct: boolean | null;
  attempts: number;
  accuracy: number | null;
  xp_awarded: number;
  completed_at: string | null;
}

const MAX_ATTEMPTS = 3;
const BONUS_XP = 25;

export { MAX_ATTEMPTS, BONUS_XP };

async function fetchTodayRow(childId: string, date: string): Promise<WordOfDayLog | null> {
  const { data, error } = await supabase
    .from('word_of_day_log')
    .select('id, child_id, word, date, correct, attempts, accuracy, xp_awarded, completed_at')
    .eq('child_id', childId)
    .eq('date', date)
    .maybeSingle();
  if (error) throw error;
  return data as WordOfDayLog | null;
}

/** Deterministic per-child-per-day pick from the level-appropriate word bank, matching mobile's hash. */
export async function getOrCreateWordOfDay(childId: string, level: string): Promise<WordOfDayLog | null> {
  const date = getAsiaManilaDate();
  const existing = await fetchTodayRow(childId, date);
  if (existing) return existing;

  const { data: words, error: wordsErr } = await supabase
    .from('words')
    .select('id, word')
    .eq('level', level.toLowerCase())
    .limit(500);
  if (wordsErr) throw wordsErr;
  if (!words || words.length === 0) return null;

  const key = `${childId}-${date}`;
  const index = Math.abs([...key].reduce((sum, ch) => sum + ch.charCodeAt(0), 0)) % words.length;
  const chosen = words[index];

  const { data: upserted, error: upsertErr } = await supabase
    .from('word_of_day_log')
    .upsert(
      { child_id: childId, word: chosen.word, date, attempts: 0 },
      { onConflict: 'child_id,date', ignoreDuplicates: true },
    )
    .select('id, child_id, word, date, correct, attempts, accuracy, xp_awarded, completed_at')
    .maybeSingle();
  if (upsertErr) throw upsertErr;
  if (upserted) return upserted as WordOfDayLog;

  return fetchTodayRow(childId, date);
}
