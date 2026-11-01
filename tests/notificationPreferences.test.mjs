import test from 'node:test';
import assert from 'node:assert/strict';
import {showParentInAppNotice} from '../src/lib/notificationPreferences.ts';
const row=type=>({id:'n',title:'Update',body:null,message:null,type,is_read:false,read:false,created_at:'2026-10-30'});
test('each saved in-app preference controls its matching notification category',()=>{
 for(const [key,types] of Object.entries({progress:['lesson','practice','streak','achievement','xp','assessment_graded','new_lesson'],teacher:['teacher_message','parent_teacher_reply'],schedule:['pdf_assignment','schedule','reminder','appointment'],announcements:['announcement','school_announcement','system_announcement']})){
  for(const type of types){assert.equal(showParentInAppNotice(row(type),{[key]:{inApp:false}}),false);assert.equal(showParentInAppNotice(row(type),{[key]:{inApp:true}}),true);}
 }
});
test('login/security and unknown notices cannot be hidden by optional learning settings',()=>{
 const disabled=Object.fromEntries(['progress','teacher','schedule','announcements'].map(key=>[key,{inApp:false}]));
 for(const type of ['student_login','password_changed','security_alert','future_type'])assert.equal(showParentInAppNotice(row(type),disabled),true);
});
test('missing preferences default to visible; email/SMS values do not suppress in-app notices',()=>{
 assert.equal(showParentInAppNotice(row('lesson')),true);assert.equal(showParentInAppNotice(row('lesson'),null),true);assert.equal(showParentInAppNotice(row('lesson'),{progress:{email:false,sms:false}}),true);
});
