import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { build } from 'vite';
import { chromium } from './qa-tools/node_modules/playwright/index.mjs';
import { apiFixture, createRoleModel, ids } from '../testing-audit/fixtures/roleModel.mjs';

// All credentials, account data and API responses in this check are synthetic.
process.env.VITE_SUPABASE_URL = 'http://127.0.0.1:9';
process.env.VITE_SUPABASE_ANON_KEY = 'isolated-browser-anon-key';
process.env.VITE_API_URL = '/api';
const outDir = path.resolve('.qa/login-recovery-build');
const evidence = path.resolve('.qa/login-recovery');
fs.mkdirSync(evidence, { recursive: true });
if (!process.argv.includes('--reuse-build')) await build({ logLevel: 'error', build: { outDir, emptyOutDir: false }, plugins: [{
  name: 'isolated-login-recovery', enforce: 'pre',
  resolveId(id, importer) {
    if (importer && id.startsWith('.') && path.resolve(path.dirname(importer), id).replace(/\.ts$/, '') === path.resolve('src/lib/supabaseClient')) return path.resolve('testing-audit/fixtures/browserSupabase.mjs');
  },
  transform(code, id) {
    if (id.replaceAll('\\', '/').endsWith('/src/components/AppErrorBoundary.tsx')) return code.replace('static getDerivedStateFromError() {', 'static getDerivedStateFromError(error: unknown) { globalThis.__QA_RENDER_ERROR__ = String(error);');
    if (id.replaceAll('\\', '/').endsWith('/testing-audit/fixtures/browserSupabase.mjs')) return code
      .replace('let session = {', 'const loginSession = {')
      .replace('const subscribers = new Set();', "let session = sessionStorage.getItem('qa-authenticated') ? loginSession : null; const subscribers = new Set();")
      .replace('signInWithPassword: async () => ({ data: { session, user: session?.user }, error: null }),', "signInWithPassword: async () => { session = loginSession; sessionStorage.setItem('qa-authenticated','1'); subscribers.forEach(callback => callback('SIGNED_IN', session)); return {data:{session,user:session.user},error:null}; },")
      .replace('updateUser: async ()', "refreshSession: async () => { session = loginSession; sessionStorage.setItem('qa-authenticated','1'); subscribers.forEach(callback => callback('TOKEN_REFRESHED',session)); return {data:{session,user:session.user},error:null}; }, updateUser: async ()")
      .replace('globalThis.__LINAW_QA_MODEL__ = model;', "globalThis.__LINAW_QA_MODEL__ = model; if(globalThis.__QA_PROGRESS_BADGES__)model.tables.child_progress[0].achievements=globalThis.__QA_PROGRESS_BADGES__.map(id=>({id,unlockedAt:new Date().toISOString()}));")
      + '\nexport async function verifyAccountPassword(){return true;}';
  },
}] });

