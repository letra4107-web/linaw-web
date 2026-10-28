import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const directory = 'testing-audit/evidence/github-cleanup';
const scan = JSON.parse(fs.readFileSync(`${directory}/scan.json`, 'utf8'));
function sourceFor(row, current) {
  if (current) return fs.readFileSync(row.file, 'utf8');
  const result = spawnSync('git', ['cat-file', 'blob', row.blob], { encoding: 'utf8', windowsHide: true, maxBuffer: 10000000 });
  if (result.status !== 0) throw new Error('Unable to review candidate object; raw output withheld');
  return result.stdout;
}
const reviewed = [];
for (const scope of ['historical', 'snapshotFindings', 'index', 'workingTree', 'retainedBlobFindings']) {
  for (const row of scan[scope]) {
    const source = sourceFor(row, scope === 'workingTree');
    const lines = source.split(/\r?\n/);
    for (const finding of row.findings) {
      const line = lines[finding.line - 1] || '';
      let disposition = 'REVIEW: unclassified literal; no validity request permitted';
      if (finding.confidence.startsWith('credential-shaped')) disposition = 'OPEN: potentially real exposed credential; owner revocation confirmation required';
      else if (/errors\.password\s*=/.test(line)) disposition = 'FALSE POSITIVE: password validation feedback string';
      else if (source.includes('validateServerConfig') && /(?:GOOGLE_TTS_API_KEY|ELEVENLABS_API_KEY)\s*:/.test(line)) disposition = 'REVIEW: configuration-validation test fixture; not recognized provider token format; owner can confirm it is synthetic';
      else if (row.file.endsWith('authQa.test.mjs') && line.includes('signupHarness')) disposition = 'FALSE POSITIVE: mocked sign-up session fixture';
      reviewed.push({ scope, file: row.file, blob: row.blob, line: finding.line, category: finding.category, disposition, containingCommits: row.containingCommits || [], snapshotRefs: row.snapshotRefs || [] });
    }
  }
}
const exposed = reviewed.filter((row) => row.disposition.startsWith('OPEN:'));
const summary = {
  generatedAt: new Date().toISOString(),
  recognizedCredentialBlobs: [...new Set(exposed.map((row) => row.blob))].length,
  recognizedCredentialContainingCommits: [...new Set(exposed.flatMap((row) => row.containingCommits))],
  recognizedCredentialSnapshotRefs: [...new Set(exposed.flatMap((row) => row.snapshotRefs))],
  reviewed,
};
fs.writeFileSync(`${directory}/triage.json`, JSON.stringify(summary, null, 2) + '\n');
const csv = ['file,blob,commit,line,category'];
for (const row of exposed) for (const commit of row.containingCommits) csv.push([row.file, row.blob, commit, String(row.line), row.category].map((value) => JSON.stringify(value)).join(','));
fs.writeFileSync(`${directory}/affected-commits.csv`, csv.join('\n') + '\n');
const candidates = ['file,blob,commit,line,category,disposition'];
for (const row of reviewed.filter((entry) => entry.scope === 'historical')) for (const commit of row.containingCommits) candidates.push([row.file, row.blob, commit, String(row.line), row.category, row.disposition].map((value) => JSON.stringify(value)).join(','));
fs.writeFileSync(`${directory}/candidate-commits.csv`, candidates.join('\n') + '\n');
console.log(JSON.stringify({ recognizedCredentialBlobs: summary.recognizedCredentialBlobs, containingCommits: summary.recognizedCredentialContainingCommits.length, localSnapshotRefs: summary.recognizedCredentialSnapshotRefs.length, unclassified: reviewed.filter((row) => row.disposition.startsWith('REVIEW: unclassified')).length }));
