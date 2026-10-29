import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './helpers/load-ts.mjs';

const { groupLearnModules, learnModulePercent, learnModuleArt, compactModuleDescription } = loadTs('src/lib/learnPresentation.ts');
const module = number => ({ id: `module-${number}`, module_number: number, title: `Modyul ${number}`, state: 'locked', content_item_count: 5, completed_content_item_count: 0, instructional_content_type: 'phonetic' });

test('Beginner stages follow the reference boundaries without changing source order, content or unlock state', () => {
  const modules = Array.from({ length: 17 }, (_, index) => module(index + 1)).reverse();
  const before = structuredClone(modules);
  const stages = groupLearnModules(modules, 'Beginner');
  assert.deepEqual(Array.from(stages, stage => Array.from(stage.modules, item => item.module_number)), [[1], [2,3,4,5,6], [7,8,9,10,11], [12,13,14,15,16], [17]]);
  assert.deepEqual(modules, before);
  assert.equal(stages[1].modules[0], modules.find(item => item.module_number === 2));
});

test('Additional, sparse and non-Beginner curricula retain every actual module exactly once', () => {
  for (const level of ['Beginner', 'Intermediate', 'Advanced', 'Unknown']) {
    for (const numbers of [[], [1,4,17,20,0], Array.from({length:23},(_,index)=>index+1)]) {
      const modules = numbers.map(module);
      const cards = groupLearnModules(modules, level).flatMap(stage => stage.modules);
      assert.equal(cards.length, modules.length);
      assert.deepEqual(Array.from(cards, item => item.id).sort(), modules.map(item => item.id).sort());
    }
  }
  assert.notEqual(groupLearnModules([module(1)], 'Advanced')[0].title, 'Panimula');
});

test('Module percentages are bounded and handle zero or invalid totals', () => {
  assert.equal(learnModulePercent({content_item_count:8,completed_content_item_count:3}),38);
  assert.equal(learnModulePercent({content_item_count:0,completed_content_item_count:4}),0);
  assert.equal(learnModulePercent({content_item_count:5,completed_content_item_count:9}),100);
  assert.equal(learnModulePercent({content_item_count:5,completed_content_item_count:-1}),0);
  assert.equal(learnModulePercent({content_item_count:5,completed_content_item_count:NaN}),0);
});

test('Card syllables come from recognized source titles; other curricula never receive invented syllables', () => {
  assert.equal(learnModuleArt({title:'Hanay ng Nga',instructional_content_type:'phonetic'}).syllable,'Nga');
  assert.equal(learnModuleArt({title:'HANAY NG BA',instructional_content_type:'phonetic'}).syllable,'Ba');
  assert.equal(learnModuleArt({title:'Kwento 1: Isang Araw sa Bahay',instructional_content_type:'story'}).syllable,null);
  assert.equal(learnModuleArt({title:'Hanay ng Za',instructional_content_type:'phonetic'}).syllable,null);
  assert.equal(compactModuleDescription('Bigkasin ang Ba, Be, Bi, Bo at Bu.','phonetic'),'Ba, Be, Bi, Bo, Bu');
  assert.equal(compactModuleDescription('Basahin ang kuwento.','story'),'Basahin ang kuwento.');
});

test('Filipino picture examples begin with the module syllable and have distinct picture cells', () => {
  const syllables = ['Ba','Da','Ga','Ha','Ka','La','Ma','Na','Nga','Pa','Ra','Sa','Ta','Wa','Ya'];
  const pictures = syllables.map(syllable => learnModuleArt({title:`Hanay ng ${syllable}`,instructional_content_type:'phonetic'}));
  for (const picture of pictures) {
    assert.ok(picture.exampleWord?.toLowerCase().startsWith(picture.syllable.toLowerCase()), `${picture.syllable}: ${picture.exampleWord}`);
    assert.ok(Number.isInteger(picture.sprite) && picture.sprite >= 0 && picture.sprite < 15);
  }
  assert.equal(new Set(pictures.map(picture => picture.sprite)).size,15);
  assert.equal(learnModuleArt({title:'Hanay ng Da',instructional_content_type:'phonetic'}).exampleWord,'Dahon');
  assert.equal(learnModuleArt({title:'Hanay ng Wa',instructional_content_type:'phonetic'}).exampleWord,'Walis');
  assert.equal(learnModuleArt({title:'Maikling Kuwento',instructional_content_type:'story'}).exampleWord,null);
});
