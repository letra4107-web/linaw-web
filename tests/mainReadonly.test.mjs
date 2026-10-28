import test from 'node:test';
import assert from 'node:assert/strict';
import {validateMainReadonlyConfig,assertReaderContext,integrityScope,INTEGRITY_TABLES,READER_ROLE} from '../scripts/qa-main-readonly-lib.mjs';

test('Main verifier refuses incomplete or disabled connection setup before networking',()=>{
  assert.throws(()=>validateMainReadonlyConfig({},'testref'),/incomplete/);
  const env={MAIN_DATABASE_HOST:'db.testref.supabase.co',MAIN_DATABASE_USER:READER_ROLE,MAIN_DATABASE_PASSWORD:'synthetic',MAIN_EXPECTED_PROJECT_REF:'testref',MAIN_DATABASE_CA_FILE:'not-read'};
  assert.throws(()=>validateMainReadonlyConfig(env,'testref'),/not been enabled/);
});
test('Main verifier rejects administrator identities, wrong targets and transaction pooler configuration',()=>{
  const env={MAIN_READONLY_VERIFICATION_ENABLED:'true',MAIN_DATABASE_HOST:'db.testref.supabase.co',MAIN_DATABASE_USER:READER_ROLE,MAIN_DATABASE_PASSWORD:'synthetic',MAIN_EXPECTED_PROJECT_REF:'testref',MAIN_DATABASE_CA_FILE:'not-read'};
  for(const patch of [{MAIN_DATABASE_USER:'postgres'},{MAIN_DATABASE_USER:'service_role'},{MAIN_EXPECTED_PROJECT_REF:'otherref'},{MAIN_DATABASE_HOST:'db.evil.example'},{MAIN_DATABASE_PORT:'6543'}])assert.throws(()=>validateMainReadonlyConfig({...env,...patch},'testref'));
});
const reader={current_role:READER_ROLE,login_role:READER_ROLE,transaction_read_only:'on',row_security:'on',rolsuper:false,rolbypassrls:false,rolcreatedb:false,rolcreaterole:false,rolreplication:false,privileged_membership:false};
test('Main verifier rejects actual elevated roles, impersonated sessions and writable transactions',()=>{
  assert.doesNotThrow(()=>assertReaderContext(reader));
  for(const patch of [{rolsuper:true},{rolbypassrls:true},{rolcreaterole:true},{rolcreatedb:true},{privileged_membership:true},{login_role:'postgres'},{transaction_read_only:'off'},{row_security:'off'}])assert.throws(()=>assertReaderContext({...reader,...patch}));
});
const visible=INTEGRITY_TABLES.map(table_name=>({table_name,relation_kind:'r',can_select:true,has_write_privilege:false,inherits_owner:false,proven_unfiltered_select:true}));
test('Main integrity checks require proven unfiltered visibility across every joined table',()=>{
  assert.equal(integrityScope(visible).allowed,true);
  assert.equal(integrityScope(visible.slice(1)).allowed,false);
  assert.equal(integrityScope(visible.map((r,i)=>i? r:{...r,proven_unfiltered_select:false})).allowed,false);
  assert.equal(integrityScope(visible.map((r,i)=>i? r:{...r,relation_kind:'v'})).allowed,false);
});
test('Main integrity checks refuse reader ownership or inherited write privileges',()=>{
  for(const patch of [{inherits_owner:true},{has_write_privilege:true},{can_select:false}])assert.equal(integrityScope(visible.map((r,i)=>i?r:{...r,...patch})).allowed,false);
});
