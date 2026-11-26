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
const outDir = path.resolve(process.argv.includes('--baseline') ? '.qa/login-recovery-build' : '.qa/dark-mode-build');
const mobile=process.argv.includes('--mobile');
const evidence = path.resolve(mobile?'.qa/dark-mode-mobile':'.qa/dark-mode');
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
const routes = {
  parent: ['', 'progress','schedule','children','messages','settings','notifications','app-settings','materials'],
  teacher: ['', 'students','lessons','schedule','progress-reports','messages','profile','settings','notifications'],
  admin: ['', 'users','students','parents','teachers-monitoring','teachers','sections','analytics','notifications','settings','profile','audit-logs','archived'],
  student: ['', 'learn','practice','practice?mode=listen','achievements','profile',`learn/module/${ids.module}`,`learn/assessment/${ids.assessment}`],
  public: ['login','signup','forgot-password','reset-password','verify-email','resend-verification','confirm-email-change'],
};
if(mobile)Object.assign(routes,{parent:['','progress','app-settings','children'],teacher:['','profile','settings','schedule'],admin:['','users','profile'],student:['','practice','practice?mode=listen','profile'],public:['login']});
const roleArgument=process.argv.find(value=>value.startsWith('--role='));
if(roleArgument)for(const role of Object.keys(routes))if(role!==roleArgument.slice(7))delete routes[role];

// Audit solid surfaces and the least contrasting stop on gradient controls.
// Sample illustrated backgrounds from viewport screenshots, then review the
// saved screenshots as well; ancestor colors cannot describe the artwork.
async function textContrast({menuOnly,screenshot}) {
  let screen;
  if(screenshot){
    const picture=new Image();picture.src=screenshot;await picture.decode();
    const canvas=document.createElement('canvas');canvas.width=picture.naturalWidth;canvas.height=picture.naturalHeight;
    const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(picture,0,0);
    screen={width:canvas.width,height:canvas.height,pixels:context.getImageData(0,0,canvas.width,canvas.height).data};
  }
  const canvas=document.createElement('canvas');canvas.width=canvas.height=1;
  const context=canvas.getContext('2d',{willReadFrequently:true}),colors=new Map();
  const rgba = value => {
    if(colors.has(value))return [...colors.get(value)];
    context.clearRect(0,0,1,1);context.fillStyle=value;context.fillRect(0,0,1,1);
    const [r,g,b,a]=context.getImageData(0,0,1,1).data,color=[r,g,b,a/255];colors.set(value,color);return [...color];
  };
  const over=(a,b)=>[0,1,2].map(i=>a[i]*a[3]+b[i]*(1-a[3])).concat(1);
  const luminance=color=>color.slice(0,3).map(c=>{c/=255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;}).reduce((sum,c,i)=>sum+c*[.2126,.7152,.0722][i],0);
  const rows=[],walker=document.createTreeWalker(menuOnly?document.querySelector('[role="menu"]'):document.body,NodeFilter.SHOW_TEXT);
  while(walker.nextNode()){
    const node=walker.currentNode,el=node.parentElement,text=node.textContent.trim();
    if(!text||!el||el.closest('script,style,svg,.sr-only,[aria-hidden=true],button:disabled,input:disabled'))continue;
    const range=document.createRange();range.selectNodeContents(node);const rect=range.getBoundingClientRect();if(rect.width<3||rect.height<3||rect.bottom<0||rect.top>=innerHeight||!el.checkVisibility({checkOpacity:true,checkVisibilityCSS:true}))continue;
    const style=getComputedStyle(el),layers=[];let opacity=1,complex=false,controlGradient;
    for(let parent=el;parent;parent=parent.parentElement){const s=getComputedStyle(parent);opacity*=Number(s.opacity);const layer=rgba(s.backgroundColor);if(s.backgroundImage!=='none')complex=true;if(parent.matches('button,a')&&s.backgroundImage.includes('gradient')&&!s.backgroundImage.includes('url('))controlGradient=s.backgroundImage.match(/rgba?\([^)]+\)/g)?.map(rgba);layers.push(layer);if(layer[3]>=.9)break;}
    if(opacity<.05)continue;
    let background=[255,255,255,1];for(const layer of layers.reverse())background=over(layer,background);
    let sampled=false;
    if(controlGradient?.length){
      const ink=luminance(rgba(style.color));
      background=controlGradient.map(color=>over(color,background)).sort((a,b)=>Math.abs(luminance(a)-ink)-Math.abs(luminance(b)-ink))[0];complex=false;
    }else if(complex&&screen){
      const first=range.getClientRects()[0],samples=[];
      for(const y of [first.top+.25,first.bottom-.25])for(let step=0;step<=8;step++){
        const x=Math.round(first.left+first.width*step/8),sy=Math.round(y);
        if(x<0||sy<0||x>=screen.width||sy>=screen.height)continue;
        const index=(sy*screen.width+x)*4,sample=Array.from(screen.pixels.slice(index,index+3)),ink=rgba(style.color);
        if(sample.reduce((sum,c,i)=>sum+(c-ink[i])**2,0)>900)samples.push(sample);
      }
      if(samples.length){background=[0,1,2].map(channel=>samples.map(color=>color[channel]).sort((a,b)=>a-b)[Math.floor(samples.length/2)]).concat(1);sampled=true;}
    }
    const foreground=rgba(style.color);foreground[3]*=opacity;const painted=over(foreground,background);
    const light=luminance(painted),dark=luminance(background),ratio=(Math.max(light,dark)+.05)/(Math.min(light,dark)+.05);
    const large=parseFloat(style.fontSize)>=24||(parseFloat(style.fontSize)>=18.66&&parseFloat(style.fontWeight)>=700),required=large?3:4.5;
    if(ratio<required-.05)rows.push({text:text.slice(0,100),selector:el.tagName.toLowerCase()+'.'+[...el.classList].join('.').slice(0,160),parent:el.parentElement?.className,ratio:Math.round(ratio*100)/100,required,color:style.color,background:background.slice(0,3),complex,sampled});
  }
  return rows;
}

