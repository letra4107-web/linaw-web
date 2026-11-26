const {isUuid}=require('../lib/validation');
const failure=(status,message)=>Object.assign(new Error(message),{status});
async function monitoringLearning(client,userId,{kind='assessments',page=1,childId}={}){
 if(!['assessments','activities'].includes(kind)||!Number.isSafeInteger(page)||page<1||page>100000||(childId&&!isUuid(childId)))throw failure(400,'Hindi wastong filter o pahina.');
 const user=await client.from('users').select('id,role').eq('id',userId).maybeSingle();if(user.error)throw user.error;
 if(!user.data||!['student','parent'].includes(user.data.role))throw failure(404,'Hindi makita ang account.');
 const children=await client.from('children').select('id,name').eq(user.data.role==='parent'?'parent_id':'auth_uid',userId);
 if(children.error)throw children.error;
 const owned=children.data||[];
 if(childId&&!owned.some(child=>child.id===childId))throw failure(404,'Hindi makita ang mag-aaral sa account na ito.');
 const ids=owned.filter(child=>!childId||child.id===childId).map(child=>child.id),pageSize=10;
 if(!ids.length)return {kind,rows:[],page,pageSize,total:0};
 const table=kind==='assessments'?'student_module_assessment_attempts':'pronunciation_practice_sessions';
 const fields=kind==='assessments'
  ?'id,student_id,status,score,passed,pass_percentage_snapshot,started_at,submitted_at,assessment:reading_module_assessments(title,module:reading_modules(title,module_number,level))'
  :'id,student_id,word,accuracy_percentage,is_correct,created_at';
 const date=kind==='assessments'?'started_at':'created_at';
 const result=await client.from(table).select(fields,{count:'exact'}).in('student_id',ids).order(date,{ascending:false}).order('id',{ascending:false}).range((page-1)*pageSize,page*pageSize-1);
 if(result.error)throw result.error;
 const names=new Map(owned.map(child=>[child.id,child.name]));
 const rows=(result.data||[]).map(row=>({...row,studentName:names.get(row.student_id)||'Student'}));
 return {kind,rows,page,pageSize,total:result.count??0};
}
module.exports={monitoringLearning};
