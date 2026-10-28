// Executable atomic-RPC CONTRACT MODEL. It is deliberately not a database or a
// substitute for executing the review-only SQL against a measured schema.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { recordWordOfDayAttempt } = require('../../services/wordOfDayAttempt');
const { wordOfDayStreak } = require('../../lib/calendarDay');
const STUDENT = '11111111-1111-4111-8111-111111111111';
const LOG = '22222222-2222-4222-8222-222222222222';
const NOW = new Date('2026-10-21T04:00:00Z');

function createHarness(options = {}) {
  let state = { log: { id: LOG, child_id: STUDENT, word: 'bata', date: '2026-10-21', attempts: 0, accuracy: null, correct: null, xp_awarded: 0, completed_at: null, ...options.log }, progress: { xp: 100, streak: 4, longest_streak: 9, last_practice_date: '2026-10-20', ...options.progress }, receipts: {} };
  let tail = Promise.resolve();
  const controls = { failStage: options.failStage, loseAck: options.loseAck || false, rpcError: options.rpcError, badgeError: false, beforeRpc: null, malformed: false, missingProgress: false };
  const calls = { queries: [], rpc: [], badges: 0, credits: 0 };
  const client = {
    from(table) {
      calls.queries.push(table);
      const builder = { select() { return builder; }, eq() { return builder; }, maybeSingle: async () => ({ data: table === 'children' ? { id: STUDENT } : structuredClone(state.log), error: null }) };
      if (!['children','word_of_day_log'].includes(table)) throw new Error('Unexpected nontransactional data access');
      return builder;
    },
    async rpc(name, args) {
      calls.rpc.push({ name, args });
      if (name !== 'record_web_word_of_day_attempt') throw new Error('Unexpected RPC');
      const before = tail;
      let release; tail = new Promise(resolve => { release = resolve; });
      await before;
      try {
        if (controls.beforeRpc) controls.beforeRpc(state);
        if (controls.rpcError) return { data: null, error: controls.rpcError };
        if (controls.malformed) return { data: {}, error: null };
        const draft = structuredClone(state), log = draft.log, progress = draft.progress;
        const error = code => ({ data: null, error: { code, message: 'private synthetic database diagnostic' } });
        if (controls.missingProgress) return error('PT503');
        if (!log || log.child_id !== args.p_student_id || log.id !== args.p_log_id) return error('P0002');
        const receipt = draft.receipts[args.p_attempt_number];
        if (receipt) return { data: { ...receipt, xpAwarded: 0, originalXpAwarded: receipt.xpAwarded, replayed: true, newXp: progress.xp, newStreak: progress.streak }, error: null };
        if (log.completed_at || log.correct === true || log.xp_awarded !== 0 || log.word !== args.p_expected_word || log.date !== '2026-10-21' || args.p_attempt_number !== log.attempts + 1) return error('PT409');
        const isFinal = args.p_is_correct || args.p_attempt_number === 3;
        const reward = args.p_is_correct ? 25 : 0;
        if (reward) Object.assign(progress, { xp: progress.xp + reward, ...wordOfDayStreak(progress, NOW) });
        if (controls.failStage === 'after-xp') return error('XX001');
        Object.assign(log, { attempts: args.p_attempt_number, accuracy: args.p_accuracy });
        if (isFinal) Object.assign(log, { correct: args.p_is_correct, xp_awarded: reward, completed_at: NOW.toISOString() });
        if (controls.failStage === 'after-log') return error('XX001');
        const response = { success: true, isFinal, correct: isFinal ? args.p_is_correct : null, accuracy: args.p_accuracy, xpAwarded: reward, newXp: reward ? progress.xp : null, newStreak: reward ? progress.streak : null, replayed: false };
        draft.receipts[args.p_attempt_number] = response;
        if (controls.failStage === 'after-receipt') return error('XX001');
        state = draft; if (reward) calls.credits++;
        if (controls.loseAck) { controls.loseAck = false; return error('NETWORK_ACK_LOST'); }
        return { data: response, error: null };
      } finally { release(); }
    },
  };
  const awardBadges = async () => { calls.badges++; if (controls.badgeError) throw new Error('private badge outage'); return []; };
  let router;
  function loadRouter() {
    if (router) return router;
    const filename = path.resolve(__dirname, '../../routes/student.js'), actualRequire = createRequire(filename), module = { exports: {} };
    vm.runInNewContext(fs.readFileSync(filename, 'utf8'), { module, exports: module.exports, console: { error() {}, warn() {} }, require(name) {
      if (name === '../config/supabase') return { supabaseAdmin: client };
      if (name === '../middleware/auth') return { requireAuth(req, _res, next) { req.user = { id: 'synthetic-student' }; next(); }, requireRole: () => (_req, _res, next) => next() };
      if (name === '../services/wordOfDayAttempt') return { recordWordOfDayAttempt: (inputClient, input) => recordWordOfDayAttempt(inputClient, input, { awardBadges }) };
      return actualRequire(name);
    } }, { filename });
    router = module.exports; return router;
  }
  return { client, controls, calls, snapshot: () => structuredClone(state), awardBadges,
    attempt: (body = {}) => recordWordOfDayAttempt(client, { studentId: STUDENT, logId: LOG, attempts: 1, transcript: 'bata', ...body }, { awardBadges }),
    request: (body = {}) => new Promise((resolve, reject) => {
      const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(data) { resolve({ status: this.statusCode, body: data }); } };
      loadRouter().handle({ method: 'POST', url: '/word-of-day/attempt', headers: {}, body: { logId: LOG, attempts: 1, transcript: 'bata', ...body } }, res, reject);
    }),
  };
}
module.exports = { createHarness, STUDENT, LOG };