let browser;const results=[];
try{
  browser=await chromium.launch({headless:true,channel:'chromium'});
  for(const [role,pages] of Object.entries(routes)){
    const model=createRoleModel(role==='public'?'parent':role);
    const context=await browser.newContext({viewport:{width:mobile?375:1440,height:1000}});
    await context.addInitScript(({role})=>{
      globalThis.__LINAW_QA_ROLE__=role==='public'?'parent':role;
      if(role!=='public')sessionStorage.setItem('qa-authenticated','1');
      localStorage.setItem('linawletra.a11y.v2',JSON.stringify({font:'comic',theme:'dark',fontScale:'medium'}));
      Object.defineProperty(globalThis,'__LINAW_QA_MODEL__',{configurable:true,set(model){
        Object.defineProperty(globalThis,'__LINAW_QA_MODEL__',{configurable:true,writable:true,value:model});
        model.tables.reading_content=[{id:'dark-word',content_text:'pagpapakadalubhasa',content_type:'word',is_active:true,level:'Beginner',definition:'Ang pag-aaral upang maging mahusay sa isang gawain.'}];
        model.tables.word_definitions=[{word_key:'pagpapakadalubhasa',display_word:null,meaning_fil:'Ang pag-aaral upang maging mahusay sa isang gawain.',example_sentence:null}];
      }});
    },{role});
    await context.route('**/*',async route=>{
      const req=route.request(),url=new URL(req.url());if(url.origin!==base)return route.abort();
      if(url.pathname.startsWith('/api/')){const result=apiFixture(model,url.pathname+url.search,req.method(),req.postDataJSON()||{});return route.fulfill({status:result.status||200,contentType:'application/json',body:JSON.stringify(result.data)});}
      const file=req.isNavigationRequest()?path.join(outDir,'index.html'):path.resolve(outDir,'.'+decodeURIComponent(url.pathname));assert.ok(file.startsWith(outDir+path.sep));
      if(!fs.existsSync(file))return route.fulfill({status:404,body:'Missing isolated asset'});
      return route.fulfill({path:file,contentType:mime[path.extname(file)]||'application/octet-stream'});
    });
    const page=await context.newPage();
    async function audit(route,state){const screenshot=state.startsWith('page')?(await page.screenshot({animations:'disabled'})).toString('base64'):null;const issues=await page.evaluate(textContrast,{menuOnly:!state.startsWith('page'),screenshot:screenshot?'data:image/png;base64,'+screenshot:null});results.push({role,route,state,issues});fs.writeFileSync(path.join(evidence,'latest.json'),JSON.stringify(results,null,2));console.log(JSON.stringify({role,route,state,flat:issues.filter(issue=>!issue.complex).length,illustrated:issues.filter(issue=>issue.complex).length}));}
    for(const route of pages){
      await page.goto(base+(role==='public'?'/'+route:'/'+role+(route?'/'+route:'')));await page.locator('h1').first().waitFor();await page.waitForLoadState('networkidle');
      await page.addStyleTag({content:'html{scroll-behavior:auto!important}*,*::before,*::after{animation:none!important;transition:none!important}'});
      await page.evaluate(()=>{document.documentElement.dataset.theme='dark';});
      if(process.argv.includes('--candidate'))await page.addStyleTag({content:fs.readFileSync('src/lib/a11y/dark-contrast.css','utf8')});
      if(process.argv.includes('--candidate'))await page.evaluate(()=>{for(const el of document.querySelectorAll('[style]')){if(!el.style.borderColor.includes('color-mix'))continue;el.style.backgroundColor=el.style.backgroundColor.replace(/,\s*white\)/,', var(--card-tint-base, white))');el.style.borderColor=el.style.borderColor.replace(/,\s*white\)/,', var(--card-border-base, white))');}});
      assert.equal(await page.evaluate(()=>globalThis.__QA_RENDER_ERROR__||null),null,role+'/'+route);
      await audit(route,'page');
      const height=await page.evaluate(()=>document.documentElement.scrollHeight);
      for(let top=800;top<height;top+=800){await page.evaluate(top=>scrollTo(0,top),top);await audit(route,'page:'+top);}
      await page.evaluate(()=>scrollTo(0,0));
      if(['parent','teacher','student'].includes(role)&&['','profile','settings','app-settings'].includes(route)){
        const profile=page.getByRole('button',{name:/^Aking profile/}).filter({visible:true}).first();
        if(await profile.count()){
          await profile.click();const menu=page.getByRole('menu').filter({visible:true}).first();await menu.waitFor();await audit(route,'menu');
          for(const item of await menu.getByRole('menuitem').all()){await item.hover();await audit(route,'hover:'+((await item.innerText()).trim()));await item.focus();await audit(route,'focus:'+((await item.innerText()).trim()));}
          if(['app-settings','profile','settings'].includes(route))await page.screenshot({path:path.join(evidence,`${role}-${route}-menu.png`),fullPage:true});
          await page.keyboard.press('Escape');await page.mouse.click(1400,5);
        }
      }
      if(['','progress','settings','profile','login'].includes(route))await page.screenshot({path:path.join(evidence,`${role}-${route||'home'}.png`),fullPage:true});
    }
    await context.close();
  }
}finally{fs.writeFileSync(path.join(evidence,process.argv.includes('--candidate')?'candidate.json':'audit.json'),JSON.stringify(results,null,2));await browser?.close();await new Promise(resolve=>server.close(resolve));}
const flat=results.flatMap(result=>result.issues.filter(issue=>!issue.complex||issue.sampled).map(issue=>({role:result.role,route:result.route,state:result.state,...issue})));
fs.writeFileSync(path.join(evidence,process.argv.includes('--candidate')?'candidate-flat.json':'flat.json'),JSON.stringify(flat,null,2));
if(process.argv.includes('--strict'))assert.equal(flat.length,0,'all audited text on flat dark surfaces meets its contrast target');
