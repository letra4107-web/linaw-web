const test = require('node:test');
const assert = require('node:assert/strict');
const { checkAndAwardBadges } = require('../lib/badgeEngine');
const { loadCompletedContentIds } = require('../services/readingProfileData');
const { buildReadingProfile } = require('../services/readingInsights');
const { evaluateLevelPromotion } = require('../services/learningProgression');

function badgeClient(progress,{awardError=null,verifiedIds=[]}={}){
 const awards=[];return {awards,client:{from(){throw new Error('Unverified client totals must not be read for awards');},async rpc(name,args){assert.equal(name,'reconcile_verified_student_badges');assert.deepEqual(args,{p_student_id:'test-student'});awards.push(args);return{data:{awarded_badge_ids:verifiedIds},error:awardError};}}};
}
test('QA first completed activity cannot fabricate its badge from unverified totals',async()=>{const h=badgeClient({activities_completed:1,total_attempts:0,achievements:[]});assert.deepEqual(await checkAndAwardBadges(h.client,'test-student'),[]);assert.deepEqual(h.awards,[{p_student_id:'test-student'}]);});
test('QA existing badges and unmet thresholds do not reissue awards',async()=>{const h=badgeClient({activities_completed:4,achievements:[{id:'unang_hakbang'}]});assert.deepEqual(await checkAndAwardBadges(h.client,'test-student'),[]);assert.equal(h.awards.length,1);});
test('QA forged day-seven streak cannot unlock a new consistency badge',async()=>{for(const streak of [6,7]){const h=badgeClient({streak,achievements:[]});assert.deepEqual(await checkAndAwardBadges(h.client,'test-student'),[]);}});
test('QA badge storage failures propagate and verified awards return official IDs only',async()=>{const h=badgeClient({activities_completed:1},{awardError:new Error('persistence unavailable')});await assert.rejects(checkAndAwardBadges(h.client,'test-student'),/Verified badge service unavailable/);assert.deepEqual(await checkAndAwardBadges(badgeClient(null,{verifiedIds:['unang_bigkas']}).client,'test-student'),['unang_bigkas']);});
test('QA completion loader reads beyond the first database page and stops on the partial page', async () => {
  const ranges = [];
  const ids = await loadCompletedContentIds({ from: () => ({ select: () => ({ eq: (_column, id) => { assert.equal(id, 'test-student'); return { range: async (start, end) => { ranges.push([start, end]); return { data: Array.from({ length: start === 0 ? 500 : 1 }, (_, index) => ({ content_id: start + index })), error: null }; } }; } }) }) }, 'test-student');
  assert.equal(ids.length, 501);
  assert.equal(ids[500], 500);
  assert.deepEqual(ranges, [[0, 499], [500, 999]]);
});
test('QA completion loader fails on database error without returning a misleading partial report', async () => {
  const client = { from: () => ({ select: () => ({ eq: () => ({ range: async () => ({ data: null, error: new Error('unavailable') }) }) }) }) };
  await assert.rejects(loadCompletedContentIds(client, 'test-student'), /unavailable/);
});
test('QA empty reading profiles distinguish missing observations from a measured score', () => {
  const result = buildReadingProfile({ now: new Date('2026-10-17T00:00:00Z') });
  assert.equal(result.averageAccuracy, null);
  assert.equal(result.sessionCount, 0);
  assert.equal(result.needsIntervention, false);
  assert.equal(result.completedContentCount, 0);
});
test('QA learning promotion denies missing, incomplete, under-threshold and terminal-level paths', () => {
  const modules = Array.from({ length: 10 }, () => ({ state: 'completed' }));
  assert.equal(evaluateLevelPromotion({ effectiveLevel: 'Intermediate', modules, accuracySum: 800, totalAttempts: 10 }).eligible, true);
  for (const input of [{ effectiveLevel: 'Intermediate', modules: [] }, { effectiveLevel: 'Intermediate', modules: modules.slice(0, 9), accuracySum: 1000, totalAttempts: 10 }, { effectiveLevel: 'Intermediate', modules, accuracySum: 790, totalAttempts: 10 }, { effectiveLevel: 'Advanced', modules, accuracySum: 1000, totalAttempts: 10 }]) assert.equal(evaluateLevelPromotion(input).eligible, false);
});
