import test from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {loadTs} from './helpers/load-ts.mjs';
const require=createRequire(import.meta.url),server=require('../server/lib/childBirthDate');
const browser=loadTs('src/lib/childBirthDate.ts');
test('optional birthday and exact age-seven boundaries agree in the browser and API',()=>{
 const now=new Date('2026-11-11T00:00:00+08:00');
 for(const [date,valid]of [['',true],['2019-11-11',true],['2019-11-12',false],['2026-02-30',false],['1899-12-31',false],['2018-02-29',false],['2016-02-29',true]]){assert.equal(browser.validOptionalChildBirthDate(date,now),valid,date);assert.equal(server.validOptionalChildBirthDate(date,now),valid,date);}
 assert.equal(server.validOptionalChildBirthDate(null,now),true);
});
test('Manila day and leap-day cutoff are stable',()=>{for(const api of [browser,server]){assert.equal(api.latestChildBirthDate(new Date('2026-11-10T16:00:00Z')),'2019-11-11');assert.equal(api.latestChildBirthDate(new Date('2024-02-29T05:00:00Z')),'2017-02-28');}});
