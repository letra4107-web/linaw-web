import fs from 'node:fs';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import pg from './qa-tools/node_modules/pg/lib/index.js';
import {startDisposablePostgres} from './qa-postgres.mjs';
import {assertReaderContext,integrityScope,evaluateCatalog} from './qa-main-readonly-lib.mjs';

// Local synthetic verifier tests only. No main env/connection is loaded.
// Migration files are never run. Function definitions are copied as fixture
// DDL in a new loopback database, and every mutation below is local-only.
const rows=[];let db,reader;
const check=async(scenario,run)=>{try{await run();rows.push({scenario,status:'PASS'});}catch(error){rows.push({scenario,status:'FAIL',actual:error.message});}};
try{
  db=await startDisposablePostgres();const c=db.client;
  const password=randomBytes(30).toString('base64url');
  await c.query(`CREATE ROLE anon NOLOGIN;CREATE ROLE authenticated NOLOGIN;CREATE ROLE service_role NOLOGIN BYPASSRLS;
    CREATE ROLE linawletra_safety_reader LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS PASSWORD '${password}';
    CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE TABLE public.users(id uuid PRIMARY KEY,role text);
    CREATE TABLE public.children(id uuid PRIMARY KEY,grade_level int);
    CREATE TABLE public.teacher_profiles(user_id uuid PRIMARY KEY,grade_levels int[]);
    CREATE TABLE public.class_sections(id uuid PRIMARY KEY,name text NOT NULL,grade_level int NOT NULL CHECK(grade_level BETWEEN 1 AND 6),adviser_id uuid NOT NULL REFERENCES auth.users(id),capacity int NOT NULL CHECK(capacity BETWEEN 1 AND 35),UNIQUE(grade_level,name));
    CREATE TABLE public.section_students(section_id uuid REFERENCES public.class_sections(id),student_id uuid REFERENCES public.children(id),PRIMARY KEY(section_id,student_id));
    CREATE TABLE public.teacher_student_links(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),teacher_id uuid NOT NULL REFERENCES auth.users(id),student_id uuid NOT NULL REFERENCES public.children(id),assigned_by uuid REFERENCES auth.users(id),UNIQUE(teacher_id,student_id));
    GRANT USAGE ON SCHEMA public TO linawletra_safety_reader;
    GRANT SELECT ON ALL TABLES IN SCHEMA public TO linawletra_safety_reader;
  `);
  const tableNames=['class_sections','section_students','teacher_student_links','children','teacher_profiles','users'];
  for(const table of tableNames)await c.query(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`);
  // Synthetic pre-existing invalid rows, inserted before local trigger fixture.
  await c.query("INSERT INTO auth.users VALUES('00000000-0000-4000-8000-000000000001');INSERT INTO users VALUES('00000000-0000-4000-8000-000000000001','teacher');INSERT INTO children VALUES('00000000-0000-4000-8000-000000000002',1),('00000000-0000-4000-8000-000000000003',2);INSERT INTO teacher_profiles VALUES('00000000-0000-4000-8000-000000000001',ARRAY[1]);INSERT INTO class_sections VALUES('00000000-0000-4000-8000-000000000004','Synthetic',1,'00000000-0000-4000-8000-000000000001',1);INSERT INTO section_students VALUES('00000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000002'),('00000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000003');INSERT INTO teacher_student_links(teacher_id,student_id) VALUES('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002');");
  const functions={};
  for(const file of ['migrations/047_atomic_section_assignments.sql','migrations/048_section_capacity_snapshot_safety.sql'])for(const m of fs.readFileSync(file,'utf8').matchAll(/CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.(\w+)[\s\S]*?\bAS\s*\$\$[\s\S]*?\$\$;/gi))functions[m[1]]=m[0];
  for(const definition of Object.values(functions))await c.query(definition);
  await c.query('REVOKE ALL ON FUNCTION public.assign_section_students(uuid,uuid[],uuid) FROM PUBLIC,anon,authenticated;GRANT EXECUTE ON FUNCTION public.assign_section_students(uuid,uuid[],uuid) TO service_role;CREATE TRIGGER validate_section_student_trigger BEFORE INSERT OR UPDATE ON public.section_students FOR EACH ROW EXECUTE FUNCTION public.validate_section_student();');
  reader=new pg.Client({...db.connection,user:'linawletra_safety_reader',password});await reader.connect();
  const catalog=async()=>{const result=await reader.query(fs.readFileSync('docs/qa/main-post-migration/catalog.sql','utf8'));return Object.fromEntries(['transaction','functions','triggers','constraints','indexes','tables','policies','columns','dependencies'].map((key,i)=>[key,result[i].rows]));};
  await reader.query('BEGIN READ ONLY');
  await check('Dedicated reader connects without elevated attributes and a read-only transaction is enforced',async()=>{
    const {rows:[context]}=await reader.query("SELECT current_user AS current_role,session_user AS login_role,current_setting('transaction_read_only') AS transaction_read_only,current_setting('row_security') AS row_security,rolsuper,rolbypassrls,rolcreatedb,rolcreaterole,rolreplication,false AS privileged_membership FROM pg_roles WHERE rolname=current_user");assertReaderContext(context);
  });
  await check('Catalog verifier recognizes copied function signatures/bodies/trigger/constraints without invoking either RPC',async()=>{
    const data=await catalog();const results=evaluateCatalog(data);assert.deepEqual(results.filter(row=>row.status!=='PASS'),[]);
  });
  await check('RLS-filtered empty results are refused as global integrity proof',async()=>{const data=await catalog();assert.equal(integrityScope(data.tables).allowed,false);assert.equal((await reader.query('SELECT count(*)::int AS n FROM public.section_students')).rows[0].n,0);});
  await reader.query('ROLLBACK');
  for(const table of tableNames)await c.query(`CREATE POLICY local_fixture_read ON public.${table} FOR SELECT TO linawletra_safety_reader USING(true)`);
  await reader.query('BEGIN READ ONLY');
  await check('Approved local SELECT policies permit aggregate checks without bypassing RLS',async()=>{const data=await catalog();assert.equal(integrityScope(data.tables).allowed,true);assert.ok(data.tables.every(t=>t.rls_active&&!t.inherits_owner&&!t.has_write_privilege));});
  await check('Aggregate verifier detects synthetic over-capacity, wrong-grade and missing-roster defects',async()=>{
    const sql=fs.readFileSync('docs/qa/main-post-migration/integrity.sql','utf8');const result=await reader.query(sql);const values=Object.fromEntries(result.rows.map(r=>[r.check_name,r.violations]));assert.equal(values.sections_over_capacity,1);assert.equal(values.membership_grade_mismatch,1);assert.equal(values.membership_missing_adviser_roster_link,1);
    await c.query('UPDATE public.teacher_profiles SET grade_levels=ARRAY[NULL]::int[]');
    const nullable=await reader.query(sql);assert.equal(nullable.rows.find(r=>r.check_name==='roster_outside_teacher_grades').violations,1,'NULL array entries must not hide an invalid teacher grade');
  });
  await check('Writes are refused in the local reader session',async()=>{await assert.rejects(reader.query("DELETE FROM public.section_students WHERE false"),error=>['25006','42501'].includes(error.code));});
  await reader.query('ROLLBACK');
}catch(error){rows.push({scenario:'Local verifier fixture setup',status:'BLOCKED',actual:error.message});}
finally{
  if(reader)await reader.end().catch(()=>{});if(db)await db.stop();
  fs.mkdirSync('docs/qa/evidence/main-post-migration',{recursive:true});
  fs.writeFileSync('docs/qa/evidence/main-post-migration/local-verifier-tests.json',JSON.stringify({timestamp:new Date().toISOString(),scope:'Fresh synthetic loopback database only; main never contacted. Fixture DDL is not a main migration execution.',rows},null,2)+'\n');
  console.log(JSON.stringify({cases:rows.length,passed:rows.filter(r=>r.status==='PASS').length,other:rows.filter(r=>r.status!=='PASS')}));
  if(rows.some(r=>r.status!=='PASS'))process.exitCode=1;
}
