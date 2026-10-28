import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

// Never echo origin's URL or authentication errors: those may embed credentials.
const result = spawnSync('git', ['ls-remote', '--refs', 'origin'], {
  encoding: 'utf8', timeout: 45000, windowsHide: true,
  env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never' },
});
const refs = (result.stdout || '').split(/\r?\n/).filter(Boolean).flatMap((line) => {
  const match = line.match(/^([0-9a-f]{40,64})\t(refs\/[^\s]+)$/);
  return match ? [{ name: match[2], object: match[1] }] : [];
});
const status = result.status === 0 ? 'PASS: read-only remote ref advertisement retrieved' : 'BLOCKED: remote inventory unavailable';
const error = result.stderr || '';
const failureCategory = result.status === 0 ? null : /resolve|proxy|connect|network|timed out/i.test(error) ? 'Network/proxy/connection failure; raw error withheld' : /authentication|username|credential|denied/i.test(error) ? 'Authentication/access unavailable; raw error withheld' : 'Git command failed; raw error withheld';
const evidence = { generatedAt: new Date().toISOString(), status, exitCode: result.status, refs, failureCategory, limitations: ['No remote objects fetched', 'Advertised refs do not inventory forks, caches, deleted refs, artifacts or private GitHub metadata'] };
fs.mkdirSync('testing-audit/evidence/github-cleanup', { recursive: true });
fs.writeFileSync('testing-audit/evidence/github-cleanup/remote-refs.json', JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify(evidence));
if (result.status !== 0) process.exitCode = 1;
