import test from 'node:test';
import assert from 'node:assert/strict';
import {loadTs} from './helpers/load-ts.mjs';
const {descriptionParts,insertDescriptionFormat}=loadTs('src/lib/lessons/description.ts');
const plain=value=>JSON.parse(JSON.stringify(value));
test('lesson descriptions retain ordinary text, line breaks and list markers',()=>{
 const value='Unang aralin\n• Pakinggan\n2. Basahin';assert.deepEqual(plain(descriptionParts(value)),[{kind:'text',text:value}]);
});
test('HTML-like description content is text and cannot become markup',()=>{
 const value='<img src=x onerror=alert(1)><script>bad()</script>';assert.deepEqual(plain(descriptionParts(value)),[{kind:'text',text:value}]);
});
test('lesson description formatting recognizes bounded text marks in order',()=>{
 assert.deepEqual(plain(descriptionParts('**Basa** *tunog* __letra__')),[{kind:'bold',text:'Basa'},{kind:'text',text:' '},{kind:'italic',text:'tunog'},{kind:'text',text:' '},{kind:'underline',text:'letra'}]);
});
test('only http and https links are rendered as description links',()=>{
 assert.deepEqual(plain(descriptionParts('[Basa](https://example.test/basa)')),[{kind:'link',text:'Basa',href:'https://example.test/basa'}]);
 for(const value of ['[x](javascript:alert(1))','[x](data:text/html,bad)','[x](//example.test)'])assert.equal(descriptionParts(value).some(part=>part.kind==='link'),false);
});
test('formatting a selection preserves surrounding description text and selection',()=>{
 assert.deepEqual(plain(insertDescriptionFormat('Ang bata ay nagbabasa.',4,8,'bold')),{value:'Ang **bata** ay nagbabasa.',start:6,end:10});
});
test('list tools keep line order and surrounding content',()=>{
 assert.equal(insertDescriptionFormat('basa\nbigkas',0,11,'number').value,'1. basa\n2. bigkas');
 assert.equal(insertDescriptionFormat('basa\nbigkas',0,11,'bullet').value,'• basa\n• bigkas');
 assert.equal(insertDescriptionFormat('basa',0,4,'indent').value,'  basa');
});
test('formatting respects character limits without silently truncating data',()=>{
 assert.equal(insertDescriptionFormat('a'.repeat(500),0,500,'bold'),null);
 assert.equal(insertDescriptionFormat('a'.repeat(496),0,496,'bold').value.length,500);
});
test('emoji insertion preserves the selected text',()=>{
 assert.equal(insertDescriptionFormat('Mahusay!',0,8,'emoji').value,'Mahusay! 😊');
});
