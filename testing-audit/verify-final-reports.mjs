import fs from 'node:fs';
import path from 'node:path';
const root = 'testing-audit', base = `${root}/evidence/final-verification`;
const files = ['PROJECT_INVENTORY.md', 'FUNCTIONALITY_AUDIT.md', 'FUNCTIONAL_TEST_CASES.md', 'NON_FUNCTIONAL_TEST_CASES.md', 'UNIT_TEST_READINESS.md', 'INTEGRATION_TEST_READINESS.md', 'BUG_REPORT.md', 'REGRESSION_TEST_RESULTS.md', 'FINAL_TESTING_REPORT.md', 'DEFECT_RESOLUTION.md'];
const missingLinks = [];
for (const file of files) for (const match of fs.readFileSync(`${root}/${file}`, 'utf8').matchAll(/\]\(([^)]+)\)/g)) {
  const target = match[1];
  if (!target.startsWith('https:') && !target.startsWith('#') && !fs.existsSync(path.resolve(root, target))) missingLinks.push({ file, target });
}
const summary = JSON.parse(fs.readFileSync(`${base}/final-summary.json`));
const rows = JSON.parse(fs.readFileSync(`${base}/case-register.json`)).cases;
const fields = ['id', 'role', 'module', 'feature', 'preconditions', 'steps', 'expected', 'actual', 'status', 'evidence', 'defect'];
const caseFieldGaps = rows.flatMap((row) => fields.filter((field) => !(field in row)).map((field) => ({ id: row.id, field })));
const duplicateCaseIds = rows.length - new Set(rows.map((row) => row.id)).size;
const result = { generatedAt: new Date().toISOString(), reports: files.length, cases: rows.length, missingLinks, caseFieldGaps, duplicateCaseIds, unitPass: summary.finalPass, newUnitCases: summary.newCases, publicBrowsers: summary.browsers.filter((row) => row.name.startsWith('public-')), status: !missingLinks.length && !caseFieldGaps.length && !duplicateCaseIds ? 'PASS' : 'FAIL' };
fs.writeFileSync(`${base}/report-verification.json`, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));
if (result.status !== 'PASS') process.exitCode = 1;
