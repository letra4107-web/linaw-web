// Server-side mirror of mobile's src/services/achievementService.ts, adapted to the
// badge ids/xp/criteria actually shown in web's src/lib/badges.ts. Mobile computes and
// persists badges entirely client-side after specific actions (practice, module
// completion, word-of-day) -- web has no equivalent client-side flow, so this runs the
// same check server-side, right after the actions that can move the underlying stats,
// and merges (never removes) into child_progress.achievements, matching mobile's
// mergeAchievements() union-only semantics (backend/routes/progress.js).

// { id, xp, predicate(progress, stats) }. Ids/xp/order match src/lib/badges.ts exactly
// so the client-side catalog and criteria text stay in sync with what actually unlocks.
const BADGE_DEFS = [
  { id: 'unang_hakbang', xp: 20, predicate: (p) => (p.activities_completed ?? 0) >= 1 },
  { id: 'batang_mambabasa', xp: 30, predicate: (p) => (p.activities_completed ?? 0) >= 5 },
  { id: 'masigasig_na_mambabasa', xp: 40, predicate: (p) => (p.activities_completed ?? 0) >= 10 },
  { id: 'kampeon_sa_pagbasa', xp: 60, predicate: (p) => (p.activities_completed ?? 0) >= 25 },
  { id: 'dalubhasa_sa_pagbasa', xp: 80, predicate: (p) => (p.activities_completed ?? 0) >= 50 },
  { id: 'unang_bigkas', xp: 20, predicate: (p) => (p.total_attempts ?? 0) >= 1 },
  { id: 'malinaw_magsalita', xp: 30, predicate: (_p, s) => s.maxSingleAccuracy >= 90 },
  { id: 'tamang_bigkas', xp: 40, predicate: (_p, s) => s.perfectWordCount >= 5 },
  { id: 'boses_ng_tagumpay', xp: 60, predicate: (p) => (p.total_attempts ?? 0) >= 25 },
  {
    id: 'bigkas_champion',
    xp: 60,
    predicate: (p) => (p.total_attempts ?? 0) >= 10 && averageAccuracy(p) >= 90,
  },
  { id: 'unang_araw', xp: 20, predicate: (p) => (p.total_attempts ?? 0) >= 1 },
  { id: 'tuloy_tuloy', xp: 30, predicate: (p) => (p.streak ?? 0) >= 3 },
  { id: 'lingguhang_bayani', xp: 40, predicate: (p) => (p.streak ?? 0) >= 7 },
  { id: 'buwan_ng_pagsisikap', xp: 60, predicate: (p) => (p.streak ?? 0) >= 30 },
  { id: 'hindi_ako_susuko', xp: 30, predicate: (_p, s) => s.hasDifficultWordRetried },
  { id: 'lakas_ng_loob', xp: 40, predicate: (_p, s) => s.challengingWordsMastered >= 5 },
  {
    id: 'matalinong_mag_aaral',
    xp: 40,
    // Approximates mobile's baseline-vs-current improvement: needs a real baseline and
    // enough attempts since to be meaningful, not just a lucky first try.
    predicate: (p) => (p.total_attempts ?? 0) >= 5 && p.baseline_accuracy != null && averageAccuracy(p) - p.baseline_accuracy >= 20,
  },
  // patuloy_na_umuunlad ("umakyat sa susunod na antas") needs level-history tracking
  // this schema doesn't have yet -- intentionally left unimplemented rather than guessed.
];

const CASCADE_FIRST_BADGE_ID = 'aking_unang_tagumpay';
const CASCADE_ALL_BADGES_ID = 'alamat_ng_pagbasa';
const CASCADE_ALL_XP = 200;
const CASCADE_FIRST_XP = 25;

function averageAccuracy(progress) {
  const attempts = progress.total_attempts ?? 0;
  if (attempts <= 0) return 0;
  return (progress.accuracy_sum ?? 0) / attempts;
}

