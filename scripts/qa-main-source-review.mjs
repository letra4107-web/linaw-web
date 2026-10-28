import fs from 'node:fs';
import {execFileSync,spawnSync} from 'node:child_process';

const dir='docs/qa/evidence/main-post-migration';
const health=JSON.parse(fs.readFileSync(`${dir}/public-backend-status.json`,'utf8'));
const result={timestamp:new Date().toISOString(),scope:'Read-only local Git comparison against the commit self-reported by deployed health. No platform artifact or deployment-log access, RPC execution or authenticated production request.'};
try{
  const sha=health.knownDeployedCommit;
  if(!/^[a-f0-9]{40}$/.test(sha||''))throw new Error('No usable deployed commit object.');
  result.declaredCommit=sha;
  const scan=spawnSync('git',['grep','-l','-E','class_sections|section_students|assign_section_students|validate_section_student',sha,'--','server','src'],{encoding:'utf8',windowsHide:true});
  if(scan.status!==0&&scan.status!==1)throw new Error('Declared source scan could not run.');
  result.declaredSectionReferences=scan.stdout.trim().split(/\r?\n/).filter(Boolean);
  const oldAdmin=execFileSync('git',['show',`${sha}:server/routes/admin.js`],{encoding:'utf8',stdio:['ignore','pipe','ignore']});
  result.declaredSectionRoutes=[...oldAdmin.matchAll(/router\.(get|post|patch|delete|put)\(\s*['"]([^'"]+)['"]/g)].filter(match=>match[2].includes('section')).map(match=>({method:match[1],path:match[2]}));
  const parent=execFileSync('git',['show',`${sha}:server/routes/parent.js`],{encoding:'utf8',stdio:['ignore','pipe','ignore']});
  result.declaredEnrollmentReferencesChangedSectionObjects=/class_sections|section_students|assign_section_students|validate_section_student/.test(parent);
  const oldPackage=JSON.parse(execFileSync('git',['show',`${sha}:server/package.json`],{encoding:'utf8',stdio:['ignore','pipe','ignore']}));
  const localPackage=JSON.parse(fs.readFileSync('server/package.json','utf8'));
  result.packageSpecifications=Object.fromEntries(['@supabase/supabase-js','express','multer','nodemailer'].map(name=>[name,{declared:oldPackage.dependencies?.[name],local:localPackage.dependencies?.[name]}]));
  result.localAssignment={rpc:'public.assign_section_students(uuid,uuid[],uuid)',response:'JSON {success:true}',validationStatus:400,missingSectionStatus:404,serializationOrDeadlockStatus:409,unexpectedFailureStatus:500};
  result.finding=result.declaredSectionReferences.length===0?'No direct reference to either changed function or the section tables exists in the declared server/src tree. This does not attest the exact running image.':'Section references require handler-level review.';
  result.limitations=['Health metadata is not a cryptographic attestation of the running image.','No authenticated main section assignment, enrollment or serialization test was executed.','Package specifications do not prove installed lockfile state or a current vulnerability audit.','Migration 048 still affects any direct/database caller inserting or updating section_students, even if the declared backend has no such caller.'];
}catch(error){result.status='BLOCKED';result.reason=error.message;}
fs.writeFileSync(`${dir}/source-compatibility.json`,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
