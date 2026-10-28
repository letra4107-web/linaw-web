import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { deflateRawSync } from 'node:zlib';

// Recover only the pure module catalogue; do not recreate prior deleted exports
// or execute application code, tests, environment loading or service calls.
const source = fs.readFileSync('testing-audit/create-unit-documents.mjs', 'utf8');
const start = source.indexOf('const modules = [];'), stop = source.indexOf('const byId = new Map');
assert.ok(start >= 0 && stop > start);
const modules = vm.runInNewContext(`${source.slice(start, stop)}\nmodules;`, {}, { timeout: 1000 }).filter((m) => m.route || m.actions.length);
const recorded = JSON.parse(fs.readFileSync('testing-audit/evidence/final-verification/case-register.json')).cases.filter((r) => r.id.startsWith('UNIT-'));
assert.equal(modules.length, 40); assert.equal(recorded.length, 550);
const paragraphs = [], text = (value, style = 'body') => paragraphs.push({ value, style });
text('LINAWLETRA', 'title');
text('COPY-PASTE TEST CONTENT AND SCREENSHOT GUIDE', 'title');
text('Nakalistang content lamang. Walang tables at walang invented screenshots. Part I ang ililipat mo sa module test document; Part II ang hiwalay na existing automated evidence.');
text('PAANO ILILIPAT SA FORMAT NG SAMPLE', 'heading');
text('HEADER: kopyahin ang Module Name, Component Name, Type of System, Pre-conditions, Action Description at Verification Steps. Ikaw ang maglalagay ng tunay na Test Cycle No. at Date Tested.');
text('SCENARIO COLUMNS: Column 1 = Test Scenario; Column 2 = Data (Input Values); Column 3 = Expected Results; Column 4 = Actual Results at screenshot; Column 5 = Remarks.');
text('Ang mga linyang “KOPYAHIN…” ay field labels/instructions. Kopyahin ang kasunod na content sa tamang field. Ang “ANO ANG I-SCREENSHOT” ay guide lang at hindi bahagi ng Expected Results.');
text('Actual Results: ilagay lamang ang totoong na-observe pagkatapos ng test. Remarks: PASSED kapag tugma ang actual at expected; FAILED kapag hindi; BLOCKED kapag may kulang na prerequisite; NOT RUN kung hindi pa na-execute. Walang bagong test na isinagawa para sa Word na ito.');
text('Gamitin ang synthetic/test accounts. Save, create, send, delete, reset, archive, password/MFA at reward changes ay para lamang sa approved isolated setup; huwag gawin sa shared database. Sa screenshots, huwag ipakita ang tunay na passwords, tokens, OTP/MFA secrets o pribadong learner data.');
text('Ang UI screenshot ay ebidensiya ng nakikitang behavior. Ang tunay na automated unit/model assertion ay may TAP/terminal evidence, na hiwalay sa UI at database signoff.');
text('PART I — MODULE CONTENT AT SPECIFIC SCREENSHOT CHECKLIST', 'heading');

