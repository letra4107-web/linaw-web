import test from 'node:test';
import assert from 'node:assert/strict';
import {loadTs} from './helpers/load-ts.mjs';

const profile={userId:'parent-1',role:'parent',displayName:'QA Magulang',email:'parent@example.test'};
function harness({missingMethod=false,revokeError=null,auditFails=false,avatar=undefined}={}){
 const saved=[],removed=[],revoked=[];let cleared=false;
 const auth={getSession:async()=>({data:{session:{refresh_token:'latest-rotated-ticket'}}}),signOut:async options=>{revoked.push(options);return {error:revokeError};}};
 if(!missingMethod)auth._removeSession=async()=>{cleared=true;};
 const {softSignOut}=loadTs('src/lib/auth/softSignOut.ts',{
  '../supabaseClient':{supabase:{auth}},
  './savedProfiles':{saveAuthProfile:p=>saved.push(p),removeSavedProfile:id=>removed.push(id)},
  './authEvents':{recordAuthEvent:async()=>{if(auditFails)throw new Error('offline audit');}},
  './profileAvatar':{loadProfileAvatar:async()=>avatar},
 });
 return {softSignOut,saved,removed,revoked,cleared:()=>cleared};
}
test('profile logout saves the current rotated ticket and clears local auth without revoking it',async()=>{
 const h=harness();await h.softSignOut(profile);
 assert.equal(h.cleared(),true);assert.equal(h.revoked.length,0);
 assert.deepEqual(JSON.parse(JSON.stringify(h.saved)),[{...profile,refreshToken:'latest-rotated-ticket'}]);
});
test('a failed audit cannot prevent profile logout',async()=>{
 const h=harness({auditFails:true});await h.softSignOut(profile);assert.equal(h.cleared(),true);
});
test('logout saves the uploaded profile photo before clearing authentication',async()=>{
 const avatar='https://example.test/parent-avatars/parent-1/photo.png';const h=harness({avatar});await h.softSignOut(profile);
 assert.equal(h.saved[0].avatarUrl,avatar);assert.equal(h.cleared(),true);assert.equal(h.revoked.length,0);
});
test('an explicitly removed photo is saved as null',async()=>{
 const h=harness({avatar:null});await h.softSignOut(profile);assert.equal(h.saved[0].avatarUrl,null);
});
test('revoking fallback removes a saved ticket that no longer works',async()=>{
 const h=harness({missingMethod:true});await h.softSignOut(profile);
 assert.equal(h.revoked[0].scope,'local');assert.deepEqual(h.removed,[profile.userId]);
});
test('failed fallback sign-out reports failure instead of pretending to log out',async()=>{
 const h=harness({missingMethod:true,revokeError:new Error('offline')});
 await assert.rejects(h.softSignOut(profile),/offline/);assert.deepEqual(h.removed,[]);
});