function computeStats(sessions) {
  const byWord = new Map();
  for (const s of sessions) {
    const key = (s.word || '').toLowerCase();
    if (!byWord.has(key)) byWord.set(key, []);
    byWord.get(key).push(s);
  }

  let maxSingleAccuracy = 0;
  let perfectWordCount = 0;
  let hasDifficultWordRetried = false;
  let challengingWordsMastered = 0;

  for (const rows of byWord.values()) {
    const accuracies = rows.map((r) => r.accuracy_percentage ?? 0);
    const maxForWord = Math.max(...accuracies, 0);
    maxSingleAccuracy = Math.max(maxSingleAccuracy, maxForWord);
    if (maxForWord >= 100) perfectWordCount += 1;
    if (rows.length >= 5) hasDifficultWordRetried = true;
    if (rows.length >= 3 && maxForWord >= 100) challengingWordsMastered += 1;
  }

  return { maxSingleAccuracy, perfectWordCount, hasDifficultWordRetried, challengingWordsMastered };
}

// Fetches current progress + practice-session stats, checks every not-yet-unlocked
// badge, merges newly-earned ones into child_progress.achievements (union, never
// removing existing ids -- same guarantee as mobile's mergeAchievements), and awards
// their XP. Returns the list of newly unlocked badge ids, or [] if nothing changed.
async function checkAndAwardBadges(supabaseAdmin, studentId) {
  const { data: progress, error: progressErr } = await supabaseAdmin
    .from('child_progress')
    .select('xp, streak, total_attempts, accuracy_sum, activities_completed, baseline_accuracy, achievements')
    .eq('child_id', studentId)
    .maybeSingle();
  if (progressErr) throw progressErr;
  if (!progress) return [];

  const existing = Array.isArray(progress.achievements) ? progress.achievements : [];
  const unlockedIds = new Set(existing.map((a) => a?.id).filter(Boolean));

  const { data: sessions, error: sessionsErr } = await supabaseAdmin
    .from('pronunciation_practice_sessions')
    .select('word, accuracy_percentage')
    .eq('student_id', studentId)
    .limit(1000);
  if (sessionsErr) throw sessionsErr;

  const stats = computeStats(sessions || []);

  const newlyUnlocked = [];
  for (const badge of BADGE_DEFS) {
    if (unlockedIds.has(badge.id)) continue;
    if (badge.predicate(progress, stats)) newlyUnlocked.push(badge);
  }

  // Cascade: "first badge ever" unlocks alongside whatever just triggered it.
  if (newlyUnlocked.length > 0 && !unlockedIds.has(CASCADE_FIRST_BADGE_ID)) {
    newlyUnlocked.push({ id: CASCADE_FIRST_BADGE_ID, xp: CASCADE_FIRST_XP });
  }

  if (newlyUnlocked.length === 0) return [];

  const nowUnlockedIds = new Set([...unlockedIds, ...newlyUnlocked.map((b) => b.id)]);
  // Cascade: "all other badges" unlocks once every regular badge (excluding itself) is in.
  const allOtherIds = [...BADGE_DEFS.map((b) => b.id), CASCADE_FIRST_BADGE_ID];
  if (allOtherIds.every((id) => nowUnlockedIds.has(id)) && !nowUnlockedIds.has(CASCADE_ALL_BADGES_ID)) {
    newlyUnlocked.push({ id: CASCADE_ALL_BADGES_ID, xp: CASCADE_ALL_XP });
  }

  const unlockedAt = new Date().toISOString();
  const mergedAchievements = [...existing, ...newlyUnlocked.map((b) => ({ id: b.id, unlockedAt }))];
  const bonusXp = newlyUnlocked.reduce((sum, b) => sum + b.xp, 0);
  const newXp = (progress.xp ?? 0) + bonusXp;

  const { error: updateErr } = await supabaseAdmin
    .from('child_progress')
    .update({ achievements: mergedAchievements, xp: newXp })
    .eq('child_id', studentId);
  if (updateErr) throw updateErr;

  return newlyUnlocked.map((b) => b.id);
}

module.exports = { checkAndAwardBadges };
