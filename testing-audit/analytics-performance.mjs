import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { performance } from 'node:perf_hooks';
const require = createRequire(new URL('../server/package.json', import.meta.url));
const express = require('express');
const out = process.env.QA_EVIDENCE_DIR || 'testing-audit/evidence/final-verification/performance';
fs.mkdirSync(out, { recursive: true });
const count = 10000, timestamp = new Date().toISOString(), data = {
  children: Array.from({ length: count }, (_, id) => ({ id, created_at: timestamp, grade_level: 1 })),
  users: Array.from({ length: count }, (_, id) => ({ id, created_at: timestamp, role: 'student' })),
  child_progress: Array.from({ length: count }, () => ({ xp: 25, streak: 1, achievements: ['first'] })),
  pronunciation_practice_sessions: Array.from({ length: count }, (_, id) => ({ id, created_at: timestamp, is_correct: true })),
};
const client = { from(table) { assert.ok(Object.hasOwn(data, table)); return { select: async () => ({ data: data[table], error: null }) }; } };
const filename = path.resolve('server/routes/admin.js'), actualRequire = createRequire(filename), module = { exports: {} };
vm.runInNewContext(fs.readFileSync(filename, 'utf8'), { module, exports: module.exports, console: { error() {} }, require(name) {
  if (name === '../config/supabase') return { supabaseAdmin: client };
  if (name === '../config/mailer') return { sendMail: async () => assert.fail('No external delivery') };
  if (name === '../middleware/auth') return { requireAuth: (_req, _res, next) => next(), requireRole: () => (_req, _res, next) => next() };
  return actualRequire(name);
} }, { filename });
const app = express(); app.use(module.exports);
const server = await new Promise((resolve) => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
const latencies = [], before = process.memoryUsage().heapUsed;
let report = { id: 'PERF-LOCAL-001', scope: 'Actual Express analytics route over local HTTP, four synthetic 10,000-row in-memory query results; query/auth/service network latency excluded. Ten simultaneous requests. No production SLA or capacity certification.', status: 'FAIL' };
try {
  const started = performance.now();
  await Promise.all(Array.from({ length: 10 }, async () => {
    const start = performance.now(), response = await fetch(`http://127.0.0.1:${server.address().port}/analytics`), body = await response.json();
    assert.equal(response.status, 200); assert.equal(body.totals.children, count); assert.equal(body.totals.studentAccounts, count); assert.equal(body.totals.totalXp, count * 25); assert.equal(body.totals.badgeUnlockCount, count); assert.equal(body.totals.practiceSessions, count);
    latencies.push(performance.now() - start);
  }));
  latencies.sort((a, b) => a - b);
  report = { ...report, status: 'PASS', requests: latencies.length, wallMs: performance.now() - started, p50Ms: latencies[4], p95Ms: latencies[9], heapDeltaBytes: process.memoryUsage().heapUsed - before, assertions: 'All ten responses contain the expected totals; no throughput threshold asserted.' };
} catch (error) { report.actual = error.message; process.exitCode = 1; }
finally { await new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }); }
fs.writeFileSync(`${out}/analytics.json`, JSON.stringify({ generatedAt: new Date().toISOString(), ...report }, null, 2) + '\n');
console.log(JSON.stringify(report));
