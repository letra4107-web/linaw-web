const test=require('node:test'),assert=require('node:assert/strict');
const {childEnrollmentEmail,teacherAccountEmail,passwordResetEmail}=require('../lib/emailTemplates');
test('student and teacher credentials are escaped, selectable and rendered with the shared branded email layout',()=>{
 const password='A<&"123456',username='learner@example.test',childName='<img src=x onerror=alert(1)>';
 for(const html of [childEnrollmentEmail({childName,gradeLevel:1,readingLevel:'Beginner',username,password}),passwordResetEmail({childName,username,password}),teacherAccountEmail({name:childName,email:username,password,verificationCode:'00123456'})]){
  assert.match(html,/class="email-shell"/);assert.match(html,/LinawLetra/);assert.match(html,/&lt;img/);assert.match(html,/A&lt;&amp;&quot;123456/);assert.match(html,/learner@example.test/);
  assert.doesNotMatch(html,/<(?:script|form|img)\b/i);assert.match(html,/role="presentation"/);
 }
});
