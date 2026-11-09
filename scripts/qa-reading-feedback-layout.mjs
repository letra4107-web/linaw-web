import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { build } from 'vite';
import { createServer } from 'node:http';
import { chromium } from './qa-tools/node_modules/playwright/index.mjs';
import { apiFixture, createRoleModel, ids } from '../testing-audit/fixtures/roleModel.mjs';

process.env.VITE_SUPABASE_URL = 'http://127.0.0.1:9';
process.env.VITE_SUPABASE_ANON_KEY = 'isolated-browser-anon-key';
process.env.VITE_API_URL = '/api';
// Run from the repository root after installing scripts/qa-tools dependencies.
// Real components and CSS, synthetic authentication, transcripts and playback.
const outDir = path.resolve('.qa/reading-feedback-layout-build');
await build({ logLevel: 'error', build: { outDir, emptyOutDir: false }, plugins: [{
  name: 'isolated-reading-boundary', enforce: 'pre',
  resolveId(id, importer) {
    if (importer && id.startsWith('.') && path.resolve(path.dirname(importer), id).replace(/\.ts$/, '') === path.resolve('src/lib/supabaseClient')) return path.resolve('testing-audit/fixtures/browserSupabase.mjs');
  },
  transform(code, id) {
    if (id.replaceAll('\\', '/').endsWith('/testing-audit/fixtures/browserSupabase.mjs')) return code.replace('globalThis.__LINAW_QA_MODEL__ = model;', `globalThis.__LINAW_QA_MODEL__ = model; model.tables.reading_content = [{ id: '${ids.item}', content_text: 'ano', content_type: 'word', is_active: true, level: 'Beginner' }]; model.tables.word_definitions = [{word_key:'ano',display_word:null,meaning_fil:'Isang tanong tungkol sa isang bagay o pangyayari.',example_sentence:null}]; model.tables.student_settings[0].dyslexia_font = globalThis.__READING_DYSLEXIC__ || false; model.tables.student_settings[0].font_size = globalThis.__READING_FONT_SIZE__ || 'medium';`) + '\nexport async function verifyAccountPassword() { throw new Error("Not available in reading fixture"); }';
  },
}] });
const server = createServer((req, res) => {
  let file = path.resolve(outDir, `.${decodeURIComponent(new URL(req.url, 'http://localhost').pathname)}`);
  if (!file.startsWith(outDir + path.sep)) { res.writeHead(403).end(); return; }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(outDir, 'index.html');
  const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff': 'font/woff', '.woff2': 'font/woff2' };
  res.writeHead(200, {
    'Content-Type': types[path.extname(file)] || 'application/octet-stream',
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; media-src 'self' data: blob:; worker-src 'none'; object-src 'none'",
  });
  fs.createReadStream(file).pipe(res);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const mainStyles = fs.readFileSync(path.join(outDir, 'assets', fs.readdirSync(path.join(outDir, 'assets')).find(name => /^index-.*\.css$/.test(name))), 'utf8');
let browser;
try {
  browser = await chromium.launch({ headless: true, channel: 'chromium' });
  for (const variant of [
    {width:1280,height:800,dyslexic:false,fontSize:'medium'},
    {width:375,height:667,dyslexic:false,fontSize:'medium'},
    {width:1918,height:934,dyslexic:true,fontSize:'large'},
    {width:1280,height:800,dyslexic:true,fontSize:'large'},
    {width:375,height:667,dyslexic:true,fontSize:'large'},
  ]) {
    const {width,height,dyslexic,fontSize}=variant;
    const context = await browser.newContext({ viewport: { width, height } });
    const audioRequests = [], errors = [];
    const model = createRoleModel('student');
    let eventNumber = 0;
    const eventContents = new Map();
    await context.addInitScript(({dyslexic,fontSize}) => {
      globalThis.__LINAW_QA_ROLE__ = 'student';
      globalThis.__READING_DYSLEXIC__ = dyslexic;
      globalThis.__READING_FONT_SIZE__ = fontSize;
      globalThis.__READING_TRANSCRIPT__ = 'ano';
      globalThis.SpeechRecognition = class {
        start() { setTimeout(() => this.onresult?.({ results: [[{ transcript: globalThis.__READING_TRANSCRIPT__, confidence: 0.95 }]] }), 30); }
        stop() {}
      };
      HTMLMediaElement.prototype.play = function () { queueMicrotask(() => this.onended?.()); return Promise.resolve(); };
      HTMLMediaElement.prototype.pause = function () {};
    }, {dyslexic,fontSize});
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin !== base) return route.abort();
      if (!url.pathname.startsWith('/api/')) return route.continue();
      let result;
      const body = request.postDataJSON() || {};
      if (url.pathname === '/api/student/lessons') result = { lessons: [{ id: ids.item, title: 'Aralin sa mga Patinig', description: 'Basahin ang A, E, I, O, U.', grade_level: '1', file_name: 'patinig.pdf', created_at: model.timestamp }] };
      else if (url.pathname.endsWith('/access-url')) result = { url: `${base}/sample.pdf` };
      else if (url.pathname === '/api/tts') { audioRequests.push(body); result = { audioContent: 'UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAA==', languageCode: 'fil-PH' }; }
      else if (url.pathname === '/api/student/progress/events/start') {
        const eventId = `event-${++eventNumber}`; eventContents.set(eventId, body.contentId);
        result = { eventId, expiresAt: new Date(Date.now() + 60000).toISOString() };
      } else if (url.pathname.startsWith('/api/student/progress/events/')) {
        const contentId = eventContents.get(url.pathname.split('/').at(-1));
        const correct = body.transcript === 'ano';
        result = { success: true, result: { attempt_id: `answer-${eventNumber}`, correct, accuracy: correct ? 100 : 0 }, baseReward: { rewardType: 'content_practice', contentId, status: 'not_applicable', xpAwarded: 0 }, progress: { xp: 0, total_attempts: eventNumber }, xpAwarded: 0, replayed: false, newlyPersistedAchievementIds: [] };
      } else {
        const fixture = apiFixture(model, url.pathname + url.search, request.method(), body);
        return route.fulfill({ status: fixture.status || 200, contentType: 'application/json', headers: { 'x-api-compatibility-version': '3' }, body: JSON.stringify(fixture.data) });
      }
      await route.fulfill({ contentType: 'application/json', headers: { 'x-api-compatibility-version': '3' }, body: JSON.stringify(result) });
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/student/learn`, { waitUntil: 'domcontentloaded' });
    await page.addStyleTag({ content: mainStyles });
    await page.waitForFunction(() => getComputedStyle(document.body).margin === '0px');
    await page.getByRole('tab', { name: 'Galing sa Guro' }).click();
    await page.getByRole('heading', { name: 'Aralin sa mga Patinig' }).waitFor();
    const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: 'Buksan ang PDF' }).click();
    const popup = await popupPromise; await popup.waitForURL(`${base}/sample.pdf`); await popup.close();
    await page.screenshot({ path: `.qa/teacher-lessons-${width}.png`, fullPage: true });
    await page.goto(`${base}/student/practice`, { waitUntil: 'domcontentloaded' });
    await page.addStyleTag({ content: mainStyles });
    await page.waitForFunction(() => getComputedStyle(document.body).margin === '0px');
    await page.waitForFunction(font => document.body.dataset.font === font, dyslexic ? 'dyslexic' : 'default');
    assert.equal(await page.evaluate(() => document.documentElement.style.getPropertyValue('--font-scale')),fontSize==='large'?'1.16':'1');
    const mic = page.getByRole('button', { name: 'Simulan ang pagbigkas' });
    await mic.waitFor();
    await mic.scrollIntoViewIfNeeded();
    const initialHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    const initialScroll = await page.evaluate(() => scrollY);
    await mic.click();
    await page.getByRole('button', { name: 'Pakinggan ang positibong mensahe' }).waitFor();
    await page.waitForFunction(() => document.body.textContent.includes('Narinig: "ano"'));
    assert.ok(!(await page.locator('main').textContent()).includes('Na-save ang pagsubok'));
    await page.waitForTimeout(250);
    assert.equal(await page.evaluate(() => scrollY), initialScroll, 'feedback never scrolls the child');
    assert.equal(await page.evaluate(() => document.documentElement.scrollHeight), initialHeight, 'feedback adds no page height');
    const toast = page.getByRole('region', { name: 'Mensahe sa iyong pagbasa' });
    assert.equal(await toast.evaluate(node => node.parentElement === document.body), true, 'feedback is outside clipped reading cards');
    const bounds = await toast.boundingBox();
    assert.ok(bounds.y >= 0 && bounds.y + bounds.height <= height, 'feedback fits inside the viewport');
    const micBounds=await mic.boundingBox();
    const overlaps=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
    assert.equal(overlaps(bounds,micBounds),false,'feedback must not cover the microphone');
    assert.ok(bounds.height<185,'correct feedback stays compact with dyslexia spacing enabled');
    const paragraphMargins=await toast.locator('p').evaluateAll(nodes=>nodes.map(node=>getComputedStyle(node).marginBottom));
    assert.ok(paragraphMargins.every(value=>value==='0px'),'reading paragraph margins must not expand the feedback UI');
    await page.locator('body > canvas[data-reading-confetti="true"]').waitFor();
    assert.equal(await page.locator('canvas[data-reading-confetti]').evaluate(canvas => getComputedStyle(canvas).pointerEvents), 'none');
    const hasParticles = await page.locator('canvas[data-reading-confetti]').evaluate(canvas => {
      const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      return pixels.some((value, index) => index % 4 === 3 && value > 0);
    });
    assert.equal(hasParticles, true, 'confetti actually draws particles under production-style CSP');
    assert.equal(await page.getByText('Pindutin ang Pakinggan para marinig ang mensahe.').count(), 0);
    const before = audioRequests.length;
    await toast.getByRole('button', { name: 'Isara ang mensahe' }).click();
    assert.equal(await page.locator('canvas[data-reading-confetti]').count(), 0);
    await page.evaluate(() => { globalThis.__READING_TRANSCRIPT__ = 'pusa'; });
    await mic.click();
    await page.waitForFunction(() => document.body.textContent.includes('Narinig: "pusa"'));
    await page.getByRole('button', { name: 'Pakinggan ang positibong mensahe' }).waitFor();
    await page.waitForTimeout(250);
    assert.equal(await page.locator('body > canvas[data-reading-confetti]').count(), 1);
    assert.equal(await page.getByText('Pindutin ang Pakinggan para marinig ang mensahe.').count(), 0);
    assert.ok(audioRequests.some(item => item.text === 'Ulitin natin. Pakinggan mabuti.'));
    assert.ok(audioRequests.length > before, 'incorrect attempt also requests spoken feedback');
    const wrongBounds=await toast.boundingBox();
    assert.equal(overlaps(wrongBounds,await mic.boundingBox()),false,'encouragement must not cover the microphone');
    assert.ok(wrongBounds.height<210,'incorrect feedback stays compact');
    await page.screenshot({ path: `.qa/reading-feedback-${width}-${dyslexic?'dyslexic':'default'}.png` });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, 'no horizontal overflow');
    assert.deepEqual(errors, []);
    await toast.getByRole('button', { name: 'Ulitin', exact: true }).click();
    await page.getByRole('button', { name: 'Pakinggan ang positibong mensahe' }).waitFor();
    await page.getByRole('region', { name: 'Mensahe sa iyong pagbasa' }).getByRole('button', { name: 'Susunod', exact: true }).click();
    assert.equal(await page.locator('canvas[data-reading-confetti]').count(), 0);
    console.log(JSON.stringify({ width, height, dyslexic, fontSize, teacherLessonVisible: true, pdfOpens: true, feedbackFitsViewport: true, noExtraScroll: true, micUncovered: true, feedbackHeight: wrongBounds.height, correctFeedback: true, incorrectFeedback: true, visibleConfettiUnderCsp: hasParticles, confettiCleanup: true, spokenRequests: audioRequests.length, runtimeErrors: errors.length }));
    await context.close();
  }
} finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
