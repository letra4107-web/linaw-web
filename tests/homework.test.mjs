import test from 'node:test';
import assert from 'node:assert/strict';
import {loadTs} from './helpers/load-ts.mjs';
const api=loadTs('src/lib/homework.ts');
test('homework accepts supported attachments only and caps them at 20 MB',()=>{
  for(const name of ['answer.pdf','answer.docx','answer.ppt','answer.xlsx','answer.JPG','answer.png'])assert.ok(api.homeworkFileType(name,1024));
  for(const [name,size] of [['answer.html',10],['answer.svg',10],['answer.pdf',0],['answer.jpg',20*1024*1024+1]])assert.throws(()=>api.homeworkFileType(name,size));
});
test('student answers resolve the child identity rather than accepting a client-supplied student ID',async()=>{
  const filters=[];const client={auth:{getUser:async()=>({data:{user:{id:'auth-student'}},error:null})},from:table=>({
    select(){return this;},eq(key,value){filters.push([table,key,value]);return this;},single:async()=>({data:{id:'child-id'},error:null}),then(resolve){return Promise.resolve({data:[],error:null}).then(resolve);},
  })};
  await api.ownHomeworkAnswers(client);assert.deepEqual(filters,[['children','auth_uid','auth-student'],['homework_submissions','student_id','child-id']]);
});
test('homework uploads use a private bucket, an owned path and a signed read URL',async()=>{
  const calls=[];const client={auth:{getUser:async()=>({data:{user:{id:'auth-student'}},error:null})},storage:{from:bucket=>{
    assert.equal(bucket,'homework-files');return {upload:async(path,contents,opts)=>{calls.push({path,opts});return {data:{},error:null};},createSignedUrl:async(path,expires)=>{calls.push({path,expires});return {data:{signedUrl:'https://storage.example/signed-answer'},error:null};}};
  }}};
  const file=await api.uploadHomeworkFile(client,'sagot sa bahay.PNG',10,new ArrayBuffer(10));assert.ok(file.file_path.startsWith('auth-student/'));assert.equal(calls[0].opts.contentType,'image/png');assert.equal(calls[0].opts.upsert,false);
  assert.equal(await api.homeworkFileUrl(client,file.file_path),'https://storage.example/signed-answer');assert.equal(calls[1].expires,300);
});
test('empty turn-in never reaches the database, while a valid draft is not submitted',async()=>{
  const calls=[];const client={rpc:async(name,args)=>{calls.push({name,args});return {data:{status:'draft'},error:null};}};
  await assert.rejects(api.saveHomeworkAnswer(client,'assignment',' ',{file_path:null,file_name:null},true));assert.equal(calls.length,0);
  await api.saveHomeworkAnswer(client,'assignment','Draft',{file_path:null,file_name:null},false);assert.equal(calls[0].args.p_submit,false);assert.equal(calls[0].name,'save_homework_answer');
});
