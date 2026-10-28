import fs from 'node:fs';
import path from 'node:path';

const destination = 'docs/qa/phase1';
fs.mkdirSync(destination, { recursive: true });
for (const name of ['REPORT.md', 'TEST_CASES.md', 'test-results.json']) {
  const target = path.join(destination, name);
  if (!fs.existsSync(target)) fs.copyFileSync(path.join('docs/qa', name), target);
}
const evidence = path.join(destination, 'evidence');
if (!fs.existsSync(evidence)) fs.cpSync('docs/qa/evidence', evidence, { recursive: true, errorOnExist: true });
console.log('Preserved the prior QA report and evidence; existing snapshots are never overwritten.');
