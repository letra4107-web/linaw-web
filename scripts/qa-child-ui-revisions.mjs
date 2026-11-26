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
const outDir = path.resolve('.qa/child-ui-revisions-build');
const evidence = path.resolve('.qa/child-ui-revisions');
fs.mkdirSync(evidence, {recursive:true});
if(!process.argv.includes('--reuse-build')) await build({logLevel:'error',build:{outDir,emptyOutDir:false},plugins:[{
 name:'isolated-child-ui',enforce:'pre',
 resolveId(id,importer){if(importer&&id.startsWith('.')&&path.resolve(path.dirname(importer),id).replace(/\.ts$/,'')===path.resolve('src/lib/supabaseClient'))return path.resolve('testing-audit/fixtures/browserSupabase.mjs');},
 transform(code,id){if(id.replaceAll('\\','/').endsWith('/src/components/AppErrorBoundary.tsx'))return code.replace('static getDerivedStateFromError() {', 'static getDerivedStateFromError(error: unknown) { globalThis.__QA_RENDER_ERROR__ = error instanceof Error ? error.stack : String(error);');if(id.replaceAll('\\','/').endsWith('/testing-audit/fixtures/browserSupabase.mjs'))return code.replace('let session = {', 'let session = globalThis.__QA_PUBLIC__ ? null : {').replace('globalThis.__LINAW_QA_MODEL__ = model;',`globalThis.__LINAW_QA_MODEL__ = model;
 const word = globalThis.__QA_WORD__ || 'pagpapakadalubhasa';
 model.tables.reading_content = [{id:'${ids.item}',content_text:word,content_type:'word',is_active:true,level:'Beginner'}];
 model.tables.word_definitions = [{word_key:word.replace(/[^a-z]/g,''),display_word:null,meaning_fil:'Ang pag-aaral upang maging mahusay sa isang gawain.',example_sentence:null}];
 model.tables.student_settings[0].dyslexia_font = globalThis.__QA_LARGE__ || false;
 model.tables.student_settings[0].font_size = globalThis.__QA_LARGE__ ? 'large' : 'medium';
 model.tables.child_progress[0].achievements = [{id:'unang_hakbang',unlockedAt:'2026-11-20T04:00:00Z'}];
 `)+'\nexport async function verifyAccountPassword(){return true;}';}
}]});
const server=createServer((req,res)=>{let file=path.resolve(outDir,`.${decodeURIComponent(new URL(req.url,'http://localhost').pathname)}`);if(!file.startsWith(outDir+path.sep)){res.writeHead(403).end();return;}if(!fs.existsSync(file)||fs.statSync(file).isDirectory())file=path.join(outDir,'index.html');res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf'})[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res);});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}`;
const stylesheet=fs.readFileSync(path.join(outDir,'index.html'),'utf8').match(/href="(\/assets\/index-[^"]+\.css)"/)[1];
const mainStyles=fs.readFileSync(path.join(outDir,stylesheet),'utf8');
let browser;
try{
 browser=await chromium.launch({headless:true,channel:'chromium'});
 async function session(role,width=1280,large=false,word='pagpapakadalubhasa'){
  const model=createRoleModel(role), errors=[];
  const context=await browser.newContext({viewport:{width,height:900}});
  await context.addInitScript(({role,large,word})=>{globalThis.__LINAW_QA_ROLE__=role;globalThis.__QA_PUBLIC__=role==='public';globalThis.__QA_WORD__=word;globalThis.__QA_LARGE__=large;},{role,large,word});
  await context.route('**/*',async route=>{const req=route.request(),url=new URL(req.url());if(url.origin!==base)return route.abort();
   // Serve the actual compiled assets directly so browser preloads do not depend on localhost socket timing.
   if(url.pathname.startsWith('/assets/')){
    const file=path.resolve(outDir,'.'+decodeURIComponent(url.pathname));if(!file.startsWith(outDir+path.sep)||!fs.existsSync(file))return route.abort();
    const contentType=({'.js':'application/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf'})[path.extname(file)]||'application/octet-stream';
    return route.fulfill({path:file,contentType});
   }
   if(!url.pathname.startsWith('/api/'))return route.continue();const result=apiFixture(model,url.pathname+url.search,req.method(),req.postDataJSON()||{});
      if(url.pathname.startsWith('/api/student/learn/module/')) result.data = {module:{...model.module,title:'Unang mga Titik',instructional_content_type:'phonetic',assessment_id:ids.assessment},items:['m','s','a','i','o','e','u'].map((text,index)=>({module_item_id:ids.item+index,content_id:ids.item+index,content_text:text,content_type:'phonetic',role:'learn',completed:false}))};return route.fulfill({status:result.status||200,contentType:'application/json',body:JSON.stringify(result.data)});});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));if(process.env.QA_DEBUG)page.on('console',message=>{if(message.type()==='error')console.log('Browser error:',message.text());});
  async function goto(route){await page.goto(base+route);await page.addStyleTag({content:mainStyles});await page.locator('h1').first().waitFor();}
  return{context,page,model,errors,goto};
 }
 if(!process.env.QA_ART_ROLE&&!process.env.QA_AUTH_SCENE&&!process.env.QA_TEACHER_LAYOUT){
 for(const width of [1280,375])for(const large of [false,true]){
  const {context,page,errors,goto}=await session('student',width,large);
  await goto('/student/practice');await page.locator('.practice-word-content > p').waitFor().catch(async error=>{await page.screenshot({path:evidence+'/practice-failure.png',fullPage:true});console.log({url:page.url(),errors,body:(await page.locator('body').textContent()).slice(-4000)});throw error;});
  if(width===1280){const mascot=page.locator('.student-sidebar img[src*="owl-mascot"]');await mascot.waitFor();await mascot.evaluate(img=>img.decode());assert.ok(await mascot.evaluate(img=>img.naturalWidth>=1000));}

  assert.equal(await page.locator('.practice-word-content > p').textContent(),'pagpapakadalubhasa');
  const back=page.getByRole('link',{name:'Bumalik sa Simula'});assert.ok((await back.boundingBox()).height>=48);
  const fits=await page.locator('.practice-word-content > p').evaluate(el=>({scroll:el.scrollWidth,width:el.clientWidth}));if(fits.scroll>fits.width+1){await page.screenshot({path:evidence+'/overflow.png',fullPage:true});console.log(await page.locator('.practice-word-content > p').evaluate(el=>({html:el.outerHTML,style:getComputedStyle(el).cssText,font:getComputedStyle(el).fontSize,letter:getComputedStyle(el).letterSpacing,word:getComputedStyle(el).wordSpacing,spans:Array.from(el.children).map(n=>({display:getComputedStyle(n).display,width:n.getBoundingClientRect().width}))})));}assert.ok(fits.scroll<=fits.width+1,JSON.stringify(fits));
  await page.getByRole('button',{name:'Bigkasin nang malakas ang kahulugan',exact:true}).waitFor();await page.getByRole('button',{name:'Bigkasin nang mabagal ang kahulugan',exact:true}).waitFor();
  await page.screenshot({path:`${evidence}/practice-${width}-${large?'large':'normal'}.png`,fullPage:true});
  await page.getByRole('button',{name:'Pakinggan at Basahin',exact:true}).click();await page.locator('.syllable-karaoke__chip').first().waitFor();
  const chips=await page.locator('.syllable-karaoke__chip').allTextContents();assert.equal(chips.join(''),'pagpapakadalubhasa');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  await page.screenshot({path:`${evidence}/listen-${width}-${large?'large':'normal'}.png`,fullPage:true});
  await goto('/student/learn/module/'+ids.module);const moduleBack=page.getByRole('link',{name:'Bumalik sa mga Modyul'});assert.ok((await moduleBack.boundingBox()).height>=48);assert.equal(await page.locator('.module-item-picture-object svg').count(),7);await page.screenshot({path:evidence+'/module-'+width+'-'+large+'.png',fullPage:true});
  await goto('/student/achievements');await page.getByRole('button',{name:/Kabuuang XP/}).click();await page.locator('dialog[open]').waitFor();assert.match(await page.locator('dialog').textContent(),/Rising Star/);await page.getByRole('button',{name:'Isara',exact:true}).click();await page.locator('dialog').waitFor({state:'detached'});
  await page.getByRole('button',{name:/Araw ng Pagsasanay/}).click();await page.locator('dialog[open]').waitFor();assert.match(await page.locator('dialog').textContent(),/Pinakamahabang streak/);await page.keyboard.press('Escape');await page.locator('dialog').waitFor({state:'detached'});
  await page.getByRole('button',{name:'Tingnan ang detalye ng Unang Hakbang',exact:true}).click();await page.locator('dialog[open]').waitFor();assert.match(await page.locator('dialog').textContent(),/Nakuha mo na/);await page.screenshot({path:`${evidence}/badge-${width}-${large?'large':'normal'}.png`});await page.getByRole('button',{name:'Bumalik sa Parangal'}).click();
  assert.deepEqual(errors,[]);console.log(JSON.stringify({role:'student',width,large,longWordFits:true,syllablesIntact:true,meaningLabels:true,dialogs:true}));await context.close();
 }
 {
  const {context,page,goto,errors}=await session('admin');await goto('/admin/users');await page.getByRole('searchbox',{name:'Search users by name'}).fill('Parent');await page.waitForTimeout(100);assert.equal(await page.locator('tbody > tr').count(),1);assert.match(await page.locator('tbody').textContent(),/Parent/i);assert.doesNotMatch(await page.locator('tbody').textContent(),/@/);await page.getByRole('searchbox',{name:'Search users by name'}).fill('example.invalid');assert.equal(await page.locator('tbody > tr').count(),0);
  await goto('/admin/profile');const account=page.locator('.admin-sidebar-account > a');assert.equal(await account.getAttribute('aria-current'),'page');assert.equal(await account.evaluate(el=>getComputedStyle(el).color),'rgb(255, 255, 255)');await page.screenshot({path:`${evidence}/admin-profile.png`});assert.deepEqual(errors,[]);console.log(JSON.stringify({role:'admin',nameSearch:true,namesOnly:true,profileActiveStyle:true}));await context.close();
 }
 {
  const {context,page,goto,errors,model}=await session('teacher');await goto('/teacher/notifications');const button=page.getByRole('button',{name:'Markahan lahat bilang nabasa'});await button.waitFor();assert.equal(await button.isDisabled(),true);
  // A slow request must update the visible count right away, and a rejected write must roll back.
  model.tables.notifications=[{id:'notice-one',title:'Bagong abiso',body:'Isang abiso para sa guro.',message:null,type:'system',is_read:false,read:false,created_at:new Date().toISOString()}];
  await goto('/teacher/notifications');await page.waitForFunction(()=>!document.querySelector('.tn-read-all').disabled);
  await page.route('**/api/notifications/read-all',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Hindi na-save ang pagbabago.'})}));
  await button.click();await page.getByText('Hindi na-update ang read status. Subukan muli.',{exact:true}).waitFor();assert.equal(await button.isDisabled(),false);await page.unroute('**/api/notifications/read-all');
  let release;const held=new Promise(resolve=>{release=resolve;});let began;const requested=new Promise(resolve=>{began=resolve;});
  await page.route('**/api/notifications/read-all',async route=>{began();await held;model.tables.notifications[0].is_read=true;model.tables.notifications[0].read=true;await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true})});});
  await button.click();await requested;assert.equal(await page.locator('.tn-read-all').isDisabled(),true);assert.match(await page.locator('.tn-toolbar nav').textContent(),/Hindi pa nababasa \(0\)/);release();await page.getByRole('button',{name:'Markahan lahat bilang nabasa'}).waitFor();assert.equal(await button.isDisabled(),true);
  assert.deepEqual(errors,[]);console.log(JSON.stringify({role:'teacher',emptyReadAllDisabled:true,immediateReadStatus:true,failureRollback:true}));await context.close();
 }

 {
  const {context,page,goto}=await session('public');await goto('/login');
  await page.locator('#password').fill('Valid Pass123');assert.equal(await page.locator('#password').inputValue(),'');await page.getByText('Hindi maaaring may espasyo ang password.',{exact:true}).waitFor();
  await page.locator('#password').fill('ValidPass123');await page.locator('#password').press('Space');assert.equal(await page.locator('#password').inputValue(),'ValidPass123');
  await page.locator('#email').fill('bad-email');await page.getByRole('button',{name:'Mag-login',exact:true}).click();await page.getByText('Hindi wasto ang email address.',{exact:true}).waitFor();
  console.log(JSON.stringify({role:'public',passwordSpacesBlocked:true,pasteBlocked:true,emailValidation:true}));await context.close();
 }

 }
 if(process.env.QA_AUTH_SCENE) for(const route of ['login','signup','forgot-password','reset-password','verify-email','resend-verification','confirm-email-change'])for(const [width,height] of [[1280,900],[1024,900],[375,900]]){
  const {context,page,goto,errors}=await session('public',width);await page.setViewportSize({width,height});await goto('/'+route);
  await page.locator('img').evaluateAll(images=>Promise.all(images.map(img=>img.decode())));
  if(width>=1024){const scene=page.locator('.auth-shell-illustration > img, .verify-email-scene-image');await scene.waitFor({state:'visible'});assert.match(await scene.getAttribute('src'),/auth-reading-scene/);assert.equal(await scene.evaluate(img=>getComputedStyle(img).objectPosition),'25% 50%');}
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  assert.equal(await page.getByRole('heading',{name:'Hindi muna makakonekta'}).count(),0);
  await page.screenshot({path:evidence+'/auth-reading-'+route+'-'+width+'.png',fullPage:true});assert.deepEqual(errors,[]);
  console.log(JSON.stringify({page:route,width,height,artworkLoaded:true,noHorizontalOverflow:true}));await context.close();
 }
 if(!process.env.QA_AUTH_SCENE&&!process.env.QA_TEACHER_LAYOUT)for (const role of ['student','parent','teacher','admin'].filter(role=>!process.env.QA_ART_ROLE||process.env.QA_ART_ROLE==='all'||role===process.env.QA_ART_ROLE)) for (const width of [1280,375]) {
  const {context,page,goto,errors}=await session(role,width);
  await goto('/'+role);
  await page.waitForLoadState('networkidle');await page.locator('img').evaluateAll(images=>Promise.all(images.map(async img=>{img.loading='eager';try{await img.decode();}catch{}})));
  assert.equal(await page.getByRole('heading',{name:'Hindi muna makakonekta'}).count(),0,role+' dashboard must render instead of an error boundary: '+await page.evaluate(()=>globalThis.__QA_RENDER_ERROR__||''));
  await page.locator({student:'.student-home-reference',parent:'.parent-ref-hero',teacher:'.teacher-home-design',admin:'.admin-home-reference'}[role]).waitFor();
  const broken=await page.locator('img').evaluateAll(images=>images.filter(img=>img.getClientRects().length&&!img.naturalWidth).map(img=>img.getAttribute('src')));assert.deepEqual(broken,[]);
  if(process.env.QA_ROLE_THEMES&&role!=='student'){
   const owls=await page.locator('img, image').evaluateAll(elements=>elements.map(el=>el.getAttribute('src')||el.getAttribute('href')||'').filter(url=>/\/(?:owl-(?:mascot|family|teacher|laptop)|parent-icons|teacher-icons|report-icons)-/.test(url)));assert.deepEqual(owls,[],role+' uses its own theme');
  }
  await page.screenshot({path:evidence+'/owl-world-'+role+'-'+width+'.png',fullPage:true});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,role+' horizontal overflow at '+width);
  assert.deepEqual(errors,[]);console.log(JSON.stringify({role,width,owlWorldArtwork:true,noBrokenImages:true,noHorizontalOverflow:true}));await context.close();
 }
 if(process.env.QA_ROLE_THEMES&&['all','parent'].includes(process.env.QA_ART_ROLE))for(const width of [1280,375]){
  const {context,page,goto,errors}=await session('parent',width);
  for(const route of ['children','progress','schedule','settings','app-settings','messages','notifications','materials']){
   await goto('/parent/'+route);await page.waitForLoadState('networkidle');
   assert.equal(await page.getByRole('heading',{name:'Hindi muna makakonekta'}).count(),0,route+' must render');
   await page.locator('img').evaluateAll(images=>Promise.all(images.map(async img=>{img.loading='eager';await img.decode();})));
   const owls=await page.locator('img, image').evaluateAll(elements=>elements.map(el=>el.getAttribute('src')||el.getAttribute('href')||'').filter(url=>/\/(?:owl-(?:mascot|family|teacher|laptop)|parent-icons)-/.test(url)));assert.deepEqual(owls,[],route+' uses family theme');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,route+' fits at '+width);
   await page.screenshot({path:evidence+'/family-theme-'+route+'-'+width+'.png',fullPage:true});assert.deepEqual(errors,[]);
   console.log(JSON.stringify({role:'parent',route,width,familyTheme:true,noHorizontalOverflow:true}));
  }await context.close();
 }

 if(process.env.QA_TEACHER_LAYOUT) {
  const routes=['','students','lessons','schedule','progress-reports','messages','profile','settings','notifications'];
  for(const [width,height] of [[1440,900],[1280,640],[1024,768],[375,812]]){
   const {context,page,goto,errors}=await session('teacher',width);await page.setViewportSize({width,height});await page.emulateMedia({reducedMotion:'reduce'});
   let expectedLeft;
   for(const route of routes){
    await goto('/teacher'+(route?'/'+route:''));await page.waitForLoadState('networkidle');
    assert.equal(await page.getByRole('heading',{name:'Hindi muna makakonekta'}).count(),0,route+': '+await page.evaluate(()=>globalThis.__QA_RENDER_ERROR__||''));
    const hero=page.locator('.teacher-workspace :is(.th-hero,.ts-hero,.tl-hero,.tr-hero,.tm-hero,.teacher-calendar-hero,.tp-hero,.tsg-hero,.tn-hero)').first();await hero.waitFor();
    const box=await hero.boundingBox();if(expectedLeft===undefined)expectedLeft=box.x;assert.ok(Math.abs(box.x-expectedLeft)<=1,route+' header aligns at '+width+': '+box.x+' vs '+expectedLeft);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,route+' horizontal overflow '+width);
    assert.equal(await page.locator('.teacher-workspace').evaluate(el=>el.scrollHeight>el.clientHeight+1),false,route+' content is not vertically clipped');
    if(width>=1024){
     const sidebar=page.locator('.teacher-sidebar-art'),profile=sidebar.getByRole('button',{name:'Aking profile',exact:true});const bounds=await sidebar.boundingBox(),account=await profile.boundingBox();
     assert.equal(Math.round(bounds.height),height);assert.ok(account.y>=0&&account.y+account.height<=height,route+' profile stays visible');
     assert.equal(await sidebar.locator('nav a').first().textContent(),'Simula');
     for(const link of await sidebar.locator('nav a').all()){await link.scrollIntoViewIfNeeded();const rect=await link.boundingBox();assert.ok(rect.y>=0&&rect.y+rect.height<=account.y,route+' sidebar link reachable');}
    }
    await page.screenshot({path:evidence+'/teacher-layout-'+(route||'home')+'-'+width+'.png',fullPage:true});assert.deepEqual(errors,[]);
    console.log(JSON.stringify({role:'teacher',route:route||'home',width,height,headersAligned:true,sidebarFits:true,noHorizontalOverflow:true}));
   }
   await goto('/teacher/schedule');await page.locator('.teacher-calendar-list article').first().waitFor();
   const original=await page.locator('input[type=month]').inputValue();
   await page.getByRole('button',{name:'Susunod na buwan',exact:true}).click();assert.notEqual(await page.locator('input[type=month]').inputValue(),original);
   await page.getByRole('button',{name:'Naunang buwan',exact:true}).click();assert.equal(await page.locator('input[type=month]').inputValue(),original);
   await page.getByRole('button',{name:'Ngayon',exact:true}).click();
   const parentActivity=page.locator('.teacher-calendar-list article').filter({hasText:'Paalala mula sa magulang'});assert.equal(await parentActivity.locator('button').count(),0);
   await page.locator('.teacher-calendar-toolbar').getByRole('button',{name:'Magdagdag ng Iskedyul',exact:true}).click();
   const form=page.getByRole('dialog');await form.waitFor();
   assert.equal(await form.getByLabel('Petsa',{exact:true}).inputValue(),await page.locator('.teacher-calendar-day[aria-current=date]').evaluate(el=>el.getAttribute('aria-label')).then(()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila'}).format(new Date())));
   await form.getByLabel('Pamagat',{exact:true}).fill('Praktis sa pagbasa');
   await form.getByLabel('Oras ng Simula (opsyonal)',{exact:true}).fill('10:00');
   await form.getByLabel('Oras ng Pagtatapos (opsyonal)',{exact:true}).fill('09:00');
   const save=form.getByRole('button',{name:'I-save at Abisuhan ang Magulang',exact:true});assert.equal(await save.isDisabled(),true);
   await form.getByLabel('Oras ng Pagtatapos (opsyonal)',{exact:true}).fill('10:30');
   await page.evaluate(()=>{globalThis.__QA_CALENDAR_FAILURE__='save';});await save.click();await form.getByRole('alert').waitFor();assert.equal(await form.getByLabel('Pamagat',{exact:true}).inputValue(),'Praktis sa pagbasa');
   await page.evaluate(()=>{globalThis.__QA_CALENDAR_FAILURE__=null;});await save.click();await form.waitFor({state:'detached'});
   await page.locator('.teacher-calendar-list').getByRole('heading',{name:'Praktis sa pagbasa',exact:true}).waitFor();
   const saved=await page.evaluate(()=>globalThis.__LINAW_QA_MODEL__.calls.filter(call=>call.kind==='rpc'&&call.name==='save_teacher_calendar').at(-1).params);assert.equal(saved.p_start,'10:00');assert.equal(saved.p_end,'10:30');assert.equal(saved.p_revision,null);
   let own=page.locator('.teacher-calendar-list article').filter({hasText:'Praktis sa pagbasa'});await own.getByRole('button',{name:'I-edit',exact:true}).click();await form.waitFor();assert.equal(await form.locator('select').first().isDisabled(),true);assert.equal(await save.isDisabled(),true);
   await form.getByLabel('Pamagat',{exact:true}).fill('Praktis na na-update');await save.click();await form.waitFor({state:'detached'});own=page.locator('.teacher-calendar-list article').filter({hasText:'Praktis na na-update'});await own.waitFor();
   page.once('dialog',dialog=>dialog.accept());await own.getByRole('button',{name:'Kanselahin',exact:true}).click();await own.waitFor({state:'detached'});
   const deletion=await page.evaluate(()=>globalThis.__LINAW_QA_MODEL__.calls.filter(call=>call.kind==='rpc'&&call.name==='delete_teacher_calendar').at(-1).params);assert.equal(deletion.p_id,saved.p_id);assert.equal(deletion.p_revision,2);
   if(width>=1024){await page.getByRole('button',{name:'Paliitin ang sidebar',exact:true}).click();assert.equal(Math.round((await page.locator('.teacher-sidebar-art').boundingBox()).width),76);await page.getByRole('button',{name:'Palawakin ang sidebar',exact:true}).click();}
   else{await page.getByRole('button',{name:'Menu',exact:true}).click();assert.equal(await page.locator('header + div nav a').first().textContent(),'Simula');await page.getByRole('link',{name:'Kalendaryo',exact:true}).click();}
   assert.deepEqual(errors,[]);console.log(JSON.stringify({role:'teacher',width,calendarCreateEditCancel:true,timeValidation:true,saveFailurePreservesForm:true,parentActivityReadOnly:true,sidebarToggle:true}));await context.close();
  }
 }

}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
