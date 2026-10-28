import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { inspectCredentials } from './github-credential-detector.mjs';

const evidence = 'testing-audit/evidence/github-cleanup';
fs.mkdirSync(evidence, { recursive: true });
const hash = (file) => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const privateEnvironments = new Map();
function walk(directory, visit) {
  if (!fs.existsSync(directory)) return;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!['.git', 'node_modules', 'dist', 'dist-ssr', '.qa'].includes(entry.name)) walk(file, visit);
    } else if (entry.isFile()) visit(file);
  }
}
walk('.', (file) => {
  const base = path.basename(file);
  if ((/^\.env(?:\..*)?$/.test(base) && base !== '.env.example') || base.endsWith('.env')) privateEnvironments.set(file, hash(file));
});
if (fs.existsSync('.qa/staging.env')) privateEnvironments.set('.qa/staging.env', hash('.qa/staging.env'));
const indexHash = hash('.git/index');
const result = spawnSync(process.execPath, ['scripts/qa-checks.mjs'], {
  encoding: 'utf8', windowsHide: true, timeout: 900000,
  env: { ...process.env, QA_EVIDENCE_DIR: evidence, E2E_ALLOW_STAGING_TESTS: 'false' },
});
// The existing local runner records routine TAP/build output in this directory.
console.log(result.stdout || '');
const preservation = {
  generatedAt: new Date().toISOString(),
  privateEnvironments: [...privateEnvironments].map(([file, previous]) => ({ file: file.replaceAll('\\', '/'), unchanged: fs.existsSync(file) && hash(file) === previous })),
  indexUnchanged: hash('.git/index') === indexHash,
  note: 'Private environment hashes stayed in memory and are not serialized. Comparison covers this verification run; no environment edits were made by the cleanup task.',
};
fs.writeFileSync(`${evidence}/preservation.json`, JSON.stringify(preservation, null, 2) + '\n');
const artifacts = [];
const privateValueMatches = [];
const parseEnv = createRequire(new URL('../server/package.json', import.meta.url))('dotenv').parse;
const privateValues = [];
for (const file of privateEnvironments.keys()) {
  for (const [key, value] of Object.entries(parseEnv(fs.readFileSync(file)))) {
    if (/(?:SECRET|PASSWORD|(?:^|_)PASS(?:_|$)|TOKEN|SERVICE_ROLE|API_KEY|PRIVATE_KEY)/i.test(key) && !/(?:ANON|PUBLISHABLE)/i.test(key) && value.length >= 12) privateValues.push({ key, value });
  }
}
function inspectBuild(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) inspectBuild(file);
    else if (entry.isFile()) {
      const source = fs.readFileSync(file).toString('utf8');
      const findings = inspectCredentials(source);
      if (findings.length) artifacts.push({ file: file.replaceAll('\\', '/'), findings });
      for (const { key, value } of privateValues) if (source.includes(value)) privateValueMatches.push({ file: file.replaceAll('\\', '/'), environmentKey: key });
    }
  }
}
if (fs.existsSync('dist')) inspectBuild('dist');
const credentialShapedFiles = artifacts.filter((entry) => entry.findings.some((finding) => finding.confidence.startsWith('credential-shaped'))).length;
fs.writeFileSync(`${evidence}/build-secret-scan.json`, JSON.stringify({ generatedAt: new Date().toISOString(), findings: artifacts, credentialShapedFiles, privateEnvironmentValueMatches: privateValueMatches, limitation: 'Heuristic byte-pattern scan plus exact matches of selected private env values of at least 12 characters; no OCR or compressed-content extraction; public client identifiers are not automatically secrets' }, null, 2) + '\n');
console.log(JSON.stringify({ verificationExit: result.status, environmentsPreserved: preservation.privateEnvironments.every((row) => row.unchanged), indexUnchanged: preservation.indexUnchanged, buildCandidateFiles: artifacts.length, credentialShapedFiles, privateEnvironmentValueMatches: privateValueMatches.length }));
if (result.status !== 0 || !preservation.indexUnchanged || preservation.privateEnvironments.some((row) => !row.unchanged) || credentialShapedFiles || privateValueMatches.length) process.exitCode = 1;
