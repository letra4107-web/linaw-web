import fs from 'node:fs';
import { createServer } from 'node:http';
import { chromium } from '../scripts/qa-tools/node_modules/playwright/index.mjs';

const output = process.env.QA_EVIDENCE_DIR || 'testing-audit/evidence/resolution/browser-diagnostic';
fs.mkdirSync(output, { recursive: true });
const reports = [];
for (const [name, executablePath] of [['Edge', 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'], ['Chromium', null]]) {
  for (const routing of [true, false]) {
    let server, browser;
    const requests = [], report = { name, routing, runs: [], requests };
    try {
      server = createServer((req, res) => {
        requests.push({ url: req.url, time: Date.now() });
        res.setHeader('Cache-Control', 'no-store');
        if (req.url === '/') { res.setHeader('Content-Type', 'text/html'); res.end('<!doctype html><meta name="viewport" content="width=device-width"><link rel="stylesheet" href="/style.css"><h1>Independent fixture</h1>' + Array.from({ length: 20 }, (_, i) => `<script src="/chunk-${i}.js"></script>`).join('')); }
        else if (req.url === '/style.css') { res.setHeader('Content-Type', 'text/css'); res.end('body{max-width:100%;margin:0}'); }
        else { res.setHeader('Content-Type', 'text/javascript'); res.end('window.loaded=(window.loaded||0)+1;'); }
      });
      await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
      const base = `http://127.0.0.1:${server.address().port}`;
      report.base = base;
      try { report.nodeHttpStatus = (await fetch(base)).status; } catch (error) { report.nodeHttpError = { message: error.message, code: error.cause?.code }; }
      browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : { channel: 'chromium' }) });
      report.version = browser.version();
      for (let i = 0; i < 10; i++) {
        const context = await browser.newContext({ viewport: { width: 375, height: 800 }, serviceWorkers: 'block' });
        const failures = [], start = requests.length;
        if (routing) await context.route('**/*', route => route.request().url().startsWith(base + '/') ? route.continue() : route.abort());
        try {
          const page = await context.newPage();
          page.on('requestfailed', req => failures.push({ url: req.url(), error: req.failure()?.errorText }));
          await page.goto(base, { timeout: 15000 });
          report.runs.push({ index: i, loaded: await page.evaluate(() => window.loaded), failures, observedAtServer: requests.slice(start).map(r => r.url) });
        } catch (error) { report.runs.push({ index: i, error: error.message, failures, observedAtServer: requests.slice(start).map(r => r.url) }); }
        finally { await context.close(); }
      }
    } catch (error) { report.setupError = error.message; }
    finally {
      if (browser) await browser.close();
      if (server) await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
      reports.push(report);
      fs.writeFileSync(`${output}/network-diagnostic.json`, JSON.stringify({ timestamp: new Date().toISOString(), scope: 'Independent Node HTML/CSS/20-script fixture, routed versus native HTTP loading. No React, Vite, app source, environment files, Supabase or remote page resources. No browser/OS security policy changed.', reports }, null, 2) + '\n');
      console.log(JSON.stringify({ name, routing, setupError: report.setupError, nodeHttpStatus: report.nodeHttpStatus, complete: report.runs.filter(r => r.loaded === 20 && !r.failures.length).length, runs: report.runs.length, denied: report.runs.flatMap(r => r.failures).filter(f => f.error?.includes('ACCESS_DENIED')).length }));
    }
  }
}
