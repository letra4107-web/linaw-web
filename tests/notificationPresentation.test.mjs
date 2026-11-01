import test from 'node:test';
import assert from 'node:assert/strict';
import {notificationPresentation,matchesNoticeFilter} from '../src/pages/parent/notificationPresentation.ts';
const row=(type,title='Update',body=null)=>({id:'n',type,title,body,message:null,is_read:false,read:false,created_at:'2026-10-30T00:00:00Z'});
test('completed learning, scores and motivation appear in the Progress filter',()=>{
 for(const item of [row('lesson','Nakumpleto ang Pagbasa'),row('assessment_graded'),row('practice'),row('xp'),row('streak')])assert.equal(matchesNoticeFilter(item,'progress'),true);
 assert.equal(notificationPresentation(row('streak')).label,'Motibasyon');
});
test('new available lessons stay System while assignments and appointments are scheduled',()=>{
 assert.equal(notificationPresentation(row('lesson','May Bagong Aralin')).group,'system');
 assert.equal(notificationPresentation(row('student_login')).group,'system');
 for(const type of ['pdf_assignment','scheduled_activity','schedule','reminder','appointment'])assert.equal(matchesNoticeFilter(row(type),'schedule'),true);
});
test('explicit teacher replies and legacy message notices share the Messages category',()=>{
 for(const item of [row('teacher_message'),row('parent_teacher_reply'),row('legacy','Bagong Mensahe mula sa Guro')]){
  assert.equal(matchesNoticeFilter(item,'messages'),true);assert.equal(notificationPresentation(item).label,'Mensahe');
 }
 assert.equal(notificationPresentation(row('legacy','Iba pang abiso')).group,'system');
});
test('category counts partition actual rows; unread counts remain independent of category',()=>{
 const items=[row('student_login'),row('pdf_assignment'),row('lesson','Nakumpleto ang Pagbasa'),{...row('teacher_message'),is_read:true,read:true}];
 const counts=['progress','schedule','messages','system'].map(filter=>items.filter(item=>matchesNoticeFilter(item,filter)).length);
 assert.deepEqual(counts,[1,1,1,1]);assert.equal(items.filter(item=>matchesNoticeFilter(item,'all')).length,4);assert.equal(items.filter(item=>matchesNoticeFilter(item,'unread')).length,3);
});
