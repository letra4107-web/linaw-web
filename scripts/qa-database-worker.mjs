import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import pg from './qa-tools/node_modules/pg/lib/index.js';
import { startDisposablePostgres } from './qa-postgres.mjs';

// This suite never reads application environment files or connects to Supabase.
const rows = [], reproductions = [];
const evidenceDir = process.env.QA_EVIDENCE_DIR || 'docs/qa/evidence/phase3';
const ids = Object.fromEntries(['admin', 'teacher', 'parent', 'student', 'otherTeacher', 'otherStudent', 'child', 'child2', 'wrongGrade', 'section', 'section2'].map((key, i) => [key, `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`]));
let db;
async function check(scenario, run) {
  const row = { id: `DB-${String(rows.length + 1).padStart(3, '0')}`, module: 'Disposable PostgreSQL integration', scenario, expected: 'Assertions succeed on a fresh local database', evidence: `${evidenceDir.replace('docs/qa/', '')}/database.json` };
  try { row.actual = await run() || 'Assertions passed'; row.status = 'PASS'; }
  catch (error) { row.actual = error.message; row.status = 'FAIL'; }
  rows.push(row); console.log(`${row.id} ${row.status} ${scenario}`);
}
async function client() { const connection = new pg.Client(db.connection); await connection.connect(); return connection; }
async function asRole(role, subject, sql, args = [], commit = false) {
  const c = await client();
  try {
    await c.query('BEGIN'); await c.query(`SET LOCAL ROLE ${role}`);
    await c.query("SELECT set_config('request.jwt.claim.sub', $1, true), set_config('request.jwt.claim.role', $2, true)", [subject || '', role]);
    const result = await c.query(sql, args);
    if (commit) await c.query('COMMIT');
    return result;
  } finally { await c.query('ROLLBACK'); await c.end(); }
}
try {
  db = await startDisposablePostgres(); const c = db.client;
  await c.query(`
    CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT current_setting('request.jwt.claim.role', true) $$;
    CREATE TABLE public.children(id uuid PRIMARY KEY, grade_level integer NOT NULL, auth_uid uuid REFERENCES auth.users(id));
    CREATE TABLE public.teacher_profiles(user_id uuid PRIMARY KEY REFERENCES auth.users(id), grade_levels integer[] NOT NULL);
    CREATE TABLE public.child_progress(child_id uuid PRIMARY KEY REFERENCES children(id), xp integer DEFAULT 0, achievements jsonb DEFAULT '[]', updated_at timestamptz DEFAULT now());
  `);
  for (const key of ['admin', 'teacher', 'parent', 'student', 'otherTeacher', 'otherStudent']) await c.query('INSERT INTO auth.users VALUES($1)', [ids[key]]);
  await c.query('INSERT INTO children VALUES ($1,1,$2),($3,1,$4),($5,2,NULL)', [ids.child, ids.student, ids.child2, ids.otherStudent, ids.wrongGrade]);
  await c.query('INSERT INTO teacher_profiles VALUES ($1,ARRAY[1]),($2,ARRAY[2])', [ids.teacher, ids.otherTeacher]);
  await c.query('INSERT INTO child_progress(child_id) VALUES($1),($2)', [ids.child, ids.child2]);
  const workspace = fs.readFileSync('migrations/004_teacher_workspace.sql', 'utf8');
  await c.query(workspace.slice(0, workspace.indexOf('-- pdf_materials  (insert only')));
  await c.query(fs.readFileSync('migrations/026_atomic_badge_awards.sql', 'utf8'));
  await c.query(fs.readFileSync('migrations/046_sections_and_reading_support_groups.sql', 'utf8'));
  await c.query('GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role; GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role');
  await c.query('INSERT INTO class_sections(id,name,grade_level,adviser_id,capacity) VALUES($1,\'QA capacity\',1,$2,1),($3,\'QA race\',1,$2,1)', [ids.section, ids.teacher, ids.section2]);
  await c.query('INSERT INTO section_students(section_id,student_id) VALUES($1,$2)', [ids.section, ids.child]);
  try { await c.query('INSERT INTO section_students(section_id,student_id) VALUES($1,$2) ON CONFLICT DO NOTHING', [ids.section, ids.child]); reproductions.push({ defect: 'Repeated assignment at capacity', reproduced: false }); }
  catch (error) { reproductions.push({ defect: 'Repeated assignment at capacity', reproduced: /capacity/.test(error.message), actual: error.message }); }
  const a = await client(), b = await client();
  try {
    await a.query('BEGIN'); await b.query('BEGIN');
    await a.query('INSERT INTO section_students(section_id,student_id) VALUES($1,$2)', [ids.section2, ids.child]);
    await b.query('INSERT INTO section_students(section_id,student_id) VALUES($1,$2)', [ids.section2, ids.child2]);
    await a.query('COMMIT'); await b.query('COMMIT');
    const { rows: counts } = await c.query('SELECT count(*)::int AS count FROM section_students WHERE section_id=$1', [ids.section2]);
    reproductions.push({ defect: 'Concurrent assignments exceed capacity', reproduced: counts[0].count === 2, actual: `${counts[0].count} members in a capacity-1 section` });
  } finally { await a.end(); await b.end(); }
  await c.query('DELETE FROM section_students WHERE section_id=$1', [ids.section2]);
  await c.query(fs.readFileSync('migrations/047_atomic_section_assignments.sql', 'utf8'));
  await c.query(fs.readFileSync('migrations/048_section_capacity_snapshot_safety.sql', 'utf8'));
  await check('Historical capacity defects reproduced before applying the additive fix', () => assert.ok(reproductions.every(r => r.reproduced)));
  await check('Duplicate membership at capacity is idempotent', async () => { await c.query('INSERT INTO section_students(section_id,student_id) VALUES($1,$2) ON CONFLICT DO NOTHING', [ids.section, ids.child]); });
  await check('Concurrent inserts cannot exceed section capacity', async () => {
    const left = await client(), right = await client();
    try {
      await left.query('BEGIN'); await left.query('INSERT INTO section_students(section_id,student_id) VALUES($1,$2)', [ids.section2, ids.child]);
      const waiting = right.query('INSERT INTO section_students(section_id,student_id) VALUES($1,$2)', [ids.section2, ids.child2]).then(() => null, error => error);
      await left.query('COMMIT'); const error = await waiting; assert.match(error?.message || '', /capacity/);
      assert.equal((await c.query('SELECT count(*)::int AS n FROM section_students WHERE section_id=$1', [ids.section2])).rows[0].n, 1);
    } finally { await left.query('ROLLBACK'); await left.end(); await right.end(); }
  });
  await check('Grade mismatch is rejected', async () => { await assert.rejects(c.query('INSERT INTO section_students(section_id,student_id) VALUES($1,$2)', [ids.section2, ids.wrongGrade]), /grade/); });
  await check('Section capacity and grade constraints reject invalid CRUD', async () => { await assert.rejects(c.query("INSERT INTO class_sections(name,grade_level,adviser_id,capacity) VALUES('Invalid',7,$1,36)", [ids.teacher]), /check constraint/); });
  await check('Adviser foreign key prevents orphan sections', async () => { await assert.rejects(c.query('DELETE FROM auth.users WHERE id=$1', [ids.teacher]), /foreign key/); });
  await check('Teacher sees only own sections under real RLS', async () => { assert.equal((await asRole('authenticated', ids.teacher, 'SELECT * FROM class_sections')).rows.length, 2); assert.equal((await asRole('authenticated', ids.otherTeacher, 'SELECT * FROM class_sections')).rows.length, 0); });
  for (const key of ['admin', 'parent', 'student']) await check(`${key} browser role cannot read section rosters`, async () => { assert.equal((await asRole('authenticated', ids[key], 'SELECT * FROM section_students')).rows.length, 0); });
  await check('Anonymous cannot read section rosters', async () => { assert.equal((await asRole('anon', null, 'SELECT * FROM section_students')).rows.length, 0); });
  await check('Authenticated browser cannot insert section membership', async () => { const section='00000000-0000-4000-8000-000000000077'; await c.query("INSERT INTO class_sections(id,name,grade_level,adviser_id) VALUES($1,'QA RLS insert',1,$2)",[section,ids.teacher]); await assert.rejects(asRole('authenticated', ids.teacher, 'INSERT INTO section_students(section_id,student_id) VALUES($1,$2)', [section, ids.child2]), /row-level security/); });
  await check('Authenticated browser cannot execute service-only assignment RPC', async () => { await assert.rejects(asRole('authenticated', ids.admin, 'SELECT assign_section_students($1,$2,$3)', [ids.section, [ids.child], ids.admin]), /permission denied/); });
  await check('Service assignment repairs an existing membership roster atomically', async () => { const result = await asRole('service_role', null, 'SELECT assign_section_students($1,$2,$3) AS result', [ids.section, [ids.child,ids.child], ids.admin], true); assert.equal(result.rows[0].result.success, true); assert.equal((await c.query('SELECT count(*)::int AS n FROM teacher_student_links WHERE teacher_id=$1 AND student_id=$2',[ids.teacher,ids.child])).rows[0].n,1); assert.equal((await c.query('SELECT count(*)::int AS n FROM section_students WHERE section_id=$1',[ids.section])).rows[0].n,1); });
  await check('Roster trigger failure rolls back newly inserted memberships', async () => {
    const section = '00000000-0000-4000-8000-000000000099';
    await c.query("INSERT INTO class_sections(id,name,grade_level,adviser_id) VALUES($1,'QA rollback',1,$2)", [section, ids.otherTeacher]);
    await assert.rejects(asRole('service_role', null, 'SELECT assign_section_students($1,$2,$3)', [section, [ids.child], ids.admin]), /outside/);
    assert.equal((await c.query('SELECT count(*)::int AS n FROM section_students WHERE section_id=$1', [section])).rows[0].n, 0);
  });
  await check('Missing section and empty assignment payload fail explicitly', async () => { await assert.rejects(asRole('service_role', null, 'SELECT assign_section_students($1,$2,$3)', [ids.section, [], ids.admin]), /one to 35/); await assert.rejects(asRole('service_role', null, 'SELECT assign_section_students($1,$2,$3)', ['00000000-0000-4000-8000-000000000088', [ids.child], ids.admin]), /not found/); });
  await check('Badge award is idempotent with one XP credit', async () => { const awards = JSON.stringify([{id:'qa_badge',xp:25}]); await asRole('service_role', null, 'SELECT award_student_badges($1,$2)', [ids.child, awards]); /* role helper rolls back: commit actual service transaction below */ await c.query('SELECT award_student_badges($1,$2)', [ids.child, awards]); await c.query('SELECT award_student_badges($1,$2)', [ids.child, awards]); assert.equal((await c.query('SELECT xp FROM child_progress WHERE child_id=$1', [ids.child])).rows[0].xp,25); });
  await check('Concurrent distinct badges preserve both XP credits', async () => { const left = await client(), right = await client(); try { await Promise.all([left.query('SELECT award_student_badges($1,$2)', [ids.child2, JSON.stringify([{id:'qa_one',xp:25}])]), right.query('SELECT award_student_badges($1,$2)', [ids.child2, JSON.stringify([{id:'qa_two',xp:50}])])]); assert.equal((await c.query('SELECT xp FROM child_progress WHERE child_id=$1', [ids.child2])).rows[0].xp,75); } finally { await left.end(); await right.end(); } });
  await check('Malformed badge payload rolls back all awards and XP', async () => { await assert.rejects(c.query('SELECT award_student_badges($1,$2)', [ids.child, JSON.stringify([{id:'qa_valid',xp:10},{id:'INVALID!',xp:10}])]), /invalid badge/); assert.equal((await c.query("SELECT count(*)::int AS n FROM student_badge_awards WHERE badge_id='qa_valid'")).rows[0].n,0); });
  await check('Student cannot execute privileged badge award RPC', async () => { await assert.rejects(asRole('authenticated', ids.student, 'SELECT award_student_badges($1,$2)', [ids.child, '[]']), /permission denied/); });
  await check('Anonymous cannot insert badge awards directly', async () => { await assert.rejects(asRole('anon', null, "INSERT INTO student_badge_awards VALUES($1,'qa_forged',500,now())", [ids.child]), /row-level security/); });
  await check('Deleting a disposable section cascades only its memberships', async () => { await c.query('DELETE FROM class_sections WHERE id=$1', [ids.section2]); assert.equal((await c.query('SELECT count(*)::int AS n FROM section_students WHERE section_id=$1', [ids.section2])).rows[0].n,0); assert.equal((await c.query('SELECT count(*)::int AS n FROM children')).rows[0].n,3); });
  await check('Membership updates cannot move into a full section but can replace one existing member', async () => { const section='00000000-0000-4000-8000-000000000077'; await c.query('INSERT INTO section_students(section_id,student_id) VALUES($1,$2)',[section,ids.child2]); await assert.rejects(c.query('UPDATE section_students SET section_id=$1 WHERE section_id=$2',[ids.section,section]),/capacity/); await c.query('UPDATE section_students SET student_id=$1 WHERE section_id=$2',[ids.child2,ids.section]); assert.equal((await c.query('SELECT student_id FROM section_students WHERE section_id=$1',[ids.section])).rows[0].student_id,ids.child2); });
  await check('Repeatable-read transactions cannot overfill a section', async () => {
    const section='00000000-0000-4000-8000-000000000066';
    await c.query("INSERT INTO class_sections(id,name,grade_level,adviser_id,capacity) VALUES($1,'QA repeatable read',1,$2,1)",[section,ids.teacher]);
    const left=await client(),right=await client();
    try{
      await left.query('BEGIN ISOLATION LEVEL REPEATABLE READ');await right.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
      await right.query('SELECT count(*) FROM section_students WHERE section_id=$1',[section]);
      await left.query('INSERT INTO section_students(section_id,student_id) VALUES($1,$2)',[section,ids.child]);
      const waiting=right.query('INSERT INTO section_students(section_id,student_id) VALUES($1,$2)',[section,ids.child2]).then(()=>null,error=>error);
      await left.query('COMMIT');const error=await waiting;if(error)await right.query('ROLLBACK');else await right.query('COMMIT');
      const count=(await c.query('SELECT count(*)::int AS n FROM section_students WHERE section_id=$1',[section])).rows[0].n;
      assert.equal(count,1,'Capacity must hold even when the second transaction has an older snapshot');
      assert.ok(error && (error.code==='40001'||error.code==='22023'));
    }finally{await left.query('ROLLBACK');await right.query('ROLLBACK');await left.end();await right.end();}
  });
  await check('Read-only schema preflight compiles and reports missing fixture dependencies without invoking RPCs', async () => {
    const result=await c.query(fs.readFileSync('docs/qa/ISOLATED_SCHEMA_PREFLIGHT.sql','utf8'));
    assert.ok(Array.isArray(result));
    assert.ok(result.flatMap(r=>r.rows).some(row=>row.present===false),'Minimal fixture must not be mistaken for the complete application baseline');
  });
  const legacyDir=path.resolve(process.env.QA_MOBILE_MIGRATIONS_DIR || '../LinawLm/LinawLm/migration/migrations');
  await db.cluster.createDatabase('legacy_schema_probe');
  const legacy=db.cluster.getPgClient('legacy_schema_probe','127.0.0.1');await legacy.connect();
  try{
    await legacy.query("CREATE SCHEMA auth; CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$; CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT current_setting('request.jwt.claim.role',true) $$;");
    const original=fs.readFileSync(path.join(legacyDir,'001_schema.sql'),'utf8');
    await check('Historical mobile 001 fails real PostgreSQL parsing at unsupported policy syntax',async()=>{await assert.rejects(legacy.query(original),error=>error.code==='42601'&&/NOT/.test(error.message));});
    await legacy.query(original.slice(0,original.indexOf('-- Optional: create profile')));
    await legacy.query(fs.readFileSync(path.join(legacyDir,'002_new_tables.sql'),'utf8'));
    await check('Historical TEXT foundation cannot apply the UUID-dependent child RLS migration',async()=>{await assert.rejects(legacy.query(fs.readFileSync(path.join(legacyDir,'017_children_rls.sql'),'utf8')),error=>error.code==='42883'&&/text = uuid/.test(error.message));});
  }finally{await legacy.end();}
  await check('Concurrent service-role assignment RPCs preserve capacity under repeatable read',async()=>{
    const section='00000000-0000-4000-8000-000000000055';
    await c.query("INSERT INTO class_sections(id,name,grade_level,adviser_id,capacity) VALUES($1,'QA RPC snapshot',1,$2,1)",[section,ids.teacher]);
    const left=await client(),right=await client();
    try{
      for(const conn of [left,right]){await conn.query('BEGIN ISOLATION LEVEL REPEATABLE READ');await conn.query('SET LOCAL ROLE service_role');}
      await right.query('SELECT count(*) FROM section_students WHERE section_id=$1',[section]);
      await left.query('SELECT assign_section_students($1,$2,$3)',[section,[ids.child],ids.admin]);
      const waiting=right.query('SELECT assign_section_students($1,$2,$3)',[section,[ids.child2],ids.admin]).then(()=>null,error=>error);
      await left.query('COMMIT');const error=await waiting;assert.equal(error?.code,'40001');await right.query('ROLLBACK');
      assert.equal((await c.query('SELECT count(*)::int AS n FROM section_students WHERE section_id=$1',[section])).rows[0].n,1);
    }finally{await left.query('ROLLBACK');await right.query('ROLLBACK');await left.end();await right.end();}
  });
} catch(error) { rows.push({id:'DB-SETUP',module:'Disposable PostgreSQL integration',scenario:'Initialize local migration fixture',status:'BLOCKED',expected:'Fresh local PostgreSQL available',actual:error.message,evidence:'evidence/phase2/database.json'}); }
finally {
  fs.mkdirSync(evidenceDir, {recursive:true});
  fs.writeFileSync(`${evidenceDir}/database.json`, JSON.stringify({runId:process.env.QA_DB_RUN_ID,timestamp:new Date().toISOString(),version:db?.version,scope:'Fresh loopback PostgreSQL; synthetic users with Admin/Teacher/Parent/Student identities. SQL claims emulate Supabase auth helpers only. NOT a Supabase Auth/PostgREST/Storage test or full migration replay. Exact 004 roster SQL excerpt, 026, 046, 047 and additive 048 executed against a minimal UUID foundation. Historical mobile 001/002/017 separately probed for syntax/type incompatibilities; authoritative full baseline remains unavailable.',reproductions,rows},null,2)+'\n');
  if(db) await db.stop();
  if(rows.some(r=>r.status!=='PASS')) process.exitCode=1;
}
