import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { chromium } from './qa-tools/node_modules/playwright/index.mjs';

// Actual WordOfDayCard/React Query; synthetic identity, speech and API only.
const root = path.resolve('.qa/word-of-day-retry');
const outDir = path.join(root,'dist');
fs.mkdirSync(root,{recursive:true});
fs.writeFileSync(path.join(root,'index.html'),'<div id="root"></div><script type="module" src="/entry.tsx"></script>');
fs.writeFileSync(path.join(root,'entry.tsx'),`import React from 'react'; import {createRoot} from 'react-dom/client'; import {QueryClient,QueryClientProvider} from '@tanstack/react-query'; import {WordOfDayCard} from '../../src/components/WordOfDayCard'; createRoot(document.getElementById('root')!).render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><WordOfDayCard/></QueryClientProvider>);`);
process.env.VITE_API_URL = '/api';
await build({root,configFile:false,logLevel:'error',plugins:[react(),{
  name:'isolated-word-of-day-boundary',enforce:'pre',
  resolveId(id,importer){
    if(!importer || !id.startsWith('.')) return;
    const resolved=path.resolve(path.dirname(importer),id).replace(/\.tsx?$/,'');
    if(resolved===path.resolve('src/lib/supabaseClient')) return path.resolve('testing-audit/fixtures/browserSupabase.mjs');
    if(resolved===path.resolve('src/lib/auth/AuthContext')) return '\0qa-auth';
  },
  load(id){if(id==='\0qa-auth')return "export function useAuth(){return {user:{id:'00000000-0000-4000-8000-000000000004'}};}";},
}],build:{outDir,emptyOutDir:false}});
const server=createServer((req,res)=>{
  const file=path.resolve(outDir,'.'+new URL(req.url,'http://localhost').pathname);
  if(!file.startsWith(outDir+path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html');
  fs.createReadStream(file).pipe(res);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}`;
let browser;
try{
  browser=await chromium.launch({headless:true,channel:'chromium'});
  const context=await browser.newContext();
  await context.addInitScript(()=>{
    globalThis.__LINAW_QA_ROLE__='student';globalThis.__TRANSCRIPT__='pusa';globalThis.__RECORDINGS__=0;
    globalThis.SpeechRecognition=class{start(){globalThis.__RECORDINGS__++;setTimeout(()=>this.onresult?.({results:[[{transcript:globalThis.__TRANSCRIPT__,confidence:0.95}]]}),10);}stop(){}};
    HTMLMediaElement.prototype.play=function(){queueMicrotask(()=>this.onended?.());return Promise.resolve();};
    HTMLMediaElement.prototype.pause=function(){};
  });
  let mode='unavailable';
  const requests=[],receipts=new Map(),audioRequests=[];
  const log={id:'00000000-0000-4000-8000-000000000008',child_id:'00000000-0000-4000-8000-000000000005',word:'bata',date:'2026-11-09',attempts:0,accuracy:null,correct:null,xp_awarded:0,completed_at:null};
  await context.route('**/api/**',async route=>{
    const request=route.request(),url=new URL(request.url()),body=request.postDataJSON();let data;
    if(url.pathname==='/api/student/learn/path')data={effective_level:'Beginner'};
    else if(url.pathname==='/api/student/word-of-day')data={success:true,log};
    else if(url.pathname==='/api/tts'){audioRequests.push(body);data={audioContent:'UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAA=='};}
    else if(url.pathname==='/api/student/word-of-day/attempt'){
      requests.push(body);
      if(mode==='unavailable')return route.fulfill({status:503,json:{error:'Hindi magamit ang serbisyo ng pang-araw-araw na gantimpala. Ulitin ang parehong pagsubok mamaya.'}});
      if(receipts.has(body.attempts))data={...receipts.get(body.attempts),xpAwarded:0,originalXpAwarded:25,replayed:true};
      else{
        assert.equal(body.attempts,log.attempts+1);
        const correct=body.transcript==='bata',isFinal=correct || body.attempts===3;
        data={success:true,isFinal,correct:isFinal?correct:null,accuracy:correct?100:0,xpAwarded:correct?25:0,replayed:false};
        Object.assign(log,{attempts:body.attempts,accuracy:data.accuracy,correct:data.correct,xp_awarded:data.xpAwarded,completed_at:isFinal?new Date().toISOString():null});receipts.set(body.attempts,data);
        if(mode==='lost-ack'){mode='available';return route.abort('connectionreset');}
      }
    }else return route.fulfill({status:404,json:{error:'Unexpected isolated API'}});
    return route.fulfill({json:data,headers:{'x-api-compatibility-version':'3'}});
  });
  const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base+'/index.html');
  const mic=page.locator('[data-word-action="speak"]');await mic.click();
  const retry=page.getByRole('button',{name:'I-save muli ang sagot'});await retry.waitFor();assert.equal(await mic.isDisabled(),true);
  mode='available';await retry.click();
  const toast=page.getByRole('region',{name:'Mensahe sa iyong pagbasa'});await toast.waitFor();
  assert.deepEqual(requests[0],requests[1]);assert.equal(await page.evaluate(()=>globalThis.__RECORDINGS__),1);assert.equal(log.attempts,1);
  await toast.getByRole('button',{name:'Isara ang mensahe'}).click();
  await mic.click();await toast.waitFor();assert.equal(log.attempts,2);
  await page.waitForFunction(()=>globalThis.__RECORDINGS__===2);
  await toast.getByRole('button',{name:'Isara ang mensahe'}).click();
  await page.evaluate(()=>{globalThis.__TRANSCRIPT__='bata';});mode='lost-ack';
  await mic.click();await retry.waitFor();assert.equal(log.xp_awarded,25);await retry.click();
  await toast.waitFor();await page.getByText(/\+25 XP/).waitFor();
  assert.deepEqual(requests.at(-1),requests.at(-2));assert.equal(receipts.size,3);assert.equal(log.xp_awarded,25);
  assert.equal(await page.evaluate(()=>globalThis.__RECORDINGS__),3);assert.equal(await mic.isDisabled(),true);
  assert.ok(audioRequests.length>=3,'spoken feedback for every accepted attempt');assert.deepEqual(errors,[]);
  console.log('PASS: missing-service retry preserves speech; repeated wrong attempts speak again; lost acknowledgement replays one 25 XP reward');
}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
