export interface EditableDrillItem { id?:string; band_index:number; item_order:number; syllable_pattern:string; word:string; image_url:string|null; xp_value:number; }
export function prepareDrillItems(items:EditableDrillItem[]) {
  if(items.length>250)throw new Error('Hanggang 250 row lamang ang maaaring i-save.');
  return items.map((item,index)=>{
    if(!item.word.trim() || !item.syllable_pattern.trim())throw new Error(`Kumpletuhin ang pantig at salita sa row ${index+1}.`);
    if(item.word.trim().length>120 || item.syllable_pattern.trim().length>80)throw new Error(`Masyadong mahaba ang teksto sa row ${index+1}.`);
    if(!Number.isInteger(item.xp_value)||item.xp_value<1||item.xp_value>100)throw new Error(`Ang XP sa row ${index+1} ay dapat 1 hanggang 100.`);
    return {...item,item_order:index,word:item.word.trim(),syllable_pattern:item.syllable_pattern.trim()};
  });
}
/** Match the existing PDF API contract before starting an upload. */
export async function validateReadingPdf(file:Pick<File,'name'|'type'|'size'|'slice'>) {
  if(!file.size)throw new Error('Walang laman ang napiling PDF.');
  if(file.size>15*1024*1024)throw new Error('Hanggang 15 MB lamang ang PDF.');
  if(!file.name.toLowerCase().endsWith('.pdf')||!['application/pdf','application/x-pdf'].includes(file.type.toLowerCase()))throw new Error('Pumili ng wastong PDF file.');
  if(await file.slice(0,5).text()!=='%PDF-' || !(await file.slice(Math.max(0,file.size-2048)).text()).includes('%%EOF'))throw new Error('Hindi wastong PDF o kulang ang laman ng file.');
}
