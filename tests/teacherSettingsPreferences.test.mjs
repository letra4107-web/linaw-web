import test from 'node:test';
import assert from 'node:assert/strict';
import {loadTs} from './helpers/load-ts.mjs';
const {parseTeacherPreferences,teacherPreferenceKey}=loadTs('src/lib/teacher/preferences.ts');
const {showTeacherInAppNotice}=loadTs('src/lib/notificationPreferences.ts');
const plain=value=>JSON.parse(JSON.stringify(value));
test('teacher settings accept only supported modes and boolean notification preferences',()=>{
 assert.deepEqual(plain(parseTeacherPreferences('{"theme":"system","notices":{"messages":false,"progress":true,"schedule":"false","unknown":false}}')),{theme:'system',notices:{messages:false,progress:true}});
 for(const raw of ['bad','null','[]','{"theme":"unknown"}'])assert.deepEqual(plain(parseTeacherPreferences(raw)),{});
});
test('teacher preference storage keys are isolated by signed-in account',()=>{
 assert.notEqual(teacherPreferenceKey('teacher-a'),teacherPreferenceKey('teacher-b'));assert.match(teacherPreferenceKey('teacher-a'),/teacher-a$/);
});
test('teacher notification switches affect only their optional in-app category',()=>{
 for(const [category,types] of Object.entries({announcements:['announcement','school_announcement','system_announcement'],messages:['teacher_message','parent_teacher_reply','admin_message','school_message'],schedule:['pdf_assignment','scheduled_activity','schedule','reminder','appointment'],progress:['lesson','practice','streak','xp','achievement','assessment_graded','new_lesson','lesson_available']}))for(const type of types){assert.equal(showTeacherInAppNotice({type},{[category]:false}),false);assert.equal(showTeacherInAppNotice({type},{[category]:true}),true);assert.equal(showTeacherInAppNotice({type}),true);}
});
test('teacher account and security notifications cannot be hidden by optional settings',()=>{
 const preferences={announcements:false,messages:false,schedule:false,progress:false};for(const type of ['account_disabled','password_changed','security_alert','student_login','future_type'])assert.equal(showTeacherInAppNotice({type},preferences),true);
});
