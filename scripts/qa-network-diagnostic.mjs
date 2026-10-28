import fs from 'node:fs';
import {createServer} from 'node:http';
import {chromium} from './qa-tools/node_modules/playwright/index.mjs';

// Independent of the app: no Supabase/env files, user data, or remote requests.
const reports=[];
for(const [name,executablePath] of [['Edge','C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'],['Chromium',null]]){
  const requests=[];let server,browser;
  const row={name,runs:[],serverRequests:requests};
  try{
    server=createServer((req,res)=>{requests.push({url:req.url,at:Date.now()});if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><meta name="viewport" content="width=device-width"><link rel="stylesheet" href="/style.css"><h1>Network fixture</h1>'+Array.from({length:20},(_,i)=>`<script src="/chunk-${i}.js"></script>`).join(''));}else if(req.url==='/style.css'){res.setHeader('Content-Type','text/css');res.end('body{max-width:100%;margin:0}');}else{res.setHeader('Content-Type','text/javascript');res.end('window.loaded=(window.loaded||0)+1;');}});
    await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
    const base=`http://127.0.0.1:${server.address().port}`;row.base=base;
    browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{channel:'chromium'})});row.version=browser.version();
    for(let i=0;i<10;i++){
      const context=await browser.newContext({viewport:{width:375,height:800}});const failures=[];const start=requests.length;
      await context.route('**/*',route=>route.request().url().startsWith(base+'/')?route.continue():route.abort());
      try{const page=await context.newPage();page.on('requestfailed',req=>failures.push({url:req.url(),error:req.failure()?.errorText}));await page.goto(base,{timeout:15000});row.runs.push({index:i,loaded:await page.evaluate(()=>window.loaded),failures,serverRequests:requests.slice(start).map(r=>r.url)});}
      catch(error){row.runs.push({index:i,error:error.message,failures,serverRequests:requests.slice(start).map(r=>r.url)});}
      finally{await context.close();}
    }
  }catch(error){row.setupError=error.message;}
  finally{if(browser)await browser.close();if(server)await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});reports.push(row);}
}
fs.mkdirSync('docs/qa/evidence/phase3',{recursive:true});
fs.writeFileSync('docs/qa/evidence/phase3/network-diagnostic.json',JSON.stringify({timestamp:new Date().toISOString(),scope:'Independent HTML/CSS/20-script fixture with browser/server correlation; no app, authentication or Supabase. No OS/browser security setting changes.',reports},null,2)+'\n');
console.log(JSON.stringify(reports.map(r=>({name:r.name,setupError:r.setupError,runs:r.runs.length,complete:r.runs.filter(r=>r.loaded===20&&!r.failures.length).length,denied:r.runs.flatMap(r=>r.failures).filter(f=>f.error?.includes('ACCESS_DENIED')).length}))));
