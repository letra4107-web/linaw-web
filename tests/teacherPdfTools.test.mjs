import test from 'node:test';
import assert from 'node:assert/strict';
import {loadTs} from './helpers/load-ts.mjs';
const {prepareDrillItems,validateReadingPdf}=loadTs('src/lib/teacher/pdfTools.ts');
const row=(word='bata',order=0)=>({band_index:3,item_order:order,syllable_pattern:' ba-ta ',word,image_url:null,xp_value:25});
test('drill save preserves Tagalog words and bands while rebuilding unique row order',()=>{
 const input=[row(' bata ',5),row('ngipin',5),row('mga',9)],result=prepareDrillItems(input);assert.deepEqual(Array.from(result,item=>item.item_order),[0,1,2]);assert.equal(result[0].word,'bata');assert.equal(result[1].word,'ngipin');assert.equal(result[0].band_index,3);assert.equal(input[0].item_order,5);
});
test('drill save rejects missing words, invalid XP and overlong input before API writes',()=>{
 for(const patch of [{word:' '},{syllable_pattern:''},{xp_value:0},{xp_value:101},{xp_value:1.5},{word:'a'.repeat(121)},{syllable_pattern:'a'.repeat(81)}])assert.throws(()=>prepareDrillItems([{...row(),...patch}]));assert.throws(()=>prepareDrillItems(Array.from({length:251},()=>row())));assert.equal(prepareDrillItems([]).length,0);
});
const file=(text='%PDF-1.7\nTest\n%%EOF',props={})=>{const blob=new Blob([text]);return {name:'aralin.pdf',type:'application/pdf',size:blob.size,slice:blob.slice.bind(blob),...props};};
test('reading PDF validation accepts the existing API format and MIME aliases',async()=>{
 await validateReadingPdf(file());await validateReadingPdf(file(undefined,{name:'ARALIN.PDF',type:'application/x-pdf'}));
});
test('reading PDF validation rejects empty, too large, wrong type/signature and truncated files',async()=>{
 for(const invalid of [file('',{}),file(undefined,{size:15*1024*1024+1}),file(undefined,{name:'aralin.txt'}),file(undefined,{type:'text/plain'}),file('not a pdf %%EOF'),file('%PDF-1.7 missing trailer')])await assert.rejects(validateReadingPdf(invalid));
});
