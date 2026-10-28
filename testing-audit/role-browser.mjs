import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { chromium, firefox } from '../scripts/qa-tools/node_modules/playwright/index.mjs';
import { apiFixture, createRoleModel, ids } from './fixtures/roleModel.mjs';

// Explicitly substitutes only the Supabase client boundary in an isolated build.
// Real routes, AuthProvider, role resolution, React Query and components execute.
// No production build configuration or application environment file is changed.
const evidence = process.env.QA_EVIDENCE_DIR || 'testing-audit/evidence/final-verification/role-browser';
fs.mkdirSync(evidence, { recursive: true });
const browserName = process.argv.find((arg) => arg.startsWith('--browser='))?.split('=')[1] || 'firefox';
const variants = (process.argv.find((arg) => arg.startsWith('--variants='))?.split('=')[1] || 'populated,empty').split(',');
const widths = (process.argv.find((arg) => arg.startsWith('--widths='))?.split('=')[1] || '1440,375').split(',').map(Number);
const dashboardOnly = process.argv.includes('--dashboard-only');
const skipAxe = process.argv.includes('--no-a11y');
const routes = {
  admin: ['', '/users', '/archived', '/teachers', '/sections', '/analytics', '/notifications', '/settings', '/profile', '/audit-logs', '/students', '/parents', '/teachers-monitoring'],
  teacher: ['', '/students', '/lessons', '/progress-reports', '/messages', '/settings'],
  parent: ['', '/children', '/progress', '/schedule', '/messages', '/settings', '/notifications', '/app-settings', '/materials'],
  student: ['', '/learn', `/learn/module/${ids.module}`, `/learn/assessment/${ids.assessment}`, '/practice', '/achievements', '/profile'],
};
const selectedRoles = (process.argv.find((arg) => arg.startsWith('--roles='))?.split('=')[1] || Object.keys(routes).join(',')).split(',');
process.env.VITE_SUPABASE_URL = 'http://127.0.0.1:9';
process.env.VITE_SUPABASE_ANON_KEY = 'isolated-browser-anon-key';
process.env.VITE_API_URL = '/api';
const { build } = await import('vite');
const outDir = path.resolve('.qa', `role-browser-${Date.now()}`);
await build({ logLevel: 'error', build: { outDir, emptyOutDir: false, sourcemap: true }, plugins: [{
  name: 'isolated-supabase-boundary', enforce: 'pre',
  resolveId(id, importer) {
    if (importer && id.startsWith('.') && path.resolve(path.dirname(importer), id).replace(/\.ts$/, '') === path.resolve('src/lib/supabaseClient')) return path.resolve('testing-audit/fixtures/browserSupabase.mjs');
  },
  transform(code, id) {
    if (id.replaceAll('\\', '/').endsWith('/src/main.tsx')) return `${code}\nglobalThis.__QA_QUERY_CLIENT__ = queryClient;`;
  },
}] });
const requests = [];
const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff': 'font/woff', '.woff2': 'font/woff2', '.json': 'application/json' };
const server = createServer((req, res) => {
  requests.push({ path: new URL(req.url, 'http://localhost').pathname, time: Date.now() });
  let file = path.resolve(outDir, `.${decodeURIComponent(new URL(req.url, 'http://localhost').pathname)}`);
  if (!file.startsWith(outDir + path.sep)) { res.writeHead(403).end(); return; }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(outDir, 'index.html');
  res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
let browser;
const rows = [], accessibility = [], controls = [], contextReports = [];
const filePrefix = `${browserName}-${variants.join('-')}`;
const report = { startedAt: new Date().toISOString(), scope: 'Real role UI and frontend auth/role middleware with synthetic sessions and explicitly mocked Supabase/API persistence. Not real Supabase Auth, RLS, delivery or durable CRUD.', browser: browserName, rows, accessibility, controls, contextReports, requests };
function save() { fs.writeFileSync(`${evidence}/${filePrefix}.json`, JSON.stringify(report, null, 2) + '\n'); }
async function check(role, variant, width, feature, run) {
  const row = { id: `ROLE-${browserName}-${String(rows.length + 1).padStart(3, '0')}`, role, module: 'Authenticated UI with mocked boundaries', feature, preconditions: `${browserName}, ${width}px, ${variant} synthetic session/data`, steps: feature, expected: 'Named UI assertions pass; no remote service request', evidence: `${filePrefix}.json` };
  try { row.actual = await run() || 'Named assertions passed'; row.status = 'PASS'; }
  catch (error) { row.actual = error.message; row.status = 'FAIL'; }
  rows.push(row); save(); console.log(JSON.stringify({ id: row.id, role, variant, width, feature, status: row.status }));
}
try {
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(Number(process.env.QA_LOOPBACK_PORT || 0), '127.0.0.1', resolve); });
  const base = `http://127.0.0.1:${server.address().port}`;
  report.base = base;
  browser = await (browserName === 'firefox' ? firefox : chromium).launch({ headless: true, ...(browserName === 'edge' ? { executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe' } : browserName === 'chromium' ? { channel: 'chromium' } : {}) });
  report.version = browser.version();
  for (const role of selectedRoles) for (const variant of variants) for (const width of widths) {
    const model = createRoleModel(role, variant), runtimeErrors = [], failedRequests = [], escapedRequests = [];
    const context = await browser.newContext({ viewport: { width, height: 1000 }, serviceWorkers: 'block' });
    const contextReport = { role, variant, width, runtimeErrors, failedRequests, escapedRequests, api: model.calls, unexpectedApi: model.unexpected };
    contextReports.push(contextReport);
    await context.addInitScript(({ role, variant }) => { globalThis.__LINAW_QA_ROLE__ = role; globalThis.__LINAW_QA_VARIANT__ = variant; }, { role, variant });
    await context.route('**/*', async (route) => {
      const req = route.request(), url = req.url();
      if (url.startsWith(base + '/api/')) {
        const result = apiFixture(model, new URL(url).pathname + new URL(url).search, req.method(), req.postDataJSON() || {});
        return route.fulfill({ status: result.status || 200, headers: { 'content-type': 'application/json', 'x-api-compatibility-version': '3', 'access-control-allow-origin': '*' }, body: JSON.stringify(result.data) });
      }
      if (url.startsWith(base + '/') && ['GET', 'HEAD'].includes(req.method())) return route.continue();
      escapedRequests.push({ method: req.method(), url });
      return route.abort('blockedbyclient');
    });
    let page;
    const openPage = async () => {
      page = await context.newPage(); page.setDefaultTimeout(10000); page.setDefaultNavigationTimeout(15000);
      page.on('pageerror', (error) => runtimeErrors.push(error.message));
      page.on('console', (message) => { if (message.type() === 'error') (contextReport.consoleErrors ||= []).push(message.text().slice(0, 1500)); });
      page.on('requestfailed', (req) => failedRequests.push({ url: req.url(), error: req.failure()?.errorText }));
    };
    await openPage();
    const visit = async (suffix) => {
      try { await page.goto(`${base}/${role}${suffix}`, { waitUntil: 'domcontentloaded' }); }
      catch (error) { await page.close(); await openPage(); throw error; }
      await page.waitForFunction(() => !!globalThis.__LINAW_QA_MODEL__);
      await page.locator('main').first().waitFor();
      await page.waitForFunction(() => !document.body.textContent.includes('Sinusuri ang iyong account'));
      await page.waitForFunction(() => globalThis.__QA_QUERY_CLIENT__?.isFetching() === 0);
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await page.waitForFunction(() => globalThis.__QA_QUERY_CLIENT__?.isFetching() === 0);
      if (variant === 'error') await page.waitForFunction(() => {
        const queries = globalThis.__QA_QUERY_CLIENT__.getQueryCache().getAll();
        return globalThis.__QA_QUERY_CLIENT__.isFetching() === 0 && queries.some((q) => q.state.status === 'error') && queries.every((q) => !q.state.fetchFailureCount || q.state.status === 'error');
      });
    };
    try {
      for (const suffix of dashboardOnly ? [''] : routes[role]) await check(role, variant, width, `Render /${role}${suffix} with no route crash or cross-role redirect`, async () => {
        const before = runtimeErrors.length;
        await visit(suffix);
        assert.equal(new URL(page.url()).pathname, `/${role}${suffix}`);
        assert.equal(await page.getByText('Hindi ma-load ang pahina. Suriin ang koneksyon at subukan muli.', { exact: false }).count(), 0);
        // Let already-running mocked responses settle without a retry/reload.
        await page.waitForTimeout(120);
        assert.deepEqual(runtimeErrors.slice(before), []);
        const ui = await page.evaluate(() => ({ text: document.querySelector('main')?.textContent?.trim().slice(0, 160), width: innerWidth, content: document.documentElement.scrollWidth, navigation: performance.getEntriesByType('navigation').map((n) => ({ domContentLoadedMs: n.domContentLoadedEventEnd, loadMs: n.loadEventEnd })), unexpected: globalThis.__LINAW_QA_MODEL__.unexpected, queryFailures: globalThis.__QA_QUERY_CLIENT__.getQueryCache().getAll().filter((q) => q.state.status === 'error').map((q) => ({ key: q.queryKey, error: q.state.error?.message })) }));
        assert.ok(ui.text?.length > 5);
        assert.deepEqual(ui.unexpected, [], 'Unsupported fixture table is a harness gap, not a verified application defect');
        assert.deepEqual(model.unexpected, [], 'Unsupported fixture API is a harness gap');
        assert.ok(model.calls.length > 0, 'No mock API was reached; this cannot verify a populated dashboard');
        if (variant !== 'error') assert.deepEqual(ui.queryFailures, [], 'Failed data queries must not be counted as a populated/empty render pass');
        if (variant === 'error' && !suffix) {
          assert.ok(ui.queryFailures.length > 0, 'The isolated outage must reach a query error');
          await page.locator('main').getByRole('alert').filter({ hasText: /unable|hindi|unavailable/i }).first().waitFor();
        }
        controls.push({ role, variant, width, path: `/${role}${suffix}`, controls: await page.locator('button,input,select,textarea,a[href]').evaluateAll((elements) => elements.filter((el) => el.getClientRects().length).map((el) => ({ tag: el.tagName, name: el.getAttribute('aria-label') || el.labels?.[0]?.textContent?.trim() || el.textContent?.trim().slice(0, 70) || el.getAttribute('placeholder') || '', disabled: el.disabled || false, type: el.type || '', href: el.getAttribute('href'), status: 'NOT RUN', actual: 'Visible control inventory; rendering does not verify its action' }))) });
        if (!suffix && variant === 'populated') {
          try { await page.screenshot({ path: `${evidence}/${browserName}-${role}-${width}.png`, fullPage: true, timeout: 5000 }); }
          catch (error) { ui.screenshotStatus = 'BLOCKED'; ui.screenshotError = error.message; }
        }
        return ui;
      });
      if (variant === 'error') await check(role, variant, width, 'Dashboard retry recovers after the isolated service becomes available', async () => {
        model.variant = 'populated';
        await page.evaluate(() => { globalThis.__LINAW_QA_MODEL__.variant = 'populated'; });
        await page.locator('main').getByRole('button', { name: /Subukan muli/ }).first().click();
        await page.waitForFunction(() => globalThis.__QA_QUERY_CLIENT__.isFetching() === 0);
        await page.locator('main').getByRole('alert').first().waitFor({ state: 'hidden' });
        const errors = await page.evaluate(() => globalThis.__QA_QUERY_CLIENT__.getQueryCache().getAll().filter((q) => q.state.status === 'error' && !String(q.queryKey[0]).includes('notifications')).map((q) => q.queryKey));
        // Parent language/avatar errors have their own controls; this journey
        // verifies recovery of the dashboard query behind its retry action.
        if (role !== 'parent') assert.deepEqual(errors, []);
      });
      if (variant === 'populated' && width === 1440) {
        await check(role, variant, width, 'Wrong-role URL redirects to the signed-in role dashboard', async () => {
          const other = role === 'admin' ? 'teacher' : 'admin';
          await page.goto(`${base}/${other}`); await page.waitForURL(`${base}/${role}`); await page.locator('main').first().waitFor();
        });
        if (role === 'admin') await check(role, variant, width, 'System settings edit submits and displays success with mocked persistence', async () => {
          await visit('/settings'); await page.getByLabel('System name', { exact: true }).fill('QA Updated');
          await page.getByRole('button', { name: 'Save changes', exact: true }).click();
          await page.locator('[role=status]').filter({ hasText: /saved|updated|Na-save/i }).first().waitFor();
          assert.equal(model.settings.systemName, 'QA Updated');
        });
        if (role === 'admin') await check(role, variant, width, 'Admin navigation search reports no match, dismisses with Escape and navigates with Enter', async () => {
          await visit(''); const input = page.getByRole('searchbox', { name: 'Search admin pages' });
          await input.fill('no-such-page'); await page.getByRole('status').filter({ hasText: 'No matching pages.' }).waitFor();
          await input.press('Escape'); assert.equal(await input.inputValue(), '');
          await input.fill('Sections'); await input.press('Enter'); await page.waitForURL(`${base}/admin/sections`);
        });
        if (role === 'teacher') await check(role, variant, width, 'Teacher sends a message through the actual UI to the synthetic roster parent', async () => {
          await visit('/messages');
          const field = page.getByPlaceholder('Isulat ang iyong mensahe...'); await field.fill('QA local message');
          await page.getByRole('button', { name: /Ipadala|Send message|^Send$/i }).last().click();
          await page.getByText('QA local message', { exact: true }).last().waitFor();
          const calls = await page.evaluate(() => globalThis.__LINAW_QA_MODEL__.calls);
          assert.ok(calls.some((c) => c.table === 'teacher_messages' && c.method === 'insert' && c.values.parent_id === ids.parent));
        });
        if (role === 'student') await check(role, variant, width, 'Student assessment requires an answer, records selected text and submits the resulting attempt', async () => {
          await visit(`/learn/assessment/${ids.assessment}`);
          const submit = page.getByRole('button', { name: 'Isumite ang Pagsusulit', exact: true });
          assert.equal(await submit.isDisabled(), true);
          await page.getByRole('button', { name: 'bata', exact: true }).click();
          await page.waitForFunction(() => !Array.from(document.querySelectorAll('button')).find((b) => b.textContent === 'Isumite ang Pagsusulit')?.disabled);
          await submit.click(); await page.getByRole('heading', { name: 'Magaling!', exact: true }).waitFor();
          const answer = model.calls.find((c) => c.path === `/student/learn/content/${ids.item}/attempt`);
          assert.equal(answer.body.transcript, 'bata'); assert.equal(answer.body.source, 'assessment');
          const completed = model.calls.find((c) => c.path.endsWith('/submit'));
          assert.deepEqual(completed.body.responses, [{ assessment_item_id: ids.item, content_attempt_id: ids.item }]);
        });
        if (!skipAxe) await check(role, variant, width, 'Automated accessibility scan of role dashboard', async () => {
          await visit('');
          const axePath = path.resolve('scripts/qa-tools/node_modules/axe-core/axe.min.js');
          if (!fs.existsSync(axePath)) throw new Error('BLOCKED: axe-core QA tooling unavailable');
          await page.addScriptTag({ path: axePath });
          const outcome = await page.evaluate(async () => { const result = await globalThis.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }); return { violations: result.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.map((n) => ({ target: n.target, failureSummary: n.failureSummary })) })), incomplete: result.incomplete.map((v) => ({ id: v.id, nodes: v.nodes.length })), passes: result.passes.length }; });
          accessibility.push({ role, width, ...outcome }); assert.deepEqual(outcome.violations, []);
        });
      }
    } finally { await context.close(); save(); }
  }
} catch (error) { report.setupError = error.message; report.setupStatus = 'BLOCKED'; save(); }
finally { if (browser) await browser.close(); if (server.listening) await new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }); report.completedAt = new Date().toISOString(); save(); }
if (report.setupError || rows.some((row) => row.status !== 'PASS')) process.exitCode = 1;
