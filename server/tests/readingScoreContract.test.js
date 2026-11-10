const test=require('node:test'),assert=require('node:assert/strict');
const {recordProgressEvent}=require('../services/progressEvents');
const studentId='11111111-1111-4111-8111-111111111111',eventId='22222222-2222-4222-8222-222222222222',contentId='33333333-3333-4333-8333-333333333333';
function fixture(expected,{replayScore=null,channel='web'}={}){
 const calls=[];
 const client={
  from(table){const query={select(){return this;},eq(){return this;},async maybeSingle(){return {data:table==='student_progress_events'?{id:eventId,student_id:studentId,content_id:contentId,expected_text:expected,channel,source:'practice'}:{streak:2,longest_streak:2,last_practice_date:'2026-11-10'}};}};return query;},
  async rpc(name,params){calls.push({name,params});if(name==='progress_contract_version')return {data:{version:2}};
   return {data:{success:true,replayed:replayScore!==null,xpAwarded:0,newlyPersistedAchievementIds:[],progress:{child_id:studentId,xp:0,total_attempts:1,achievements:[]},baseReward:{rewardType:'content_practice',contentId,status:'not_applicable',xpAwarded:0},result:{attempt_id:eventId,accuracy:replayScore??params.p_accuracy,correct:params.p_is_correct}}};
  }
 };return {client,calls};
}
test('web scores use server-owned expected text for short units and phrases',async()=>{
 for(const [expected,transcript,accuracy]of [['bata','ba',50],['ilog','ilok',75],['Ang bata','Ang pusa',50],['Ako ay nagbabasa','Ako nagbabasa',67]]){
  const f=fixture(expected),result=await recordProgressEvent(f.client,studentId,eventId,{transcript});
  assert.equal(result.result.accuracy,accuracy);const call=f.calls.find(c=>c.name==='record_student_progress_event');assert.equal(call.params.p_accuracy,accuracy);assert.equal(call.params.p_expected_text,expected);
 }
});
test('replaying a historical attempt keeps its original stored score',async()=>{
 const f=fixture('bata',{replayScore:0});const result=await recordProgressEvent(f.client,studentId,eventId,{transcript:'ba'});
 assert.equal(f.calls.at(-1).params.p_accuracy,50);assert.equal(result.result.accuracy,0);assert.equal(result.replayed,true);assert.equal(result.xpAwarded,0);
});
test('the web refinement does not change legacy mobile scoring',async()=>{
 const f=fixture('bata',{channel:'mobile'});await recordProgressEvent(f.client,studentId,eventId,{transcript:'ba'});
 assert.notEqual(f.calls.at(-1).params.p_accuracy,50);
});
