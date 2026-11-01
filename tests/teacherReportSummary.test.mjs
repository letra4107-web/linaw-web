import test from 'node:test';
import assert from 'node:assert/strict';
import {loadTs} from './helpers/load-ts.mjs';
const {buildReportRows,startOfManilaWeek,reportCohort,reportGraph,reportDistribution}=loadTs('src/lib/teacher/reportSummary.ts');
const plain=value=>JSON.parse(JSON.stringify(value));
const roster=(id,grade=1)=>({id:'link-'+id,student_id:id,assigned_at:'2026-10-01T00:00:00Z',children:{id,name:id,grade_level:grade,username:id}});
const progress=(id,accuracy=80,total_attempts=2,activities_completed=1,level='Beginner')=>({child_id:id,accuracy_sum:accuracy*total_attempts,total_attempts,activities_completed,level,xp:0,streak:0});
test('report rows match progress by child and use latest activity regardless of order',()=>{
 const rows=buildReportRows([roster('a'),roster('b')],[progress('b',60),progress('a',90)],[{student_id:'a',created_at:'2026-10-30T09:00:00Z'},{student_id:'a',created_at:'2026-10-01T09:00:00Z'}]);
 assert.equal(rows[0].accuracy,90);assert.equal(rows[1].accuracy,60);assert.equal(rows[0].lastActivity,'2026-10-30T09:00:00Z');assert.equal(rows[1].lastActivity,undefined);
});
test('unattempted learners never require support and missing levels retain the existing default',()=>{
 const rows=buildReportRows([roster('a'),roster('b'),roster('c'),roster('d')],[progress('a',0,0),progress('b',69),progress('c',70,2,1,null)],[]);
 assert.deepEqual(plain(rows.map(r=>r.needsAttention)),[false,true,false,false]);assert.equal(rows[2].level,'Beginner');assert.equal(rows[3].item,undefined);
});
test('report scores retain rounded cumulative accuracy at thresholds',()=>{
 const rows=buildReportRows([roster('a')],[{...progress('a'),accuracy_sum:159,total_attempts:2}],[]);
 assert.equal(rows[0].accuracy,80);assert.equal(rows[0].needsAttention,false);
});
test('Manila weekly totals start Monday at local midnight, including Sunday and rollover',()=>{
 assert.equal(new Date(startOfManilaWeek(Date.parse('2026-11-01T12:00:00Z'))).toISOString(),'2026-10-25T16:00:00.000Z');
 assert.equal(new Date(startOfManilaWeek(Date.parse('2026-11-01T16:00:00Z'))).toISOString(),'2026-11-01T16:00:00.000Z');
});
test('period cohorts filter recent activity inclusively while leaving cumulative scores intact',()=>{
 const now=Date.parse('2026-11-01T08:00:00Z');const list=['a','b','c','d','e'].map(id=>roster(id));
 const rows=buildReportRows(list,list.map(r=>progress(r.student_id,80,r.student_id==='e'?0:2)),[{student_id:'a',created_at:'2026-10-25T08:00:00Z'},{student_id:'b',created_at:'2026-10-05T08:00:00Z'},{student_id:'c',created_at:'2026-11-02T08:00:00Z'},{student_id:'e',created_at:'2026-11-01T08:00:00Z'}]);
 assert.deepEqual(plain(reportCohort(rows,'7',now).map(r=>r.student_id)),['a']);assert.deepEqual(plain(reportCohort(rows,'30',now).map(r=>r.student_id)),['a','b']);assert.equal(reportCohort(rows,'all',now).length,4);assert.equal(reportCohort(rows,'7',now)[0].accuracy,80);
});
test('graph retains class-relative activity and attempt calculations per grade',()=>{
 const rows=buildReportRows([roster('a',0),roster('b',1),roster('c',1)],[progress('a',90,4,4),progress('b',60,2,2),progress('c',80,4,0)],[]);
 const graph=plain(reportGraph(rows));assert.deepEqual(graph[0].groups,[{grade:0,value:90},{grade:1,value:70}]);assert.deepEqual(graph[1].groups,[{grade:0,value:100},{grade:1,value:25}]);assert.deepEqual(graph[2].groups,[{grade:0,value:100},{grade:1,value:75}]);
});
test('graph supports all grades and handles no records or zero denominators',()=>{
 assert.deepEqual(plain(reportGraph([])),['Accuracy','Completion','Practice'].map(metric=>({metric,groups:[]})));
 const rows=buildReportRows([0,1,2,3,4,5,6].map(g=>roster(String(g),g)),[],[]);assert.equal(reportGraph(rows)[0].groups.length,7);assert.ok(reportGraph(rows).every(metric=>metric.groups.every(g=>g.value===0)));
});
test('reading distribution includes additional levels without double counting letter casing',()=>{
 const rows=buildReportRows(['a','b','c','d'].map(id=>roster(id)),[progress('a',80,2,1,'beginner'),progress('b',80,2,1,'Early'),progress('c',80,2,1,'Advanced')],[]);
 const distribution=reportDistribution(rows);assert.equal(distribution.reduce((n,r)=>n+r.value,0),4);assert.equal(distribution.find(r=>r.name==='Beginner').value,2);assert.equal(distribution.find(r=>r.name==='Early').value,1);assert.equal(distribution.filter(r=>r.name.toLowerCase()==='beginner').length,1);
});
