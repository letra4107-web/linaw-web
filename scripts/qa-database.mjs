import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';

// The embedded PostgreSQL dependency installs exit hooks that can turn a
// failing worker's exit into 0. Keep the verifier outside that dependency.
const evidenceDir=process.env.QA_EVIDENCE_DIR || 'docs/qa/evidence/phase3';
const started=Date.now();
const runId=randomUUID();
const worker=spawn(process.execPath,[path.resolve('scripts/qa-database-worker.mjs')],{stdio:'inherit',windowsHide:true,env:{...process.env,QA_EVIDENCE_DIR:evidenceDir,QA_DB_RUN_ID:runId}});
let result;
try{
  const exitCode=await new Promise((resolve,reject)=>{worker.once('error',reject);worker.once('exit',resolve);});
  const evidence=JSON.parse(fs.readFileSync(path.join(evidenceDir,'database.json'),'utf8'));
  const fresh=Date.parse(evidence.timestamp)>=started;
  const matchingRun=evidence.runId===runId;
  const success=exitCode===0&&fresh&&matchingRun&&evidence.rows.length>=28&&evidence.rows.some(row=>row.id==='DB-028')&&new Set(evidence.rows.map(row=>row.id)).size===evidence.rows.length&&evidence.rows.every(row=>row.status==='PASS');
  result={timestamp:new Date().toISOString(),runId,workerExitCode:exitCode,freshEvidence:fresh,matchingRun,cases:evidence.rows.length,status:success?'PASS':'FAIL',scope:'Worker status and fresh matching-run JSON assertions both required; exit 0 alone is insufficient.'};
}catch(error){result={timestamp:new Date().toISOString(),status:'FAIL',actual:error.message};}
fs.mkdirSync(evidenceDir,{recursive:true});
fs.writeFileSync(path.join(evidenceDir,'database-runner.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
if(result.status!=='PASS')process.exitCode=1;
