import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const output = process.env.QA_EVIDENCE_DIR || 'testing-audit/evidence/final-verification/advisories-restricted';
fs.mkdirSync(output, { recursive: true });
const results = [];
for (const [name, directory] of [['frontend', '.'], ['backend', 'server'], ['qa-tools', 'scripts/qa-tools']]) {
  const result = spawnSync('cmd.exe', ['/d', '/s', '/c', 'npm.cmd audit --json --fetch-retries=0 --fetch-timeout=20000'], { cwd: path.resolve(directory), encoding: 'utf8', timeout: 60000, maxBuffer: 5000000, windowsHide: true });
  let parsed;
  try { parsed = JSON.parse(result.stdout); } catch { /* Never echo raw authentication/network diagnostics. */ }
  const data = { generatedAt: new Date().toISOString(), workspace: name, exitCode: result.status, status: parsed?.metadata?.vulnerabilities ? parsed.metadata.vulnerabilities.total ? 'FAIL: registry advisories found' : 'PASS: no registry advisories reported' : 'BLOCKED: registry audit unavailable', metadata: parsed?.metadata || null, vulnerabilities: parsed?.vulnerabilities || null, limitation: 'Registry advisory inventory only; not a complete security review' };
  fs.writeFileSync(`${output}/${name}.json`, JSON.stringify(data, null, 2) + '\n');
  results.push(data); console.log(JSON.stringify({ workspace: name, exitCode: data.exitCode, status: data.status, counts: data.metadata?.vulnerabilities }));
}
if (results.some((row) => !row.status.startsWith('PASS:'))) process.exitCode = 1;
