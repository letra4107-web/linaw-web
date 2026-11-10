const test=require('node:test'),assert=require('node:assert/strict');
const {compareReading}=require('../lib/readingAccuracy');
test('Beginner short units receive proportional letter scores without treating phoneme changes as exact',()=>{
 for(const [target,heard,score]of [['bata','ba',50],['ilog','ilok',75],['pala','fala',75],['ng','nang',50],['bata','bata bata',50]]){
  const result=compareReading(target,heard);assert.equal(result.accuracy,score);assert.equal(result.correct,false);assert.ok(result.issues.length);assert.ok(result.letterIssues.length);
 }
});
test('Intermediate phrases align words and count missing, changed, and extra words',()=>{
 assert.equal(compareReading('Ang bata','Ang pusa').accuracy,50);
 const missing=compareReading('Ako ay nagbabasa','Ako nagbabasa');assert.equal(missing.accuracy,67);assert.equal(missing.issues[0].kind,'missing');assert.equal(missing.issues[0].expected,'ay');
 const extra=compareReading('Ang bata','Ang bata bata');assert.equal(extra.accuracy,67);assert.equal(extra.issues[0].kind,'extra');
});
test('normalization allows case, vowel stress and punctuation without collapsing distinct Filipino letters',()=>{
 assert.equal(compareReading('Báta!','bata').accuracy,100);assert.equal(compareReading('Mag-ingat','mag ingat').accuracy,100);
 assert.equal(compareReading('Mag-ingat, bata!','mag ingat bata').accuracy,100);
 assert.equal(compareReading('ñoño','nono').correct,false);
 for(const [target,heard]of [['A','ah'],['E','eh'],['I','ee'],['O','oh'],['U','oo']])assert.equal(compareReading(target,heard).accuracy,100);
});
test('100 percent requires an exact accepted comparison even on long passages',()=>{
 const target=Array(400).fill('bata').join(' '),heard=Array(399).fill('bata').join(' ');assert.equal(compareReading(target,heard).accuracy,99);assert.equal(compareReading(target,target).accuracy,100);
 assert.equal(compareReading('bata','').accuracy,0);assert.equal(compareReading('','').correct,false);
});
