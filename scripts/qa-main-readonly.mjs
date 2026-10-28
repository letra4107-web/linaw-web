import fs from 'node:fs';
import path from 'node:path';
import pg from './qa-tools/node_modules/pg/lib/index.js';
import {parsePrivateEnv,validateMainReadonlyConfig,assertReaderContext,integrityScope,evaluateCatalog} from './qa-main-readonly-lib.mjs';

// Never imports server/config/supabase, uses service keys, logs connection
// strings, invokes app RPCs, changes roles, or runs migration/operator files.
const evidence='docs/qa/evidence/main-post-migration';
const report={timestamp:new Date().toISOString(),scope:'Main-project catalog inspection and permitted aggregate-only integrity checks in REPEATABLE READ READ ONLY. No migration, write-capable RPC, Auth or Storage operation.',connectionAttempted:false,connected:false,catalogRead:false,aggregatesRead:false,catalogStatus:'BLOCKED',integrityStatus:'BLOCKED',checks:[]};
let client;
try{
  const file=path.resolve(process.argv[2]||'.qa/main-readonly.env');
  if(!fs.existsSync(file))throw new Error('Private read-only connection file is missing.');
  const env=parsePrivateEnv(file);
  const urlLine=fs.readFileSync('server/.env','utf8').split(/\r?\n/).find(line=>/^\s*SUPABASE_URL\s*=/.test(line));
  const mainUrl=urlLine?.slice(urlLine.indexOf('=')+1).trim().replace(/^['"]|['"]$/g,'');
  const knownRef=new URL(mainUrl).hostname.match(/^([a-z0-9]+)\.supabase\.co$/)?.[1];
  const config=validateMainReadonlyConfig(env,knownRef);
  client=new pg.Client(config);report.connectionAttempted=true;await client.connect();report.connected=true;
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const {rows:[context]}=await client.query(`SELECT current_user AS current_role,session_user AS login_role,
    current_setting('transaction_read_only') AS transaction_read_only,current_setting('row_security') AS row_security,
    r.rolsuper,r.rolbypassrls,r.rolcreatedb,r.rolcreaterole,r.rolreplication,
    EXISTS(SELECT 1 FROM pg_roles privileged WHERE privileged.rolname IN ('postgres','service_role','supabase_admin','pg_write_all_data')
      AND pg_has_role(current_user,privileged.oid,'MEMBER')) AS privileged_membership
    FROM pg_roles r WHERE r.rolname=current_user`);
  assertReaderContext(context);report.connection=context;
  const results=await client.query(fs.readFileSync('docs/qa/main-post-migration/catalog.sql','utf8'));
  report.catalogRead=true;
  const keys=['transaction','functions','triggers','constraints','indexes','tables','policies','columns','dependencies'];
  const catalog=Object.fromEntries(keys.map((key,i)=>[key,results[i].rows]));
  fs.mkdirSync('.qa',{recursive:true});fs.writeFileSync('.qa/main-post-migration-catalog.json',JSON.stringify({timestamp:report.timestamp,catalog},null,2),{mode:0o600});
  report.catalogSummary={functions:catalog.functions.map(fn=>({name:fn.proname,argument_types:fn.argument_types,result_type:fn.result_type,body_md5:fn.body_md5})),tableVisibility:catalog.tables,triggerCount:catalog.triggers.length,constraintCount:catalog.constraints.length,indexCount:catalog.indexes.length,policyCount:catalog.policies.length,dependencyCount:catalog.dependencies.length,classSectionTriggers:catalog.triggers.filter(t=>t.table_name==='class_sections'&&!t.tgisinternal).map(t=>({name:t.trigger_name,function:t.function_name,enabled:t.tgenabled}))};
  report.checks=evaluateCatalog(catalog);report.catalogStatus=report.checks.every(row=>row.status==='PASS')?'PASS':'FAIL';
  report.integrityScope=integrityScope(catalog.tables);
  if(report.integrityScope.allowed){const result=await client.query(fs.readFileSync('docs/qa/main-post-migration/integrity.sql','utf8'));report.aggregatesRead=true;report.integrity=result.rows;report.integrityStatus=result.rows.every(row=>row.violations===0)?'PASS':'FAIL';}
  await client.query('ROLLBACK');
}catch(error){report.reason=['ENOENT','ENOTFOUND','ECONNREFUSED','ETIMEDOUT'].includes(error.code)?`Read-only setup/connection unavailable (${error.code}).`:error.message?.startsWith('Private ')||error.message?.startsWith('Read-only ')||error.message?.startsWith('Target ')||error.message?.startsWith('Only ')||error.message?.startsWith('Use ')||error.message?.startsWith('Connection is not')?error.message:'Read-only verification could not complete; inspect private connection configuration and operator-side logs. No connection details or server error payload were published.';}
finally{
  if(client){await client.query('ROLLBACK').catch(()=>{});await client.end().catch(()=>{});}
  fs.mkdirSync(evidence,{recursive:true});fs.writeFileSync(`${evidence}/main-readonly-results.json`,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({catalogStatus:report.catalogStatus,integrityStatus:report.integrityStatus,reason:report.reason,scopeReason:report.integrityScope?.reason}));
  if(report.catalogStatus!=='PASS'||report.integrityStatus!=='PASS')process.exitCode=1;
}