const server = createServer((_req, res) => res.end('Isolated QA server'));
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };
let browser;
try {
  browser = await chromium.launch({ headless: true, channel: 'chromium' });
  if (!process.argv.includes('--progress-only')) for (const role of ['admin', 'teacher', 'parent', 'student']) for (const failure of ['none', 'js', 'css', 'persistent', 'translated', ...(role === 'admin' ? [] : ['saved-translated'])]) {
    const model = createRoleModel(role);
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await context.addInitScript(({ role, failure, userId }) => {
      globalThis.__LINAW_QA_ROLE__ = role;
      if (failure === 'saved-translated') localStorage.setItem('linawletra.savedProfiles.v1', JSON.stringify([{userId,role,displayName:'QA '+role,email:`qa-${role}@example.invalid`,refreshToken:'isolated-refresh-ticket',savedAt:new Date().toISOString()}]));
    }, { role, failure, userId: ids[role] });
    let failed = 0, documents = 0;
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin !== base) return route.abort();
      if (url.pathname.startsWith('/api/')) {
        const result = apiFixture(model, url.pathname + url.search, request.method(), request.postDataJSON() || {});
        return route.fulfill({ status: result.status || 200, contentType: 'application/json', body: JSON.stringify(result.data) });
      }
      const roleBundle = new RegExp('/' + role[0].toUpperCase() + role.slice(1) + 'Area-[^/]+\\.' + (failure === 'css' ? 'css' : 'js') + '$');
      if (['js','css','persistent'].includes(failure) && roleBundle.test(url.pathname) && (documents === 1 || failure === 'persistent')) { failed++; return route.abort('failed'); }
      let file = path.resolve(outDir, '.' + decodeURIComponent(url.pathname));
      assert.ok(file.startsWith(outDir + path.sep));
      if (request.isNavigationRequest()) { documents++; file = path.join(outDir, 'index.html'); }
      if (!fs.existsSync(file)) return route.fulfill({ status: 404, body: 'Missing isolated asset' });
      return route.fulfill({ path: file, contentType: mime[path.extname(file)] || 'application/octet-stream' });
    });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base + '/login');
    const translateText = root => {
      // Model browser translation wrapping text in font elements. React must
      // still be able to insert/remove the spinner alongside the stable label.
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), nodes = [];
      while(walker.nextNode()) nodes.push(walker.currentNode);
      for (const node of nodes) if (node.textContent.trim()) {
        const font = document.createElement('font'); node.parentNode.insertBefore(font,node); font.append(node);
      }
    };
    if (failure === 'saved-translated') {
      const saved = page.getByRole('button', { name: new RegExp('QA '+role) });
      await saved.evaluate(translateText); await saved.click();
    } else {
      await page.locator('#email').fill(`qa-${role}@example.invalid`);
      await page.locator('#password').fill('FixturePass123');
      const submit = page.getByRole('button', { name: 'Mag-login', exact: true });
      if (failure === 'translated') await submit.evaluate(translateText);
      await submit.click();
    }
    await page.waitForURL(base + '/' + role);
    if (failure === 'persistent') {
      await page.getByRole('button', { name: 'Subukan muli', exact: true }).waitFor();
      await page.waitForTimeout(300);
      assert.equal(documents, 2, 'persistent outage stops after one automatic reload');
    } else {
      await page.locator(`.role-${role}`).waitFor();
      assert.equal(await page.getByRole('button', { name: 'Subukan muli', exact: true }).count(), 0);
      assert.equal(await page.evaluate(() => globalThis.__QA_RENDER_ERROR__ || null), null);
      assert.deepEqual(errors, []);
      assert.equal(documents, ['none','translated','saved-translated'].includes(failure) ? 1 : 2);
    }
    if (['js','css','persistent'].includes(failure)) assert.ok(failed >= 1, 'dashboard download failure was exercised');
    await page.screenshot({ path: path.join(evidence, `${role}-${failure}.png`), fullPage: true });
    console.log(JSON.stringify({ role, failure, authenticated: true, documents, passed: true }));
    await context.close();
  }
  if (process.argv.includes('--progress-only')) for (const [width, large] of [[1920,false],[1280,false],[1024,false],[375,false],[1280,true]]) {
    const role = 'parent', model = createRoleModel(role);
    const moduleTitles = ['Unang mga Titik','Hanay ng Ba','Hanay ng Da','Hanay ng Ga','Hanay ng Ha','Hanay ng Ka','Hanay ng La'];
    model.path.modules = moduleTitles.map((title,index)=>({...model.module,id:'progress-module-'+index,title,module_number:index+1,content_item_count:index?5:7,completed_content_item_count:index?0:3,state:index?'locked':'unlocked',instructional_content_type:'phonetic'}));
    const context = await browser.newContext({ viewport: { width, height: 1000 } });
    await context.addInitScript(({large}) => {
      globalThis.__LINAW_QA_ROLE__='parent';sessionStorage.setItem('qa-authenticated','1');
      globalThis.__QA_PROGRESS_BADGES__=['unang_hakbang','batang_mambabasa','masigasig_na_mambabasa','kampeon_sa_pagbasa','unang_bigkas','malinaw_magsalita','tamang_bigkas','boses_ng_tagumpay'];
      if(large)localStorage.setItem('linawletra.a11y.v2',JSON.stringify({font:'dyslexic',fontScale:'large',theme:'default'}));
    },{large});
    await context.route('**/*',async route=>{
      const req=route.request(),url=new URL(req.url());if(url.origin!==base)return route.abort();
      if(url.pathname.startsWith('/api/')){const result=apiFixture(model,url.pathname+url.search,req.method(),req.postDataJSON()||{});return route.fulfill({status:result.status||200,contentType:'application/json',body:JSON.stringify(result.data)});}
      const file=req.isNavigationRequest()?path.join(outDir,'index.html'):path.resolve(outDir,'.'+decodeURIComponent(url.pathname));assert.ok(file.startsWith(outDir+path.sep));
      if(!fs.existsSync(file))return route.fulfill({status:404,body:'Missing isolated asset'});
      return route.fulfill({path:file,contentType:mime[path.extname(file)]||'application/octet-stream'});
    });
    const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto(base+'/parent/progress');await page.locator('.progress-ref-module').first().waitFor();
    await page.locator('.student-badge-mini-grid > article').first().waitFor();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'progress fits '+width);
    for(const selector of ['.progress-ref-week-card','.progress-ref-recommendations-card']) {
      const bottomGap=await page.locator(selector).evaluate(card=>{const last=card.lastElementChild;return card.getBoundingClientRect().bottom-last.getBoundingClientRect().bottom;});
      assert.ok(bottomGap<=24,selector+' has no stretched whitespace: '+bottomGap);
    }
    if(width>1100){const tops=await page.locator('.student-badge-summary > .student-badge-mini-grid > article').evaluateAll(cards=>cards.map(card=>card.getBoundingClientRect().top));assert.ok(tops.every(top=>Math.abs(top-tops[0])<=1),'four badges fit on one row');}
    await page.screenshot({path:path.join(evidence,`parent-progress-${width}-${large?'large':'normal'}.png`),fullPage:true});
    await page.getByRole('button',{name:'Tingnan ang lahat',exact:true}).click();await page.getByRole('dialog').waitFor();await page.getByRole('button',{name:'Isara ang mga badge',exact:true}).click();
    await page.locator('.progress-ref-module').first().click();await page.getByRole('button',{name:'Bumalik sa mga modyul'}).waitFor();await page.getByRole('button',{name:'Bumalik sa mga modyul'}).click();
    for(const name of ['Mga Aktibidad','Mga Nakuhang Resulta','Mga Tala sa Pagsasanay','Pag-unlad sa Modyul']){await page.getByRole('tab',{name,exact:true}).click();await page.waitForFunction(name=>[...document.querySelectorAll('[role=tab]')].find(tab=>tab.textContent===name)?.getAttribute('aria-selected')==='true',name);}
    assert.equal(await page.evaluate(()=>globalThis.__QA_RENDER_ERROR__||null),null);assert.deepEqual(errors,[]);
    console.log(JSON.stringify({role,width,large,progressNaturalCardHeights:true,badgesAndTabsWork:true,passed:true}));await context.close();
  }
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
