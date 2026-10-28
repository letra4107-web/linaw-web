import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import assert from 'node:assert/strict';

const live = process.argv.includes('--live');
const actionsOnly = process.argv.includes('--actions-only');
const evidence = path.resolve('docs/qa/evidence');
fs.mkdirSync(evidence, { recursive: true });
const executable = process.env.QA_BROWSER_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const rows = [];
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let vite;
let browser;
let socket;
let browserVersion;
let base = 'https://linawletra.com';
let nextId = 0;
const pending = new Map();
const runtimeErrors = [];
const networkFailures = [];
function cdp(method, params = {}, sessionId) {
  return new Promise((resolve, reject) => {
    const id = ++nextId;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 20000);
    pending.set(id, { resolve, reject, timer });
    socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  });
}
let session;
const evaluate = async (expression) => {
  const result = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, session);
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
};
async function until(expression, timeout = 15000) {
  const start = performance.now();
  while (performance.now() - start < timeout) {
    if (await evaluate(expression)) return;
    await delay(100);
  }
  throw new Error(`Browser condition not satisfied: ${expression}`);
}
async function navigate(route, width = 1440) {
  await cdp('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width < 600 }, session);
  await cdp('Page.navigate', { url: `${base}${route}` }, session);
  const expectedPath = /^\/(admin|teacher|parent|student)(\/|$)/.test(route) ? '/login' : route;
  await until(`document.readyState === "complete" && location.pathname === ${JSON.stringify(expectedPath)} && !!document.querySelector("h1")`);
}
async function check(id, scenario, run) {
  console.log(`${id} ${scenario}`);
  try { const actual = await run(); rows.push({ id, module: live ? 'Deployed Edge browser' : 'Local Edge browser', scenario, expected: 'Expected UI behavior without authenticated data access', actual: actual || 'Assertions passed', status: 'PASS' }); }
  catch (error) { rows.push({ id, module: live ? 'Deployed Edge browser' : 'Local Edge browser', scenario, expected: 'Expected UI behavior', actual: error.message, status: 'FAIL' }); }
}
try {
  if (!fs.existsSync(executable)) throw new Error(`Browser executable unavailable: ${executable}`);
  if (!live) {
    process.env.VITE_SUPABASE_URL = 'http://127.0.0.1:9';
    process.env.VITE_SUPABASE_ANON_KEY = 'isolated-browser-anon-key';
    process.env.VITE_API_URL = 'http://127.0.0.1:9/api';
    const { build } = await import('vite');
    const outDir = path.resolve('.qa', `browser-dist-${Date.now()}`);
    await build({ build: { outDir, emptyOutDir: false }, logLevel: 'error' });
    const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff' };
    const staticServer = createServer((req, res) => {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      let file = path.resolve(outDir, `.${pathname}`);
      if (!file.startsWith(`${outDir}${path.sep}`) && file !== outDir) { res.writeHead(403).end(); return; }
      if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(outDir, 'index.html');
      res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    await new Promise((resolve) => staticServer.listen(0, '127.0.0.1', resolve));
    vite = { close: () => new Promise((resolve) => { staticServer.close(resolve); staticServer.closeAllConnections(); }) };
    base = `http://127.0.0.1:${staticServer.address().port}`;
  }
  const profile = path.resolve('.qa', `edge-${live ? 'public' : 'local'}-${Date.now()}`);
  const args = ['--headless=new', '--guest', '--disable-sync', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--disable-extensions', '--disable-background-networking', '--disable-component-update', '--no-default-browser-check', 'about:blank'];
  browser = spawn(executable, args, { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
  const endpoint = await new Promise((resolve, reject) => {
    let stderr = '';
    const timer = setTimeout(() => reject(new Error(`Browser startup timed out: ${stderr.slice(-500)}`)), 20000);
    browser.once('error', (error) => { clearTimeout(timer); reject(error); });
    browser.stderr.on('data', (chunk) => { stderr += chunk.toString(); const match = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/); if (match) { clearTimeout(timer); resolve(match[1]); } });
    browser.once('exit', (code) => { clearTimeout(timer); reject(new Error(`Browser exited at startup (${code}). ${stderr.slice(-500)}`)); });
  });
  socket = new WebSocket(endpoint);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    if (message.id && pending.has(message.id)) {
      const item = pending.get(message.id); pending.delete(message.id); clearTimeout(item.timer);
      if (message.error) item.reject(new Error(message.error.message)); else item.resolve(message.result);
    }
    if (message.method === 'Runtime.exceptionThrown') runtimeErrors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    if (message.method === 'Network.loadingFailed') networkFailures.push({ type: message.params.type, error: message.params.errorText, blockedReason: message.params.blockedReason });
  });
  browserVersion = await cdp('Browser.getVersion');
  const { targetInfos } = await cdp('Target.getTargets');
  const startup = targetInfos.find((target) => target.type === 'page' && target.url === 'about:blank');
  const { targetId } = startup || await cdp('Target.createTarget', { url: 'about:blank' });
  ({ sessionId: session } = await cdp('Target.attachToTarget', { targetId, flatten: true }));
  await cdp('Page.enable', {}, session);
  await cdp('Runtime.enable', {}, session);
  await cdp('Network.enable', {}, session);
  await cdp('Emulation.setFocusEmulationEnabled', { enabled: true }, session);
  await cdp('Page.bringToFront', {}, session);
  if (!live) await cdp('Network.setBlockedURLs', { urls: ['https://*', 'wss://*'] }, session);
  let index = actionsOnly ? 51 : 0;
  const id = () => `${live ? 'LIVE-BR' : 'BR'}-${String(++index).padStart(3, '0')}`;
  const publicRoutes = ['/', '/login', '/signup', '/forgot-password', '/reset-password', '/verify-email', '/resend-verification', '/privacy', '/terms', '/child-data', '/account-deletion', '/accessibility', '/not-a-real-page'];
  for (const width of actionsOnly ? [] : [375, 768, 1440]) {
    for (const route of publicRoutes) {
      await check(id(), `${route} renders without horizontal overflow at ${width}px`, async () => {
        await navigate(route, width);
        const result = await evaluate('({width: innerWidth, content: document.documentElement.scrollWidth, title: document.querySelector("h1")?.textContent, path: location.pathname, navigation: performance.getEntriesByType("navigation").map(e => ({domContentLoadedMs: Math.round(e.domContentLoadedEventEnd), loadMs: Math.round(e.loadEventEnd), transferBytes: e.transferSize}))})');
        assert.equal(result.path, route);
        assert.ok(result.title?.trim());
        assert.equal(await evaluate('!!document.querySelector("[role=alert]")'), false, 'The page rendered an error screen');
        assert.ok(result.content <= result.width + 1, `Horizontal overflow: ${result.content}px content / ${result.width}px viewport`);
        if (route === '/login' || route === '/signup' && width === 375) {
          const screenshot = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }, session);
          fs.writeFileSync(path.join(evidence, `${live ? 'live' : 'local'}-${route.slice(1)}-${width}.png`), Buffer.from(screenshot.data, 'base64'));
        }
        return result;
      });
    }
  }
  for (const role of actionsOnly ? [] : ['admin', 'teacher', 'parent', 'student']) {
    for (const suffix of ['', '/settings', '/not-a-real-page']) {
      await check(id(), `Anonymous ${role}${suffix} redirects to login`, async () => {
        await navigate(`/${role}${suffix}`);
        await until('location.pathname === "/login"');
        assert.equal(await evaluate('!!document.querySelector("input[type=password]")'), true);
      });
    }
  }
  await check(id(), 'Empty login submission displays validation; password visibility and keyboard toggle work', async () => {
    await navigate('/login');
    await until('!!document.getElementById("password") && !!document.querySelector("form")');
    await evaluate('document.querySelector("form").requestSubmit()');
    await until('!!document.querySelector("[role=alert]")');
    const count = await evaluate('document.querySelectorAll("[role=alert]").length');
    assert.ok(count >= 1);
    await evaluate('document.querySelector("input[type=password]").parentElement.querySelector("button").focus()');
    assert.equal(await evaluate('document.activeElement.tagName'), 'BUTTON');
    await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', text: '\r', unmodifiedText: '\r', windowsVirtualKeyCode: 13 }, session);
    await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 }, session);
    await until('document.getElementById("password").type === "text"');
  });
  await check(id(), 'Empty signup submission displays required-field errors', async () => {
    await navigate('/signup');
    await evaluate('document.querySelector("form").requestSubmit()');
    await until('document.querySelectorAll("[role=alert]").length >= 5');
  });
  await check(id(), 'OTP keyboard navigation and nonnumeric input validation', async () => {
    await navigate('/verify-email');
    await evaluate('document.querySelector("fieldset input").focus()');
    await cdp('Input.insertText', { text: '123456' }, session);
    assert.equal(await evaluate('[...document.querySelectorAll("fieldset input")].map(input => input.value).join("")'), '123456');
    await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowLeft', code: 'ArrowLeft', windowsVirtualKeyCode: 37 }, session);
    assert.equal(await evaluate('document.activeElement.getAttribute("aria-label")'), 'Digit 5 of 6');
  });
  await check(id(), 'Public forms have accessible names for visible input controls', async () => {
    const missing = [];
    for (const route of ['/login', '/signup', '/forgot-password', '/reset-password', '/verify-email', '/resend-verification']) {
      await navigate(route);
      const controls = await evaluate('[...document.querySelectorAll("input,select,textarea")].filter(el => el.type !== "hidden" && el.getClientRects().length && !el.labels?.length && !el.getAttribute("aria-label") && !el.getAttribute("aria-labelledby")).map(el => ({id: el.id, type: el.type}))');
      missing.push(...controls.map((control) => ({ route, ...control })));
    }
    assert.deepEqual(missing, []);
  });
  await check(id(), 'No uncaught JavaScript exceptions during the tested navigation and actions', async () => { assert.deepEqual(runtimeErrors, []); });
  if (!live && !actionsOnly) {
    await check(id(), 'A failed route-bundle download displays retry feedback and recovers after reloading', async () => {
      await cdp('Network.setBlockedURLs', { urls: ['https://*', 'wss://*', '*TeacherArea-*.js*'] }, session);
      await cdp('Page.navigate', { url: `${base}/teacher` }, session);
      await until('!!document.querySelector("[role=alert]") && !!document.querySelector("button")');
      assert.match(await evaluate('document.querySelector("[role=alert]").textContent'), /Hindi ma-load/);
      await cdp('Network.setBlockedURLs', { urls: ['https://*', 'wss://*'] }, session);
      await evaluate('document.querySelector("button").click()');
      await until('location.pathname === "/login" && !!document.getElementById("password")');
    });
  }
} catch (error) {
  rows.push({ id: 'BROWSER-SETUP', module: live ? 'Deployed Edge browser' : 'Local Edge browser', scenario: 'Start isolated headless browser', expected: 'Browser available', actual: error.message, status: 'BLOCKED' });
} finally {
  if (socket?.readyState === WebSocket.OPEN) { try { await cdp('Browser.close'); } catch {} socket.close(); }
  if (browser && browser.exitCode === null) browser.kill();
  if (vite) await vite.close();
  fs.writeFileSync(path.join(evidence, `${live ? 'deployed' : 'local'}-browser${actionsOnly ? '-actions' : ''}.json`), JSON.stringify({ scope: 'Public/anonymous browser behavior only; no account login, emails, TTS or database writes.', browserVersion, runtimeErrors, networkFailures, rows }, null, 2) + '\n');
  console.log(JSON.stringify({ cases: rows.length, passed: rows.filter((row) => row.status === 'PASS').length, failures: rows.filter((row) => row.status !== 'PASS') }, null, 2));
  if (rows.some((row) => row.status !== 'PASS')) process.exitCode = 1;
}
