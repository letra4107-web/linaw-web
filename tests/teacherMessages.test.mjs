import test from 'node:test';
import assert from 'node:assert/strict';
import {loadTs} from './helpers/load-ts.mjs';
const {missingAttachmentColumns}=loadTs('src/lib/messages/replies.ts');
const {teacherConversation,loadTeacherParentReplies}=loadTs('src/lib/messages/teacherMessages.ts',{'./replies':{missingAttachmentColumns}});
const plain=value=>JSON.parse(JSON.stringify(value));
const row=(id,parent_id='p',created_at='2026-10-30T08:00:00Z')=>({id,parent_id,created_at,child_id:'c',message:id,read:false});
test('teacher conversation combines follow-up sends and replies for only the selected parent',()=>{
 const sent=[row('a'),row('c','other'),row('b','p','2026-10-31T08:00:00Z')],replies=[{...row('r','p','2026-10-30T09:00:00Z'),teacher_message_id:'a',attachment_name:'basa.pdf',attachment_path:'p/basa.pdf'}];
 const result=teacherConversation(sent,replies,'p');assert.deepEqual(plain(result.map(item=>[item.id,item.author])),[['a','teacher'],['r','parent'],['b','teacher']]);assert.equal(result[1].attachment_name,'basa.pdf');assert.equal(sent[0].author,undefined);
});
test('teacher conversation handles empty history and ties deterministically',()=>{
 assert.deepEqual(plain(teacherConversation([],[],'p')),[]);assert.deepEqual(plain(teacherConversation([row('b'),row('a')],[],'p').map(item=>item.id)),['a','b']);
});
function client(results){const calls=[];return {calls,from(table){const call={table};calls.push(call);return {select(fields){call.fields=fields;return this;},eq(key,value){call.filter=[key,value];return this;},order(key,value){call.order=[key,value];return Promise.resolve(results.shift());}};}};}
test('teacher replies preserve metadata and scope their read to the authenticated teacher',async()=>{
 const reply={...row('r'),attachment_name:'basa.pdf',attachment_path:'p/basa.pdf'};const c=client([{data:[reply],error:null}]);assert.deepEqual(plain(await loadTeacherParentReplies(c,'teacher-1')),[reply]);assert.deepEqual(c.calls[0].filter,['teacher_id','teacher-1']);assert.match(c.calls[0].fields,/parent_id.*attachment_name/);
});
test('legacy reply schema falls back once without dropping parent and thread identifiers',async()=>{
 const reply={...row('r'),teacher_message_id:'a'};const c=client([{data:null,error:{code:'42703',message:'column attachment_name does not exist'}},{data:[reply],error:null}]);assert.deepEqual(plain(await loadTeacherParentReplies(c,'teacher-1')),[{...reply,attachment_name:null,attachment_path:null}]);assert.equal(c.calls.length,2);assert.deepEqual(c.calls[1].filter,['teacher_id','teacher-1']);assert.equal(c.calls[1].fields.includes('attachment_name'),false);
});
test('permission and transport errors remain errors rather than fake empty conversations',async()=>{
 const error={code:'42501',message:'denied'};const c=client([{data:null,error}]);await assert.rejects(loadTeacherParentReplies(c,'t'),e=>e===error);assert.equal(c.calls.length,1);
 const c2=client([{data:null,error:{code:'42703',message:'attachment_path missing'}},{data:null,error}]);await assert.rejects(loadTeacherParentReplies(c2,'t'),e=>e===error);
});
