import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { chromium } from '../scripts/qa-tools/node_modules/playwright/index.mjs';
const directory = 'testing-audit/unit-test-documents';
const data = JSON.parse(fs.readFileSync(`${directory}/UNIT_TEST_DOCUMENT_DATA.json`));
const reports = [];
let browser;
try {
  browser = await chromium.launch({ headless: true, channel: 'chromium' });
  for (const name of ['UNIT_TEST_DOCUMENTS', 'MODULE_TEST_SHEETS']) {
    const context = await browser.newContext({ viewport: { width: 1123, height: 900 }, serviceWorkers: 'block' });
    await context.route('**/*', (route) => route.request().url().startsWith('file:') ? route.continue() : route.abort('blockedbyclient'));
    const page = await context.newPage();
    const errors = []; page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(pathToFileURL(path.resolve(directory, `${name}.html`)).href, { waitUntil: 'load' });
    await page.emulateMedia({ media: 'print' });
    const expectedRows = name === 'UNIT_TEST_DOCUMENTS' ? data.automated.length : data.modulePlans.length;
    assert.equal(await page.locator('table.cases tbody tr').count(), expectedRows);
    const layout = await page.evaluate(() => ({ width: innerWidth, contentWidth: document.documentElement.scrollWidth, escapedCells: Array.from(document.querySelectorAll('td,th')).filter((cell) => cell.scrollWidth > cell.clientWidth + 2).length }));
    assert.ok(layout.contentWidth <= layout.width + 1); assert.equal(layout.escapedCells, 0);
    await page.pdf({ path: `${directory}/${name}.pdf`, preferCSSPageSize: true, printBackground: true, displayHeaderFooter: true, headerTemplate: '<div></div>', footerTemplate: '<div style="font:8px Arial;width:100%;text-align:center;color:#444">LinawLetra | Existing evidence / planned sheets as labeled | Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>' });
    const firstModule = await page.locator('#AUTH-LOGIN').evaluate((element) => element.outerHTML);
    await page.setContent(`<!doctype html><html lang="en"><head><meta charset="utf-8"><style>${await page.locator('style').innerText()}</style></head><body>${firstModule}</body></html>`);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `${directory}/${name}-preview.png` });
    assert.deepEqual(errors, []);
    const pdf = await createRequire(new URL('../server/package.json', import.meta.url))('pdf-parse')(fs.readFileSync(`${directory}/${name}.pdf`));
    const normalized = pdf.text.replace(/\s+/g, '');
    const expected = name === 'UNIT_TEST_DOCUMENTS' ? data.automated : data.modulePlans;
    const missingCaseIds = expected.filter((row) => !normalized.includes(row.id.replace(/\s+/g, ''))).map((row) => row.id);
    assert.deepEqual(missingCaseIds, []);
    reports.push({ document: `${name}.pdf`, status: 'PASS', pages: pdf.numpages, expectedRows, renderedRows: expectedRows, allExpectedCaseIdsPresent: true, layout, bytes: fs.statSync(`${directory}/${name}.pdf`).size });
    await context.close();
  }
} catch (error) { reports.push({ status: 'BLOCKED / FAIL', actual: error.message }); process.exitCode = 1; }
finally { if (browser) await browser.close(); }
const report = { generatedAt: new Date().toISOString(), scope: 'Local static document rendering/validation only; not an application test rerun. No remote page or service accessed.', reports };
fs.writeFileSync(`${directory}/PRINT_VERIFICATION.json`, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report));
