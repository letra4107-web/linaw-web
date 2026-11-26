import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './helpers/load-ts.mjs';

function notificationsHarness() {
  let rows = [{id:'one',is_read:false,read:false},{id:'two',is_read:true,read:true}];
  const mutations=[],calls=[];
  const cache={cancelQueries:async()=>calls.push('cancel'),getQueryData:()=>rows,setQueryData:(_key,next)=>{rows=typeof next==='function'?next(rows):next;},invalidateQueries:async()=>calls.push('invalidate')};
  const { useNotifications }=loadTs('src/lib/useNotifications.ts',{
    react:{useEffect(){}},
    '@tanstack/react-query':{useQueryClient:()=>cache,useQuery:()=>({data:rows,isLoading:false}),useMutation:options=>{mutations.push(options);return options;}},
    './supabaseClient':{supabase:{}},'./auth/AuthContext':{useAuth:()=>({user:{id:'teacher'},identity:{role:'teacher'}})},
    './api':{api:async(path)=>calls.push(path)},
    './notificationPreferences':{showParentInAppNotice:()=>true,showTeacherInAppNotice:()=>true},
    './teacher/useTeacherPreferences':{useTeacherPreferences:()=>({preferences:{notices:{}}})},
  });
  useNotifications();return {mutation:mutations[1],rows:()=>rows,calls};
}
test('mark all read updates immediately and restores unread flags when persistence fails',async()=>{
 const h=notificationsHarness(),previous=h.rows();const context=await h.mutation.onMutate();
 assert.equal(h.rows().every(row=>row.is_read&&row.read),true);
 h.mutation.onError(new Error('offline'),undefined,context);assert.equal(h.rows(),previous);assert.equal(h.rows()[0].is_read,false);
 await h.mutation.onSettled();assert.deepEqual(h.calls,['cancel','invalidate']);
});
test('mark all read persists once and reconciles with the server without keeping the button pending on refetch',async()=>{
 const h=notificationsHarness();await h.mutation.onMutate();await h.mutation.mutationFn();assert.equal(h.mutation.onSettled(),undefined);assert.deepEqual(h.calls,['cancel','/notifications/read-all','invalidate']);
});
test('known authentication failures identify the actual account or password problem',()=>{
 const {tagalogError}=loadTs('src/lib/validationMessages.ts');
 assert.match(tagalogError({code:'user_not_found'}),/email/);
 assert.match(tagalogError({code:'invalid_password'}),/kasalukuyang password/);
 assert.match(tagalogError({code:'account_disabled'}),/Naka-disable/);
 assert.match(tagalogError({code:'invalid_credentials'}),/email o password/);
});
