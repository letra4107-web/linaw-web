import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const evidence = process.env.QA_EVIDENCE_DIR || 'docs/qa/evidence/phase3';
fs.mkdirSync(evidence, { recursive: true });
const backend = fs.readdirSync('server/tests').filter((file) => file.endsWith('.test.js')).map((file) => path.join('server/tests', file));
const ui = fs.readdirSync('tests').filter((file) => file.endsWith('.test.mjs')).map((file) => path.join('tests', file));
const checks = [
  ['backend', process.execPath, ['--test', ...backend]],
  ['frontend', process.execPath, ['--test', ...ui]],
  ['lint', process.execPath, ['node_modules/oxlint/bin/oxlint', '--deny-warnings']],
  ['build', process.execPath, ['node_modules/typescript/bin/tsc', '-b']],
  ['vite-build', process.execPath, ['node_modules/vite/bin/vite.js', 'build']],
  ['diff', 'git', ['-c', 'core.safecrlf=false', 'diff', '--check']],
];
const summary = [];
for (const [name, command, args] of checks) {
  const start = performance.now();
  // This runner is always local. Dedicated service-backed suites have their
  // own explicit staging invocation; inherited shell flags must not enable them.
  const result = spawnSync(command, args, { encoding: 'utf8', windowsHide: true, timeout: 180000, env: { ...process.env, E2E_ALLOW_STAGING_TESTS: 'false' } });
  const output = `${result.stdout || ''}${result.stderr || ''}${result.error ? `\n${result.error.message}` : ''}`;
  fs.writeFileSync(`${evidence}/${name}.${['backend', 'frontend'].includes(name) ? 'tap' : 'txt'}`, output);
  const counts = Object.fromEntries([...output.matchAll(/^# (tests|pass|fail|skipped|cancelled) (\d+)$/gm)].map((match) => [match[1], Number(match[2])]));
  summary.push({ name, exitCode: result.status, durationMs: Math.round(performance.now() - start), ...counts });
  console.log(JSON.stringify(summary.at(-1)));
}
fs.writeFileSync(`${evidence}/check-summary.json`, JSON.stringify(summary, null, 2) + '\n');
if (summary.some((row) => row.exitCode !== 0)) process.exitCode = 1;
