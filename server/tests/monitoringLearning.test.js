const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),http=require('node:http'),express=require('express'),{createRequire}=require('node:module');
const {monitoringLearning}=require('../services/monitoringLearning'),{createAuthMiddleware}=require('../middleware/authCore');
const id=n=>`73000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
function fixture(){
 const calls=[],tables={users:[{id:id(1),role:'student'},{id:id(2),role:'student'},{id:id(3),role:'parent',email_verified:true},{id:id(8),role:'admin',email_verified:true},{id:id(9),role:'teacher',email_verified:true}],children:[{id:id(11),auth_uid:id(1),parent_id:id(3),name:'Ana'},{id:id(12),auth_uid:id(2),parent_id:id(4),name:'Ben'}],student_module_assessment_attempts:[{id:id(20),student_id:id(11),status:'submitted',score:0,passed:false,pass_percentage_snapshot:75,started_at:'2026-11-10',submitted_at:'2026-11-10',assessment:{title:'Module test',module:{title:'Module 1',level:'Beginner'}}},{id:id(21),student_id:id(12),status:'submitted',score:100,passed:true,started_at:'2026-11-11'}],pronunciation_practice_sessions:Array.from({length:25},(_,n)=>({id:id(100+n),student_id:id(11),word:'kahon',accuracy_percentage:n*4,created_at:`2026-11-${String(n+1).padStart(2,'0')}`}))};
 let failedTable;
 const client={auth:{getUser:async token=>({data:{user:tables.users.some(row=>row.id===token)?{id:token,email_confirmed_at:'2026-11-01'}:null}})},from(table){calls.push(table);const filters=[],orders=[];let start,end;
  const result=()=>{let rows=[...(tables[table]||[])].filter(row=>filters.every(filter=>filter(row)));rows.sort((a,b)=>{for(const [key,options]of orders){if(a[key]===b[key])continue;return(a[key]<b[key]?-1:1)*(options?.ascending===false?-1:1);}return 0;});const count=rows.length;if(start!==undefined)rows=rows.slice(start,end+1);return {data:rows,count,error:failedTable===table?{code:'XX001',message:'private database diagnostic'}:null};};
  const q={select(){return q;},eq(key,value){filters.push(row=>row[key]===value);return q;},in(key,values){filters.push(row=>values.includes(row[key]));return q;},order(key,options){orders.push([key,options]);return q;},range(a,b){start=a;end=b;return q;},async maybeSingle(){const r=result();return {...r,data:r.data[0]||null};},then(resolve,reject){return Promise.resolve(result()).then(resolve,reject);}};return q;
 }};
 return {client,calls,tables,fail:table=>{failedTable=table;}};
}
test('assessments resolve the child ID from the selected account and retain stored zero scores and pass thresholds',async()=>{
 const h=fixture(),result=await monitoringLearning(h.client,id(1));assert.equal(result.total,1);assert.equal(result.rows[0].student_id,id(11));assert.equal(result.rows[0].score,0);assert.equal(result.rows[0].passed,false);assert.equal(result.rows[0].pass_percentage_snapshot,75);assert.equal(result.rows[0].studentName,'Ana');
});
test('parent filters include only linked children and reject a forged foreign child before reading attempts',async()=>{
 const h=fixture();assert.equal((await monitoringLearning(h.client,id(3))).total,1);assert.equal((await monitoringLearning(h.client,id(3),{childId:id(11)})).total,1);
 h.calls.length=0;await assert.rejects(monitoringLearning(h.client,id(3),{childId:id(12)}),error=>error.status===404);assert(!h.calls.includes('student_module_assessment_attempts'));
});
test('activities paginate every retry with stable IDs and no duplication across pages',async()=>{
 const h=fixture(),first=await monitoringLearning(h.client,id(1),{kind:'activities'}),second=await monitoringLearning(h.client,id(1),{kind:'activities',page:2});assert.equal(first.total,25);assert.equal(first.rows.length,10);assert.equal(second.rows.length,10);assert(first.rows.every(row=>!second.rows.some(other=>other.id===row.id)));assert(first.rows[0].created_at>second.rows[0].created_at);
});
test('empty children and records return honest zero totals, while database failures propagate',async()=>{
 const h=fixture();h.tables.children=[];assert.deepEqual((await monitoringLearning(h.client,id(1))).rows,[]);const failing=fixture();failing.fail('student_module_assessment_attempts');await assert.rejects(monitoringLearning(failing.client,id(1)),error=>error.code==='XX001');
});
test('unsupported roles, malformed filters and invalid pagination cannot query a learning table',async()=>{
 for(const options of [{kind:'users'},{page:0},{page:1.5},{page:100001},{childId:'invalid'}]){const h=fixture();await assert.rejects(monitoringLearning(h.client,id(1),options),error=>error.status===400);assert.equal(h.calls.length,0);}
 await assert.rejects(monitoringLearning(fixture().client,id(9)),error=>error.status===404);
});
async function withRoute(run){
 const h=fixture(),filename=path.resolve(__dirname,'../routes/admin.js'),actual=createRequire(filename),module={exports:{}};
 vm.runInNewContext(fs.readFileSync(filename,'utf8'),{module,exports:module.exports,console:{error(){}},require(name){if(name==='../config/supabase')return {supabaseAdmin:h.client};if(name==='../middleware/auth')return createAuthMiddleware(h.client);if(name==='../config/mailer')return {sendMail:async()=>{throw Error('Email not allowed');}};return actual(name);}},{filename});
 const app=express();app.use('/admin',module.exports);const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
 const request=(query='',actor=id(8))=>new Promise((resolve,reject)=>{http.get({hostname:'127.0.0.1',port:server.address().port,path:`/admin/monitoring/users/${id(1)}/learning${query}`,headers:actor?{Authorization:'Bearer '+actor}:{}},res=>{let text='';res.on('data',data=>text+=data);res.on('end',()=>resolve({status:res.statusCode,body:JSON.parse(text),cache:res.headers['cache-control']}));}).on('error',reject);});
 try{await run(request,h);}finally{await new Promise(resolve=>server.close(resolve));}
}
test('admin learning endpoint requires a verified active admin and prevents caching',()=>withRoute(async(request,h)=>{
 assert.equal((await request('',null)).status,401);assert.equal((await request('',id(1))).status,403);assert.equal((await request('',id(9))).status,403);
 const result=await request();assert.equal(result.status,200);assert.equal(result.body.rows[0].score,0);assert.equal(result.cache,'private, no-store');h.tables.users.find(row=>row.id===id(8)).is_active=false;assert.equal((await request()).status,403);
}));
test('admin endpoint distinguishes malformed filters from unavailable records and hides database diagnostics',()=>withRoute(async(request,h)=>{
 assert.equal((await request('?page=0')).status,400);h.fail('student_module_assessment_attempts');const result=await request();assert.equal(result.status,500);assert.doesNotMatch(JSON.stringify(result.body),/private database|XX001/);
}));
