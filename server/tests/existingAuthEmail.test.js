const test=require('node:test'),assert=require('node:assert/strict');
const {findExistingAuthEmail}=require('../services/existingAuthEmail');
const user={id:'existing-teacher',email:'legacy.teacher@example.test',user_metadata:{role:'teacher'}};
function client(run){return {auth:{admin:{listUsers:run}}};}
test('an existing Auth identity can be found without creating or changing an app profile',async()=>{
 const found=await findExistingAuthEmail(client(async()=>({data:{users:[user]}})),'LEGACY.TEACHER@example.test');
 assert.equal(found,user);
});
test('unknown inboxes and Gmail aliases are not treated as the registered Auth identity',async()=>{
 for(const email of ['unknown@example.test','legacy.teacher+alias@example.test'])assert.equal(await findExistingAuthEmail(client(async()=>({data:{users:[user]}})),email),null);
});
test('lookup continues past a full page of unrelated users',async()=>{
 const calls=[];const found=await findExistingAuthEmail(client(async input=>{calls.push(input);return{data:{users:input.page===1?Array.from({length:200},(_,i)=>({id:String(i),email:`other${i}@example.test`})):[user]}};}),user.email);
 assert.equal(found,user);assert.deepEqual(calls.map(row=>row.page),[1,2]);
});
test('provider errors and malformed responses fail instead of silently suppressing recovery',async()=>{
 await assert.rejects(findExistingAuthEmail(client(async()=>({error:Error('Auth unavailable')})),user.email),/Auth unavailable/);
 await assert.rejects(findExistingAuthEmail(client(async()=>({data:{}})),user.email),/unavailable/);
});
test('soft-deleted Auth identities are not recovery targets',async()=>{
 assert.equal(await findExistingAuthEmail(client(async()=>({data:{users:[{...user,deleted_at:'2026-01-01'}]}})),user.email),null);
});
test('a full bounded scan reports failure rather than a phantom send',async()=>{
 let pages=0;await assert.rejects(findExistingAuthEmail(client(async()=>{pages++;return{data:{users:Array.from({length:200},(_,i)=>({id:String(i),email:`other${i}@example.test`}))}};}),user.email),/limit reached/);assert.equal(pages,50);
});