function screenshot(m, scenario, isDisplay) {
  if (isDisplay) return [`Buksan ang ${m.route}. I-capture ang module heading at main content: list, cards, table o form na malinaw ang labels.`, 'Kung populated at empty fixtures ang tine-test, kumuha ng magkahiwalay na screenshot para sa populated content at tunay na empty-state message. Huwag mag-delete ng shared records para gumawa ng empty state.'];
  const s = scenario.toLowerCase();
  if (m.id === 'AUTH-LOGIN') {
    if (s.startsWith('correct email and correct password')) return ['Sa isolated test account, mag-sign in. I-screenshot ang DESTINATION ROLE DASHBOARD pagkatapos ng redirect, kasama ang role/module heading.', 'Optional: login form bago ang submit, na masked ang password. Hindi sapat ang “Signing in…” screenshot para patunayang successful ang authentication.'];
    if (s.includes('incorrect email') || s.includes('incorrect password')) return ['I-submit ang nakasaad na invalid credentials sa dedicated test account/setup. I-capture ang login form at actual error message pagkatapos ng response.', 'Dapat malinaw na nasa login page pa rin at hindi naka-open ang protected dashboard. Panatilihing masked ang password.'];
    if (s.includes('empty')) return ['Iwanang blank ang email at password, saka i-submit ang form. I-capture ang blank fields at visible required-field validation.'];
    return ['I-capture ang confirmation-required o access-denied feedback para sa synthetic account state na tine-test.', 'Kung role/status middleware lamang ang na-test, screenshot ng exact automated case at result ang gamitin; huwag mag-claim ng live token revocation.'];
  }
  if (m.id === 'AUTH-SIGNUP') return s.includes('valid parent') ? ['Pagkatapos ng isolated registration, i-capture ang verification destination/pending-confirmation feedback.', 'Huwag isama sa screenshot ang password o aktuwal na verification secret.'] : ['Kumuha ng screenshot sa bawat invalid variant: blank required fields, invalid email, short password, mismatched confirmation at unchecked policy.', 'Isama ang field na mali at mismong validation message; huwag pagsamahin ang magkakaibang result sa iisang PASSED claim.'];
  if (m.id === 'AUTH-VERIFY') return s.includes('resend') ? ['I-capture ang actual resend acknowledgement o retry-limit feedback. Kung delivery ang claim, idagdag ang isolated test-mailbox evidence na walang OTP secret.', 'Ang acknowledgement screenshot lamang ay hindi proof na dumating ang email.'] : ['Magkahiwalay na screenshots: valid-code destination, wrong-code error at expired-code error. Takpan ang aktuwal na OTP at personal email identifiers.'];
  if (m.id === 'AUTH-RECOVERY') return s.includes('recovery') ? ['I-capture ang safe recovery-request response. Delivery evidence, kung authorized, ay sa isolated test mailbox lamang; huwag ipakita ang reset URL/token.'] : ['I-capture ang successful reset confirmation para sa valid isolated session at hiwalay na error para sa expired/invalid link.', 'Huwag ipakita ang recovery token o password; huwag mag-reset ng real shared account.'];
  const instructions = {
    'ADMIN-DASH': ['I-capture ang dashboard totals/cards at reporting period para sa known synthetic fixture.', 'Sa mocked outage, i-capture ang error notice at retry control; pagkatapos ng recovery, i-capture ang restored values.'],
    'ADMIN-USERS': s.includes('search') ? ['I-capture ang search/filter selections at matching user rows, kasama ang role/status at pagination/range.', 'Para sa no-match variant, i-capture ang query at empty result feedback.'] : ['Sa isolated setup lamang: before/after account row status at actual confirmation/cancellation feedback.', 'Kung persistence failure ang variant, i-capture ang error at unchanged record; huwag gumawa ng real account deletion.'],
    'ADMIN-ARCHIVE': ['I-capture ang synthetic archived row bago ang restore at ang restored active row o explicit successful state pagkatapos.', 'Para sa failure variant, i-capture ang error at row na hindi na-restore.'],
    'ADMIN-TEACHERS': s.includes('duplicate') ? ['I-capture ang relevant invalid fields at visible rejection/validation response.'] : ['I-capture ang permitted grade selections at teacher creation/verification-pending result sa isolated setup.', 'Kung email delivery ang sinusukat, idagdag ang test-mailbox receipt na redacted ang temporary password at OTP.'],
    'ADMIN-SECTIONS': s.includes('create') ? ['I-capture ang section form values at saved row na may tamang grade, adviser at capacity.', 'Kumuha ng hiwalay na invalid-data error screenshot kung iyon ang variant.'] : ['I-capture ang member count/capacity bago at pagkatapos, duplicate selection behavior at capacity error.', 'Ang concurrent/atomicity claim ay nangangailangan din ng isolated SQL/API output. Hindi iyon mapapatunayan ng roster screenshot lang; huwag mag-run ng unapproved SQL.'],
    'ADMIN-ANALYTICS': ['I-capture ang totals/trends at selected reporting period para sa known synthetic dataset.', 'Para sa partial query failure, i-capture ang visible error; sa API assertion, screenshot ng actual HTTP 500/no totals o exact passing local test.'],
    'ADMIN-NOTIFICATIONS': ['I-capture ang unread count at synthetic notice list bago at pagkatapos ng read-one/read-all.', 'Para sa >50-row/ownership assertion, idagdag ang exact local test output o approved isolated persistence evidence; hindi sapat ang first page lang.'],
    'ADMIN-SETTINGS': s.includes('enforcement') ? ['I-capture ang setting value at ang downstream page behavior na talagang naapektuhan nito, sa approved isolated setup.'] : ['I-capture ang toggle/value bago at pagkatapos ng save at ang saved feedback/reloaded persisted state.', 'String/null/number boolean rejection is an API test: gamitin ang exact HTTP validation response o local test output; huwag mag-imbento ng UI message.'],
    'ADMIN-PROFILE': ['I-capture ang relevant profile form/validation at successful confirmation kung naisagawa sa isolated account.', 'Huwag ipakita ang bagong/lumang password; real email/password changes remain blocked without isolated authorization.'],
    'ADMIN-AUDIT': ['I-capture ang selected date/user/action filter at matching event rows, kasama ang permitted event metadata.', 'Gumamit ng synthetic identities; huwag ipakita ang secrets o raw credential logs.'],
    'ADMIN-STUDENTS': ['I-capture ang Student filter/list, selected synthetic learner details at relevant note state. Notes-save proof requires authorized isolated execution.'],
    'ADMIN-PARENTS': ['I-capture ang Parent filter/list, selected synthetic parent details at permitted child relationships. Notes-save proof requires authorized isolated execution.'],
    'ADMIN-TEACHER-MON': ['I-capture ang Teacher filter/list, selected synthetic teacher details at permitted roster information. Notes-save proof requires authorized isolated execution.'],
    'TEACHER-DASH': ['I-capture ang roster/lesson/progress summary cards.', 'Sa mocked failure, i-capture ang error/retry feedback at recovered dashboard pagkatapos ng retry.'],
    'TEACHER-ROSTER': ['I-capture ang selected grade/search filter at matching roster rows.', 'Para sa unrelated learner access, i-capture ang actual denial o exact ownership-guard test result, hindi ibang teacher\'s private data.'],
    'TEACHER-LESSONS': s.includes('upload') ? ['I-capture ang selected synthetic PDF, upload result at resulting material row; sa invalid PDF, ang actual rejection message.', 'Unique-key, ambiguous commit at orphan cleanup assertions need exact local test/API/storage fixture evidence. A successful upload screenshot alone does not prove compensation.'] : ['Sa isolated fixture: i-capture ang draft items/editor at publish/archive result.', 'Sa invalid/published-replacement variant, i-capture ang actual rejection; hindi sapat ang open editor lang.'],
    'TEACHER-REPORTS': ['I-capture ang selected synthetic learner/report period at progress/module table.', 'Para sa missing observations, i-capture ang actual empty/no-measurement feedback; huwag gumawa ng score na walang observations.'],
    'TEACHER-MESSAGES': ['Sa mocked/isolated thread, i-capture ang selected parent at newly sent message sa tamang conversation.', 'Para sa blank/error variant, i-capture ang disabled validation o actual error at unsent message state. Realtime delivery is a separate check.'],
    'TEACHER-SETTINGS': ['I-capture ang account settings values/validation and permitted confirmation after an isolated save; mask passwords.'],
    'PARENT-DASH': ['I-capture ang selected synthetic child at corresponding progress cards.', 'Pagpalit ng child, kumuha ng second screenshot na nagbago ang child-specific view. Mocked outage/retry gets separate before/after screenshots.'],
    'PARENT-CHILDREN': s.includes('reset') ? ['Sa isolated account: i-capture ang authorized reset response. Denied foreign-child access gets a separate error screenshot.', 'Huwag ipakita ang temporary password o mail secret; no real learner reset.'] : ['I-capture ang child name/grade input at success/duplicate/invalid response sa isolated fixture.', 'Rollback/mail-outage behavior needs exact local test or isolated persistence evidence. The enrollment form screenshot is not proof of rollback.'],
    'PARENT-PROGRESS': s.includes('paginate') ? ['I-capture ang child/month selection, page-size setting, displayed module rows at visible page range.', 'Kumuha ng next/last-page screenshot at detail/back view na napreserve ang intended child/month.'] : ['I-capture ang effective reading level at badge display para sa known stored-progress/override fixture.', 'Authority/merge correctness needs the relevant local assertion or approved isolated data comparison.'],
    'PARENT-SCHEDULE': ['Sa isolated fixture lamang: i-capture ang activity input at scheduled entry after save.', 'Para sa invalid date/save failure/cancellation, i-capture ang actual error o unchanged calendar; huwag mag-delete ng shared schedule.'],
    'PARENT-MESSAGES': ['I-capture ang allowed teacher thread at reply na nasa tamang conversation after isolated send.', 'Para sa blank/unrelated reply, i-capture ang actual rejection/disabled input behavior.'],
    'PARENT-SETTINGS': ['I-capture ang profile validation o isolated update confirmation. Keep password fields masked.'],
    'PARENT-NOTIFICATIONS': ['I-capture ang owned notice list/filter at unread count before/after an isolated read action.', 'Foreign ownership and >50-row behavior need exact test or isolated persistence evidence.'],
    'PARENT-APP-SETTINGS': s.includes('mfa') ? ['Sa isolated MFA account: i-capture ang provider verification/enabled/disabled confirmation only.', 'Huwag isama ang QR provisioning code, secret seed o recovery codes. Opening the MFA panel alone does not prove enrollment.'] : ['I-capture ang selected language/theme/notification value at the documented visible effect after approved isolated save/reload.'],
    'PARENT-MATERIALS': ['I-capture ang selected child/assigned material at the opened permitted document or actual access-denied message.', 'Signed URL expiry/RLS requires isolated access evidence; do not expose signed URL query tokens in screenshots.'],
    'STUDENT-DASH': ['I-capture ang synthetic learner\'s XP/streak, learning path and deadlines.', 'For mocked failure, capture the error/retry notice and recovered values. These UI screenshots do not prove SQL reward atomicity.'],
    'STUDENT-LEARN': ['I-capture ang locked/unlocked/completed module indicators for known synthetic progress fixtures.', 'Kumuha ng authorized/denied navigation result; opening one module does not prove every progression boundary.'],
    'STUDENT-MODULE': ['I-capture ang target activity, synthetic submitted transcript and visible scoring/feedback.', 'Ownership, forged-score and issued-set restrictions need their exact local/API assertions, not a generic module screenshot.'],
    'STUDENT-ASSESSMENT': s.startsWith('answer') ? ['I-capture ang unanswered state with submission disabled, selected answer state, and final result after mocked/isolated submit.', 'Isama ang assessment heading and final score/result; no real learner record mutation.'] : ['I-capture ang actual malformed/unauthorized/retry response via the isolated API or matching automated case output.', 'Never claim duplicate-reward safety from the result screen alone.'],
    'STUDENT-PRACTICE': ['I-capture ang target word/PDF activity, recognized synthetic transcript and result/retry feedback.', 'For microphone/device behavior, capture the actual permission/unsupported/error feedback if encountered; do not invent successful recognition.'],
    'STUDENT-BADGES': ['I-capture ang eligible badge/reward display sa approved fixture and the repeated/reloaded state.', 'Exactly-once credit and failed-award handling need the exact automated/model or approved isolated database assertion.'],
    'STUDENT-PROFILE': ['I-capture ang reading preference selections and actual visible text/font/contrast effect after an approved isolated save/reload.'],
    'STUDENT-WOD': s.includes('third') ? ['Sa local model/approved isolated setup: i-capture ang third incorrect result and zero added XP; include attempt count.', 'Fourth-attempt rejection and unchanged streak need exact model or approved real-database evidence.'] : ['I-capture ang before/after/replayed XP and streak state for the same synthetic daily attempt.', 'Para sa atomicity/concurrency, gamitin ang exact local model output now. Real SQL proof remains BLOCKED until its proposal is approved and executed in isolation.'],
  };
  return instructions[m.id] || ['I-capture ang relevant module heading, input state and actual visible response for this exact scenario.'];
}

