const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');

// Real route handler; account, database, hashing and email boundaries are mocks.
async function enrollment({ cleanup = '', duplicate = false, invalid = false, mailFailure = false, mailReceiptFailure = false, success = false, race=false, unrelatedConflict=false, doubleSubmit=false } = {}) {
  const calls = [], uid = '00000000-0000-4000-8000-000000000004';
  let releaseCreate,createdSignal;const entered=new Promise(resolve=>{createdSignal=resolve;}),gate=new Promise(resolve=>{releaseCreate=resolve;});
  const client = {
    auth: { admin: {
      async createUser() { calls.push('auth:create');if(doubleSubmit){createdSignal();await gate;} return { data: { user: { id: uid } }, error: null }; },
      async deleteUser(id) { assert.equal(id, uid); calls.push('auth:delete'); if (cleanup === 'auth-throw') throw new Error('synthetic auth cleanup outage'); return { error: null }; },
    } },
    from(table) {
      let method = 'select', query,single=false;
      const execute = async () => {
        if (method === 'delete') {
          calls.push(`${table}:delete`);
          if (table === 'children' && cleanup === 'throw') throw new Error('synthetic child cleanup outage');
          return { error: table === 'children' && cleanup === 'returned-error' ? { message: 'synthetic cleanup rejection' } : null };
        }
        if (method === 'select') return { data: table === 'teacher_profiles' ? [] : single ? (duplicate?{id:'existing'}:null) : (duplicate?[{id:'existing',name:'  SYNTHETIC   learner '}]:[]), error: null };
        calls.push(`${table}:${method}`);
        if(table==='children'&&method==='insert'&&(race||unrelatedConflict))return {data:null,error:{code:'23505',message:'duplicate key value violates unique constraint "'+(unrelatedConflict?'unrelated_constraint':'children_parent_enrollment_name_uidx')+'"'}};
        if(table === 'child_credentials' && method === 'update' && mailReceiptFailure) throw new Error('synthetic receipt outage');
        return { data: table === 'children' ? { id: 'synthetic-child' } : null, error: table === 'users' && !success ? { message: 'synthetic private profile diagnostic' } : null };
      };
      query = new Proxy({}, { get(_target, key) {
        if (key === 'then') return (resolve, reject) => execute().then(resolve, reject);
        if (key === 'single' || key === 'maybeSingle') return ()=>{single=true;return execute();};
        return () => { if (['insert', 'upsert', 'update', 'delete'].includes(key)) method = key; return query; };
      } }); return query;
    },
  };
  const filename = path.resolve(__dirname, '../routes/parent.js'), actualRequire = createRequire(filename), module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), { module, exports: module.exports, console: { error() {} }, require(name) {
    if (name === '../config/supabase') return { supabaseAdmin: client };
    if (name === '../config/mailer') return { sendMail: async () => { calls.push('mail'); if (mailFailure) throw new Error('synthetic delivery outage'); } };
    if (name === 'bcryptjs') return { hash: async () => 'synthetic-hash' };
    if (name === '../lib/temporaryPassword') return { temporaryPassword: () => 'synthetic-one-time-password' };
    if (name === '../middleware/auth') return { requireAuth() {}, requireRole: () => () => {} };
    return actualRequire(name);
  } }, { filename });
  const handler = module.exports.stack.find((layer) => layer.route?.path === '/children' && layer.route.methods.post).route.stack[0].handle;
  const response = { headers: {}, setHeader(key, value) { this.headers[key] = value; }, code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  const request={user:{id:'synthetic-parent',email:'qa-parent@example.invalid'},body:{childName:invalid?'':'Synthetic Learner',gradeLevel:1}};
  const pending=handler(request,response);let secondResponse;
  if(doubleSubmit){await entered;secondResponse={...response,headers:{}};await handler({...request,body:{childName:' synthetic   LEARNER ',gradeLevel:1}},secondResponse);releaseCreate();}
  await pending;
  return { calls, response,secondResponse };
}
for (const cleanup of ['throw', 'returned-error', 'auth-throw']) test(`final enrollment: ${cleanup} cleanup failure cannot prevent remaining cleanup or safe response`, async () => {
  const { calls, response } = await enrollment({ cleanup });
  assert.equal(response.code, 500); assert.equal(response.body.error, 'Hindi na-enroll ang bata.');
  assert.deepEqual(calls.slice(-3), ['children:delete', 'users:delete', 'auth:delete']);
});
test('final enrollment: invalid input makes no account or database mutation', async () => {
  const { calls, response } = await enrollment({ invalid: true }); assert.equal(response.code, 400); assert.deepEqual(calls, []);
});
test('final enrollment: duplicate child does not create an account', async () => {
  const { calls, response } = await enrollment({ duplicate: true }); assert.equal(response.code, 409); assert.deepEqual(calls, []);
});
for (const mailFailure of [false, true]) test(`final enrollment: successful account survives email failure=${mailFailure}`, async () => {
  const { calls, response } = await enrollment({ success: true, mailFailure });
  assert.equal(response.code, 200); assert.equal(response.body.success, true); assert.ok(calls.includes('mail')); assert.ok(!calls.some((call) => call.endsWith(':delete'))); assert.equal(response.body.credentialsEmailSent, !mailFailure); assert.equal(response.headers['Cache-Control'], 'private, no-store'); assert.equal(calls.includes('child_credentials:update'), !mailFailure);
});

test('enrollment survives a mail receipt outage after provider acceptance',async()=>{const {calls,response}=await enrollment({success:true,mailReceiptFailure:true});assert.equal(response.code,200);assert.equal(response.body.credentialsEmailSent,true);assert.equal(calls.includes('auth:delete'),false);});

test('parallel equivalent submissions cannot create a second Auth account or send a second mail',async()=>{const {calls,response,secondResponse}=await enrollment({success:true,doubleSubmit:true});assert.equal(response.code,200);assert.equal(secondResponse.code,409);assert.equal(secondResponse.body.code,'ENROLLMENT_IN_PROGRESS');assert.equal(calls.filter(value=>value==='auth:create').length,1);assert.equal(calls.filter(value=>value==='mail').length,1);});
test('database duplicate races return a safe 409 after attempting all partial-account cleanup',async()=>{const {calls,response}=await enrollment({success:true,race:true});assert.equal(response.code,409);assert.equal(response.body.message,'Student already exists');assert.equal(response.body.code,'STUDENT_ALREADY_EXISTS');assert.deepEqual(calls.slice(-3),['children:delete','users:delete','auth:delete']);assert(!calls.includes('mail'));});
test('unrelated database conflicts remain failures rather than false duplicate-child messages',async()=>{const {response}=await enrollment({unrelatedConflict:true});assert.equal(response.code,500);assert.notEqual(response.body.code,'STUDENT_ALREADY_EXISTS');});
