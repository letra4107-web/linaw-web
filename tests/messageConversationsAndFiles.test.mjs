import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './helpers/load-ts.mjs';
const { parentConversations } = loadTs('src/lib/messages/parentConversations.ts');
const { messageLinkParts } = loadTs('src/lib/messages/messageLinks.ts', {}, { URL });
const { missingAttachmentColumns } = loadTs('src/lib/messages/replies.ts');
const { loadTeacherMessages, validateMessageAttachment } = loadTs('src/lib/messages/teacherAttachments.ts', { './replies': { missingAttachmentColumns } });
const plain = value => JSON.parse(JSON.stringify(value));
const row = (id, teacher_id='teacher-a', child_id='child-a', created_at='2026-11-01T08:00:00Z') => ({id,teacher_id,child_id,parent_id:'parent-a',message:id,read:false,created_at,children:{name:child_id}});

test('three follow-ups about siblings produce one teacher conversation with complete history', () => {
  const input = [row('old'), row('new','teacher-a','child-b','2026-11-01T09:00:00Z'), row('middle')];
  const result = parentConversations(input);
  assert.equal(result.length,1); assert.equal(result[0].latest.id,'new');
  assert.deepEqual(plain(result[0].children.map(child=>child.id)),['child-b','child-a']);
  assert.equal(result[0].messages.length,3); assert.equal(input[0].id,'old');
});
test('conversation identity and unread counts remain independent for different teachers', () => {
  const input = [row('a'),row('b','teacher-b'),{...row('c'),read:true}];
  const result = parentConversations(input);
  assert.equal(result.length,2);assert.deepEqual(plain(result.find(group=>group.teacherId==='teacher-a').unreadIds),['a']);
  assert.deepEqual(plain(parentConversations([])),[]);
});
test('announcement filters count conversations while preserving mixed history and duplicate IDs', () => {
  const message={...row('announcement'),message:'Paalala: may reading session.'};
  const result=parentConversations([row('normal'),message,message]);
  assert.equal(result.length,1);assert.equal(result[0].hasAnnouncements,true);assert.equal(result[0].hasTeacherMessages,true);assert.equal(result[0].messages.length,2);
});
test('links preserve Tagalog text, newlines, URL parameters and trailing punctuation', () => {
  const text='Basahin: https://example.test/aralin?a=1&b=2.\nSalamat! www.example.test/basa';
  const parts=messageLinkParts(text);assert.equal(parts.map(part=>part.text).join(''),text);
  assert.deepEqual(plain(parts.filter(part=>part.href).map(part=>part.href)),['https://example.test/aralin?a=1&b=2','https://www.example.test/basa']);
});
test('message link parsing leaves HTML, unsafe schemes, credentials and invalid addresses as text', () => {
  for(const text of ['javascript:alert(1)','data:text/html,<script>alert(1)</script>','<img src=x onerror=alert(1)>','https://user:password@example.test','https://']) {
    assert.equal(messageLinkParts(text).some(part=>part.href),false);assert.equal(messageLinkParts(text).map(part=>part.text).join(''),text);
  }
  assert.equal(messageLinkParts('(https://example.test/basa_(aklat)).').find(part=>part.href).text,'https://example.test/basa_(aklat)');
});
function client(results) { const calls=[];return {calls,from(table){const call={table,filters:[]};calls.push(call);return {select(fields){call.fields=fields;return this;},eq(key,value){call.filters.push([key,value]);return this;},order(){return Promise.resolve(results.shift());}};}}; }
test('teacher file reads retain attachment metadata and explicit account scoping',async()=>{
  const message={...row('a'),attachment_name:'basa.pdf',attachment_path:'teacher-a/file.pdf'};
  const db=client([{data:[message],error:null}]);assert.deepEqual(plain(await loadTeacherMessages(db,{teacherId:'teacher-a'})),{attachmentsAvailable:true,rows:[message]});assert.deepEqual(db.calls[0].filters,[['teacher_id','teacher-a']]);
});
test('legacy teacher schemas retain text and scope while disabling only attachments',async()=>{
  const db=client([{error:{code:'PGRST204',message:'attachment_path not found'}},{data:[row('a')],error:null}]);
  const result=await loadTeacherMessages(db,{parentId:'parent-a',includeChildren:true});assert.equal(result.attachmentsAvailable,false);assert.equal(result.rows.length,1);assert.equal(db.calls.length,2);assert.deepEqual(db.calls[1].filters,[['parent_id','parent-a']]);assert.match(db.calls[1].fields,/children\(name\)/);
});
test('permission failures and unscoped teacher message reads cannot masquerade as empty lists',async()=>{
  const error={code:'42501',message:'denied'};const db=client([{error}]);await assert.rejects(loadTeacherMessages(db,{parentId:'parent-a'}),value=>value===error);assert.equal(db.calls.length,1);await assert.rejects(loadTeacherMessages(client([]),{}));
});
const file=(name,type,content)=>new File([typeof content==='string'?content:new Uint8Array(content)],name,{type});
test('teacher attachments accept supported document/image signatures and reject unsupported/spoofed files',async()=>{
  for(const input of [file('basa.pdf','application/pdf','%PDF-1.4\n%%EOF'),file('basa.txt','text/plain','Magandang araw'),file('basa.png','image/png',[137,80,78,71,13,10,26,10]),file('basa.docx','application/vnd.openxmlformats-officedocument.wordprocessingml.document',[80,75,3,4])])await validateMessageAttachment(input);
  for(const input of [file('fake.pdf','application/pdf','not PDF'),file('active.html','text/html','<script/>'),file('empty.txt','text/plain',''),file('wrong.png','image/jpeg',[137,80,78,71,13,10,26,10]),file('bad.txt','text/plain',[0,1,2])])await assert.rejects(validateMessageAttachment(input));
});
test('teacher attachments enforce five megabytes before reading content',async()=>{
  await assert.rejects(validateMessageAttachment({size:5*1024*1024+1}),/5 MB/);
});
