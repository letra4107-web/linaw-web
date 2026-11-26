import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';

// Isolated PostgreSQL only. No .env, Supabase or live enrollment is used.
if(!process.argv.includes('--worker')){
  const runId=randomUUID(),report=path.resolve('.qa',`child-enrollment-${runId}.json`);
  fs.mkdirSync(path.dirname(report),{recursive:true});
  const child=spawn(process.execPath,[path.resolve('scripts/qa-child-enrollment-sql.mjs'),'--worker',report,runId],{stdio:'inherit',windowsHide:true});
  const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve);});
  try{const result=JSON.parse(fs.readFileSync(report,'utf8'));assert.equal(code,0);assert.equal(result.runId,runId);assert.ok(result.cases.length>=10&&result.cases.every(c=>c.pass));console.log(`PASS: ${result.cases.length} child enrollment PostgreSQL checks`);}
  catch(error){console.error('FAIL:',error.message);process.exitCode=1;}
}else{
  const {startDisposablePostgres}=await import('./qa-postgres.mjs');
  const {default:pg}=await import('./qa-tools/node_modules/pg/lib/index.js');
  const cases=[];let db;
  const parent=randomUUID(),other=randomUUID();
  const migration=fs.readFileSync('migrations/064_prevent_duplicate_child_enrollment.sql','utf8');
  const check=async(name,run)=>{await run();cases.push({name,pass:true});console.log('PASS:',name);};
  try{
    db=await startDisposablePostgres();const c=db.client;
    await c.query('CREATE TABLE public.children(id uuid PRIMARY KEY,parent_id uuid,name text,grade_level int,date_of_birth date)');
    const insert=(client,name='Ana Luna',owner=parent,grade=1)=>client.query('INSERT INTO public.children(id,parent_id,name,grade_level,date_of_birth) VALUES($1,$2,$3,$4,$5)',[randomUUID(),owner,name,grade,'2019-05-20']);
    const snapshot=async()=>(await c.query('SELECT * FROM public.children ORDER BY id')).rows;
    const duplicate=error=>error.code==='23505'&&error.constraint==='children_parent_enrollment_name_uidx';
    await insert(c);await insert(c,' ANA  LUNA ');
    await check('legacy duplicates stop installation without deleting accounts or changing records',async()=>{
      const before=await snapshot();await assert.rejects(c.query(migration),e=>e.code==='23505'&&e.message.includes('needs review'));
      await c.query('ROLLBACK');assert.deepEqual(await snapshot(),before);
      assert.equal((await c.query("SELECT to_regclass('public.children_parent_enrollment_name_uidx') AS index")).rows[0].index,null);
    });
    await c.query('DELETE FROM public.children WHERE name=$1',[' ANA  LUNA ']);
    await check('migration installs twice while preserving existing accounts',async()=>{
      const before=await snapshot();await c.query(migration);await c.query(migration);assert.deepEqual(await snapshot(),before);
    });
    await check('identical child details are rejected with no added child',async()=>{
      const before=await snapshot();await assert.rejects(insert(c),duplicate);assert.deepEqual(await snapshot(),before);
    });
    await check('case, surrounding spaces, repeated spaces, tabs and nonbreaking spaces cannot bypass the index',async()=>{
      const before=await snapshot();for(const name of ['ana luna','  ANA LUNA  ','Ana   Luna','\tAna\tLuna\n','Ana\u00a0Luna'])await assert.rejects(insert(c,name),duplicate);assert.deepEqual(await snapshot(),before);
    });
    await check('different parents can enroll children with the same name',async()=>{await insert(c,'Ana Luna',other);});
    await check('another child under the same parent is allowed',async()=>{await insert(c,'Juan Luna');});
    await check('the existing distinct-grade enrollment rule is preserved',async()=>{await insert(c,'Ana Luna',parent,2);});
    await check('editing a child into an existing enrollment is rejected',async()=>{
      const before=await snapshot();await assert.rejects(c.query('UPDATE public.children SET name=$1 WHERE parent_id=$2 AND name=$3',['Ana Luna',parent,'Juan Luna']),duplicate);assert.deepEqual(await snapshot(),before);
    });
    await check('eight simultaneous requests for one child can create only one row',async()=>{
      const clients=Array.from({length:8},()=>new pg.Client(db.connection));
      try{
        await Promise.all(clients.map(client=>client.connect()));
        const results=await Promise.all(clients.map(client=>insert(client,'Concurrent Learner').then(()=>({accepted:true}),error=>({error}))));
        assert.equal(results.filter(r=>r.accepted).length,1);assert.equal(results.filter(r=>r.error&&duplicate(r.error)).length,7);
        assert.equal((await c.query('SELECT count(*)::int AS n FROM public.children WHERE parent_id=$1 AND name=$2',[parent,'Concurrent Learner'])).rows[0].n,1);
      }finally{await Promise.all(clients.map(client=>client.end()));}
    });
    await check('a stale repeatable-read request also cannot create a duplicate',async()=>{
      const stale=new pg.Client(db.connection);await stale.connect();
      try{
        await stale.query('BEGIN ISOLATION LEVEL REPEATABLE READ');await stale.query('SELECT count(*) FROM public.children');
        await insert(c,'Snapshot Learner');await assert.rejects(insert(stale,'Snapshot Learner'),duplicate);
      }finally{await stale.query('ROLLBACK');await stale.end();}
    });
  }catch(error){cases.push({name:'setup or verification',pass:false,error:error.message});console.error('FAIL:',error.message);}
  finally{try{if(db)await db.stop();}finally{fs.writeFileSync(process.argv[3],JSON.stringify({runId:process.argv[4],cases},null,2));}}
}
