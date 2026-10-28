import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

const url='https://linawletra-production-409e.up.railway.app/api/health';
const result={timestamp:new Date().toISOString(),scope:'One anonymous GET health request only. No authenticated API, database, Auth or Storage calls.'};
try{
  const response=await fetch(url,{headers:{Origin:'https://linawletra.com'},signal:AbortSignal.timeout(15000),redirect:'error'});
  const body=await response.json();
  result.health={httpStatus:response.status,ok:body.ok,version:body.version,commit:body.commit,apiCompatibilityVersion:body.apiCompatibilityVersion,environment:body.environment,exposeHeaders:response.headers.get('access-control-expose-headers')};
  const sha=typeof body.commit==='string'&&/^[a-f0-9]{7,40}$/i.test(body.commit)?body.commit:null;
  if(sha){try{result.knownDeployedCommit=execFileSync('git',['rev-parse',`${sha}^{commit}`],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();const source=execFileSync('git',['show',`${result.knownDeployedCommit}:server/routes/admin.js`],{encoding:'utf8',stdio:['ignore','pipe','ignore']});const start=source.indexOf("router.post('/sections/:id/students'");const end=source.indexOf('\n});',start);const handler=start<0?'':source.slice(start,end+4);result.deployedSource={provenance:'Local Git object matching the SHA declared by health; platform deployment artifact not independently attested.',assignmentHandlerFound:start>=0,usesAssignmentRpc:handler.includes("rpc('assign_section_students'"),usesMembershipUpsert:handler.includes("from('section_students').upsert"),usesSeparateRosterUpsert:handler.includes("from('teacher_student_links').upsert")};}catch{result.commitSourceAvailable=false;}}
  else result.deployedSource={status:'BLOCKED',reason:'Health exposes no usable commit. Current deployed handler/dependency lockfile cannot be established from a generic version or anonymous 401 response.'};
}catch(error){result.health={status:'BLOCKED',reason:error.name==='TimeoutError'?'Health request timed out':'Public health request failed'};}
const local=fs.readFileSync('server/routes/admin.js','utf8');
result.localSource={usesAssignmentRpc:local.includes("rpc('assign_section_students'"),handlesSerializationConflict:local.includes("['40001', '40P01']"),uncommittedChanges:true};
fs.mkdirSync('docs/qa/evidence/main-post-migration',{recursive:true});
fs.writeFileSync('docs/qa/evidence/main-post-migration/public-backend-status.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