let scenarioCount = 0;
for (let moduleIndex = 0; moduleIndex < modules.length; moduleIndex++) {
  const m = modules[moduleIndex];
  text(`${moduleIndex + 1}. ${m.name.toUpperCase()}`, 'heading');
  const field = (name, value) => { text(`KOPYAHIN SA ${name.toUpperCase()}:`, 'label'); text(value); };
  field('Module Name', m.name);
  field('Component Name', m.component.replace(/src\/pages\/(admin|teacher|parent|student)\//g, '').replace(/\.tsx/g, ''));
  field('Test Cycle No.', '[Enter the actual test cycle number.]');
  field('Date Tested', '[Enter the actual testing date.]');
  field('Type of System', 'Web Application');
  field('Pre-conditions', `Prepare the appropriate ${m.role} synthetic test account and fixture data. ${m.route ? `Navigate to ${m.route}.` : `Open the ${m.name} component.`} Use an isolated environment for all write or provider-dependent tests.`);
  field('Action Description', `Validate the ${m.name} module using the specified valid, invalid and failure scenarios, and check that only permitted actions succeed.`);
  field('Verification Steps', '1. Prepare the stated test account and input values. 2. Open the module and perform the action. 3. Compare the actual response and permitted data effects with the expected result. 4. Capture the scenario-specific evidence described below. 5. Record the actual observation and final remarks.');
  let cases = [...m.actions];
  const display = ['Display the module with test data', 'Populated/empty synthetic fixtures for the appropriate role.', 'Display the intended module content and an appropriate empty state without exposing unauthorized data.', 'NOT RUN', 'This manual module-sheet case has not been executed.'];
  if (m.route) cases = m.id === 'AUTH-LOGIN' ? [...cases, display] : [display, ...cases];
  cases.forEach(([scenario, data, expected, status, blocker], index) => {
    scenarioCount++;
    const id = `${m.id}_TC${String(index + 1).padStart(2, '0')}`;
    text(`SCENARIO ${index + 1} — ${id}`, 'case');
    field('Column 1 — Test Scenario', scenario);
    field('Column 2 — Data (Input Values)', data);
    field('Column 3 — Expected Results', expected);
    field('Column 4 — Actual Results', '[Enter what actually happened during this scenario. Insert the relevant screenshot below this observation. Do not copy the expected result as an unverified actual result.]');
    field('Column 5 — Remarks', `${status}${status === 'BLOCKED' ? ` — ${blocker}` : ' — not yet manually executed.'}`);
    text('ANO ANG I-SCREENSHOT:', 'screenshot');
    screenshot(m, scenario, scenario === display[0]).forEach((instruction, i) => text(`${i + 1}. ${instruction}`, 'instruction'));
    text(`Suggested filename: ${id}-result.png. Use suffixes -before, -after, -error, -empty or -variant-01 when multiple observations are required.`, 'instruction');
    text('SAAN IDIDIKIT ANG IMAGE: sa Actual Results cell/area ng mismong scenario na ito, pagkatapos ng actual observation. Screenshot instructions and filenames are guide notes, not expected/actual test results.', 'instruction');
  });
}
assert.equal(scenarioCount, 96);
text('PART II — AUTOMATED UNIT / SOURCE / MOCKED TEST EVIDENCE', 'heading');
text('Para sa automated assertion, screenshot ang exact test name, ok/PASS or not ok/FAIL result, and final totals from the recorded TAP output or a separately authorized fresh run. Hindi login-page screenshot ang proof ng unit assertion.');
text('Existing evidence: testing-audit/evidence/final-verification/gates-release-review/backend.tap and frontend.tap. Use only the matching test-case assertion. Existing totals: 548 passed, two skipped/blocked. No test was rerun while creating this document.');
text('For each record below, the expected result and actual result are the historical named-assertion scope. Do not copy them into a live UI workflow as if it had been tested. For static checks, screenshot the exact source-contract test output; for WOD concurrency, label it MODEL evidence, not SQL execution.');
for (const r of recorded) {
  text(`${r.id} — ${r.feature}`, 'case');
  text(`Expected Results: ${r.expected}`);
  text(`Actual Results: ${r.actual}`);
  text(`Remarks: ${r.status === 'PASS' ? 'PASSED for this named assertion only' : 'BLOCKED — runner skipped the dependency-gated staging case'}.`);
  text(`Screenshot: show this exact named case and status in ${r.evidence}, plus the run totals. Suggested filename: ${r.id}-tap.png.`, 'instruction');
}

const escape = (s) => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const body = paragraphs.map(({ value, style }) => {
  const heading = ['title', 'heading', 'case', 'label', 'screenshot'].includes(style);
  const size = style === 'title' ? 30 : style === 'heading' ? 26 : style === 'case' ? 23 : style === 'instruction' ? 19 : 22;
  return `<w:p><w:pPr><w:spacing w:before="${style === 'heading' ? 260 : style === 'case' ? 200 : 0}" w:after="90"/>${heading ? '<w:keepNext/>' : ''}</w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="${size}"/>${heading ? '<w:b/>' : ''}${['instruction', 'screenshot'].includes(style) ? '<w:color w:val="1F4E79"/>' : ''}</w:rPr><w:t xml:space="preserve">${escape(value)}</w:t></w:r></w:p>`;
}).join('');
const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body></w:document>`;
assert.ok(!xml.includes('<w:tbl')); assert.ok(!xml.includes('<w:drawing'));
const entries = [
  ['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'],
  ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'],
  ['word/document.xml', xml],
];
const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = (bytes) => { let crc = 0xffffffff; for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8); return (crc ^ 0xffffffff) >>> 0; };
const chunks = [], central = []; let offset = 0;
for (const [name, value] of entries) {
  const filename = Buffer.from(name), bytes = Buffer.from(value), compressed = deflateRawSync(bytes), crc = crc32(bytes);
  const h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50); h.writeUInt16LE(20, 4); h.writeUInt16LE(0x800, 6); h.writeUInt16LE(8, 8); h.writeUInt16LE(33, 12); h.writeUInt32LE(crc, 14); h.writeUInt32LE(compressed.length, 18); h.writeUInt32LE(bytes.length, 22); h.writeUInt16LE(filename.length, 26);
  const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(0x800, 8); c.writeUInt16LE(8, 10); c.writeUInt16LE(33, 14); c.writeUInt32LE(crc, 16); c.writeUInt32LE(compressed.length, 20); c.writeUInt32LE(bytes.length, 24); c.writeUInt16LE(filename.length, 28); c.writeUInt32LE(offset, 42);
  chunks.push(h, filename, compressed); central.push(c, filename); offset += 30 + filename.length + compressed.length;
}
const directory = Buffer.concat(central), ending = Buffer.alloc(22); ending.writeUInt32LE(0x06054b50); ending.writeUInt16LE(entries.length, 8); ending.writeUInt16LE(entries.length, 10); ending.writeUInt32LE(directory.length, 12); ending.writeUInt32LE(offset, 16);
const file = 'testing-audit/LINAWLETRA_COPY_PASTE_SCREENSHOT_GUIDE.docx';
fs.writeFileSync(file, Buffer.concat([...chunks, directory, ending]));
const verification = { createdAt: new Date().toISOString(), file, modules: modules.length, manualScenarios: scenarioCount, automatedRecords: recorded.length, perScenarioScreenshotGuides: paragraphs.filter((p) => p.value === 'ANO ANG I-SCREENSHOT:').length, screenshotPlacementNotes: paragraphs.filter((p) => p.value.startsWith('SAAN IDIDIKIT ANG IMAGE:')).length, tables: 0, images: 0, testsRerun: false };
assert.equal(verification.perScenarioScreenshotGuides, 96); assert.equal(verification.screenshotPlacementNotes, 96);
fs.writeFileSync(file.replace('.docx', '_VERIFICATION.json'), JSON.stringify(verification, null, 2) + '\n');
console.log(JSON.stringify(verification));
