const test=require('node:test'),assert=require('node:assert/strict');const {syncConfirmedStudentEmail}=require('../services/confirmedEmailAlias');
test('verified student email changes synchronize only the matching child login and credential alias',async()=>{
 const calls=[];const client={from(table){let patch;const q={select(){return q;},eq(key,value){calls.push({table,key,value,patch});return q;},update(value){patch=value;return q;},maybeSingle:async()=>({data:{role:'student'}}),then(resolve,reject){return Promise.resolve({data:table==='children'?[{id:'child'}]:[]}).then(resolve,reject);}};return q;}};
 await syncConfirmedStudentEmail(client,{id:'auth-child',email:'new@example.test',email_confirmed_at:'2026-11-11'});
 assert.deepEqual(calls.filter(x=>x.patch),[{table:'children',key:'auth_uid',value:'auth-child',patch:{username:'new@example.test'}},{table:'child_credentials',key:'child_id',value:'child',patch:{username:'new@example.test'}}]);
});
test('an unconfirmed email never changes a student login alias',async()=>{await syncConfirmedStudentEmail({from(){throw Error('Must not query');}},{id:'child',email:'new@example.test'});});
