const test = require('node:test');
const assert = require('node:assert/strict');
process.env.SUPABASE_URL = 'http://127.0.0.1:9';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'isolated-word-of-day-test';
const { createHarness } = require('./helpers/wordOfDayHarness');

for (const failStage of ['after-xp','after-log','after-receipt']) {
  test(`WOD contract model ${failStage} failure leaves completion/reward/streak unchanged; retry succeeds once`, async () => {
    const h = createHarness({ failStage }), before = h.snapshot();
    const failed = await h.request(); assert.equal(failed.status, 503);
    assert.deepEqual(h.snapshot(), before);
    assert.doesNotMatch(JSON.stringify(failed.body), /private|XX001/);
    h.controls.failStage = null;
    const success = await h.request(), retry = await h.request();
    assert.equal(success.status, 200); assert.equal(success.body.xpAwarded, 25);
    assert.equal(retry.status, 200); assert.equal(retry.body.xpAwarded, 0); assert.equal(retry.body.replayed, true);
    assert.equal(h.snapshot().progress.xp, 125); assert.equal(h.snapshot().progress.streak, 5);
    assert.equal(h.calls.credits, 1);
  });
}
test('WOD actual route retries a lost commit acknowledgement without duplicating XP', async () => {
  const h = createHarness({ loseAck: true });
  assert.equal((await h.request()).status, 503);
  assert.equal(h.snapshot().progress.xp, 125);
  const retry = await h.request();
  assert.equal(retry.status, 200); assert.equal(retry.body.xpAwarded, 0);
  assert.equal(h.calls.credits, 1);
});
test('WOD concurrent request model returns one credit across twenty actual-router calls', async () => {
  const h = createHarness();
  const results = await Promise.all(Array.from({ length: 20 }, () => h.request()));
  assert.ok(results.every(result => result.status === 200));
  assert.equal(results.reduce((total, result) => total + result.body.xpAwarded, 0), 25);
  assert.equal(results.filter(result => result.body.replayed).length, 19);
  assert.equal(h.calls.credits, 1); assert.equal(h.snapshot().progress.streak, 5);
});
test('WOD partial attempts and repeated nonfinal requests cannot consume extra attempts', async () => {
  const h = createHarness();
  const first = await h.attempt({ transcript: 'pusa' }), replay = await h.attempt({ transcript: 'pusa' });
  assert.equal(first.isFinal, false); assert.equal(replay.replayed, true);
  assert.equal(h.snapshot().log.attempts, 1);
  await h.attempt({ attempts: 2, transcript: 'pusa' });
  const third = await h.attempt({ attempts: 3, transcript: 'pusa' });
  assert.equal(third.isFinal, true); assert.equal(third.correct, false);
  assert.equal(third.xpAwarded, 0); assert.equal(h.snapshot().progress.streak, 4);
});
test('WOD cannot skip attempt order or credit a legacy completed log without a receipt', async () => {
  assert.equal((await createHarness().request({ attempts: 3 })).status, 409);
  for (const log of [{ completed_at: '2026-10-21T02:00:00Z', correct: true, xp_awarded: 25 }, { xp_awarded: 25 }]) {
    const legacy = createHarness({ log });
    assert.equal((await legacy.request()).status, 409); assert.equal(legacy.snapshot().progress.xp, 100);
  }
});
test('WOD badge failure preserves core success and is retried without repeating the daily reward', async () => {
  const h = createHarness(); h.controls.badgeError = true;
  const result = await h.request();
  assert.equal(result.status, 200); assert.equal(result.body.badgesPending, true);
  h.controls.badgeError = false;
  const retry = await h.request();
  assert.equal(retry.status, 200); assert.equal(retry.body.badgesPending, false);
  assert.equal(h.calls.credits, 1); assert.equal(h.calls.badges, 2);
});
for (const [date, expected] of [['2026-10-21',4], ['2026-10-20',5], ['2026-10-18',1]]) {
  test(`WOD streak contract ${date} remains consistent on replay`, async () => {
    const h = createHarness({ progress: { last_practice_date: date } });
    await h.attempt(); await h.attempt();
    assert.equal(h.snapshot().progress.streak, expected); assert.equal(h.snapshot().progress.longest_streak, 9);
  });
}
test('WOD absent RPC fails closed without legacy split writes', async () => {
  const h = createHarness({ rpcError: { code: 'PGRST202' } }), before = h.snapshot();
  assert.equal((await h.request()).status, 503); assert.deepEqual(h.snapshot(), before);
  assert.deepEqual(h.calls.queries, ['children','word_of_day_log']);
});
test('WOD authoritative scoring ignores forged reward/correctness fields and validates ownership', async () => {
  const h = createHarness();
  const result = await h.request({ transcript: 'pusa', correct: true, accuracy: 100, xpAwarded: 999 });
  assert.equal(result.status, 200); assert.equal(result.body.xpAwarded, 0);
  assert.equal(h.calls.rpc[0].args.p_is_correct, false);
  const other = createHarness({ log: { child_id: '33333333-3333-4333-8333-333333333333' } });
  assert.equal((await other.request()).status, 404); assert.equal(other.calls.rpc.length, 0);
});
test('WOD stale scored word, missing progress and malformed RPC response fail safely', async () => {
  const stale = createHarness(); stale.controls.beforeRpc = state => { state.log.word = 'aso'; };
  assert.equal((await stale.request()).status, 409); assert.equal(stale.calls.credits, 0);
  const missing = createHarness(); missing.controls.missingProgress = true;
  assert.equal((await missing.request()).status, 503); assert.equal(missing.snapshot().log.completed_at, null);
  const bad = createHarness(); bad.controls.malformed = true;
  assert.equal((await bad.request()).status, 503);
});
test('WOD rejects invalid/empty/boundary inputs before calling persistence', async () => {
  for (const body of [{ logId: 'invalid' }, { attempts: 0 }, { attempts: 4 }, { attempts: null }, { attempts: '1' }, { transcript: '' }, { transcript: null }, { transcript: 'a'.repeat(2001) }]) {
    const h = createHarness(); await assert.rejects(h.attempt(body), error => error.status === 400);
    assert.equal(h.calls.rpc.length, 0); assert.equal(h.calls.queries.length, 0);
  }
});
