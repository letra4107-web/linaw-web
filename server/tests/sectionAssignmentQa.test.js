const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {createRequire} = require('node:module');
const express = require('express');

// Real Express routing with an explicit substituted RPC boundary; database
// semantics are covered separately by scripts/qa-database.mjs.
async function assign({error = null, ids = ['11111111-1111-4111-8111-111111111111']} = {}) {
  const calls=[];const filename=path.resolve(__dirname,'../routes/admin.js');const actualRequire=createRequire(filename);const module={exports:{}};
  vm.runInNewContext(fs.readFileSync(filename,'utf8'),{module,exports:module.exports,console:{error(){}},require(name){
    if(name==='../config/supabase')return {supabaseAdmin:{rpc:async(name,args)=>{calls.push({name,args});return {data:{success:true},error};},from(){assert.fail('assignment must use a single atomic RPC');}}};
    if(name==='../middleware/auth')return {requireAuth:(req,_res,next)=>{req.user={id:'qa-admin'};next();},requireRole:()=>((_req,_res,next)=>next())};
    return actualRequire(name);
  }},{filename});
  const app=express();app.use(express.json(),module.exports);const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
  try{const response=await fetch(`http://127.0.0.1:${server.address().port}/sections/22222222-2222-4222-8222-222222222222/students`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({studentIds:ids})});return {status:response.status,body:await response.json(),calls};}
  finally{await new Promise(resolve=>server.close(resolve));}
}
test('QA section assignment deduplicates IDs and calls one atomic RPC',async()=>{const id='11111111-1111-4111-8111-111111111111';const result=await assign({ids:[id,id]});assert.equal(result.status,200);assert.equal(result.calls.length,1);assert.equal(result.calls[0].name,'assign_section_students');assert.equal(result.calls[0].args.p_student_ids.length,1);assert.equal(result.calls[0].args.p_assigned_by,'qa-admin');});
test('QA section assignment rejects empty selections before persistence',async()=>{const result=await assign({ids:[]});assert.equal(result.status,400);assert.equal(result.calls.length,0);});
test('QA section assignment rejects malformed UUIDs before persistence',async()=>{for(const ids of [['-'.repeat(36)],['11111111-1111-4111-8111-111111111111','invalid']]){const result=await assign({ids});assert.equal(result.status,400);assert.equal(result.calls.length,0);}});
test('QA section assignment returns actionable capacity and missing-section errors',async()=>{assert.equal((await assign({error:{code:'22023',message:'This section is already at capacity'}})).status,400);assert.equal((await assign({error:{code:'P0002',message:'Section not found'}})).status,404);});
test('QA section assignment reports RPC failure without claiming success or issuing fallback writes',async()=>{const result=await assign({error:{code:'PGRST202',message:'Migration unavailable'}});assert.equal(result.status,500);assert.equal(result.body.success,undefined);assert.equal(result.calls.length,1);});

test('final verification section assignment sanitizes unexpected persistence diagnostics',async()=>{
  const diagnostic='isolated internal database diagnostic';
  const result=await assign({error:{code:'XX001',message:diagnostic}});
  assert.equal(result.status,500);
  assert.equal(result.body.error,'Unable to add students to this section.');
  assert.ok(!JSON.stringify(result.body).includes(diagnostic));
  assert.equal(result.calls.length,1);
});
test('QA section assignment reports concurrent transaction conflicts as retryable',async()=>{for(const code of ['40001','40P01']){const result=await assign({error:{code,message:'database transaction conflict'}});assert.equal(result.status,409);assert.match(result.body.error,/try again/);assert.equal(result.calls.length,1);}});
