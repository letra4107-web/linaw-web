const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const express = require('express');
const { createAuthMiddleware } = require('../middleware/authCore');
const { createMessageProfilePhotoService } = require('../services/messageProfilePhotos');

function fixture() {
  const tables = {
    users: [{id:'p1',role:'parent'},{id:'p2',role:'parent'},{id:'t1',role:'teacher'},{id:'t2',role:'teacher'},{id:'s1',role:'student'}],
    teacher_messages: [{id:'m1',teacher_id:'t1',parent_id:'p1'},{id:'m2',teacher_id:'t1',parent_id:'p1'},{id:'m3',teacher_id:'t2',parent_id:'p2'}],
    teacher_student_links: [{id:'l1',teacher_id:'t1',children:{parent_id:'p1'}},{id:'l2',teacher_id:'t1',children:{parent_id:'p1'}},{id:'l3',teacher_id:'t2',children:{parent_id:'p2'}}],
    parents: [{auth_uid:'p1',avatar_url:'https://files.example.test/p1.png',email:'private@example.test'},{auth_uid:'p2',avatar_url:'https://files.example.test/p2.png'}],
    teacher_profiles: [{user_id:'t1',avatar_url:'https://files.example.test/t1.png',grade_levels:[1]},{user_id:'t2',avatar_url:'https://files.example.test/t2.png'}],
  };
  const calls=[];let failure;
  const client = {
    auth:{getUser:async token=>({data:{user:tables.users.some(row=>row.id===token)?{id:token}:null},error:null})},
    from(table) {
      const query={table,filters:[],offset:0,end:Infinity};calls.push(query);
      const run=single=>{if(table===failure)return {data:null,error:{code:'XX000',message:'Private database diagnostic'}};let rows=(tables[table]||[]).filter(row=>query.filters.every(([key,value,op])=>op==='in'?value.includes(row[key]):row[key]===value));if(query.sort)rows.sort((a,b)=>String(a[query.sort]).localeCompare(String(b[query.sort])));rows=rows.slice(query.offset,query.end===Infinity?undefined:query.end+1);return {data:single?rows[0]||null:rows,error:null};};
      const builder={select(fields){query.fields=fields;return this;},eq(key,value){query.filters.push([key,value,'eq']);return this;},in(key,value){query.filters.push([key,value,'in']);return this;},order(key){query.sort=key;return this;},range(start,end){query.offset=start;query.end=end;return this;},maybeSingle:async()=>run(true),then(resolve,reject){return Promise.resolve(run(false)).then(resolve,reject);}};
      return builder;
    },
  };
  return {client,tables,calls,fail:table=>{failure=table;}};
}

test('parent photo response contains only teachers who actually sent that parent messages',async()=>{
  const f=fixture(),result=await createMessageProfilePhotoService(f.client).load('p1','parent');
  assert.deepEqual(result,{avatars:{t1:'https://files.example.test/t1.png'},ownAvatarUrl:'https://files.example.test/p1.png'});
  assert.ok(f.calls.some(call=>call.table==='teacher_messages'&&call.filters.some(([key,value])=>key==='parent_id'&&value==='p1')));
  assert.ok(!JSON.stringify(result).includes('private@example.test'));assert.ok(!JSON.stringify(result).includes('t2.png'));
});
test('teacher photo response contains only parents linked through that teachers own roster',async()=>{
  const f=fixture(),result=await createMessageProfilePhotoService(f.client).load('t1','teacher');
  assert.deepEqual(result,{avatars:{p1:'https://files.example.test/p1.png'},ownAvatarUrl:'https://files.example.test/t1.png'});
  assert.ok(f.calls.some(call=>call.table==='teacher_student_links'&&call.filters.some(([key,value])=>key==='teacher_id'&&value==='t1')));
});
test('empty contact lists never issue an unscoped counterpart profile query',async()=>{
  const f=fixture();f.tables.teacher_student_links=[];const result=await createMessageProfilePhotoService(f.client).load('t1','teacher');assert.deepEqual(result.avatars,{});assert.equal(f.calls.filter(call=>call.table==='parents').length,0);
});
test('counterpart discovery traverses repeated messages beyond one database page',async()=>{
  const f=fixture();f.tables.teacher_messages=Array.from({length:501},(_,index)=>({id:String(index).padStart(4,'0'),teacher_id:index===500?'t2':'t1',parent_id:'p1'}));const result=await createMessageProfilePhotoService(f.client).load('p1','parent');assert.deepEqual(Object.keys(result.avatars).sort(),['t1','t2']);assert.equal(f.calls.filter(call=>call.table==='teacher_messages').length,2);
});
test('unsafe image URLs become empty photos and missing profiles do not expose other accounts',async()=>{
  const f=fixture();f.tables.teacher_profiles[0].avatar_url='javascript:alert(1)';f.tables.parents[0].avatar_url='https://user:secret@example.test/a';const result=await createMessageProfilePhotoService(f.client).load('p1','parent');assert.deepEqual(result,{avatars:{t1:null},ownAvatarUrl:null});
});
test('ownership discovery and metadata failures fail closed without partial profile results',async()=>{
  for(const table of ['teacher_messages','teacher_profiles','parents']){const f=fixture();f.fail(table);await assert.rejects(createMessageProfilePhotoService(f.client).load('p1','parent'));}
  await assert.rejects(createMessageProfilePhotoService(fixture().client).load('','parent'));await assert.rejects(createMessageProfilePhotoService(fixture().client).load('u','student'));
});

function router(area,client){const filename=path.resolve(__dirname,`../routes/${area}.js`),actualRequire=createRequire(filename),module={exports:{}};vm.runInNewContext(fs.readFileSync(filename,'utf8'),{module,exports:module.exports,console:{error(){},warn(){}},Buffer,process,require(name){if(name==='../config/supabase')return {supabaseAdmin:client};if(name==='../config/mailer')return {sendMail:async()=>{throw new Error('Mail is forbidden');}};if(name==='../middleware/auth')return createAuthMiddleware(client);return actualRequire(name);}},{filename});return module.exports;}
async function http(area,run){const f=fixture(),app=express();app.use(router(area,f.client));const server=await new Promise(resolve=>{const listener=app.listen(0,'127.0.0.1',()=>resolve(listener));});const request=async token=>{const response=await fetch(`http://127.0.0.1:${server.address().port}/message-profile-photos?userId=p2&teacherId=t2`,{headers:token?{Authorization:`Bearer ${token}`}:{}});return {status:response.status,cache:response.headers.get('cache-control'),body:await response.json()};};try{await run(request,f);}finally{await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});}}
for(const [area,token,wrong]of [['parent','p1','t1'],['teacher','t1','p1']]){
  test(`${area} profile endpoint enforces authentication and role, ignoring supplied account identifiers`,async()=>http(area,async request=>{assert.equal((await request()).status,401);assert.equal((await request('s1')).status,403);assert.equal((await request(wrong)).status,403);const result=await request(token);assert.equal(result.status,200);assert.equal(result.cache,'private, no-store');assert.ok(!JSON.stringify(result.body).includes('p2.png'));assert.ok(!JSON.stringify(result.body).includes('t2.png'));}));
  test(`${area} profile endpoint sanitizes internal read failures`,async()=>http(area,async(request,f)=>{f.fail(area==='parent'?'teacher_messages':'teacher_student_links');const result=await request(token);assert.equal(result.status,500);assert.ok(!JSON.stringify(result.body).includes('Private database diagnostic'));}));
}
