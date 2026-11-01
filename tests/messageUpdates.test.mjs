/* oxlint-disable react-hooks/rules-of-hooks -- isolated hook lifecycle harness */
import test from 'node:test';
import assert from 'node:assert/strict';
import {loadTs} from './helpers/load-ts.mjs';

function subscribe(role,user={id:'viewer'}){
 let cleanup;const events=[],invalidated=[],removed=[];
 const channel={on(kind,filter,callback){events.push({kind,filter,callback});return this;},subscribe(callback){this.status=callback;return this;}};
 const {useMessageUpdates}=loadTs('src/lib/messages/useMessageUpdates.ts',{
  react:{useEffect:fn=>{cleanup=fn();}},
  '@tanstack/react-query':{useQueryClient:()=>({invalidateQueries:query=>{invalidated.push(query.queryKey);return Promise.resolve();}})},
  '../supabaseClient':{supabase:{channel:()=>channel,removeChannel:value=>{removed.push(value);return Promise.resolve();}}},
  '../auth/AuthContext':{useAuth:()=>({user})},
 });
 useMessageUpdates(role);
 return {events,invalidated,removed,channel,cleanup:()=>cleanup?.()};
}
for(const role of ['parent','teacher'])test(`${role} message updates subscribe only to their participant ID and refresh on reconnect`,()=>{
 const h=subscribe(role);
 assert.equal(h.events.find(e=>e.filter.table==='teacher_messages').filter.filter,`${role}_id=eq.viewer`);
 assert.equal(h.events.find(e=>e.filter.table==='parent_teacher_replies').filter.filter,`${role}_id=eq.viewer`);
 h.events.find(e=>e.filter.table==='parent_teacher_replies').callback();
 assert.ok(h.invalidated.some(k=>k[0]===(role==='parent'?'parent-message-replies':'teacher-parent-message-replies')));
 assert.ok(h.invalidated.some(k=>k[0]==='message-profile-photos'));
 h.invalidated.length=0;h.channel.status('SUBSCRIBED');assert.ok(h.invalidated.length>0);
 h.cleanup();assert.equal(h.removed[0],h.channel);
});
test('signed-out viewers do not open a message subscription',()=>{
 const h=subscribe('parent',null);assert.equal(h.events.length,0);h.cleanup();
});
