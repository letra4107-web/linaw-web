import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';

// Never reads .env or contacts Supabase. The parent requires a fresh report
// because embedded-postgres exit hooks can otherwise mask setup failures.
if (!process.argv.includes('--worker')) {
  const runId = randomUUID();
  const report = path.resolve('.qa', `audit-user-deletion-${runId}.json`);
  fs.mkdirSync(path.dirname(report), { recursive: true });
  const child = spawn(process.execPath, [path.resolve('scripts/qa-audit-user-deletion.mjs'), '--worker', report, runId], { stdio: 'inherit', windowsHide: true });
  const code = await new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', resolve); });
  try {
    const result = JSON.parse(fs.readFileSync(report, 'utf8'));
    assert.equal(code, 0);
    assert.equal(result.runId, runId);
    assert.ok(result.cases.length >= 9 && result.cases.every(item => item.pass));
    console.log(`PASS: ${result.cases.length} audit/user deletion PostgreSQL checks`);
  } catch (error) {
    console.error('FAIL:', error.message);
    process.exitCode = 1;
  }
} else {
  const { startDisposablePostgres } = await import('./qa-postgres.mjs');
  const cases = [];
  let db;
  const actor = '00000000-0000-4000-8000-000000000001';
  const other = '00000000-0000-4000-8000-000000000002';
  const migration = fs.readFileSync('migrations/063_allow_audit_actor_cleanup.sql', 'utf8');
  const check = async (name, run) => {
    await run();
    cases.push({ name, pass: true });
    console.log('PASS:', name);
  };
  try {
    db = await startDisposablePostgres();
    const c = db.client;
    await c.query(`
      CREATE ROLE anon NOLOGIN;
      CREATE ROLE authenticated NOLOGIN;
      CREATE ROLE service_role NOLOGIN BYPASSRLS;
      CREATE ROLE supabase_auth_admin NOLOGIN;
      CREATE SCHEMA auth;
      CREATE TABLE auth.users(id uuid PRIMARY KEY);
      GRANT USAGE ON SCHEMA auth TO supabase_auth_admin;
      GRANT SELECT, DELETE ON auth.users TO supabase_auth_admin;
    `);
    await c.query(fs.readFileSync('migrations/030_admin_audit_logs.sql', 'utf8'));
    await c.query(`
      INSERT INTO auth.users VALUES ('${actor}'), ('${other}');
      INSERT INTO public.audit_logs(actor_id, actor_role, actor_name, action, module, status, metadata)
      VALUES ('${actor}', 'parent', 'Synthetic parent', 'AUTH.LOGIN_SUCCESS', 'auth', 'successful', '{"source":"test"}'),
             ('${actor}', 'parent', 'Synthetic parent', 'AUTH.LOGOUT', 'auth', 'successful', '{}'),
             ('${other}', 'teacher', 'Synthetic teacher', 'AUTH.LOGIN_SUCCESS', 'auth', 'successful', '{}'),
             (NULL, NULL, NULL, 'SYSTEM.EVENT', 'system', 'successful', '{}');
    `);
    const snapshot = async () => (await c.query('SELECT to_jsonb(a) AS event FROM public.audit_logs a ORDER BY id')).rows.map(row => row.event);
    const original = await snapshot();
    const blocked = sql => assert.rejects(c.query(sql), error => error.code === 'P0001' && error.message === 'Audit logs are append-only');

    await check('original migration reproduces the Auth deletion failure', async () => {
      await blocked(`DELETE FROM auth.users WHERE id='${actor}'`);
      assert.deepEqual(await snapshot(), original);
    });
    await check('repair can be applied twice without changing audit history', async () => {
      await c.query(migration);
      await c.query(migration);
      assert.deepEqual(await snapshot(), original);
    });
    await check('ordinary audit edits, deletions and actor reassignment remain blocked', async () => {
      for (const sql of [
        `UPDATE public.audit_logs SET actor_id=NULL WHERE actor_id='${actor}'`,
        `UPDATE public.audit_logs SET actor_id='${other}' WHERE actor_id='${actor}'`,
        `UPDATE public.audit_logs SET actor_id=NULL, actor_name='edited' WHERE actor_id='${actor}'`,
        "UPDATE public.audit_logs SET metadata='{}'",
        "UPDATE public.audit_logs SET action='ACCOUNT.DELETE'",
        'DELETE FROM public.audit_logs',
      ]) await blocked(sql);
      assert.deepEqual(await snapshot(), original);
    });
    await check('service_role cannot clear an existing actor or edit audit events', async () => {
      await c.query('SET ROLE service_role');
      try {
        await blocked(`UPDATE public.audit_logs SET actor_id=NULL WHERE actor_id='${actor}'`);
        await blocked("UPDATE public.audit_logs SET actor_name='edited'");
      } finally { await c.query('RESET ROLE'); }
    });
    await check('browser roles still cannot write audit records', async () => {
      for (const role of ['anon', 'authenticated']) {
        await c.query(`SET ROLE ${role}`);
        try { await assert.rejects(c.query('DELETE FROM public.audit_logs'), error => error.code === '42501'); }
        finally { await c.query('RESET ROLE'); }
      }
    });
    await check('rolling back user deletion restores all actor references', async () => {
      await c.query('BEGIN');
      try {
        await c.query(`DELETE FROM auth.users WHERE id='${actor}'`);
        assert.deepEqual(await snapshot(), original.map(event => event.actor_id === actor ? { ...event, actor_id: null } : event));
      } finally { await c.query('ROLLBACK'); }
      assert.deepEqual(await snapshot(), original);
    });
    await check('Auth admin can delete a user while retaining all events and other actors', async () => {
      await c.query('SET ROLE supabase_auth_admin');
      try { await c.query(`DELETE FROM auth.users WHERE id='${actor}'`); }
      finally { await c.query('RESET ROLE'); }
      assert.equal((await c.query('SELECT count(*)::int AS n FROM auth.users WHERE id=$1', [actor])).rows[0].n, 0);
      assert.deepEqual(await snapshot(), original.map(event => event.actor_id === actor ? { ...event, actor_id: null } : event));
      await blocked("UPDATE public.audit_logs SET actor_name='edited' WHERE actor_id IS NULL");
      await blocked('DELETE FROM public.audit_logs WHERE actor_id IS NULL');
    });
    await check('a user without audit history can also be deleted', async () => {
      const id = randomUUID();
      await c.query('INSERT INTO auth.users VALUES ($1)', [id]);
      const result = await c.query('DELETE FROM auth.users WHERE id=$1', [id]);
      assert.equal(result.rowCount, 1);
    });
    await check('section adviser restrictions remain enforced', async () => {
      await c.query(`CREATE TABLE public.class_sections(adviser_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT);
        INSERT INTO public.class_sections VALUES ('${other}');`);
      const before = await snapshot();
      await assert.rejects(c.query(`DELETE FROM auth.users WHERE id='${other}'`), error =>
        ['23503', '23001'].includes(error.code) && error.constraint === 'class_sections_adviser_id_fkey');
      assert.deepEqual(await snapshot(), before);
      assert.equal((await c.query('SELECT count(*)::int AS n FROM auth.users WHERE id=$1', [other])).rows[0].n, 1);
    });
  } catch (error) {
    cases.push({ name: 'setup or verification', pass: false, error: error.message });
    console.error('FAIL:', error.message);
  } finally {
    try { if (db) await db.stop(); }
    finally { fs.writeFileSync(process.argv[3], JSON.stringify({ runId: process.argv[4], cases }, null, 2)); }
  }
}
