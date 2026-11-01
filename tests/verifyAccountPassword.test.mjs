import test from 'node:test';
import assert from 'node:assert/strict';
import {loadTs} from './helpers/load-ts.mjs';
function fixture({id='teacher-1',error=null,throws=false}={}){
 const calls=[],clients=[];
 const createClient=(url,key,options)=>{const index=clients.length;const client={auth:{signInWithPassword:async input=>{calls.push({method:'password',index,input});if(throws)throw new Error('offline');return {data:{user:{id}},error};},signOut:async options=>{calls.push({method:'logout',index,options});return {error:null};}}};clients.push({url,key,options,client});return client;};
 const module=loadTs('src/lib/supabaseClient.ts',{'@supabase/supabase-js':{createClient}},{crypto:{randomUUID:()=> 'unique-check'}},{transformSource:source=>source.replaceAll('import.meta.env.VITE_SUPABASE_URL',"'https://example.invalid'").replaceAll('import.meta.env.VITE_SUPABASE_ANON_KEY',"'public-test-key'")});return {...module,calls,clients};
}
test('password verification isolates auth storage and leaves the main browser client untouched',async()=>{
 const f=fixture();await f.verifyAccountPassword('teacher@example.invalid','FakePassword!8','teacher-1');assert.equal(f.clients.length,2);assert.equal(f.clients[1].options.auth.persistSession,false);assert.equal(f.clients[1].options.auth.autoRefreshToken,false);assert.equal(f.clients[1].options.auth.detectSessionInUrl,false);assert.notEqual(f.clients[0].options.auth.storageKey,f.clients[1].options.auth.storageKey);assert.ok(f.calls.every(call=>call.index===1));assert.equal(f.calls[1].options.scope,'local');
});
test('invalid password and unexpected identity are rejected and ephemeral sessions cleaned up',async()=>{
 for(const options of [{error:new Error('invalid')},{id:'other-user'}]){const f=fixture(options);await assert.rejects(f.verifyAccountPassword('teacher@example.invalid','wrong','teacher-1'),/Hindi tama/);assert.equal(f.calls.at(-1).method,'logout');assert.equal(f.calls.at(-1).options.scope,'local');}
});
test('network failure cannot leave the password-check client signed in or update the main account',async()=>{
 const f=fixture({throws:true});await assert.rejects(f.verifyAccountPassword('teacher@example.invalid','password','teacher-1'),/offline/);assert.deepEqual(f.calls.map(call=>call.method),['password','logout']);assert.ok(f.calls.every(call=>call.index===1));
});
