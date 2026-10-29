import test from 'node:test';
import assert from 'node:assert/strict';
import {loadTs} from './helpers/load-ts.mjs';
const {moduleItemArt,moduleBoardLabel,moduleItemLocked}=loadTs('src/lib/modulePresentation.ts');

test('Ba pictures use Filipino examples instead of English object names',()=>{
 assert.deepEqual(['ba','be','bi','bo','bu'].map(x=>moduleItemArt(x,'phonetic').exampleWord),['bata','berde','bibe','bote','buko']);
 assert.ok(moduleItemArt('be','phonetic').color);
 for(const x of ['ba','bi','bo','bu'])assert.ok(moduleItemArt(x,'phonetic').picture);
});
test('all 15 syllable families and first-letter set have distinct Filipino examples',()=>{
 const families=['ba','da','ga','ha','ka','la','ma','na','nga','pa','ra','sa','ta','wa','ya'];
 const examples=families.map(x=>moduleItemArt(x,'phonetic').exampleWord);
 assert.equal(new Set(examples).size,15);
 for(const x of [...families,'M','S','A','I','O','E','U']){const a=moduleItemArt(x,'phonetic');assert.ok(a.exampleWord);assert.ok(a.picture);}
});
test('all 75 delivered syllables have a real picture with a matching example or explicit sound practice',()=>{
 const stems=['b','d','g','h','k','l','m','n','ng','p','r','s','t','w','y'];
 const practice=[];
 for(const stem of stems)for(const vowel of ['a','e','i','o','u']){
  const sound=stem+vowel,art=moduleItemArt(sound,'phonetic');
  assert.ok(art.picture,`${sound} must have a picture`);
  if(art.practiceSound){assert.equal(art.exampleWord,null);assert.equal(art.practiceSound,sound);practice.push(sound);}
  else{assert.ok(art.exampleWord?.includes(sound),`${sound} must occur in its example`);assert.equal(art.practiceSound,null);}
 }
 assert.deepEqual(practice,['nge','wo','wu','yi']);
});
test('Ga family has five distinct related Filipino pictures and mixed-case targets preserve the mapping',()=>{
 const sounds=['ga','ge','gi','go','gu'];
 assert.deepEqual(sounds.map(sound=>moduleItemArt(sound,'phonetic').exampleWord),['gatas','banggera','gitara','goma','gulong']);
 assert.equal(new Set(sounds.map(sound=>{const picture=moduleItemArt(sound,'phonetic').picture;return picture.sheet+':'+picture.index;})).size,5);
 for(const sound of sounds)assert.equal(moduleItemArt(sound.toUpperCase(),'phonetic').exampleWord,moduleItemArt(sound,'phonetic').exampleWord);
});
test('real word targets use their own picture and unknown text receives no invented example',()=>{
 assert.ok(moduleItemArt('bata','word').picture);
 assert.equal(moduleItemArt('bata','word').exampleWord,null);
 assert.equal(moduleItemArt('BATA','word').picture.index,moduleItemArt('bata','word').picture.index);
 for(const [text,type]of [['zz','phonetic'],['qe','phonetic'],['Hindi nakalista','word'],['Ang bata ay masaya.','phrase']]){const a=moduleItemArt(text,type);assert.equal(a.exampleWord,null);assert.equal(a.picture,null);}
});
test('all 20 configured Pagbuo ng Salita words have their own picture without replacing the target',()=>{
 const words=['bata','mata','puti','pula','bago','luma','gabi','tawa','sabi','laro','lasa','dami','bato','guro','hila','ngiti','wala','yaya','masaya','kusina'];
 const pictures=[];
 for(const word of words){
  const art=moduleItemArt(word,'word');
  assert.ok(art.picture,`${word} needs a picture`);
  assert.equal(art.exampleWord,null);assert.equal(art.practiceSound,null);
  const normalized=moduleItemArt(' '+word.toUpperCase()+' ','word');
  assert.equal(normalized.picture.sheet,art.picture.sheet);assert.equal(normalized.picture.index,art.picture.index);
  pictures.push(art.picture.sheet+':'+art.picture.index);
 }
 assert.equal(new Set(pictures).size,20,'Each configured word has its own illustration');
});
test('board text varies by module without replacing any reading target',()=>{
 assert.equal(moduleBoardLabel('Hanay ng Ba','phonetic',[]),'Ba');
 assert.equal(moduleBoardLabel('Hanay ng Nga','phonetic',[]),'Nga');
 assert.equal(moduleBoardLabel('Unang mga Titik','phonetic',[{content_text:'M'},{content_text:'S'},{content_text:'A'}]),'M · S · A');
 assert.equal(moduleBoardLabel('Pagbuo ng Salita','word',[]),'Salita');
 assert.equal(moduleBoardLabel('Kuwento 1','paragraph',[]),'Kuwento');
});
test('card locks preserve the preceding saved item rule',()=>{
 const items=[{completed:false},{completed:false},{completed:false}];
 assert.equal(moduleItemLocked(items,0),false);assert.equal(moduleItemLocked(items,1),true);
 items[0].completed=true;assert.equal(moduleItemLocked(items,1),false);assert.equal(moduleItemLocked(items,2),true);
 items[1].completed=true;assert.equal(moduleItemLocked(items,2),false);
});
