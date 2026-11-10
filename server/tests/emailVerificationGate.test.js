const test=require('node:test'),assert=require('node:assert/strict');
const {createAuthMiddleware}=require('../middleware/authCore');
function response(){return{statusCode:200,status(code){this.statusCode=code;return this;},json(body){this.body=body;return this;}};}
for(const profileVerified of [false,null,undefined,true])for(const confirmed of [false,true])test('email gate: profile='+profileVerified+' auth='+confirmed,async()=>{
 const client={from(){const chain={select(){return chain;},eq(){return chain;},maybeSingle:async()=>({data:{role:'parent',email_verified:profileVerified},error:null})};return chain;}};
 const res=response();let continued=false;await createAuthMiddleware(client).requireRole('parent')({user:{id:'p1',email_confirmed_at:confirmed?'2026-11-10':null}},res,()=>{continued=true;});
 assert.equal(continued,confirmed && profileVerified===true);if(!continued){assert.equal(res.statusCode,403);assert.equal(res.body.code,'EMAIL_VERIFICATION_REQUIRED');}
});
test('enrolled children retain their parent-managed student sign-in',async()=>{const client={from(){const chain={select(){return chain;},eq(){return chain;},maybeSingle:async()=>({data:{role:'student',email_verified:false},error:null})};return chain;}};let continued=false;await createAuthMiddleware(client).requireRole('student')({user:{id:'child'}},response(),()=>{continued=true;});assert.equal(continued,true);});
