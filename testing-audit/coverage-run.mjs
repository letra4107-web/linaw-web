import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const directory = process.env.QA_EVIDENCE_DIR || 'testing-audit/evidence/final-verification/coverage';
fs.mkdirSync(directory, { recursive: true });
const run = Date.now();
const c8 = 'scripts/qa-tools/node_modules/c8/bin/c8.js';
const summary = [];
for (const area of ['backend', 'frontend']) {
  const tests = fs.readdirSync(area === 'backend' ? 'server/tests' : 'tests').filter((name) => name.endsWith(area === 'backend' ? '.test.js' : '.test.mjs')).map((name) => path.join(area === 'backend' ? 'server/tests' : 'tests', name));
  const generated = path.resolve('.qa', `frontend-coverage-${run}`);
  const options = area === 'backend'
    ? ['--all', '--src=server', '--include=server/**', '--exclude=server/tests/**', '--exclude=server/scripts/**']
    : ['--include=src/**', `--include=.qa/frontend-coverage-${run}/**`, '--exclude-after-remap'];
  const args = [c8, ...options, '--clean=false', `--temp-directory=.qa/coverage-${run}-${area}`, `--reports-dir=${directory}/${area}`, '--reporter=json-summary', '--reporter=json', '--reporter=html', process.execPath, '--test', ...tests];
  const result = spawnSync(process.execPath, args, { encoding: 'utf8', timeout: 300000, maxBuffer: 10000000, windowsHide: true, env: { ...process.env, E2E_ALLOW_STAGING_TESTS: 'false', ...(area === 'frontend' ? { QA_FRONTEND_COVERAGE_DIR: generated } : {}) } });
  fs.writeFileSync(`${directory}/${area}.tap`, (result.stdout || '') + (result.stderr || ''));
  const counts = Object.fromEntries([...(result.stdout || '').matchAll(/^# (tests|pass|fail|skipped|cancelled) (\d+)$/gm)].map((match) => [match[1], Number(match[2])]));
  const coverageFile = `${directory}/${area}/coverage-summary.json`;
  const coverage = fs.existsSync(coverageFile) ? JSON.parse(fs.readFileSync(coverageFile)) : null;
  const row = { area, exitCode: result.status, ...counts, files: coverage ? Object.keys(coverage).filter((file) => file !== 'total').length : 0, totals: coverage?.total, scope: area === 'backend' ? 'c8 --all for backend JS excluding tests and operator scripts; unloaded eligible files included' : 'Source-mapped frontend TS units executed through the test loader; loaded modules only; excludes browser rendering coverage and unloaded pages' };
  summary.push(row); console.log(JSON.stringify(row));
}
fs.writeFileSync(`${directory}/summary.json`, JSON.stringify({ generatedAt: new Date().toISOString(), summary, note: 'Backend and frontend scopes are different. No combined coverage percentage is calculated.' }, null, 2) + '\n');
if (summary.some((row) => row.exitCode !== 0 || !row.files)) process.exitCode = 1;
