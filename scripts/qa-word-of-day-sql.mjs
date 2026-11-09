import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';

// This suite never reads .env or connects to Supabase. The parent verifies a
// fresh result because embedded-postgres exit hooks can mask a worker failure.
const worker = process.argv.includes('--worker');
if (!worker) {
  const runId = randomUUID();
  const report = path.resolve('.qa', `word-of-day-sql-${runId}.json`);
  fs.mkdirSync(path.dirname(report), { recursive: true });
  const child = spawn(process.execPath, [path.resolve('scripts/qa-word-of-day-sql.mjs'), '--worker', report, runId], { stdio: 'inherit', windowsHide: true });
  const code = await new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', resolve); });
  try {
    const result = JSON.parse(fs.readFileSync(report, 'utf8'));
    assert.equal(code, 0); assert.equal(result.runId, runId);
    assert.ok(result.cases.length >= 12 && result.cases.every(item => item.pass));
    console.log(`PASS: ${result.cases.length} Word of the Day PostgreSQL checks`);
  } catch (error) { console.error('FAIL:', error.message); process.exitCode = 1; }
} else {
  const { startDisposablePostgres } = await import('./qa-postgres.mjs');
  const { default: pg } = await import('./qa-tools/node_modules/pg/lib/index.js');
  const cases = [];
  let db;
  const student = '00000000-0000-4000-8000-000000000001';
  const other = '00000000-0000-4000-8000-000000000002';
  const log = '00000000-0000-4000-8000-000000000003';
  async function connection(role = 'service_role') {
    const c = new pg.Client(db.connection); await c.connect();
    await c.query(`SET ROLE ${role}`);
    await c.query("SELECT set_config('request.jwt.claim.role', $1, false)", [role]);
    return c;
  }
  const args = (number = 1, correct = true) => [student, log, 'araw', number, correct ? 100 : 0, correct];
  const sql = 'SELECT public.record_web_word_of_day_attempt($1,$2,$3,$4,$5,$6) AS result';
  async function attempt(values = args(), role = 'service_role') {
    const c = await connection(role);
    try { return (await c.query(sql, values)).rows[0].result; } finally { await c.end(); }
  }
  async function reset() {
    await db.client.query(`TRUNCATE word_of_day_log, child_progress CASCADE;
      INSERT INTO child_progress(child_id,xp,streak,longest_streak,last_practice_date)
      VALUES ('${student}',100,4,9,(clock_timestamp() AT TIME ZONE 'Asia/Manila')::date-1),('${other}',0,0,0,NULL);
      INSERT INTO word_of_day_log(id,child_id,word,date) VALUES('${log}','${student}','araw',(clock_timestamp() AT TIME ZONE 'Asia/Manila')::date);`);
  }
  async function snapshot() {
    const c = db.client;
    return { progress: (await c.query('SELECT * FROM child_progress ORDER BY child_id')).rows,
      log: (await c.query('SELECT * FROM word_of_day_log')).rows,
      receipts: (await c.query('SELECT * FROM word_of_day_web_attempt_receipts')).rows };
  }
  async function check(name, run) {
    try { await reset(); await run(); cases.push({ name, pass: true }); console.log('PASS:', name); }
    catch (error) { cases.push({ name, pass: false, error: error.message }); console.error('FAIL:', name, error.message); }
  }
  try {
    db = await startDisposablePostgres();
    await db.client.query(`CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN;
      CREATE ROLE service_role NOLOGIN BYPASSRLS;
      CREATE SCHEMA auth;
      CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT current_setting('request.jwt.claim.role',true) $$;
      GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;
      CREATE TABLE children(id uuid PRIMARY KEY);
      CREATE TABLE child_progress(child_id uuid PRIMARY KEY REFERENCES children(id),xp int DEFAULT 0,streak int DEFAULT 0,longest_streak int DEFAULT 0,last_practice_date date,updated_at timestamptz DEFAULT now());
      CREATE TABLE word_of_day_log(id uuid PRIMARY KEY,child_id uuid REFERENCES children(id),word text,date date,attempts int DEFAULT 0,accuracy int,correct bool,xp_awarded int NOT NULL DEFAULT 0,completed_at timestamptz,UNIQUE(child_id,date));
      INSERT INTO children VALUES('${student}'),('${other}');`);
    const migration = fs.readFileSync('migrations/051_atomic_word_of_day_attempt.sql', 'utf8');
    await db.client.query(migration);
    await check('migration can be reapplied without changing existing results', async () => {
      await attempt(); const before = await snapshot(); await db.client.query(migration); assert.deepEqual(await snapshot(), before);
    });
    await check('correct answer commits exactly 25 XP and Manila-day streak', async () => {
      const r = await attempt(); assert.equal(r.xpAwarded,25); assert.equal(r.newXp,125); assert.equal(r.newStreak,5);
      const s = await snapshot(); assert.equal(s.log[0].attempts,1); assert.ok(s.log[0].completed_at); assert.equal(s.receipts.length,1);
    });
    await check('lost acknowledgement replay does not duplicate XP, even next day', async () => {
      await attempt(); await db.client.query("UPDATE word_of_day_log SET date=date-1");
      const r = await attempt(); assert.equal(r.replayed,true); assert.equal(r.xpAwarded,0); assert.equal(r.newXp,125);
    });
    await check('twenty concurrent SQL sessions award only once', async () => {
      const results = await Promise.all(Array.from({length:20},()=>attempt()));
      assert.equal(results.reduce((sum,r)=>sum+r.xpAwarded,0),25); assert.equal(results.filter(r=>r.replayed).length,19);
      assert.equal((await snapshot()).receipts.length,1);
    });
    await check('wrong attempts replay without consuming another try; third finalizes without XP', async () => {
      assert.equal((await attempt(args(1,false))).isFinal,false);
      assert.equal((await attempt(args(1,false))).replayed,true);
      await attempt(args(2,false)); const r = await attempt(args(3,false));
      assert.equal(r.isFinal,true); assert.equal(r.correct,false); assert.equal(r.xpAwarded,0);
      const s = await snapshot(); assert.equal(s.progress[0].xp,100); assert.equal(s.progress[0].streak,4); assert.equal(s.log[0].attempts,3);
    });
    for (const table of ['child_progress','word_of_day_log','word_of_day_web_attempt_receipts']) {
      await check(`${table} write failure rolls back XP, streak, completion and receipt`, async () => {
        const before = await snapshot();
        await db.client.query(`CREATE FUNCTION qa_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Injected write failure'; END $$;
          CREATE TRIGGER qa_fail BEFORE INSERT OR UPDATE ON ${table} FOR EACH ROW EXECUTE FUNCTION qa_fail();`);
        try { await assert.rejects(attempt(),/Injected write failure/); assert.deepEqual(await snapshot(),before); }
        finally { await db.client.query(`DROP TRIGGER qa_fail ON ${table}; DROP FUNCTION qa_fail()`); }
        assert.equal((await attempt()).xpAwarded,25);
      });
    }
    await check('stale word, wrong owner, old date and skipped attempt cannot mutate progress', async () => {
      const before = await snapshot();
      for (const values of [[student,log,'iba',1,100,true],[other,log,'araw',1,100,true],args(3)])
        await assert.rejects(attempt(values),error=>['PT409','P0002'].includes(error.code));
      assert.deepEqual(await snapshot(),before);
      await db.client.query('UPDATE word_of_day_log SET date=date-1');
      await assert.rejects(attempt(),error=>error.code==='PT409');
    });
    await check('missing progress and legacy completion fail without guessing payment', async () => {
      await db.client.query('DELETE FROM child_progress WHERE child_id=$1',[student]);
      await assert.rejects(attempt(),error=>error.code==='PT503');
      await reset(); await db.client.query('UPDATE word_of_day_log SET completed_at=now(),correct=true,xp_awarded=25');
      await assert.rejects(attempt(),error=>error.code==='PT409'); assert.equal((await snapshot()).progress[0].xp,100);
    });
    await check('anon and authenticated roles cannot execute the RPC or read/write receipts', async () => {
      for (const role of ['anon','authenticated']) {
        await assert.rejects(attempt(args(),role),error=>error.code==='42501');
        const c = await connection(role);
        try {
          await assert.rejects(c.query('SELECT * FROM word_of_day_web_attempt_receipts'),error=>error.code==='42501');
          await assert.rejects(c.query('DELETE FROM word_of_day_web_attempt_receipts'),error=>error.code==='42501');
        } finally { await c.end(); }
      }
    });
    await check('invalid arguments and non-service claims fail before mutation', async () => {
      const before = await snapshot();
      for (const values of [args(0),[student,log,null,1,100,true],[student,log,'araw',1,101,true]])
        await assert.rejects(attempt(values),error=>error.code==='22023');
      await db.client.query("SELECT set_config('request.jwt.claim.role','authenticated',false)");
      await assert.rejects(db.client.query(sql,args()),error=>error.code==='42501');
      assert.deepEqual(await snapshot(),before);
    });
    await check('repeatable-read conflict is retryable and cannot double award', async () => {
      const left = await connection(), right = await connection();
      try {
        await right.query('BEGIN ISOLATION LEVEL REPEATABLE READ'); await right.query('SELECT count(*) FROM pg_catalog.pg_class');
        await left.query('BEGIN'); await left.query(sql,args());
        const waiting = right.query(sql,args()).then(()=>null,error=>error);
        await left.query('COMMIT'); assert.equal((await waiting)?.code,'40001');
        await right.query('ROLLBACK'); assert.equal((await attempt()).xpAwarded,0);
      } finally { await left.query('ROLLBACK'); await right.query('ROLLBACK'); await left.end(); await right.end(); }
    });
  } catch (error) { cases.push({ name:'setup',pass:false,error:error.message }); console.error(error.message); }
  finally {
    if (db) await db.stop();
    fs.writeFileSync(process.argv[3],JSON.stringify({runId:process.argv[4],cases},null,2));
  }
}
