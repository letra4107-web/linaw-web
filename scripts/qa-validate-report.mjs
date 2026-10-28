import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = 'docs/qa';
const results = JSON.parse(fs.readFileSync(`${root}/test-results.json`, 'utf8'));
const { summary, cases } = results;
assert.equal(new Set(cases.map((row) => row.id)).size, cases.length, 'Test IDs must be unique');
assert.equal(summary.total, cases.length);
for (const status of ['PASS', 'FAIL', 'BLOCKED', 'NOT RUN', 'NOT IMPLEMENTED']) assert.equal(summary[status], cases.filter((row) => row.status === status).length);
assert.equal(summary.executed, summary.PASS + summary.FAIL);
assert.equal(summary.passRate, Number((summary.PASS / summary.executed * 100).toFixed(2)));
const names = results.phase === 3 ? ['phase3/local-edge', 'phase3/local-chromium', 'phase3/local-firefox', 'phase3/live-edge', 'phase3/deployed-public-http', 'phase3/database'] : fs.existsSync(`${root}/evidence/phase2/local-edge.json`) ? ['phase2/local-edge', 'phase2/local-chromium', 'phase2/local-firefox', 'phase2/live-edge', 'deployed-public-http', 'phase2/database'] : ['local-browser', 'deployed-public-http'];
for (const name of names) {
  const local = JSON.parse(fs.readFileSync(`${root}/evidence/${name}.json`, 'utf8'));
  const rows = new Map(local.rows.map(row => [row.id, row]));
  const coldFile = `${root}/evidence/${name.replace('local-', 'cold-')}.json`;
  if (results.phase !== 3 && name.includes('local-') && fs.existsSync(coldFile)) for (const row of JSON.parse(fs.readFileSync(coldFile, 'utf8')).rows) rows.set(row.id, row);
  for (const row of rows.values()) assert.equal(cases.find((item) => item.id === row.id)?.status, row.status, `Latest evidence must match ${row.id}`);
}
if (results.phase === 3) {
  const db = JSON.parse(fs.readFileSync(`${root}/evidence/phase3/database.json`, 'utf8'));
  const runner = JSON.parse(fs.readFileSync(`${root}/evidence/phase3/database-runner.json`, 'utf8'));
  assert.equal(runner.runId, db.runId);
  assert.equal(runner.matchingRun, true);
  const previous = JSON.parse(fs.readFileSync(`${root}/phase2/test-results.json`, 'utf8'));
  for (const row of previous.cases) assert.ok(cases.some(item => item.id === row.id), `Phase 2 case remains visible: ${row.id}`);
  const gates = JSON.parse(fs.readFileSync(`${root}/evidence/phase3/check-summary.json`, 'utf8'));
  for (const [name, prefix] of [['backend', 'BE-'], ['frontend', 'UI-']]) {
    const gate = gates.find(row => row.name === name);
    assert.equal(cases.filter(row => row.id.startsWith(prefix) && row.status === 'PASS').length, gate.pass);
    assert.equal(cases.filter(row => row.id.startsWith(prefix) && row.status === 'BLOCKED').length, gate.skipped);
  }
}
if (results.baseline) {
  const baseline = JSON.parse(fs.readFileSync(`${root}/phase1/test-results.json`, 'utf8'));
  for (const row of baseline.cases) assert.ok(cases.some(item => item.id === row.id), `Historical case must remain visible: ${row.id}`);
  assert.equal(baseline.cases.filter(row => row.status === 'BLOCKED').length, 68);
}
const secrets = [];
if (fs.existsSync('server/.env')) {
  for (const line of fs.readFileSync('server/.env', 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (!match || !/SERVICE_ROLE_KEY|API_KEY|SMTP_PASS|SMTP_USER/.test(match[1])) continue;
    const value = match[2].trim().replace(/^['"]|['"]$/g, '');
    if (value.length >= 8) secrets.push({ name: match[1], value });
  }
}
function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? files(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
}
for (const file of files(root).filter((file) => /\.(json|md|csv|txt|tap)$/.test(file))) {
  const text = fs.readFileSync(file, 'utf8');
  for (const secret of secrets) assert.equal(text.includes(secret.value), false, `${file} must not contain ${secret.name}`);
}
console.log('Report counts, stable IDs, latest evidence outcomes, and secret redaction checks passed.');
