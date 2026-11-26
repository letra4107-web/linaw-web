import fs from 'node:fs';
import { chromium } from './qa-tools/node_modules/playwright/index.mjs';
const sheets=['owl-world','role-themes'].flatMap(directory=>{
 const manifestPath='src/assets/illustrations/'+directory+'/generation.json';
 if(!fs.existsSync(manifestPath))return [];
 return JSON.parse(fs.readFileSync(manifestPath,'utf8')).assets.filter(asset=>asset.columns).map(asset=>({...asset,directory}));
});
const browser=await chromium.launch({headless:true,channel:'chromium'});const regions={};
try{
 const page=await browser.newPage();
 for(const sheet of sheets){
  const source='data:image/png;base64,'+fs.readFileSync('src/assets/illustrations/'+sheet.directory+'/'+sheet.file).toString('base64');
  const cells=await page.evaluate(async({source,columns,rows})=>{
   const img=new Image();img.src=source;await img.decode();const width=img.naturalWidth,height=img.naturalHeight;
   const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);
   const rgba=ctx.getImageData(0,0,width,height).data,seen=new Uint8Array(width*height),queue=new Int32Array(width*height);
   const bounds=Array.from({length:columns*rows},()=>[width,height,0,0,0]);
   for(let start=0;start<seen.length;start++){
    if(seen[start]||rgba[start*4+3]<200)continue;let read=0,write=0;queue[write++]=start;seen[start]=1;let minX=width,minY=height,maxX=0,maxY=0;
    while(read<write){const pos=queue[read++],x=pos%width,y=Math.floor(pos/width);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
     for(const next of [x>0?pos-1:-1,x<width-1?pos+1:-1,y>0?pos-width:-1,y<height-1?pos+width:-1])if(next>=0&&!seen[next]&&rgba[next*4+3]>=200){seen[next]=1;queue[write++]=next;}
    }
    if(write<300)continue;
    const col=Math.min(columns-1,Math.floor((minX+maxX)/2/(width/columns))),row=Math.min(rows-1,Math.floor((minY+maxY)/2/(height/rows))),b=bounds[row*columns+col];
    b[0]=Math.min(b[0],minX);b[1]=Math.min(b[1],minY);b[2]=Math.max(b[2],maxX);b[3]=Math.max(b[3],maxY);b[4]+=write;
   }
   return bounds.map((b,index)=>{if(!b[4])throw Error('No artwork in cell '+index);const padding=3,x=Math.max(0,b[0]-padding),y=Math.max(0,b[1]-padding);return[x,y,Math.min(width,b[2]+padding+1)-x,Math.min(height,b[3]+padding+1)-y];});
  },{source,columns:sheet.columns,rows:sheet.rows});
  regions[sheet.name]={width:sheet.width,height:sheet.height,cells};
 }
}finally{await browser.close();}
fs.writeFileSync('.qa/owl-world-sprite-regions.json',JSON.stringify(regions,null,2));
const imports=sheets.map((sheet,index)=>"import sheet"+index+" from '../assets/illustrations/"+sheet.directory+"/"+sheet.file+"';").join('\n');
const entries=Object.entries(regions).map(([name,value],index)=>' [sheet'+index+']: '+JSON.stringify(value)).join(',\n');
fs.writeFileSync('src/lib/illustrationSprites.ts',imports+'\n\n/** Bounds measured from opaque artwork; transparent neighboring cells are excluded. */\nexport const ILLUSTRATION_SPRITES: Record<string, { width: number; height: number; cells: number[][] }> = {\n'+entries+'\n};\n');
console.log('Measured complete artwork bounds for',Object.values(regions).reduce((n,s)=>n+s.cells.length,0),'illustrations');
