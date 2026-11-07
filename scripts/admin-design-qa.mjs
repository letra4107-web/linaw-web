import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { chromium } from './qa-tools/node_modules/playwright/index.mjs';
import { apiFixture, createRoleModel, ids } from '../testing-audit/fixtures/roleModel.mjs';
const evidence = path.resolve('.qa/admin-reference-review');
fs.mkdirSync(evidence, { recursive: true });
process.env.VITE_SUPABASE_URL='http://127.0.0.1:9';
process.env.VITE_SUPABASE_ANON_KEY='isolated-browser-anon-key';
process.env.VITE_API_URL='/api';
const { build } = await import('vite');
const outDir=path.resolve('.qa/admin-reference-dist');
await build({logLevel:'error',build:{outDir,emptyOutDir:false},plugins:[{name:'admin-design-isolated-auth',enforce:'pre',resolveId(id,importer){if(importer&&id.startsWith('.')&&path.resolve(path.dirname(importer),id).replace(/\.ts$/,'')===path.resolve('src/lib/supabaseClient'))return path.resolve('testing-audit/fixtures/browserSupabase.mjs');},transform(code,id){if(id.replaceAll('\\','/').endsWith('/testing-audit/fixtures/browserSupabase.mjs'))return code+'\nexport async function verifyAccountPassword(){return {error:null};}';if(id.replaceAll('\\','/').endsWith('/src/main.tsx'))return `${code}\nglobalThis.__QA_QUERY_CLIENT__=queryClient;`;}}]});
const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2','.ttf':'font/ttf'};
const server=createServer((req,res)=>{let file=path.resolve(outDir,`.${decodeURIComponent(new URL(req.url,'http://localhost').pathname)}`);if(!file.startsWith(outDir+path.sep)){res.writeHead(403).end();return;}if(!fs.existsSync(file)||fs.statSync(file).isDirectory())file=path.join(outDir,'index.html');res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res);});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
const base=`http://127.0.0.1:${server.address().port}`, report={scope:'Synthetic sessions and API fixtures only; no shared accounts, email, or database writes.',pages:[],actions:[],errors:[],network:[]};
let browser;
try{
 browser=await chromium.launch({headless:true,timeout:20000});
 const model=createRoleModel('admin','populated');
 model.users.forEach(user=>{user.profile={...user.profile,childId:user.role==='student'?ids.child:undefined,gradeLevels:user.role==='teacher'?[1,3,5,6]:undefined};});
 const modules=Array.from({length:17},(_,i)=>({id:`module-${i}`,module_number:i+1,title:['Kwento 1: Isang Araw sa Bahay','Kwento 2: Ang Aking Paaralan','Kwento 3: Magkaibigang Tapat','Kwento 4: Alaga sa Kalikasan','Kwento 5: Kalusugan ay Yaman'][i%5],state:i===0?'in_progress':i<4?'completed':i>10?'locked':'not_started',content_item_count:5,completed_content_item_count:i<4?4:0}));
 const sessions=[{word:'bata',accuracy_percentage:85,created_at:model.timestamp}];
 const activity=[{id:'activity-1',action:'MODULE.VIEW',module:'learning',created_at:model.timestamp}];
 const announcements=[{id:'notice-1',title:'Welcome to LinawLetra!',body:'Synthetic announcement for isolated browser review.',created_at:model.timestamp,delivered:2,recipients:{student:1,parent:1}}];
 model.tables.class_sections.push({id:ids.section,name:'Grade 1-A',grade_level:1,adviser_id:ids.teacher,capacity:30,studentCount:7});
 model.tables.notifications.push({id:'notice-inbox',title:'New student account',body:'A student joined LinawLetra.',message:'A student joined LinawLetra.',type:'user_login',is_read:false,created_at:model.timestamp});
 const context=await browser.newContext({viewport:{width:1536,height:1024},serviceWorkers:'block'});
 await context.addInitScript(()=>{globalThis.__LINAW_QA_ROLE__='admin';globalThis.__LINAW_QA_VARIANT__='populated';});
 await context.route('**/*',async route=>{
  const req=route.request(),url=req.url();
  if(url.startsWith(base+'/api/')){
   const u=new URL(url),p=u.pathname.replace(/^\/api/,''),method=req.method(),body=req.postDataJSON()||{};
   let result;
   if(p==='/admin/announcements'){
    if(method==='POST'){announcements.unshift({id:'new-notice',title:body.title,body:body.message,created_at:model.timestamp,delivered:1,recipients:{[body.roles[0]]:1}});result={data:{delivered:1}};}else result={data:{announcements}};
   }else if(p==='/admin/analytics')result={data:{enrollmentTrend:['2026-05','2026-06','2026-07','2026-08','2026-09','2026-10'].map((month,i)=>({month,count:[4,5,4,6,7,8][i]})),usageTrend:['2026-05','2026-06','2026-07','2026-08','2026-09','2026-10'].map((month,i)=>({month,count:[25,32,48,60,76,107][i]})),enrollmentByRole:['student','parent','teacher'].flatMap((role,j)=>['2026-08','2026-09','2026-10'].map((month,i)=>({role,month,count:[3,0,4][i]-Math.min(j,[3,0,4][i])}))),roleCounts:{admin:1,student:7,parent:6,teacher:2},totals:{users:16,studentAccounts:7,practiceSessions:107,totalXp:445,badgeUnlockCount:11}}};
   else if(/^\/admin\/monitoring\/users\/[^/]+$/.test(p)) result={data:{children:[model.child],progress:model.progress,modules,sessions,roster:[{student_id:ids.child,assigned_at:model.timestamp}],materials:modules.slice(0,5).map(m=>({id:m.id,title:m.title,grade_level:1,level:'Beginner',created_at:model.timestamp})),assignments:[{id:'assignment-1',student_id:ids.child,status:'completed',assigned_at:model.timestamp}],sections:model.tables.class_sections,activity}};
   else if(p==='/admin/users/archived')result={data:{users:[{id:ids.student,name:'Archived QA Student',email:'archived@example.invalid',role:'student',archived_at:model.timestamp,archived_reason:'Graduated'}]}};
   else if(p==='/admin/audit-logs')result={data:{logs:Array.from({length:7},(_,i)=>({id:`audit-${i}`,actor_name:'Admin User',actor_role:'admin',action:i%2?'USER.UPDATE':'SYSTEM.CREATE',module:'users',status:'successful',metadata:{platform:'Web'},created_at:model.timestamp})),total:7,pageSize:25}};
   else result=apiFixture(model,p+u.search,method,body);
   return route.fulfill({status:result.status||200,headers:{'content-type':'application/json','x-api-compatibility-version':'3'},body:JSON.stringify(result.data)});
  }
  if(url.startsWith(base+'/'))return route.continue();
  if(!url.startsWith('https://fonts.googleapis.com/')&&!url.startsWith('https://fonts.gstatic.com/'))report.network.push(url);return route.abort();
 });
 const page=await context.newPage();page.setDefaultTimeout(8000);page.setDefaultNavigationTimeout(15000);page.on('pageerror',error=>report.errors.push(error.message));page.on('requestfailed',request=>{if(request.url().startsWith(base)&&!request.url().includes('/api/'))report.network.push({url:request.url(),failure:request.failure()});});
 const visit=async suffix=>{await page.goto(base+'/admin'+suffix,{waitUntil:'load'});await page.locator('.admin-reference-hero').waitFor();await page.waitForFunction(()=>getComputedStyle(document.querySelector('.admin-reference-hero')).backgroundColor==='rgb(6, 161, 249)',{},{timeout:12000});await page.waitForFunction(()=>globalThis.__QA_QUERY_CLIENT__?.isFetching()===0);await page.evaluate(()=>Promise.race([document.fonts.ready,new Promise(resolve=>setTimeout(resolve,5000))]));await page.waitForTimeout(650);};
 for(const width of [1536,768,375]){
  await page.setViewportSize({width,height:1024});
  for(const suffix of ['','/students','/parents','/teachers-monitoring','/users','/teachers','/sections','/analytics','/audit-logs','/archived','/notifications','/settings','/profile']){
   await visit(suffix);
   const state=await page.evaluate(()=>({width:innerWidth,content:document.documentElement.scrollWidth,title:document.querySelector('h1')?.textContent,hero:getComputedStyle(document.querySelector('.admin-reference-hero')).backgroundColor,queryErrors:globalThis.__QA_QUERY_CLIENT__.getQueryCache().getAll().filter(q=>q.state.status==='error').map(q=>String(q.queryKey))}));
   const name=suffix.slice(1)||'home';
   await page.screenshot({path:path.join(evidence,`${name}-${width}.png`),fullPage:true});
   report.pages.push({path:'/admin'+suffix,...state,pass:state.content<=width+1&&!state.queryErrors.length});
   console.log(JSON.stringify(report.pages.at(-1)));
  }
 }
 await page.setViewportSize({width:1536,height:1024});
 const action=async(name,run)=>{try{await run();report.actions.push({name,pass:true});}catch(error){report.actions.push({name,pass:false,error:error.message});}console.log(JSON.stringify(report.actions.at(-1)));};
 await action('Student learning tabs and module filters',async()=>{await visit('/students');for(const tab of ['Assessments','Activities','Performance','Achievements','Learning Modules']){await page.getByRole('tab',{name:tab,exact:true}).click();assert.equal(await page.getByRole('tab',{name:tab,exact:true}).getAttribute('aria-selected'),'true');}await page.getByLabel('Filter learning modules').selectOption('completed');assert.equal(await page.locator('.admin-reference-table tbody tr').count(),3);});
 await action('Parent learning tabs',async()=>{await visit('/parents');for(const tab of ['Assessments','Activities','Performance','Learning Modules']){await page.getByRole('tab',{name:tab,exact:true}).click();assert.equal(await page.getByRole('tab',{name:tab,exact:true}).getAttribute('aria-selected'),'true');}});
 await action('Teacher details tabs',async()=>{await visit('/teachers-monitoring');for(const tab of ['Students','Assignments','Activities','Performance','Assigned Materials']){await page.getByRole('tab',{name:tab,exact:true}).click();assert.equal(await page.getByRole('tab',{name:tab,exact:true}).getAttribute('aria-selected'),'true');}});
 await action('View user details',async()=>{await visit('/users');await page.getByRole('button',{name:'View',exact:true}).first().click();await page.getByRole('dialog',{name:'User Information'}).waitFor();await page.getByLabel('Close dialog').click();});
 await action('All six settings tabs and save',async()=>{await visit('/settings');for(const name of ['Learning','Rewards','Notifications','Security','Maintenance','General']){await page.getByRole('button',{name,exact:true}).click();}await page.getByLabel('System name',{exact:true}).fill('QA Updated School');await page.getByRole('button',{name:'Save Changes',exact:true}).click();await page.getByRole('status').waitFor();assert.equal(model.settings.systemName,'QA Updated School');});
 await action('Notification compose and history use mocked delivery',async()=>{await visit('/notifications');await page.getByLabel('Title',{exact:false}).fill('QA Design Check');await page.getByLabel('Message',{exact:false}).fill('Isolated browser fixture only.');await page.getByLabel('Students',{exact:true}).check();await page.getByRole('button',{name:'Send Notification',exact:true}).click();await page.getByRole('status').waitFor();await page.getByRole('cell',{name:'QA Design Check',exact:true}).waitFor();});
 await action('Profile password visibility and theme preferences',async()=>{await visit('/profile');await page.getByLabel('Show password',{exact:true}).click();assert.equal(await page.locator('#password').getAttribute('type'),'text');await page.getByRole('button',{name:'Dark',exact:true}).click();assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');await page.screenshot({path:path.join(evidence,'profile-dark-1536.png'),fullPage:true});await page.getByRole('button',{name:'Light',exact:true}).click();});
 await action('Navigation search opens and navigates',async()=>{await visit('');await page.getByLabel('Search admin pages',{exact:true}).click();const field=page.getByRole('searchbox');await field.fill('Sections');await field.press('Enter');await page.waitForURL(base+'/admin/sections');});
 await action('Mobile navigation opens and routes',async()=>{await page.setViewportSize({width:375,height:1024});await visit('');await page.getByLabel('Open menu',{exact:true}).click();await page.getByRole('navigation',{name:'Admin sections'}).getByRole('link',{name:'Students',exact:true}).click();await page.waitForURL(base+'/admin/students');});
 await context.close();
}finally{if(browser)await browser.close();await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});fs.writeFileSync(path.join(evidence,'report.json'),JSON.stringify(report,null,2));}
if(report.pages.some(p=>!p.pass)||report.actions.some(a=>!a.pass)||report.errors.length||report.network.length)process.exitCode=1;
