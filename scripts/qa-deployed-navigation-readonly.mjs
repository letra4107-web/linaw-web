import fs from 'node:fs';
import assert from 'node:assert/strict';
import { chromium } from './qa-tools/node_modules/playwright/index.mjs';

// Fresh anonymous browser. No forms, account sessions, database clients or RPCs.
const base = 'https://linawletra.com';
const evidence = 'docs/qa/evidence/main-post-migration/deployed-readonly-2026-10-18';
const report = {
  timestamp: new Date().toISOString(),
  scope: 'Anonymous Edge navigation only. GET/HEAD to frontend origin permitted; every other request and service worker blocked. No form submission or account session. Resized desktop viewports, not physical mobile devices. Database and authenticated workflows unexecuted.',
  rows: [], runtimeErrors: [], blockedRequests: [],
};
fs.mkdirSync(evidence, { recursive: true });
const save = () => fs.writeFileSync(`${evidence}/browser-navigation.json`, JSON.stringify(report, null, 2) + '\n');
let browser;
async function check(scenario, run) {
  const row = { id: `READONLY-NAV-${String(report.rows.length + 1).padStart(3, '0')}`, scenario };
  try { row.actual = await run(); row.status = 'PASS'; }
  catch (error) {
    row.status = /net::ERR_(NETWORK_ACCESS_DENIED|NAME_NOT_RESOLVED|INTERNET_DISCONNECTED|PROXY_CONNECTION_FAILED)|^Browser checks did not/.test(error.message) ? 'BLOCKED' : 'FAIL';
    row.actual = error.message;
  }
  report.rows.push(row); save(); console.log(`${row.id} ${row.status} ${scenario}`);
}
try {
  browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe' });
  report.browserVersion = browser.version();
  const context = await browser.newContext({ viewport: { width: 375, height: 900 }, serviceWorkers: 'block' });
  context.setDefaultTimeout(10000); context.setDefaultNavigationTimeout(15000);
  await context.route('**/*', route => {
    const request = route.request();
    const origin = new URL(request.url()).origin;
    if (!['GET', 'HEAD'].includes(request.method()) || origin !== base) {
      report.blockedRequests.push({ method: request.method(), origin });
      return route.abort('blockedbyclient');
    }
    return route.continue();
  });
  const page = await context.newPage();
  page.on('pageerror', error => report.runtimeErrors.push(error.message));
  const routes = ['/', '/login', '/signup', '/forgot-password', '/reset-password', '/verify-email', '/resend-verification', '/privacy', '/terms', '/child-data', '/account-deletion', '/accessibility', '/not-a-real-page'];
  for (const width of [375, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of routes) await check(`${route} renders without horizontal overflow at ${width}px`, async () => {
      const response = await page.goto(base + route, { waitUntil: 'load' });
      assert.equal(response.status(), 200);
      await page.locator('h1').first().waitFor();
      const actual = await page.evaluate(() => ({ path: location.pathname, title: document.querySelector('h1')?.textContent, width: innerWidth, contentWidth: document.documentElement.scrollWidth }));
      assert.equal(actual.path, route); assert.ok(actual.title?.trim());
      assert.equal(await page.locator('[role=alert]').count(), 0, 'Page rendered an alert/error screen');
      assert.ok(actual.contentWidth <= width + 1, `Horizontal overflow ${actual.contentWidth}/${width}`);
      if (['/', '/login'].includes(route)) await page.screenshot({ path: `${evidence}/${route === '/' ? 'home' : 'login'}-${width}.png` });
      return actual;
    });
  }
  for (const role of ['admin', 'teacher', 'parent', 'student']) await check(`Anonymous /${role} redirects to login`, async () => {
    await page.goto(`${base}/${role}`, { waitUntil: 'load' });
    await page.waitForURL(url => url.pathname === '/login');
    await page.locator('input[type=password]').waitFor();
    return 'Redirected to login; no session or dashboard record access';
  });
  await check('No uncaught JavaScript exceptions during scoped navigation', async () => {
    if (!report.rows.slice(0, 26).every(row => row.status === 'PASS')) throw new Error('Browser checks did not complete all planned public page renders; a clean-navigation exception result cannot be established.');
    assert.deepEqual(report.runtimeErrors, []); return 'No uncaught exceptions observed';
  });
} catch (error) {
  report.rows.push({ id: 'READONLY-NAV-SETUP', scenario: 'Anonymous browser setup', status: 'BLOCKED', actual: error.message });
} finally {
  if (browser) await browser.close();
  save();
  const counts = Object.fromEntries(['PASS', 'FAIL', 'BLOCKED'].map(status => [status, report.rows.filter(row => row.status === status).length]));
  console.log(JSON.stringify(counts));
  if (counts.FAIL || counts.BLOCKED) process.exitCode = 1;
}
