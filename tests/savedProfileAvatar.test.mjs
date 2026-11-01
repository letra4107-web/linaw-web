import test from 'node:test';import assert from 'node:assert/strict';import {loadTs} from './helpers/load-ts.mjs';
const profile={userId:'parent-1',role:'parent',displayName:'QA Magulang',email:'parent@example.test',refreshToken:'test-ticket'};
function store(initial=[]){const values=new Map([['linawletra.savedProfiles.v1',JSON.stringify(initial)]]);return loadTs('src/lib/auth/savedProfiles.ts',{}, {URL,localStorage:{getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)}});}
test('profile photos survive token rotation and a later save that omits photo metadata',()=>{
 const storage=store();const avatarUrl='https://example.test/parent-avatars/parent-1/photo.png';storage.saveAuthProfile({...profile,avatarUrl});storage.updateSavedProfileToken(profile.userId,'new-ticket');storage.saveAuthProfile({...profile,displayName:'Bagong pangalan',refreshToken:'newest-ticket'});const result=storage.getSavedProfiles()[0];assert.equal(result.avatarUrl,avatarUrl);assert.equal(result.refreshToken,'newest-ticket');assert.equal(result.displayName,'Bagong pangalan');
});
test('old saved accounts stay available without photos; invalid photo URLs cannot become image sources',()=>{
 const storage=store([{...profile,savedAt:new Date().toISOString()}]);assert.equal(storage.getSavedProfiles().length,1);assert.equal(storage.getSavedProfiles()[0].avatarUrl,null);for(const avatarUrl of ['javascript:alert(1)','data:text/html,<script/>','https://user:secret@example.test/a','blob:https://example.test/expired']){storage.saveAuthProfile({...profile,avatarUrl});assert.equal(storage.getSavedProfiles()[0].avatarUrl,null);}
});
test('explicit photo removal clears the prior image without deleting the login ticket',()=>{
 const storage=store();storage.saveAuthProfile({...profile,avatarUrl:'https://example.test/photo.png'});storage.saveAuthProfile({...profile,avatarUrl:null});assert.equal(storage.getSavedProfiles()[0].avatarUrl,null);assert.equal(storage.getSavedProfiles()[0].refreshToken,'test-ticket');
});
function reader(result){const calls=[];const query={select(fields){calls.push(['select',fields]);return this;},eq(key,value){calls.push(['eq',key,value]);return this;},abortSignal(signal){calls.push(['signal',signal]);return this;},maybeSingle:async()=>{if(result instanceof Error)throw result;return result;}};const {loadProfileAvatar}=loadTs('src/lib/auth/profileAvatar.ts',{'../supabaseClient':{supabase:{from(table){calls.push(['from',table]);return query;}}}},{AbortController,setTimeout,clearTimeout});return {loadProfileAvatar,calls};}
test('logout photos use the parent and teacher profile tables with explicit current-user scoping',async()=>{
 for(const [role,table,key] of [['parent','parents','auth_uid'],['teacher','teacher_profiles','user_id'],['student','users','id']]){const r=reader({data:{avatar_url:'https://example.test/photo.png'},error:null});assert.equal(await r.loadProfileAvatar('current-user',role),'https://example.test/photo.png');assert.deepEqual(r.calls[0],['from',table]);assert.deepEqual(r.calls[2],['eq',key,'current-user']);assert.ok(r.calls.find(call=>call[0]==='signal')[1] instanceof AbortSignal);}
});
test('failed photo reads are optional while successful empty reads explicitly clear the image',async()=>{
 assert.equal(await reader({data:null,error:{message:'offline'}}).loadProfileAvatar('u','parent'),undefined);assert.equal(await reader(new Error('offline')).loadProfileAvatar('u','teacher'),undefined);assert.equal(await reader({data:null,error:null}).loadProfileAvatar('u','parent'),null);
});
