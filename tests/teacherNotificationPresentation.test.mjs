import test from 'node:test';
import assert from 'node:assert/strict';
import {loadTs} from './helpers/load-ts.mjs';
const {teacherNoticePresentation,teacherNoticeText,teacherNoticeDateMatches}=loadTs('src/lib/teacher/notificationPresentation.ts');
const plain=value=>JSON.parse(JSON.stringify(value));
test('teacher notices map only supported types to existing protected destinations',()=>{
 for(const type of ['parent_teacher_reply','teacher_message','admin_message','school_message'])assert.deepEqual(plain(teacherNoticePresentation(type)),{group:'messages',label:'Mensahe',destination:'/teacher/messages'});
 assert.equal(teacherNoticePresentation('practice').destination,'/teacher/progress-reports');assert.equal(teacherNoticePresentation('pdf_assignment').destination,'/teacher/students');assert.equal(teacherNoticePresentation('new_lesson').destination,'/teacher/lessons');assert.equal(teacherNoticePresentation('security_alert').destination,'/teacher/profile');assert.equal(teacherNoticePresentation('https://example.invalid').destination,null);
});
test('reply subject and full content come from the existing trigger without invented text',()=>{
 const text='Tungkol kay QA Bata Uno: Ma’am, may tanong po ako: paano? 😊';assert.deepEqual(plain(teacherNoticeText({body:text,message:text})),{subject:'Tungkol kay QA Bata Uno',detail:'Ma’am, may tanong po ako: paano? 😊',extra:null});
 assert.deepEqual(plain(teacherNoticeText({body:'Tungkol kay Bata: Isang linya\nAt isa pa',message:'Iba pang detalye'})),{subject:'Tungkol kay Bata',detail:'Isang linya\nAt isa pa',extra:'Iba pang detalye'});
});
test('ordinary, empty and HTML-like notice content remains complete plain text',()=>{
 for(const text of ['Karaniwang update','<img src=x onerror=alert(1)>'])assert.deepEqual(plain(teacherNoticeText({body:text,message:null})),{subject:null,detail:text,extra:null});assert.equal(teacherNoticeText({body:' ',message:'Mula sa message'}).detail,'Mula sa message');assert.equal(teacherNoticeText({body:null,message:null}).detail,'');
});
test('date filters use Manila calendar boundaries rather than the host timezone',()=>{
 const now=Date.parse('2026-11-01T16:10:00Z');assert.equal(teacherNoticeDateMatches('2026-11-01T16:00:00Z','today',now),true);assert.equal(teacherNoticeDateMatches('2026-11-01T15:59:59Z','today',now),false);assert.equal(teacherNoticeDateMatches('2026-10-26T16:00:00Z','7',now),true);assert.equal(teacherNoticeDateMatches('2026-10-26T15:59:59Z','7',now),false);
});
test('limited date periods exclude invalid or future dates while All retains old records',()=>{
 const now=Date.parse('2026-11-01T08:00:00Z');assert.equal(teacherNoticeDateMatches('2026-10-02T16:00:00Z','30',now),true);assert.equal(teacherNoticeDateMatches('2026-10-02T15:59:59Z','30',now),false);assert.equal(teacherNoticeDateMatches('bad','7',now),false);assert.equal(teacherNoticeDateMatches('2026-11-02T08:00:00Z','7',now),false);assert.equal(teacherNoticeDateMatches('2001-01-01','all',now),true);assert.equal(teacherNoticeDateMatches('bad','all',now),true);
});
