import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './helpers/load-ts.mjs';

const { loadMessageReplies } = loadTs('src/lib/messages/replies.ts');
const plain = (value) => JSON.parse(JSON.stringify(value));
function client(results) {
 const calls=[];
 return {calls,from(table){const call={table};calls.push(call);return {select(fields){call.fields=fields;return this;},eq(key,value){call.filter=[key,value];return this;},in(key,value){call.filter=[key,value];return this;},order(){return Promise.resolve(results.shift());}};}};
}
test('deployed mobile replies load without optional attachment columns',async()=>{
 const row={id:'r1',message:'Salamat po',created_at:'2026-10-30'};
 const db=client([{error:{code:'42703',message:'column parent_teacher_replies.attachment_name does not exist'}},{data:[row],error:null}]);
 assert.deepEqual(plain(await loadMessageReplies(db,'thread-1')),{attachmentsAvailable:false,rows:[{...row,attachment_name:null,attachment_path:null}]});
 assert.deepEqual(db.calls.map(c=>c.filter),[['teacher_message_id','thread-1'],['teacher_message_id','thread-1']]);
 assert.equal(db.calls[1].fields,'id, message, created_at');
});
test('updated schemas retain stored attachment names and paths',async()=>{
 const row={id:'r1',message:'Narito po',attachment_name:'basa.pdf',attachment_path:'parent/file.pdf'};
 const db=client([{data:[row],error:null}]);
 assert.deepEqual(plain(await loadMessageReplies(db,'t1')),{attachmentsAvailable:true,rows:[row]});
 assert.equal(db.calls.length,1);
});

test('conversation replies include every follow-up message and preserve attachments',async()=>{
 const rows=[{id:'r1',message:'Unang reply',attachment_name:null,attachment_path:null},{id:'r2',message:'Follow-up',attachment_name:'basa.pdf',attachment_path:'parent/basa.pdf'}];
 const db=client([{data:rows,error:null}]);
 assert.deepEqual(plain(await loadMessageReplies(db,['t1','t2'])),{attachmentsAvailable:true,rows});
 assert.deepEqual(db.calls[0].filter,['teacher_message_id',['t1','t2']]);
});

test('legacy attachment fallback keeps the complete conversation scope',async()=>{
 const db=client([{error:{code:'42703',message:'missing attachment_name'}},{data:[],error:null}]);
 await loadMessageReplies(db,['t1','t2']);
 assert.deepEqual(db.calls.map(c=>c.filter),[['teacher_message_id',['t1','t2']],['teacher_message_id',['t1','t2']]]);
});

test('empty conversations cannot issue an unscoped replies read',async()=>{
 const db=client([]);
 assert.deepEqual(plain(await loadMessageReplies(db,[])),{attachmentsAvailable:true,rows:[]});
 assert.equal(db.calls.length,0);
});
test('schema-cache missing attachment fields also use text compatibility',async()=>{
 const db=client([{error:{code:'PGRST204',message:"Could not find the 'attachment_path' column in the schema cache"}},{data:[],error:null}]);
 assert.deepEqual(plain(await loadMessageReplies(db,'t1')),{attachmentsAvailable:false,rows:[]});
});
test('network, permission and missing-table failures are not disguised as empty replies',async()=>{
 for(const error of [{code:'42501',message:'permission denied'},{code:'PGRST205',message:'missing table'},{code:'42703',message:'missing message column'},{message:'fetch failed'}]){
  const db=client([{error}]);await assert.rejects(loadMessageReplies(db,'t1'),e=>e===error);assert.equal(db.calls.length,1);
 }
 const fallback={code:'42501',message:'permission denied'};
 const db=client([{error:{code:'42703',message:'missing attachment_name'}},{error:fallback}]);
 await assert.rejects(loadMessageReplies(db,'t1'),e=>e===fallback);
});
