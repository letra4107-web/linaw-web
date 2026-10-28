import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { classify } from './credential-classifier.mjs';

// Capture all Git content in memory. Output locations/categories only: never
// matched lines, credentials, JWT payloads, email addresses or key fingerprints.
const out = 'testing-audit/evidence/resolution';
fs.mkdirSync(out, { recursive: true });
function git(args, input) {
  const result = spawnSync('git', args, { input, encoding: input ? undefined : 'utf8', windowsHide: true, maxBuffer: 256 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`Read-only Git operation failed: ${args[0]}`);
  return result.stdout;
}
const workingExamples = ['.env.example', 'server/.env.example'].map(file => ({ file, categories: classify(fs.readFileSync(file, 'utf8')), placeholderOnly: classify(fs.readFileSync(file, 'utf8')).length === 0 }));
const objects = String(git(['rev-list', '--objects', '--all'])).trim().split(/\r?\n/).flatMap(line => {
  const match = line.match(/^([0-9a-f]+) (.+)$/);
  return match && /(?:\.env(?:[./]|$)|\.env\.example$|\.(?:js|mjs|ts|tsx|json|md|ya?ml|txt|html)$)/i.test(match[2]) && !/package-lock\.json$/.test(match[2]) ? [{ oid: match[1], file: match[2] }] : [];
});
const content = git(['cat-file', '--batch'], Buffer.from(objects.map(o => o.oid).join('\n') + '\n'));
let offset = 0;
const findings = [];
for (const object of objects) {
  const end = content.indexOf(10, offset);
  const header = content.subarray(offset, end).toString('utf8').split(' ');
  const size = Number(header[2]);
  if (!Number.isFinite(size)) throw new Error('Unexpected Git object response');
  const body = content.subarray(end + 1, end + 1 + size);
  offset = end + 1 + size + 1;
  if (header[1] !== 'blob') continue;
  const categories = classify(body.toString('utf8'));
  if (categories.length) findings.push({ file: object.file, blob: object.oid, categories, changeCommits: String(git(['log', '--all', '--root', `--find-object=${object.oid}`, '--format=%H'])).trim().split(/\r?\n/).filter(Boolean) });
}
const result = { timestamp: new Date().toISOString(), scope: 'Current tracked examples and credential-shaped literals in reachable local Git history text blobs. No remote fetch, private env read or credential validity request. Unreachable objects, reflogs, other clones, remote-only branches and binary artifacts are outside this scan.', workingExamples, historyObjectsScanned: objects.length, historyFindings: findings, credentialTypesFromOriginalAudit: ['Supabase service-role key', 'SMTP password / app password', 'Brevo API key', 'ElevenLabs API key'], status: 'OPEN: owner rotation/revocation confirmation required regardless of history scan outcome' };
fs.writeFileSync(`${out}/credential-history.json`, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ workingExamples, historyObjectsScanned: objects.length, historyFindings: findings, status: result.status }));
