import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

const mobile=path.resolve(process.env.QA_MOBILE_MIGRATIONS_DIR || '../LinawLm/LinawLm/migration/migrations');
const inventory=JSON.parse(fs.readFileSync('docs/qa/source-inventory.json','utf8'));
const calls=inventory.dataAccess.filter(row=>!row.file.includes('/tests/')&&!row.file.includes('/scripts/'));
const literal=target=>target?.match(/^['"]([a-z][a-z0-9_]*)['"]$/)?.[1];
const tables=[...new Set(calls.filter(row=>row.call.endsWith('.from')&&!row.call.includes('storage')).map(row=>literal(row.target)).filter(Boolean))].sort();
const functions=[...new Set(calls.filter(row=>row.call.endsWith('.rpc')).map(row=>literal(row.target)).filter(Boolean))].sort();
const migrations=[];
for(const [stream,dir] of [['web',path.resolve('migrations')],['mobile',mobile]]){
  if(!fs.existsSync(dir))continue;
  for(const name of fs.readdirSync(dir).filter(name=>name.endsWith('.sql')).sort()){
    const content=fs.readFileSync(path.join(dir,name),'utf8');
    migrations.push({id:`${stream}/${name}`,sha256:createHash('sha256').update(content).digest('hex'),bytes:Buffer.byteLength(content),invalidPolicyIfNotExists:/CREATE\s+POLICY\s+IF\s+NOT\s+EXISTS/i.test(content),dataStatements:/^\s*(INSERT|UPDATE|DELETE)\s/im.test(content)});
  }
}
const roots=[['children','id','uuid'],['children','parent_id','uuid'],['children','auth_uid','uuid'],['users','id',null],['child_progress','child_id','uuid'],['users','lastLoginAt',null]];
const sqlLiteral=value=>`'${value.replaceAll("'","''")}'`;
const preflight=`-- READ ONLY. Run only in the separate isolated test project, then retain
-- metadata results privately. Does not execute application RPCs or select rows.
-- Presence is necessary, not proof of policy/role correctness.
BEGIN TRANSACTION READ ONLY;
SELECT expected.name AS required_table, c.oid IS NOT NULL AS present, c.relrowsecurity AS rls_enabled
FROM (VALUES ${tables.map(name=>`(${sqlLiteral(name)})`).join(',')}) expected(name)
LEFT JOIN pg_namespace n ON n.nspname='public'
LEFT JOIN pg_class c ON c.relnamespace=n.oid AND c.relname=expected.name AND c.relkind IN ('r','p')
ORDER BY 1;
SELECT expected.name AS required_rpc, count(p.oid)::int AS overloads,
       array_agg(pg_get_function_identity_arguments(p.oid)) FILTER (WHERE p.oid IS NOT NULL) AS signatures
FROM (VALUES ${functions.map(name=>`(${sqlLiteral(name)})`).join(',')}) expected(name)
LEFT JOIN pg_namespace n ON n.nspname='public'
LEFT JOIN pg_proc p ON p.pronamespace=n.oid AND p.proname=expected.name GROUP BY 1 ORDER BY 1;
SELECT expected.table_name, expected.column_name, expected.expected_type, columns.udt_name AS actual_type,
       columns.column_name IS NOT NULL AND (expected.expected_type IS NULL OR columns.udt_name=expected.expected_type) AS compatible
FROM (VALUES ${roots.map(([table,column,type])=>`(${sqlLiteral(table)},${sqlLiteral(column)},${type?sqlLiteral(type):'NULL'})`).join(',')}) expected(table_name,column_name,expected_type)
LEFT JOIN information_schema.columns ON columns.table_schema='public' AND columns.table_name=expected.table_name AND columns.column_name=expected.column_name ORDER BY 1,2;
SELECT schemaname,tablename,policyname,roles,cmd,qual,with_check FROM pg_policies WHERE schemaname IN ('public','storage') ORDER BY 1,2,3;
SELECT n.nspname,p.proname,p.prosecdef,p.proconfig,array_agg(DISTINCT privileges.grantee) AS grantees
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
LEFT JOIN information_schema.routine_privileges privileges ON privileges.specific_schema=n.nspname AND privileges.specific_name=p.proname||'_'||p.oid::text
WHERE n.nspname='public' GROUP BY n.nspname,p.proname,p.oid,p.prosecdef,p.proconfig ORDER BY 1,2;
ROLLBACK;
`;
fs.mkdirSync('docs/qa/evidence/phase3',{recursive:true});
fs.writeFileSync('docs/qa/ISOLATED_SCHEMA_PREFLIGHT.sql',preflight);
fs.writeFileSync('docs/qa/evidence/phase3/schema-contract.json',JSON.stringify({timestamp:new Date().toISOString(),status:'BLOCKED',scope:'Static dependency/lineage inspection, not a verified complete baseline or migration replay.',reason:'No isolated Supabase project or schema-only authoritative snapshot is configured.',tables,functions,roots,migrations,unresolved:["Mobile 001 contains CREATE POLICY IF NOT EXISTS, unsupported by PostgreSQL.","Mobile 001/002 declare TEXT children and related keys; mobile 017/025 and web UUID foreign keys require the deployed UUID foundation. The conversion is not recorded.","public.users.id type must be measured; UUID-shaped strings do not prove a UUID column. Do not blindly convert it.","Runtime expects case-sensitive users.lastLoginAt, but no tracked creation/addition was found. Its actual definition is required.","Migration numbers overlap between web/mobile and mobile has two 022 files. Use stream-qualified paths and hashes, not a shared numeric ledger.","Web 036/037 and mobile curriculum/data migrations mutate rows. Never replay them automatically on shared or populated databases.","Original 047 has a repeatable-read capacity hole; additive 048 is required. Full Auth/Storage/Realtime behavior remains separately blocked."]},null,2)+'\n');
console.log(JSON.stringify({tables:tables.length,functions:functions.length,migrations:migrations.length,invalidPolicyFiles:migrations.filter(m=>m.invalidPolicyIfNotExists).map(m=>m.id),status:'BLOCKED: authoritative full baseline unavailable'}));
