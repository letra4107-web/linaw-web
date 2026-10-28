import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { deflateRawSync } from 'node:zlib';

const source = fs.readFileSync('testing-audit/create-unit-documents.mjs', 'utf8');
const start = source.indexOf('const modules = [];'), mapping = source.indexOf('const byId = new Map'), stop = source.indexOf('// Resolve static and interpolated test names');
assert.ok(start >= 0 && mapping > start && stop > mapping);
const catalogue = vm.runInNewContext(`${source.slice(start, stop)}\n({modules,moduleFor});`, {}, { timeout: 1000 });
const moduleMap = new Map(catalogue.modules.map((m) => [m.id, m]));
const automated = JSON.parse(fs.readFileSync('testing-audit/evidence/final-verification/case-register.json')).cases.filter((r) => r.id.startsWith('UNIT-'));
const fields = ['Module Name', 'Test Cycle No.', 'Component Name', 'Date Tested', 'Type of System', 'Pre-conditions', 'Action Description', 'Verification Steps', 'Test Scenario', 'Data (Input Value)', 'Expected Results', 'Actual Result', 'Remarks'];
const records = [];
for (const m of catalogue.modules.filter((m) => m.route || m.actions.length)) {
  const display = ['Display the module with test data', 'Populated and empty synthetic fixtures for the appropriate role.', 'Display the intended module and appropriate empty-state feedback without exposing unauthorized data.', 'NOT RUN', 'Not yet manually executed.'];
  let scenarios = [...m.actions];
  if (m.route) scenarios = m.id === 'AUTH-LOGIN' ? [...scenarios, display] : [display, ...scenarios];
  scenarios.forEach(([scenario, data, expected, status, reason], index) => records.push([
    m.name,
    '[Enter the actual test cycle number]',
    m.component.replace(/src\/pages\/(admin|teacher|parent|student)\//g, '').replace(/\.tsx/g, ''),
    '[Enter the actual date after testing]',
    'Web Application',
    `Prepare the appropriate ${m.role} test account and synthetic data. ${m.route ? `Open ${m.route}.` : `Open the ${m.name} component.`} Use an approved isolated environment for account, data, reward or external-service changes.`,
    `Validate the following ${m.name} scenario: ${scenario}.`,
    '1. Prepare the specified input values. 2. Perform the described action. 3. Compare the observed response and permitted data effects with the expected result. 4. Record the actual result and supporting screenshot. 5. Assign remarks based on actual evidence.',
    `${index + 1}. ${scenario}`,
    data,
    expected,
    'Not yet executed. [Replace this with the actual observed result after testing.]',
    status === 'BLOCKED' ? `BLOCKED — ${reason}` : 'NOT RUN',
  ]));
}
assert.equal(records.length, 96);
for (const row of automated) {
  const m = moduleMap.get(catalogue.moduleFor(row)); assert.ok(m);
  records.push([
    m.name,
    'Not recorded in the original execution evidence',
    m.component,
    row.status === 'PASS' ? '21 October 2026 — existing execution evidence' : 'Not executed',
    'Web Application',
    row.preconditions,
    `Verify the named automated assertion: ${row.feature}.`,
    'Locate the named case in the existing TAP evidence and compare its recorded result with its assertions. This entry records the prior run; no new test execution is claimed.',
    `${row.id} — ${row.feature}`,
    `Scenario-specific local synthetic fixtures: ${row.feature}. Concrete fixture definitions are in the corresponding test source; the TAP result does not serialize every input value.`,
    row.expected,
    `${row.actual}. Evidence: testing-audit/${row.evidence}.`,
    row.status === 'PASS' ? 'PASSED — named local automated assertion only; unit, source-contract or mocked boundary as applicable. This does not certify a complete live workflow.' : 'BLOCKED — staging dependency absent; runner skipped this case.',
  ]);
}
assert.equal(records.length, 646); assert.ok(records.every((r) => r.length === fields.length));
const escape = (s) => String(s ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const paragraphs = records.map((record, recordIndex) => fields.map((name, index) => `<w:p><w:pPr><w:spacing w:before="${index === 0 && recordIndex > 0 ? 280 : 0}" w:after="90"/><w:keepNext/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="22"/><w:b/></w:rPr><w:t xml:space="preserve">${escape(name)}: </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="22"/></w:rPr><w:t xml:space="preserve">${escape(record[index])}</w:t></w:r></w:p>`).join('').replace(/<w:keepNext\/>((?:(?!<w:p>).)*Remarks:)/s, '$1')).join('');
// No cover page, tables, screenshots, column labels or guide paragraphs.
const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body></w:document>`;
assert.ok(!document.includes('<w:tbl')); assert.ok(!document.includes('<w:drawing'));
const entries = [
  ['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'],
  ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'],
  ['word/document.xml', document],
];
const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let i = 0; i < 8; i++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = (bytes) => { let c = 0xffffffff; for (const byte of bytes) c = crcTable[(c ^ byte) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunks = [], directory = []; let offset = 0;
for (const [name, value] of entries) {
  const filename = Buffer.from(name), bytes = Buffer.from(value), compressed = deflateRawSync(bytes), crc = crc32(bytes);
  const h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50); h.writeUInt16LE(20, 4); h.writeUInt16LE(0x800, 6); h.writeUInt16LE(8, 8); h.writeUInt16LE(33, 12); h.writeUInt32LE(crc, 14); h.writeUInt32LE(compressed.length, 18); h.writeUInt32LE(bytes.length, 22); h.writeUInt16LE(filename.length, 26);
  const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(0x800, 8); c.writeUInt16LE(8, 10); c.writeUInt16LE(33, 14); c.writeUInt32LE(crc, 16); c.writeUInt32LE(compressed.length, 20); c.writeUInt32LE(bytes.length, 24); c.writeUInt16LE(filename.length, 28); c.writeUInt32LE(offset, 42);
  chunks.push(h, filename, compressed); directory.push(c, filename); offset += h.length + filename.length + compressed.length;
}
const central = Buffer.concat(directory), end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10); end.writeUInt32LE(central.length, 12); end.writeUInt32LE(offset, 16);
const file = 'testing-audit/LINAWLETRA_UNIT_TEST_EXACT_FORMAT.docx';
fs.writeFileSync(file, Buffer.concat([...chunks, central, end]));
fs.writeFileSync(file.replace('.docx', '_VERIFICATION.json'), JSON.stringify({ file, fieldsInOrder: fields, records: records.length, plannedScenarios: 96, historicalAutomatedRecords: 550, tables: 0, images: 0, extraGuideParagraphs: 0, newTestsExecuted: false }, null, 2) + '\n');
console.log(JSON.stringify({ file, records: records.length, fieldsPerRecord: fields.length, tables: 0, extraGuideParagraphs: 0 }));
