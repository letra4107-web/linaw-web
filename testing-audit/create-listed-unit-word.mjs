import fs from 'node:fs';
import assert from 'node:assert/strict';
import { inflateRawSync, deflateRawSync } from 'node:zlib';
const guided = process.argv.includes('--guided');

// Read the already-created document package without regenerating its tables.
const archive = fs.readFileSync('testing-audit/LINAWLETRA_UNIT_TEST_PACKAGE.zip');
let end = archive.length - 22;
while (end >= 0 && archive.readUInt32LE(end) !== 0x06054b50) end--;
assert.ok(end >= 0, 'Missing ZIP directory');
let cursor = archive.readUInt32LE(end + 16), input;
for (let index = 0; index < archive.readUInt16LE(end + 10); index++) {
  assert.equal(archive.readUInt32LE(cursor), 0x02014b50);
  const nameLength = archive.readUInt16LE(cursor + 28), extraLength = archive.readUInt16LE(cursor + 30), commentLength = archive.readUInt16LE(cursor + 32);
  const name = archive.subarray(cursor + 46, cursor + 46 + nameLength).toString('utf8').replaceAll('\\', '/');
  if (name.endsWith('/UNIT_TEST_DOCUMENT_DATA.json')) {
    const local = archive.readUInt32LE(cursor + 42), size = archive.readUInt32LE(cursor + 20), method = archive.readUInt16LE(cursor + 10);
    const start = local + 30 + archive.readUInt16LE(local + 26) + archive.readUInt16LE(local + 28);
    const payload = archive.subarray(start, start + size);
    input = JSON.parse((method === 8 ? inflateRawSync(payload) : payload).toString('utf8'));
  }
  cursor += 46 + nameLength + extraLength + commentLength;
}
assert.ok(input); assert.equal(input.automated.length, 550); assert.equal(input.modulePlans.length, 96);

const paragraphs = [];
const add = (text, type = 'body') => paragraphs.push({ text, type });
add('LINAWLETRA', 'title');
add('UNIT TESTING CONTENT — LIST FORMAT', 'title');
add('Plain listed content for your own formatting. No tables or screenshots.');
add('Part I: 40 module sheets and 96 proposed manual scenarios. Part II: all 550 existing automated records (548 passed; 2 blocked/skipped).');
add('Manual actual results, test date, cycle number and signatures must be filled in after real testing. Existing automated records are from the 21 October 2026 audit, not a new test run. Their scope may be unit, source-contract or mocked integration; it is labeled per case.');
add('PART I — MODULE CONTENT FOR YOUR DOCUMENT', 'section');
let moduleNumber = 0;
for (const module of input.modules.filter((module) => module.sheets.length)) {
  moduleNumber++;
  add(`${moduleNumber}. ${module.name.toUpperCase()}`, 'heading');
  add(`Module Name: ${module.name}`);
  add(`Component Name: ${module.component.replace(/src\/pages\/(?:admin|parent|teacher|student)\//g, '').replace(/\.tsx/g, '')}`);
  add('Test Cycle No.: [Enter the actual cycle number]');
  add('Date Tested: [Enter the actual testing date]');
  add('Type of System: Web Application');
  add(`Role: ${module.role}`);
  add(`Pre-conditions: Prepare the appropriate isolated test account and synthetic records. ${module.route ? `Open ${module.route}.` : `Open the ${module.name} component.`} Live writes must use an isolated environment.`);
  add(`Action Description: Validate the inputs, permitted actions and expected responses of the ${module.name} module.`);
  add('Verification Steps:');
  add('1. Open the module using the appropriate test account.');
  add('2. Prepare the input values for the scenario.');
  add('3. Perform the action described in the scenario.');
  add('4. Compare the displayed response and permitted record changes with the expected result.');
  add('5. Record the actual observation, screenshot reference, testing date and final remarks.');
  const rows = module.id === 'AUTH-LOGIN' ? [...module.sheets.filter((row) => !row.scenario.startsWith('Display the module')), ...module.sheets.filter((row) => row.scenario.startsWith('Display the module'))] : module.sheets;
  rows.forEach((row, index) => {
    add(`Test Scenario ${index + 1}: ${row.scenario}`, 'case');
    add(`Data (Input Values): ${row.data}`);
    add(`Expected Results: ${row.expected}`);
    add('Actual Results: [Enter the actual observed result and screenshot reference after testing.]');
    add(`Remarks: ${row.status}. ${row.status === 'BLOCKED' ? row.actual : 'This manual scenario has not been executed in this document.'}`);
    add(`Reference ID: ${row.id}`, 'reference');
  });
}

