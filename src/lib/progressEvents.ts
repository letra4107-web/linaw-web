import {validBaseReward,type BaseReward} from './progressReward';
import {api} from './api';
import {supabase} from './supabaseClient';
type Input={contentId:string;transcript:string;source:'practice'|'assessment';assessmentAttemptId?:string;assessmentItemId?:string};
type Pending={eventId:string;body:{transcript:string;durationSeconds:null}};
type Response={baseReward:BaseReward;success:boolean;result:{attempt_id:string;accuracy:number;correct:boolean};progress:{xp:number;total_attempts:number};xpAwarded:number;replayed:boolean;newlyPersistedAchievementIds:string[]};
const active=new Map<string,{answer:string;promise:Promise<Response>}>();

// Keep the exact pending request through reloads and ambiguous network failures.
export async function recordVerifiedAnswer(input:Input){
 const {data,error}=await supabase.auth.getSession();
 if(error||!data.session?.user.id)throw new Error('Mag-sign in muli upang ma-save ang sagot.');
 const key=`linawletra.progress.v1.${data.session.user.id}.${input.contentId}.${input.source}.${input.assessmentAttemptId||''}.${input.assessmentItemId||''}`;
 const existing=active.get(key);if(existing){
  if(existing.answer!==input.transcript)throw Object.assign(new Error('I-save muna ang nakabinbing sagot gamit ang subukan muli.'),{status:409,pendingTranscript:existing.answer});
  return existing.promise;
 }
 const promise=(async()=>{
  const saved=sessionStorage.getItem(key) || localStorage.getItem(key);
  let pending:Pending|null=saved?JSON.parse(saved):null;
  if(pending&&pending.body.transcript!==input.transcript)throw Object.assign(new Error('I-save muna ang nakabinbing sagot gamit ang subukan muli.'),{pendingTranscript:pending.body.transcript});
  if(!pending){
   const ticket=await api<{eventId:string;expiresAt:string}>('/student/progress/events/start',{auth:true,method:'POST',body:{contentId:input.contentId,source:input.source,...(input.source==='practice'?{newAttempt:true}:{}),...(input.source==='assessment'?{assessmentAttemptId:input.assessmentAttemptId,assessmentItemId:input.assessmentItemId}:{})}});
   if(!ticket.eventId||!Number.isFinite(Date.parse(ticket.expiresAt)))throw new Error('Hindi makumpirma ang pagsubok. Subukan muli.');
   pending={eventId:ticket.eventId,body:{transcript:input.transcript,durationSeconds:null}};
   localStorage.setItem(key,JSON.stringify(pending));
  }
  try{
   const result=await api<Response>(`/student/progress/events/${pending.eventId}`,{auth:true,method:'POST',body:pending.body});
   if(result.success!==true||!Number.isSafeInteger(result.progress?.xp)||!Number.isSafeInteger(result.progress?.total_attempts)||!result.result?.attempt_id||typeof result.replayed!=='boolean'||!Array.isArray(result.newlyPersistedAchievementIds)||!validBaseReward(result.baseReward,input.contentId,result.xpAwarded,result.replayed))throw new Error('Hindi pa nakumpirma ang pag-save. I-save muli ang parehong sagot.');
   localStorage.removeItem(key);sessionStorage.removeItem(key);return result;
  }catch(caught){if((caught as Error&{status?:number}).status===410){localStorage.removeItem(key);sessionStorage.removeItem(key);}throw caught;}
 })();
 active.set(key,{answer:input.transcript,promise});try{return await promise;}finally{active.delete(key);}
}
