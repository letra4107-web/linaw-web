const test=require('node:test'),assert=require('node:assert/strict');
const {canonicalAccountEmail,accountEmailInUse}=require('../services/accountEmail');
test('only Gmail/googlemail dots and tags share one identity; other providers keep their aliases',()=>{
 for(const email of ['User.Name@gmail.com','username+teacher@gmail.com',' u.s.e.r.n.a.m.e+parent@googlemail.com '])assert.equal(canonicalAccountEmail(email),'username@gmail.com');
 assert.equal(canonicalAccountEmail(' User.Name+tag@example.com '),'user.name+tag@example.com');
});
test('identity lookup is server-only, includes every role and fails closed on invalid RPC results',async()=>{
 const calls=[],client={rpc:async(name,args)=>{calls.push({name,args});return {data:true};}};
 assert.equal(await accountEmailInUse(client,'x@gmail.com'),true);assert.equal(calls[0].name,'account_email_in_use');assert.equal(calls[0].args.p_except_id,null);
 await assert.rejects(()=>accountEmailInUse({rpc:async()=>({error:{code:'missing'}})},'x@gmail.com'));
 await assert.rejects(()=>accountEmailInUse({rpc:async()=>({data:null})},'x@gmail.com'));
});