add('PART II — EXISTING AUTOMATED RESULTS', 'section');
add('These records preserve the previous executed evidence. A passing source check or mocked test does not certify a complete live workflow. Keep these records separate from the unexecuted manual scenarios in Part I.');
for (const module of input.modules.filter((module) => module.automated.length)) {
  add(`${module.id} — ${module.name}`, 'heading');
  module.automated.forEach((row, index) => {
    add(`Test Scenario ${index + 1}: ${row.scenario}`, 'case');
    add(`Case ID: ${row.id}`);
    add(`Test Level: ${row.level}`);
    add(`Date Tested: ${row.testedDate}`);
    add(`Data (Input Values): ${row.data}`);
    add(`Expected Results: ${row.expected}`);
    add(`Actual Results: ${row.actual}`);
    add(`Remarks: ${row.remarks}`);
    add(`Test Source: ${row.source}`, 'reference');
    add(`Evidence: ${row.evidence}`, 'reference');
  });
}
if (guided) {
  const guide = [
    ['title', 'PLACEMENT GUIDE — SAAN ILALAGAY ANG BAWAT CONTENT'],
    ['body', 'Gamitin ang Part I para sa module document na katulad ng sample. Naka-lista pa rin ito. Ang blue italic notes ay instructions lamang; burahin ang notes kapag nailipat mo na sa final format.'],
    ['body', 'TOP / HEADER: Module Name, Component Name, Test Cycle No., Date Tested at Type of System. Ilagay ang module/component sa kanan ng UNIT TEST DOCUMENT title; gamitin ang tunay na cycle at petsa ng execution.'],
    ['body', 'ABOVE THE SCENARIO ROWS: Pre-conditions, Action Description at Verification Steps. Ito ang mga full-width descriptive fields bago ang five-column scenario section.'],
    ['body', 'COLUMN 1 — Test Scenario: scenario number at maikling description ng tine-test.'],
    ['body', 'COLUMN 2 — Data (Input Values): aktuwal na synthetic test inputs o malinaw na description nito. Huwag isama ang tunay na passwords, tokens o OTP secrets.'],
    ['body', 'COLUMN 3 — Expected Results: dapat na behavior bago isagawa ang test.'],
    ['body', 'COLUMN 4 — Actual Results: aktuwal na nangyari; dito rin ilalagay ang sariling screenshot pagkatapos ng test. Gumamit ng screenshot ng mismong scenario, hindi ng ibang case o sample image.'],
    ['body', 'COLUMN 5 — Remarks: PASSED kung napatunayang tugma ang actual at expected; FAILED kung hindi; BLOCKED kung may kulang na prerequisite; NOT RUN kung hindi pa na-execute.'],
    ['body', 'PART II: historical automated evidence. Gamitin lang para sa eksaktong unit/source/mocked assertion na nakasaad. Huwag ituring na screenshot evidence ng live login o end-to-end workflow.'],
  ].map(([type, text]) => ({ type, text }));
  const insertion = paragraphs.findIndex((p) => p.text.startsWith('PART I '));
  paragraphs.splice(insertion, 0, ...guide);
  const notes = [
    [/^Module Name:/, 'SA HEADER: ilagay sa Module Name field ang pangalan pagkatapos ng colon.'],
    [/^Component Name:/, 'SA HEADER: ilagay sa Component Name ang form/page/function na tine-test.'],
    [/^Test Cycle No\.:/, 'SA HEADER: palitan ang bracket ng aktuwal na cycle; huwag kopyahin ang cycle number sa sample kung hindi iyon ang inyong run.'],
    [/^Date Tested:/, 'SA HEADER: aktuwal na petsa ng manual execution, hindi petsa lang ng paggawa ng document.'],
    [/^Type of System:/, 'SA HEADER: ilagay sa Type of System field.'],
    [/^Pre-conditions:/, 'BAGO ANG SCENARIOS: ilagay sa Pre-conditions row.'],
    [/^Action Description:/, 'BAGO ANG SCENARIOS: ilagay sa Action Description row.'],
    [/^Verification Steps:/, 'BAGO ANG SCENARIOS: ilagay ang sumusunod na steps sa Verification Steps row.'],
    [/^Test Scenario \d+:/, 'COLUMN 1 — TEST SCENARIO: ilipat ang scenario number at description.'],
    [/^Data \(Input Values\):/, 'COLUMN 2 — DATA: ilagay ang input values/fixture description para sa scenario na ito.'],
    [/^Expected Results:/, 'COLUMN 3 — EXPECTED RESULTS: ito ang dapat mangyari.'],
    [/^Actual Results:/, 'COLUMN 4 — ACTUAL RESULTS: palitan ang placeholder ng tunay na observation. [DITO ILAGAY ANG SCREENSHOT NG SCENARIO PAGKATAPOS I-TEST.]'],
    [/^Remarks:/, 'COLUMN 5 — REMARKS: panatilihin ang NOT RUN/BLOCKED hangga\'t hindi pa verified; huwag awtomatikong gawing PASSED.'],
  ];
  let manual = false;
  for (let index = 0; index < paragraphs.length; index++) {
    const paragraph = paragraphs[index];
    if (paragraph.text.startsWith('PART I ')) manual = true;
    if (paragraph.text.startsWith('PART II ')) manual = false;
    if (!manual) continue;
    const note = notes.find(([pattern]) => pattern.test(paragraph.text));
    if (note) { paragraphs.splice(index + 1, 0, { type: 'guide', text: note[1] }); index++; }
  }
}
const escape = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const paragraphXml = paragraphs.map(({ text, type }) => {
  const heading = ['title', 'section', 'heading', 'case'].includes(type);
  const size = type === 'title' ? 32 : type === 'section' ? 28 : type === 'heading' ? 25 : ['reference', 'guide'].includes(type) ? 18 : 22;
  const before = ['section', 'heading'].includes(type) ? 240 : type === 'case' ? 160 : 0;
  return `<w:p><w:pPr><w:spacing w:before="${before}" w:after="80" w:line="264" w:lineRule="auto"/>${heading ? '<w:keepNext/>' : ''}</w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="${size}"/>${heading ? '<w:b/>' : ''}${type === 'guide' ? '<w:i/><w:color w:val="1F4E79"/>' : ''}</w:rPr><w:t xml:space="preserve">${escape(text)}</w:t></w:r></w:p>`;
}).join('');
const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphXml}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body></w:document>`;
assert.ok(!document.includes('<w:tbl')); assert.ok(!document.includes('<w:drawing'));
for (const row of [...input.automated, ...input.modulePlans]) assert.ok(document.includes(escape(row.id)), `Missing ${row.id}`);

const crcTable = Array.from({ length: 256 }, (_, number) => { let result = number; for (let bit = 0; bit < 8; bit++) result = result & 1 ? 0xedb88320 ^ (result >>> 1) : result >>> 1; return result >>> 0; });
const crc32 = (buffer) => { let crc = 0xffffffff; for (const byte of buffer) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8); return (crc ^ 0xffffffff) >>> 0; };
const entries = [
  ['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'],
  ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'],
  ['word/document.xml', document],
];
const chunks = [], directory = []; let offset = 0;
for (const [name, text] of entries) {
  const filename = Buffer.from(name), bytes = Buffer.from(text), compressed = deflateRawSync(bytes), crc = crc32(bytes);
  const header = Buffer.alloc(30); header.writeUInt32LE(0x04034b50); header.writeUInt16LE(20, 4); header.writeUInt16LE(0x800, 6); header.writeUInt16LE(8, 8); header.writeUInt16LE(33, 12); header.writeUInt32LE(crc, 14); header.writeUInt32LE(compressed.length, 18); header.writeUInt32LE(bytes.length, 22); header.writeUInt16LE(filename.length, 26);
  const central = Buffer.alloc(46); central.writeUInt32LE(0x02014b50); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(0x800, 8); central.writeUInt16LE(8, 10); central.writeUInt16LE(33, 14); central.writeUInt32LE(crc, 16); central.writeUInt32LE(compressed.length, 20); central.writeUInt32LE(bytes.length, 24); central.writeUInt16LE(filename.length, 28); central.writeUInt32LE(offset, 42);
  chunks.push(header, filename, compressed); directory.push(central, filename); offset += header.length + filename.length + compressed.length;
}
const central = Buffer.concat(directory), ending = Buffer.alloc(22); ending.writeUInt32LE(0x06054b50); ending.writeUInt16LE(entries.length, 8); ending.writeUInt16LE(entries.length, 10); ending.writeUInt32LE(central.length, 12); ending.writeUInt32LE(offset, 16);
const destination = guided ? 'testing-audit/LINAWLETRA_UNIT_TESTING_GUIDE.docx' : 'testing-audit/LINAWLETRA_UNIT_TESTING_LIST.docx';
fs.writeFileSync(destination, Buffer.concat([...chunks, central, ending]));
if (guided) assert.equal(paragraphs.filter((p) => p.type === 'guide' && p.text.includes('DITO ILAGAY ANG SCREENSHOT')).length, 96);
fs.writeFileSync(destination.replace('.docx', '_VERIFICATION.json'), JSON.stringify({ generatedAt: new Date().toISOString(), file: destination, guided, modules: moduleNumber, plannedScenarios: input.modulePlans.length, automatedRecords: input.automated.length, all646CaseIdsPresent: true, screenshotPlacementLabels: guided ? 96 : 0, tables: 0, images: 0, newTestsExecuted: false }, null, 2) + '\n');
console.log(JSON.stringify({ destination, modules: moduleNumber, plannedScenarios: input.modulePlans.length, automatedRecords: input.automated.length, tables: 0, images: 0 }));
