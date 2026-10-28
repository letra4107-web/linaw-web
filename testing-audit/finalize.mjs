import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';

const base = 'testing-audit';
const gateDirectory = fs.existsSync(`${base}/evidence/resolution/gates/check-summary.json`) ? `${base}/evidence/resolution/gates` : `${base}/evidence/final`;
const summaryPath = `${gateDirectory}/check-summary.json`;
const gates = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
if (gateDirectory.includes('/resolution/')) {
  for (const name of ['backend','frontend']) {
    const buffer = fs.readFileSync(`${gateDirectory}/${name}.tap`);
    const tap = buffer.toString(buffer[0] === 255 && buffer[1] === 254 ? 'utf16le' : 'utf8').replace(/^\uFEFF/, '');
    const counts = Object.fromEntries([...tap.matchAll(/^# (tests|pass|fail|skipped|cancelled) (\d+)$/gm)].map(match => [match[1], Number(match[2])]));
    assert.equal(counts.fail, 0);
    Object.assign(gates.find(gate => gate.name === name), counts, { durationMs: Math.round(Number(tap.match(/^# duration_ms ([\d.]+)/m)?.[1])), rerunReason: 'Counts and duration reflect the latest resolution TAP, including new regressions.' });
  }
}
// Preserve the gate failure from the report helper's ANSI sanitization regex.
// Only rerun affected static gates after that helper was corrected; Node tests
// and the production build already passed against unchanged application source.
const previous = `${base}/evidence/gates-before-report-lint-fix.json`;
if (!fs.existsSync(previous)) fs.writeFileSync(previous, JSON.stringify(gates, null, 2) + '\n');
for (const [name, executable, args] of [
  ['lint', process.execPath, ['node_modules/oxlint/bin/oxlint', '--deny-warnings']],
  ['diff', 'git', ['-c', 'core.safecrlf=false', 'diff', '--check']],
]) {
  const start = performance.now();
  const result = spawnSync(executable, args, { encoding: 'utf8', windowsHide: true });
  fs.writeFileSync(`${gateDirectory}/${name}.txt`, (result.stdout || '') + (result.stderr || ''));
  const row = { name, exitCode: result.status, durationMs: Math.round(performance.now() - start), rerunReason: 'Audit report helper changed; application source unchanged since passing tests/build.' };
  gates[gates.findIndex(gate => gate.name === name)] = row;
  assert.equal(result.status, 0, `${name} failed`);
}
fs.writeFileSync(summaryPath, JSON.stringify(gates, null, 2) + '\n');
for (const script of ['inventory.mjs', 'report.mjs']) {
  const result = spawnSync(process.execPath, [`${base}/${script}`], { encoding: 'utf8', windowsHide: true });
  assert.equal(result.status, 0, result.stderr || `${script} failed`);
}
const required = ['PROJECT_INVENTORY.md','FUNCTIONALITY_AUDIT.md','UNIT_TEST_READINESS.md','INTEGRATION_TEST_READINESS.md','FUNCTIONAL_TEST_CASES.md','NON_FUNCTIONAL_TEST_CASES.md','BUG_REPORT.md','REGRESSION_TEST_RESULTS.md','FINAL_TESTING_REPORT.md'];
const failures = [];
for (const name of required) {
  const text = fs.readFileSync(`${base}/${name}`, 'utf8');
  assert.ok(text.length > 500, `${name} is incomplete`);
  for (const m of text.matchAll(/\[[^\]\n]+\]\(([^)]+)\)/g)) {
    if (/^https?:/.test(m[1])) continue;
    if (!fs.existsSync(path.resolve(base, m[1]))) failures.push({ file: name, brokenTarget: m[1] });
  }
}
function files(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(path.join(dir, entry.name)) : [path.join(dir, entry.name)]); }
const secretLocations = [];
for (const file of files(base).filter(file => /\.(?:md|csv|json|mjs|tap|txt)$/.test(file))) {
  const buffer = fs.readFileSync(file);
  const text = buffer.toString(buffer[0] === 255 && buffer[1] === 254 ? 'utf16le' : 'utf8');
  if (/\b(?:xkeysib-[a-zA-Z0-9-]{30,}|sk_[a-f0-9]{32,}|eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,})/.test(text)) secretLocations.push(file);
}
const results = JSON.parse(fs.readFileSync(`${base}/results.json`, 'utf8'));
assert.equal(results.backend.fail + results.frontend.fail, 0);
assert.ok(results.gates.every(gate => gate.exitCode === 0));
const validation = { timestamp: new Date().toISOString(), requiredReports: required.length, brokenLinks: failures, potentialCredentialLocations: secretLocations, backend: results.backend, frontend: results.frontend, status: failures.length || secretLocations.length ? 'FAIL' : 'PASS', scope: 'Report structure, artifact links, gate consistency and credential-shaped text scan only; no functionality certification.' };
fs.writeFileSync(`${base}/evidence/report-validation.json`, JSON.stringify(validation, null, 2) + '\n');
console.log(JSON.stringify(validation));
if (validation.status !== 'PASS') process.exitCode = 1;
