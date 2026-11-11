const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createRequire}=require('node:module');
function harness(options={}){
 const calls=[],owned='69000000-0000-4000-8000-000000000001';
 const client={rpc:async()=>{calls.push('email-check');if(options.lookupError)return {error:{code:'PRIVATE'}};return {data:!!options.used};},from(table){const q={upsert:async data=>{calls.push({table,data});return {};},select(){return q;},in:async()=>({data:[]})};return q;},auth:{admin:{
  async createUser(data){calls.push({create:data});return options.race?{error:{code:'email_exists'}}:{data:{user:{id:owned}}};},
  async generateLink(){calls.push('code');return {data:{user:{id:options.wrongIdentity?'existing-other-user':owned},properties:{email_otp:'00123456'}}};},
  async deleteUser(id){calls.push({deleted:id});return {};}
 }}};
 const filename=path.resolve(__dirname,'../routes/admin.js'),actual=createRequire(filename),module={exports:{}};
 vm.runInNewContext(fs.readFileSync(filename,'utf8'),{module,exports:module.exports,console:{error(){}},require(name){
  if(name==='../config/supabase')return {supabaseAdmin:client};
  if(name==='../config/mailer')return {sendMail:async mail=>{calls.push({mail});if(options.mailError)throw Object.assign(Error('private provider diagnostic'),{code:'MAIL_UNAVAILABLE'});}};
  if(name==='../middleware/auth')return {requireAuth(req,res,next){req.user={id:'admin'};next();},requireRole:()=>((req,res,next)=>next())};
  return actual(name);
 }},{filename});
 return {calls,request:()=>new Promise((resolve,reject)=>module.exports.handle({method:'POST',url:'/teachers',headers:{},body:{email:'Teacher@gmail.com',name:'Teacher <Example>',gradeLevels:[1]}},{statusCode:200,status(code){this.statusCode=code;return this;},json(body){resolve({status:this.statusCode,body});}},reject))};
}
test('teacher creation refuses an inbox owned by any role before generating passwords, codes or profile writes',async()=>{const h=harness({used:true}),result=await h.request();assert.equal(result.status,409);assert.deepEqual(h.calls,['email-check']);});
test('email lookup outages fail closed rather than create an account',async()=>{const h=harness({lookupError:true});assert.equal((await h.request()).status,500);assert.deepEqual(h.calls,['email-check']);});
test('a concurrent duplicate rejected by Auth cannot overwrite an existing profile or send credentials',async()=>{const h=harness({race:true});assert.equal((await h.request()).status,409);assert.equal(h.calls.length,2);});
test('new teacher receives branded credentials and code only for the newly owned unverified identity',async()=>{
 const h=harness(),result=await h.request();assert.equal(result.status,200);
 const created=h.calls.find(c=>c.create).create;assert.equal(created.email_confirm,false);assert.equal(created.email,'teacher@gmail.com');
 const profile=h.calls.find(c=>c.table==='users').data;assert.equal(profile.email_verified,false);assert.equal(profile.role,'teacher');
 const mail=h.calls.find(c=>c.mail).mail;assert.equal(mail.to,'teacher@gmail.com');assert.match(mail.html,/Teacher &lt;Example&gt;/);assert.match(mail.html,/00123456/);assert.match(mail.html,new RegExp(created.password));assert.doesNotMatch(JSON.stringify(result.body),/00123456|password/);
});
test('code identity mismatch rolls back only the new account without modifying or deleting the existing owner',async()=>{const h=harness({wrongIdentity:true});assert.equal((await h.request()).status,500);assert.deepEqual(h.calls.filter(c=>c.deleted).map(c=>c.deleted),['69000000-0000-4000-8000-000000000001']);assert.equal(h.calls.some(c=>c.table||c.mail),false);});
test('mail failure rolls back the newly created account and never reports success',async()=>{const h=harness({mailError:true}),result=await h.request();assert.equal(result.status,503);assert.equal(h.calls.filter(c=>c.deleted).length,1);assert.doesNotMatch(JSON.stringify(result.body),/private provider/);});
