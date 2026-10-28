import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { inspectCredentials, sensitivePath } from './github-credential-detector.mjs';

function git(args, input) {
  const result = spawnSync('git', ['-c', 'core.excludesFile=NUL', ...args], { input, encoding: 'utf8', windowsHide: true, maxBuffer: 20000000 });
  if (result.status !== 0) throw new Error(`Final Git read failed (${args[0]}); raw output withheld`);
  return result.stdout;
}
const files = [...new Set(git(['ls-files', '--cached', '--others', '--exclude-standard', '-z']).split('\0').filter(Boolean))];
const tracked = new Set(git(['ls-files', '-z']).split('\0').filter(Boolean));
const findings = [];
let scannedFiles = 0;
for (const file of files) {
  if (!fs.existsSync(file) || !fs.lstatSync(file).isFile()) continue;
  scannedFiles++;
  const found = inspectCredentials(fs.readFileSync(file).toString('utf8'));
  if (found.length) findings.push({ file, tracked: tracked.has(file), findings: found });
}
const examples = [];
for (const file of ['.env.example', 'server/.env.example']) {
  for (const scope of ['working tree', 'index', 'HEAD']) {
    const source = scope === 'working tree' ? fs.readFileSync(file, 'utf8') : git(['show', scope === 'index' ? `:${file}` : `HEAD:${file}`]);
    examples.push({ file, scope, placeholderCheck: inspectCredentials(source).length === 0 ? 'PASS' : 'FAIL' });
  }
}
const privatePaths = ['.env', '.env.production', 'server/.env', '.qa/staging.env'];
const ignored = new Set(git(['check-ignore', '--no-index', '--stdin', '-z'], privatePaths.join('\0') + '\0').split('\0').filter(Boolean));
const trackedSensitivePaths = [...tracked].flatMap((file) => sensitivePath(file) ? [{ file, category: sensitivePath(file) }] : []);
const credentialShapedFindings = findings.filter((row) => row.findings.some((finding) => finding.confidence.startsWith('credential-shaped')));
const report = {
  generatedAt: new Date().toISOString(), scannedFiles, credentialShapedFindings, candidates: findings.filter((row) => !credentialShapedFindings.includes(row)),
  examples, privatePaths: privatePaths.map((file) => ({ file, ignored: ignored.has(file), tracked: tracked.has(file) })), trackedSensitivePaths,
  limitations: ['Final current-file byte/text pass; full stored-history and PDF extraction results remain in scan.json', 'Ignores private local files; no values or hashes serialized', 'Heuristic result, not universal credential or personal-data certification'],
};
fs.writeFileSync('testing-audit/evidence/github-cleanup/current-file-verification.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ scannedFiles, credentialShapedFiles: credentialShapedFindings.length, candidateFiles: report.candidates.length, templateChecksPassed: examples.filter((row) => row.placeholderCheck === 'PASS').length, trackedSensitivePaths: trackedSensitivePaths.length, privatePathsIgnored: report.privatePaths.every((row) => row.ignored && !row.tracked) }));
if (credentialShapedFindings.length || trackedSensitivePaths.length || examples.some((row) => row.placeholderCheck !== 'PASS') || report.privatePaths.some((row) => !row.ignored || row.tracked)) process.exitCode = 1;
