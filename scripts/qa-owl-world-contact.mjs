import fs from 'node:fs';
import { chromium } from './qa-tools/node_modules/playwright/index.mjs';
const theme=process.argv[2]||'owl-world';
const assets = theme==='owl-world'?JSON.parse(fs.readFileSync('.qa/owl-world-staging.json','utf8')):JSON.parse(fs.readFileSync('src/assets/illustrations/'+theme+'/generation.json','utf8')).assets.map(asset=>({...asset,source:'src/assets/illustrations/'+theme+'/'+asset.file}));
const browser = await chromium.launch({headless:true,channel:'chromium'});
try {
 const page = await browser.newPage({viewport:{width:1280,height:900}});
 for (const [kind,items] of [['characters',assets.filter(a=>!a.columns)],['sheets',assets.filter(a=>a.columns)]]) {
  const html='<html><style>body{font:16px Arial;background:#edf1f5;display:grid;grid-template-columns:repeat(3,1fr);gap:16px}figure{margin:0;padding:12px;background:white;border-radius:12px}img{width:100%;height:280px;object-fit:contain}figcaption{padding:8px}</style>'+items.map(a=>'<figure><img src="data:image/png;base64,'+fs.readFileSync(a.source).toString('base64')+'"><figcaption>'+a.name+'</figcaption></figure>').join('')+'</html>';
  await page.setContent(html);await page.locator('img').evaluateAll(images=>Promise.all(images.map(img=>img.decode())));
  await page.screenshot({path:'.qa/'+theme+'-'+kind+'.png',fullPage:true});
 }
} finally {await browser.close();}
