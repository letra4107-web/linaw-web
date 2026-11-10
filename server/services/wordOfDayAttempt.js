const { compareReading } = require('../lib/readingAccuracy');
const { isUuid, isBoundedString } = require('../lib/validation');
const { checkAndAwardBadges } = require('../lib/badgeEngine');

const MAX_ATTEMPTS = 3;
const REWARD_XP = 25;

function failure(status, publicMessage) {
  return Object.assign(new Error(publicMessage), { status, publicMessage });
}
function rpcFailure(error) {
  if (['PT409', '40001', '40P01'].includes(error?.code)) return failure(409, "Nagbago ang nakatalang progreso. Buksan muli ang pahina at ulitin ang parehong pagsubok.");
  if (error?.code === '42501') return failure(403, "Wala kang pahintulot na tapusin ang gawaing ito.");
  if (error?.code === 'P0002') return failure(404, "Hindi makita ang salita ngayong araw para sa mag-aaral na ito.");
  // No compatibility fallback: separate HTTP writes cannot emulate a transaction.
  return failure(503, "Hindi magamit ang serbisyo ng pang-araw-araw na gantimpala. Ulitin ang parehong pagsubok mamaya.");
}
function validResult(data) {
  return data?.success === true && typeof data.isFinal === 'boolean'
    && (data.isFinal ? typeof data.correct === 'boolean' : data.correct === null)
    && [0, REWARD_XP].includes(data.xpAwarded)
    && Number.isInteger(data.accuracy) && data.accuracy >= 0 && data.accuracy <= 100
    && (data.newXp === null || Number.isInteger(data.newXp) && data.newXp >= 0)
    && (data.newStreak === null || Number.isInteger(data.newStreak) && data.newStreak >= 0)
    && typeof data.replayed === 'boolean'
    && (data.xpAwarded === 0 || data.isFinal && data.correct && !data.replayed)
    && (!data.correct || data.newXp !== null && data.newStreak !== null);
}

async function recordWordOfDayAttempt(client, { studentId, logId, attempts, transcript }, { awardBadges = checkAndAwardBadges } = {}) {
  if (!isUuid(logId)) throw failure(400, "Kailangan ang wastong ID ng tala ng salita.");
  if (!Number.isInteger(attempts) || attempts < 1 || attempts > MAX_ATTEMPTS) throw failure(400, "Ang bilang ng pagsubok ay dapat buong bilang mula 1 hanggang 3.");
  if (!isBoundedString(transcript, 2000, { allowEmpty: false })) throw failure(400, "Kailangan munang bigkasin ang iyong sagot.");

  let lookup;
  try {
    lookup = await client.from('word_of_day_log').select('id, child_id, word').eq('id', logId).eq('child_id', studentId).maybeSingle();
  } catch { throw rpcFailure(); }
  if (!lookup || lookup.error) throw rpcFailure(lookup?.error);
  const log = lookup.data;
  if (!log || log.child_id !== studentId) throw failure(404, "Hindi makita ang salita ngayong araw para sa mag-aaral na ito.");
  if (typeof log.word !== 'string' || !log.word.trim()) throw rpcFailure();
  const score = compareReading(log.word, transcript);

  let result;
  try {
    result = await client.rpc('record_web_word_of_day_attempt', {
      p_student_id: studentId, p_log_id: logId, p_expected_word: log.word,
      p_attempt_number: attempts, p_accuracy: score.accuracy, p_is_correct: score.correct,
    });
  } catch { throw rpcFailure(); }
  if (result?.error) throw rpcFailure(result.error);
  if (!validResult(result?.data)) throw rpcFailure();

  // The core completion/reward/streak transaction has already committed.
  // A badge outage must not turn that success into a failed activity. Replays
  // retry the separately idempotent badge award without repeating the 25 XP.
  let newlyUnlockedBadges = [], badgesPending = false;
  if (result.data.isFinal && result.data.correct) {
    try { newlyUnlockedBadges = await awardBadges(client, studentId); }
    catch { badgesPending = true; }
  }
  return { ...result.data, newlyUnlockedBadges, badgesPending };
}

module.exports = { recordWordOfDayAttempt, MAX_ATTEMPTS, REWARD_XP };
