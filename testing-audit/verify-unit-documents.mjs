import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { inflateRawSync } from 'node:zlib';
import { inspectCredentials } from './github-credential-detector.mjs';
const root = 'testing-audit/unit-test-documents';
const data = JSON.parse(fs.readFileSync(`${root}/UNIT_TEST_DOCUMENT_DATA.json`));
const print = JSON.parse(fs.readFileSync(`${root}/PRINT_VERIFICATION.json`));
const walk = (folder) => fs.readdirSync(folder, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? walk(path.join(folder, entry.name)) : [path.join(folder, entry.name)]);
const files = walk(root), docs = files.filter((file) => file.endsWith('.docx')), masterCaseCounts = {};
let checkedSourceIds = 0;
for (const file of docs) {
  const bytes = fs.readFileSync(file), entries = new Map();
  let offset = 0;
  while (bytes.readUInt32LE(offset) === 0x04034b50) {
    const method = bytes.readUInt16LE(offset + 8), length = bytes.readUInt32LE(offset + 18), nameLength = bytes.readUInt16LE(offset + 26), extraLength = bytes.readUInt16LE(offset + 28);
    const name = bytes.subarray(offset + 30, offset + 30 + nameLength).toString('utf8'), start = offset + 30 + nameLength + extraLength, payload = bytes.subarray(start, start + length);
    entries.set(name, (method === 8 ? inflateRawSync(payload) : payload).toString('utf8')); offset = start + length;
  }
  assert.ok(entries.has('[Content_Types].xml')); assert.ok(entries.has('_rels/.rels')); assert.ok(entries.has('word/document.xml'));
  const source = entries.get('word/document.xml'), ids = new Set(source.match(/UNIT-(?:backend|frontend)-\d+|SHEET-[A-Z0-9-]+-\d+/g) || []);
  if (path.basename(file) === 'UNIT_TEST_DOCUMENTS.docx') { masterCaseCounts[path.basename(file)] = ids.size; for (const row of data.automated) { assert.ok(ids.has(row.id), `Missing ${row.id}`); checkedSourceIds++; } }
  if (path.basename(file) === 'MODULE_TEST_SHEETS.docx') { masterCaseCounts[path.basename(file)] = ids.size; for (const row of data.modulePlans) assert.ok(ids.has(row.id), `Missing plan ${row.id}`); }
}
const credentialShapedFindings = [];
for (const file of files.filter((file) => /\.(?:html|md|csv|json|tap)$/.test(file))) {
  const findings = inspectCredentials(fs.readFileSync(file, 'utf8')).filter((finding) => finding.confidence?.startsWith('credential-shaped'));
  if (findings.length) credentialShapedFindings.push({ file, categories: findings.map((finding) => finding.category) });
}
assert.deepEqual(credentialShapedFindings, []); assert.equal(checkedSourceIds, 550);
assert.equal(masterCaseCounts['UNIT_TEST_DOCUMENTS.docx'], 550); assert.equal(masterCaseCounts['MODULE_TEST_SHEETS.docx'], 96);
assert.ok(print.reports.every((row) => row.status === 'PASS' && row.allExpectedCaseIdsPresent));
const result = { generatedAt: new Date().toISOString(), status: 'PASS', validatedDocxPackages: docs.length, masterCaseCounts, mappedAutomatedSourceIds: checkedSourceIds, pdfs: print.reports.map(({ document, pages, expectedRows }) => ({ document, pages, cases: expectedRows })), credentialShapedFindings, note: 'Validates document ZIP structure, complete case coverage, mapped sources, PDF extraction/layout and recognized text-secret patterns; not new functionality testing. XML parts were also independently parsed with System.Xml.' };
fs.writeFileSync(`${root}/DOCX_VERIFICATION.json`, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));
