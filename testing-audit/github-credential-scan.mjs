import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { inspectCredentials, sensitivePath } from './github-credential-detector.mjs';

const output = process.env.QA_EVIDENCE_DIR || 'testing-audit/evidence/github-cleanup';
fs.mkdirSync(output, { recursive: true });
function git(args, input) {
  const result = spawnSync('git', args, { input, maxBuffer: 512 * 1024 * 1024, windowsHide: true });
  if (result.status !== 0) throw new Error(`Git read failed (${args[0]}), exit ${result.status}; raw output withheld`);
  return result.stdout;
}
const split = (buffer) => buffer.toString('utf8').split('\0').filter(Boolean);
const refs = git(['for-each-ref', '--format=%(refname) %(objecttype) %(objectname)']).toString().trim().split(/\r?\n/).filter(Boolean).map((line) => {
  const [name, type, object] = line.split(' ');
  return { name, type, object };
});
const commits = git(['rev-list', '--all']).toString().trim().split(/\r?\n/).filter(Boolean);
const usages = new Map();
const snapshotUsages = new Map();
const blobs = new Set();
const tree = (commit) => split(git(['ls-tree', '-r', '-z', '--full-tree', commit])).map((entry) => {
  const [meta, file] = entry.split('\t');
  const [mode, type, blob] = meta.split(' ');
  return { mode, type, blob, file };
});
const head = git(['rev-parse', 'HEAD']).toString().trim();
let headTree;
const gitlinks = [];
for (const commit of commits) {
  const entries = tree(commit);
  if (commit === head) headTree = entries;
  for (const entry of entries) {
    if (entry.type !== 'blob') { gitlinks.push({ commit, file: entry.file, type: entry.type }); continue; }
    blobs.add(entry.blob);
    if (!usages.has(entry.blob)) usages.set(entry.blob, new Map());
    const files = usages.get(entry.blob);
    if (!files.has(entry.file)) files.set(entry.file, []);
    files.get(entry.file).push(commit);
  }
}
// IDE checkpoint refs can point directly to trees, without any commit. Do not
// mislabel those local snapshots as pushed commits or omit their contents.
for (const ref of refs.filter((entry) => entry.type === 'tree' || entry.type === 'blob')) {
  const entries = ref.type === 'tree' ? tree(ref.object) : [{ type: 'blob', blob: ref.object, file: '(direct blob ref)' }];
  for (const entry of entries) {
    if (entry.type !== 'blob') continue;
    blobs.add(entry.blob);
    if (!snapshotUsages.has(entry.blob)) snapshotUsages.set(entry.blob, new Map());
    const files = snapshotUsages.get(entry.blob);
    if (!files.has(entry.file)) files.set(entry.file, []);
    files.get(entry.file).push(ref.name);
  }
}
const index = split(git(['ls-files', '--stage', '-z'])).map((entry) => {
  const [meta, file] = entry.split('\t');
  const [mode, blob, stage] = meta.split(' ');
  if (mode !== '160000') blobs.add(blob);
  return { file, blob, stage, mode };
});
// Include retained/unreachable local blobs as well as refs. This is read-only:
// no pruning, reflog expiry, repacking or history updates are performed.
const storedObjects = git(['cat-file', '--batch-all-objects', '--batch-check=%(objectname) %(objecttype) %(objectsize)']).toString().trim().split(/\r?\n/).filter(Boolean).map((line) => {
  const [object, type, size] = line.split(' ');
  return { object, type, size: Number(size) };
});
for (const entry of storedObjects) if (entry.type === 'blob') blobs.add(entry.object);
const blobList = [...blobs];
const batch = git(['cat-file', '--batch'], Buffer.from(blobList.join('\n') + '\n'));
let cursor = 0;
const content = new Map();
for (const expected of blobList) {
  const end = batch.indexOf(10, cursor);
  const [id, type, count] = batch.subarray(cursor, end).toString().split(' ');
  if (id !== expected || type !== 'blob' || !/^\d+$/.test(count)) throw new Error('Invalid batch framing; content withheld');
  const size = Number(count);
  content.set(id, batch.subarray(end + 1, end + 1 + size));
  cursor = end + 1 + size + 1;
}
const pdfParse = createRequire(new URL('../server/package.json', import.meta.url))('pdf-parse/lib/pdf-parse.js');
const analyze = async (bytes) => {
  const binary = bytes.includes(0);
  const source = bytes.toString('utf8');
  const findings = inspectCredentials(source);
  let pdf = null;
  if (bytes.subarray(0, 5).toString() === '%PDF-') {
    const savedConsole = { log: console.log, warn: console.warn, error: console.error, info: console.info };
    try {
      for (const key of Object.keys(savedConsole)) console[key] = () => {};
      const parsed = await pdfParse(bytes);
      pdf = { status: 'Extracted text pattern-scanned; images/annotations not certified', pages: parsed.numpages };
      findings.push(...inspectCredentials(parsed.text).map((finding) => ({ ...finding, source: 'PDF extracted text' })));
    } catch {
      pdf = { status: 'BLOCKED: PDF text extraction failed; raw error withheld' };
    } finally {
      Object.assign(console, savedConsole);
    }
  }
  return { findings, binary, pdf, lfsPointer: source.startsWith('version https://git-lfs.github.com/spec/v1\n') };
};
const analyses = new Map();
for (const [blob, bytes] of content) analyses.set(blob, await analyze(bytes));
const historical = [];
const binaryFiles = new Map();
const pathCandidates = new Map();
for (const [blob, files] of usages) {
  const result = analyses.get(blob);
  for (const [file, containingCommits] of files) {
    if (result.findings.length) historical.push({ file, blob, findings: result.findings, containingCommits });
    if (result.binary || result.lfsPointer) binaryFiles.set(`${file}:${blob}`, { file, blob, kind: result.lfsPointer ? 'LFS pointer; payload not scanned' : 'Binary bytes pattern-scanned; embedded/compressed content not decoded' });
    const category = sensitivePath(file);
    if (category) pathCandidates.set(`${file}:${blob}`, { file, blob, category, containingCommits });
  }
}
const snapshotFindings = [];
for (const [blob, files] of snapshotUsages) {
  const result = analyses.get(blob);
  for (const [file, snapshotRefs] of files) {
    if (result.findings.length) snapshotFindings.push({ file, blob, findings: result.findings, snapshotRefs, containingCommits: usages.get(blob)?.get(file) || [] });
    if (result.binary || result.lfsPointer) binaryFiles.set(`${file}:${blob}`, { file, blob, kind: result.lfsPointer ? 'LFS pointer; payload not scanned' : 'Binary bytes pattern-scanned; embedded/compressed content not decoded' });
    const category = sensitivePath(file);
    if (category) pathCandidates.set(`${file}:${blob}`, { file, blob, category, snapshotRefs });
  }
}
const indexed = index.filter((entry) => entry.mode !== '160000').flatMap((entry) => {
  const result = analyses.get(entry.blob);
  return result.findings.length || sensitivePath(entry.file) ? [{ ...entry, findings: result.findings, pathCategory: sensitivePath(entry.file) }] : [];
});
const currentFiles = [...new Set([...index.map((entry) => entry.file), ...split(git(['ls-files', '--others', '--exclude-standard', '-z']))])];
const current = [];
const currentBinary = [];
for (const file of currentFiles) {
  if (!fs.existsSync(file) || !fs.lstatSync(file).isFile()) continue;
  const result = await analyze(fs.readFileSync(file));
  if (result.findings.length || sensitivePath(file)) current.push({ file, tracked: index.some((entry) => entry.file === file), findings: result.findings, pathCategory: sensitivePath(file) });
  if (result.binary || result.lfsPointer) currentBinary.push({ file, kind: result.lfsPointer ? 'LFS pointer' : 'Binary content' });
}
const metadataCandidates = [];
for (const commit of storedObjects.filter((entry) => entry.type === 'commit').map((entry) => entry.object)) {
  const findings = inspectCredentials(git(['show', '-s', '--format=%B', commit]).toString());
  if (findings.length) metadataCandidates.push({ commit, findings });
}
// Remote URLs can embed passwords: inspect in memory and report categories only.
const remotes = spawnSync('git', ['config', '--get-regexp', '^remote[.].*[.]url$'], { encoding: 'utf8', windowsHide: true });
const remoteConfigurationFindings = inspectCredentials(remotes.stdout || '').map(({ category, confidence }) => ({ category, confidence }));
const report = {
  generatedAt: new Date().toISOString(), headCommit: head, shallow: git(['rev-parse', '--is-shallow-repository']).toString().trim() === 'true',
  refs,
  counts: { commits: commits.length, storedCommits: storedObjects.filter((entry) => entry.type === 'commit').length, storedObjects: storedObjects.length, uniqueBlobs: blobs.size, indexEntries: index.length, headFiles: headTree?.length, currentFiles: currentFiles.length },
  historical, snapshotFindings, index: indexed, head: (headTree || []).filter((entry) => analyses.get(entry.blob)?.findings.length).map((entry) => ({ file: entry.file, blob: entry.blob, findings: analyses.get(entry.blob).findings })),
  workingTree: current, metadataCandidates, remoteConfigurationFindings,
  sensitivePathCandidates: [...pathCandidates.values()], binaryHistorical: [...binaryFiles.values()], binaryCurrent: currentBinary, gitlinks,
  pdfReviews: [...analyses].filter(([, result]) => result.pdf).map(([blob, result]) => ({ blob, files: [...new Set([...(usages.get(blob)?.keys() || []), ...(snapshotUsages.get(blob)?.keys() || [])])], ...result.pdf })),
  retainedBlobFindings: [...analyses].filter(([blob, result]) => result.findings.length && !usages.has(blob) && !snapshotUsages.has(blob)).map(([blob, result]) => ({ blob, findings: result.findings, file: 'Unattributed retained local blob; filename not recovered', containingCommits: [] })),
  limitations: ['Local objects only; remote ref advertisement is recorded separately', 'No credential validity checks', 'Ignored private environment contents excluded', 'No OCR, archive extraction or LFS payload retrieval', 'Retained blobs scanned, but historical dangling-tree filenames and reflog messages are not reconstructed', 'Heuristic detector; zero matches does not prove no sensitive data'],
};
fs.writeFileSync(path.join(output, 'scan.json'), JSON.stringify(report, null, 2) + '\n');
const rows = ['file,blob,commit,finding_status'];
for (const row of historical) for (const commit of row.containingCommits) rows.push([row.file, row.blob, commit, row.findings.some((finding) => finding.confidence.startsWith('credential-shaped')) ? 'credential-shaped literal; validity untested' : 'candidate only; manual review'].map((value) => JSON.stringify(value)).join(','));
fs.writeFileSync(path.join(output, 'candidate-commits.csv'), rows.join('\n') + '\n');
console.log(JSON.stringify({ ...report.counts, historicalFindings: historical.length, snapshotFindings: snapshotFindings.length, indexFindings: indexed.length, workingTreeFindings: current.length, metadataCandidates: metadataCandidates.length, remoteConfigurationFindings: remoteConfigurationFindings.length, output }));
