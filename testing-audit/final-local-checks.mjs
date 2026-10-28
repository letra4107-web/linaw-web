import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { inspectCredentials } from './github-credential-detector.mjs';
const out = process.env.QA_EVIDENCE_DIR || 'testing-audit/evidence/final-verification/gates';
fs.mkdirSync(out, { recursive: true });
const hash = (file) => fs.existsSync(file) ? createHash('sha256').update(fs.readFileSync(file)).digest('hex') : null;
const environments = new Map(['.env', '.env.production', 'server/.env'].map((file) => [file, hash(file)]));
const index = hash('.git/index');
function git(args) { const result = spawnSync('git', args, { windowsHide: true, encoding: 'utf8' }); if (result.status !== 0) throw new Error(`Read-only Git check failed: ${args[0]}`); return result.stdout; }
const head = git(['rev-parse', 'HEAD']), refs = git(['for-each-ref', '--format=%(refname) %(objectname)']);
const result = process.argv.includes('--artifacts-only') ? { status: 0, stdout: 'Artifact-only follow-up; original gate and preservation evidence retained.' } : spawnSync(process.execPath, ['scripts/qa-checks.mjs'], { windowsHide: true, encoding: 'utf8', timeout: 900000, maxBuffer: 10000000, env: { ...process.env, QA_EVIDENCE_DIR: out, E2E_ALLOW_STAGING_TESTS: 'false' } });
console.log(result.stdout || '');
const preservation = { generatedAt: new Date().toISOString(), environments: [...environments].map(([file, before]) => ({ file, existedBefore: before !== null, unchanged: hash(file) === before })), indexUnchanged: hash('.git/index') === index, headUnchanged: git(['rev-parse', 'HEAD']) === head, allRefsUnchanged: git(['for-each-ref', '--format=%(refname) %(objectname)']) === refs, scope: 'Comparisons cover this final local verification run. Private hashes and values were kept only in memory. No remote query or write was performed.' };
if (!process.argv.includes('--artifacts-only')) fs.writeFileSync(`${out}/preservation.json`, JSON.stringify(preservation, null, 2) + '\n');
const parse = createRequire(new URL('../server/package.json', import.meta.url))('dotenv').parse;
const privateValues = [];
for (const file of environments.keys()) if (fs.existsSync(file)) for (const [name, value] of Object.entries(parse(fs.readFileSync(file)))) if (/(SECRET|PASSWORD|TOKEN|SERVICE_ROLE|API_KEY|PRIVATE_KEY|SMTP_PASS)/i.test(name) && !/(ANON|PUBLISHABLE)/i.test(name) && value.length >= 12) privateValues.push({ name, value });
const artifacts = [];
function scan(dir) { if (!fs.existsSync(dir)) return; for (const entry of fs.readdirSync(dir, { withFileTypes: true })) { const file = path.join(dir, entry.name); if (entry.isDirectory()) scan(file); else { const bytes = fs.readFileSync(file); const findings = inspectCredentials(bytes.toString('utf8')); const privateMatches = privateValues.filter(({ value }) => bytes.includes(Buffer.from(value))).map(({ name }) => name); const fixtureMarker = /\.(?:js|html)$/.test(file) && /__LINAW_QA_ROLE__|isolated-browser-session/.test(bytes.toString('utf8')); if (findings.length || privateMatches.length || fixtureMarker) artifacts.push({ file: file.replaceAll('\\', '/'), types: findings.map((finding) => finding.type || finding.category), privateEnvironmentNames: privateMatches, isolatedFixtureMarker: fixtureMarker }); } } }
scan('dist');
fs.writeFileSync(`${out}/production-artifact-hygiene.json`, JSON.stringify({ generatedAt: new Date().toISOString(), findings: artifacts, limitation: 'Recognized byte patterns and selected exact private environment values; no claim of exhaustive secret detection. Confirms QA role fixtures do not enter the normal production artifact when no markers are found.' }, null, 2) + '\n');
if (result.status !== 0 || preservation.environments.some((row) => !row.unchanged) || !preservation.indexUnchanged || !preservation.headUnchanged || !preservation.allRefsUnchanged || artifacts.length) process.exitCode = 1;
