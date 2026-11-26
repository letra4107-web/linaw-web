import {test} from 'node:test';import assert from 'node:assert/strict';import {loadTs} from './helpers/load-ts.mjs';
const {normalizeChildEnrollmentName,hasDuplicateChildEnrollment}=loadTs('src/lib/childEnrollment.ts');
test('web duplicate enrollment compares name and grade using the parent-owned roster',()=>{
 const children=[{name:'  Ana   Peña ',grade_level:1}];
 for(const name of ['ana peña','ANA PEÑA',' Ana\u00a0Peña ','Ａｎａ　Ｐｅñａ'])assert.equal(hasDuplicateChildEnrollment(children,name,1),true);
 assert.equal(hasDuplicateChildEnrollment(children,'Ana Peña',2),false);assert.equal(hasDuplicateChildEnrollment(children,'Ana Pena',1),false);assert.equal(hasDuplicateChildEnrollment([],'Ana Peña',1),false);assert.equal(hasDuplicateChildEnrollment(children,' ',1),false);
});
test('enrollment names retain accents and punctuation while cleaning spaces and compatibility characters',()=>{assert.equal(normalizeChildEnrollmentName('  Ana\tPeña  '),'Ana Peña');assert.equal(normalizeChildEnrollmentName("  O’Neil  "),'O’Neil');assert.equal(normalizeChildEnrollmentName('Ａｎａ　Ｌｕｎａ'),'Ana Luna');});
