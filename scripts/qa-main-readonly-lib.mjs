import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

export const READER_ROLE='linawletra_safety_reader';
export const INTEGRITY_TABLES=['children','class_sections','section_students','teacher_profiles','teacher_student_links','users'];
export function parsePrivateEnv(file){
  return Object.fromEntries(fs.readFileSync(file,'utf8').split(/\r?\n/).flatMap(line=>{
    const match=line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    return match?[[match[1],match[2].replace(/^(['"])(.*)\1$/,'$2')]]:[];
  }));
}
export function validateMainReadonlyConfig(env,knownRef){
  const required=['MAIN_DATABASE_HOST','MAIN_DATABASE_USER','MAIN_DATABASE_PASSWORD','MAIN_EXPECTED_PROJECT_REF','MAIN_DATABASE_CA_FILE'];
  if(required.some(name=>!env[name]))throw new Error('Private read-only connection configuration is incomplete.');
  if(env.MAIN_READONLY_VERIFICATION_ENABLED!=='true')throw new Error('Read-only verification has not been enabled in the private file.');
  const ref=env.MAIN_EXPECTED_PROJECT_REF;
  if(!/^[a-z0-9]+$/.test(ref)||!knownRef||ref!==knownRef)throw new Error('Target project does not match the main application project.');
  const host=env.MAIN_DATABASE_HOST.toLowerCase();
  const direct=host===`db.${ref}.supabase.co`&&env.MAIN_DATABASE_USER===READER_ROLE;
  const pooler=/^[a-z0-9.-]+\.pooler\.supabase\.com$/.test(host)&&env.MAIN_DATABASE_USER===`${READER_ROLE}.${ref}`;
  if(!direct&&!pooler)throw new Error('Only the pinned main-project host with the dedicated reader login is accepted.');
  if(String(env.MAIN_DATABASE_PORT||'5432')!=='5432'||(env.MAIN_DATABASE_NAME||'postgres')!=='postgres')throw new Error('Use direct or session-pooler port 5432 and database postgres.');
  return {host,port:5432,database:'postgres',user:env.MAIN_DATABASE_USER,password:env.MAIN_DATABASE_PASSWORD,
    ssl:{rejectUnauthorized:true,ca:fs.readFileSync(path.resolve(env.MAIN_DATABASE_CA_FILE),'utf8')},
    application_name:'linawletra_readonly_safety_verifier',connectionTimeoutMillis:10000,query_timeout:15000,
    options:'-c default_transaction_read_only=on -c row_security=on -c statement_timeout=10000 -c lock_timeout=2000'};
}
export function assertReaderContext(context){
  if(context.current_role!==READER_ROLE||context.login_role!==READER_ROLE||context.transaction_read_only!=='on'||context.row_security!=='on'
    ||context.rolsuper||context.rolbypassrls||context.rolcreatedb||context.rolcreaterole||context.rolreplication||context.privileged_membership){
    throw new Error('Connection is not the dedicated non-privileged reader in an enforced read-only transaction.');
  }
}
export function integrityScope(tables){
  if(INTEGRITY_TABLES.some(name=>!tables.some(row=>row.table_name===name)))return {allowed:false,reason:'A required integrity table is absent from catalog metadata.'};
  if(tables.some(row=>!['r','p'].includes(row.relation_kind)))return {allowed:false,reason:'Integrity checks require base tables, not filtered views or foreign tables.'};
  if(tables.some(row=>!row.can_select||row.has_write_privilege||row.inherits_owner))return {allowed:false,reason:'SELECT scope is missing or the reader has unexpected write/ownership privileges.'};
  if(tables.some(row=>!row.proven_unfiltered_select))return {allowed:false,reason:'Existing RLS policies do not prove unfiltered visibility across all joined tables; zero counts or missing joins would not establish global integrity.'};
  return {allowed:true,reason:'Existing catalog permissions/policies prove unfiltered SELECT without ownership or BYPASSRLS.'};
}
export function expectedBodies(){
  const bodies={};
  for(const file of ['migrations/047_atomic_section_assignments.sql','migrations/048_section_capacity_snapshot_safety.sql']){
    const sql=fs.readFileSync(file,'utf8');
    for(const match of sql.matchAll(/CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.(\w+)[\s\S]*?\bAS\s*\$\$([\s\S]*?)\$\$;/gi)){
      bodies[match[1]]=createHash('md5').update(match[2].replaceAll('\r','').trim()).digest('hex');
    }
  }
  return bodies;
}
export function evaluateCatalog(catalog){
  const rows=[],add=(id,scenario,ok,actual)=>rows.push({id,scenario,status:ok?'PASS':'FAIL',actual});
  const hashes=expectedBodies();
  for(const [name,args,result] of [['assign_section_students','uuid, uuid[], uuid','jsonb'],['validate_section_student','','trigger']]){
    const found=catalog.functions.filter(fn=>fn.proname===name);
    const fn=found[0];
    add(`MAIN-${name}-signature`,'Required function exists once with the expected signature',found.length===1&&fn.argument_types===args&&fn.result_type===result&&fn.default_arguments===0,found.length===1?`${fn.argument_types} -> ${fn.result_type}`:`${found.length} overloads found`);
    add(`MAIN-${name}-body`,'Applied body matches the local migration body (line endings normalized)',found.length===1&&fn.body_md5===hashes[name],found.length===1&&fn.body_md5===hashes[name]?'Expected body fingerprint matches':'Missing or different body; formatting differences also require manual review');
    add(`MAIN-${name}-security`,'Function security and search_path remain compatible',found.length===1&&fn.security_definer&&fn.language==='plpgsql'&&fn.function_settings?.includes('search_path=public, pg_temp'),fn?.function_settings?.join('; ')||'Missing required metadata');
    if(name==='assign_section_students')add('MAIN-assignment-rpc-grants','Assignment RPC is service-role-only',found.length===1&&fn.service_execute&&!fn.anon_execute&&!fn.authenticated_execute&&!fn.public_execute&&!fn.reader_execute,'Expected service execute=true; anon/authenticated/PUBLIC/reader=false');
  }
  const trigger=catalog.triggers.filter(t=>t.table_name==='section_students'&&t.trigger_name==='validate_section_student_trigger');
  add('MAIN-section-trigger','Section membership trigger is enabled for INSERT and UPDATE',trigger.length===1&&['O','A'].includes(trigger[0].tgenabled)&&trigger[0].type_mask===23&&trigger[0].argument_count===0&&!trigger[0].has_condition&&trigger[0].function_schema==='public'&&trigger[0].function_name==='validate_section_student',trigger[0]?`type_mask=${trigger[0].type_mask}; enabled=${trigger[0].tgenabled}; function=${trigger[0].function_name}`:'Trigger absent');
  const has=(table,type,columns,referenced,schema='public')=>catalog.constraints.some(c=>c.table_name===table&&c.contype===type&&c.convalidated&&JSON.stringify(c.columns)===JSON.stringify(columns)&&(!referenced||c.referenced_schema===schema&&c.referenced_table===referenced));
  add('MAIN-section-primary-key','Section primary key is validated',has('class_sections','p',['id']),'Expected PRIMARY KEY(id)');
  add('MAIN-section-name-unique','Section name is unique within grade',has('class_sections','u',['grade_level','name']),'Expected UNIQUE(grade_level, name)');
  add('MAIN-section-adviser-fk','Section adviser foreign key is validated',has('class_sections','f',['adviser_id'],'users','auth'),'Expected adviser reference to auth.users; no Auth rows queried');
  add('MAIN-membership-primary-key','Section membership composite primary key is validated',has('section_students','p',['section_id','student_id']),'Expected PRIMARY KEY(section_id, student_id)');
  add('MAIN-membership-foreign-keys','Membership foreign keys exist and are validated',has('section_students','f',['section_id'],'class_sections')&&has('section_students','f',['student_id'],'children'),'Expected section and child foreign keys');
  add('MAIN-roster-unique','Teacher roster pair uniqueness is enforced',has('teacher_student_links','u',['teacher_id','student_id']),'Expected UNIQUE(teacher_id, student_id)');
  add('MAIN-roster-foreign-keys','Teacher roster foreign keys are validated',has('teacher_student_links','f',['teacher_id'],'users','auth')&&has('teacher_student_links','f',['student_id'],'children')&&has('teacher_student_links','f',['assigned_by'],'users','auth'),'Expected Auth/child relationships; Auth-row scans remain outside scope');
  const requiredColumns={class_sections:['id','name','grade_level','adviser_id','capacity'],section_students:['section_id','student_id'],teacher_student_links:['id','teacher_id','student_id']};
  add('MAIN-required-not-null','Required membership/roster/section columns remain non-nullable',Object.entries(requiredColumns).every(([table,columns])=>columns.every(column=>catalog.columns.some(c=>c.table_name===table&&c.column_name===column&&c.attnotnull))),'Required identity, grade and capacity columns must be NOT NULL');
  add('MAIN-section-roster-rls','Section and roster RLS remains enabled',['class_sections','section_students','teacher_student_links'].every(table=>catalog.tables.some(t=>t.table_name===table&&t.relrowsecurity)),'Expected RLS enabled on the three affected tables');
  for(const [column,max] of [['capacity',35],['grade_level',6]]){
    const check=catalog.constraints.some(c=>c.table_name==='class_sections'&&c.contype==='c'&&c.convalidated&&c.columns?.includes(column)&&new RegExp(`${column}>=1.*${column}<=${max}`).test(c.definition.replace(/[\s()"']/g,'')));
    add(`MAIN-section-${column}-bounds`,'Section bounds check exists and is validated',check,`Expected ${column} from 1 to ${max}`);
  }
  return rows;
}
