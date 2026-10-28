import fs from 'node:fs';
import assert from 'node:assert/strict';
import {redactConfiguredValues} from './qa-redaction.mjs';

const root='docs/qa',dir='evidence/phase3';
const read=file=>JSON.parse(fs.readFileSync(`${root}/${file}`,'utf8'));
const before=read('phase2/test-results.json');
const cases=new Map(before.cases.map(row=>[row.id,{...row,evidence:row.evidence?`phase2/${row.evidence}`:undefined}]));
const put=row=>cases.set(row.id,row);
for(const [name,prefix] of [['backend','BE'],['frontend','UI']]){
  const previous=new Map(before.cases.filter(row=>row.id.startsWith(prefix+'-')).map(row=>[row.scenario,row]));
  let next=Math.max(...[...previous.values()].map(row=>Number(row.id.split('-')[1]))),count=0;
  const tap=fs.readFileSync(`${root}/${dir}/${name}.tap`,'utf8');
  for(const match of tap.matchAll(/^(not ok|ok) \d+ - (.+)$/gm)){
    const scenario=match[2].replace(/ # SKIP.*$/,''),old=previous.get(scenario),skip=match[2].includes('# SKIP');
    put({id:old?.id||`${prefix}-${String(++next).padStart(3,'0')}`,module:old?.module||`${name} route/unit assertions`,scenario,expected:skip?'Isolated real Supabase/Auth fixtures required':'Named assertions succeed',actual:skip?'Not executed: shared database writes prohibited and isolated services absent':match[1]==='ok'?'Node assertions passed':'Node assertions failed',status:skip?'BLOCKED':match[1]==='ok'?'PASS':'FAIL',evidence:`${dir}/${name}.tap`});count++;
  }
  assert.equal(count,Number(tap.match(/^# tests (\d+)$/m)?.[1]),`${name} declared TAP count`);
}
const browsers={};
for(const file of ['local-edge','local-chromium','local-firefox','live-edge']){
  const result=read(`${dir}/${file}.json`);browsers[file]=result;
  for(const row of result.rows)put({...row,evidence:`${dir}/${file}.json`});
}
for(const [browser,file] of [['Chrome','local-chromium'],['Firefox','local-firefox']]){
  const result=browsers[file],success=result.rows.length===58&&result.rows.every(row=>row.status==='PASS');
  put({id:`COMPAT-${browser}`,module:'Compatibility summary',scenario:`Public functional browser suite in ${browser}`,expected:'All 58 local assertions pass',actual:`${result.version}: ${result.rows.filter(row=>row.status==='PASS').length}/${result.rows.length} passed; derived from the listed browser cases, not another independent execution`,status:success?'PASS':result.rows.some(row=>row.status==='FAIL')?'FAIL':'BLOCKED',evidence:`${dir}/${file}.json`});
}
const database=read(`${dir}/database.json`),runner=read(`${dir}/database-runner.json`);
assert.equal(runner.runId,database.runId,'Database evidence must match the verified worker run');
for(const row of database.rows)put({...row,evidence:`${dir}/database.json`});
for(const row of read(`${dir}/deployed-public-http.json`).rows)put({...row,scenario:row.url,evidence:`${dir}/deployed-public-http.json`});
const gates=read(`${dir}/check-summary.json`);
for(const gate of gates.filter(row=>!['backend','frontend'].includes(row.name)))put({id:`GATE-${gate.name}`,module:'Build/static checks',scenario:gate.name,expected:'Exit 0; lint denies warnings',actual:`Exit ${gate.exitCode}; ${gate.durationMs} ms`,status:gate.exitCode===0?'PASS':'FAIL',evidence:`${dir}/${gate.name}.txt`});
for(const old of before.cases.filter(row=>row.status==='BLOCKED')){
  const row=cases.get(old.id);if(row.status==='BLOCKED')row.evidence='BLOCKED_TEST_REQUIREMENTS.md; SAFE_TEST_ENVIRONMENT.md; SCHEMA_BASELINE_REVIEW.md';
}
const all=[...cases.values()],summary=Object.fromEntries(['PASS','FAIL','BLOCKED','NOT RUN','NOT IMPLEMENTED'].map(status=>[status,all.filter(row=>row.status===status).length]));
summary.total=all.length;summary.executed=summary.PASS+summary.FAIL;summary.passRate=Number((summary.PASS/summary.executed*100).toFixed(2));
const escape=value=>String(value??'').replace(/\|/g,'\\|').replace(/\r?\n/g,'<br>');
const write=(file,value)=>fs.writeFileSync(`${root}/${file}`,redactConfiguredValues(value));
const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
write('test-results.json',JSON.stringify({date,timestamp:new Date().toISOString(),timezone:'Asia/Manila',summary,baseline:before.summary,phase:3,scope:'Latest stable-ID outcomes; limited local database projection and anonymous browsers. Full Supabase/Auth/dashboard cases remain blocked. Historical dependency audits are retained at their earlier execution date.',cases:all},null,2)+'\n');
write('TEST_CASES.md',`# Actual QA test cases — phase 3\n\nLatest result per stable ID. Previous 555-case results are retained under [phase2](phase2/TEST_CASES.md). A local unit, negative schema probe or selected PostgreSQL pass does not clear a complete blocked workflow. Compatibility summary rows reuse listed browser results; they are not additional independent executions.\n\n| ID | Module | Scenario | Expected | Actual | Status | Evidence |\n|---|---|---|---|---|---|---|\n${all.map(row=>`| ${[row.id,row.module,row.scenario,row.expected,row.actual,row.status,row.evidence].map(escape).join(' | ')} |`).join('\n')}\n`);
const failedBefore=before.cases.filter(row=>row.status==='FAIL');assert.equal(failedBefore.length,16);
const investigations=failedBefore.map(old=>{
  const current=cases.get(old.id);let cause,action,counterpart='';
  if(old.id==='LIVE-025'){cause='Deployed CORS lacks the exposed compatibility header.';const local=all.find(row=>row.scenario==='local HTTP CORS exposes version headers to the configured frontend');counterpart=`${local?.id}: ${local?.status}`;action='Local correction already exists. Release approval and deployed retest required; nothing deployed.';}
  else if(/^LIVE-BR-0(08|09|10|11|12)$/.test(old.id)){cause='Deployed information grid has an intrinsic minimum width wider than 375px.';const id=old.id.replace('LIVE-','');counterpart=`${id}: ${cases.get(id)?.status}`;action='Existing local wrapping/grid correction retested; approved frontend deployment required.';}
  else if(old.id.startsWith('LIVE-BR-')){cause='Deployed role bundles lack wildcard fallback for the unsupported URL.';const id=old.id.replace('LIVE-','');counterpart=`${id}: ${cases.get(id)?.status}`;action='Existing local protected/wildcard routes retested; approved frontend deployment required.';}
  else if(old.id==='COMPAT-Chrome'){cause='Derived summary remains failed while a constituent Chromium case fails.';action='No independent product defect; inspect constituent IDs. Native network reliability is unresolved.';}
  else{cause=old.id==='CHROME-BR-001'?'The prior cold page lost its stylesheet to a network denial, causing unstyled overflow.':'Unexpected loopback asset denial interrupted native browser rendering or route loading.';action='Independent non-app fixture reproduces access denial. Single-route PASS does not clear cold reliability; clean approved host/network investigation required.';}
  return {id:old.id,scenario:old.scenario,previous:'FAIL',current:current.status,counterpart,cause,action,evidence:current.evidence};
});
write('FAILED_TEST_REVIEW.md',`# Individual review of all 16 prior failures\n\nEvery prior failed ID was rerun directly or recomputed from its rerun constituent browser suite. These are 16 failed checks across four failure classes, including a compatibility summary. No deployment or security-policy exception was used. A previously failing individual route can pass while its separate reliability case still fails. New failures, if any, remain in the main inventory.\n\n| ID | Scenario | Latest | Local counterpart | Confirmed cause / limit | Required action | Evidence |\n|---|---|---|---|---|---|---|\n${investigations.map(row=>`| ${[row.id,row.scenario,row.current,row.counterpart,row.cause,row.action,row.evidence].map(escape).join(' | ')} |`).join('\n')}\n`);
const node=gates.filter(row=>['backend','frontend'].includes(row.name)),dbPassed=database.rows.filter(row=>row.status==='PASS').length;
const schema=read(`${dir}/schema-contract.json`),network=read(`${dir}/network-diagnostic.json`);
const browserTable=Object.entries(browsers).map(([name,r])=>`| ${name} ${r.version} | ${r.rows.filter(row=>row.status==='PASS').length} | ${r.rows.filter(row=>row.status==='FAIL').length} | ${r.rows.filter(row=>row.status==='BLOCKED').length} |`).join('\n');
const changed=['migrations/048_section_capacity_snapshot_safety.sql','server/routes/admin.js','server/tests/sectionAssignmentQa.test.js','scripts/qa-database.mjs','scripts/qa-database-worker.mjs','scripts/qa-schema-contract.mjs','scripts/qa-network-diagnostic.mjs','scripts/qa-playwright.mjs','scripts/qa-public-http.mjs','scripts/qa-checks.mjs','scripts/qa-phase3-report.mjs','scripts/qa-report.mjs','scripts/qa-continuation-report.mjs','scripts/qa-validate-report.mjs'];
write('phase3-modified-files.txt','Phase 3 code/test/tool changes (prior QA changes remain in the working tree):\n'+changed.join('\n')+'\n\nReports, schema preflight, environment documentation and evidence under docs/qa were also updated.\n');
write('REPORT.md',`# LinawLetra software QA — ${date} (Asia/Manila)

**Not ready for formal capstone signoff.** All configured local Node gates, three public-browser suites, deployed anonymous checks and selected real PostgreSQL tests were rerun. The shared deployment/database was not modified. No account login, email, shared schema/data/Storage change, commit, push or deployment was performed. Complete authenticated dashboard/service workflows remain BLOCKED because there is no isolated Supabase project, complete authoritative schema snapshot or dedicated service credentials.

## Actual results

| Result | Count |
|---|---:|
| Inventoried cases | ${summary.total} |
| Passed | ${summary.PASS} |
| Failed | ${summary.FAIL} |
| Blocked | ${summary.BLOCKED} |
| Not run | ${summary['NOT RUN']} |
| Not implemented | ${summary['NOT IMPLEMENTED']} |
| Executed | ${summary.executed} |
| Pass rate of executed cases | ${summary.passRate}% |

The previous 555-case snapshot (465 PASS / 16 FAIL / 66 BLOCKED / 3 NOT RUN / 5 NOT IMPLEMENTED) is preserved in [phase2](phase2/REPORT.md). New transaction/schema regressions expand the inventory. Counts use the latest result per stable ID, not summed reruns. Compatibility summary rows reuse constituent cases and are not independent user journeys. Historical dependency audit results retain their original execution date; no new audit or full-service validation is inferred.

**${node.reduce((sum,row)=>sum+row.pass,0)} Node tests passed**: ${node.map(row=>`${row.name} ${row.pass} passed, ${row.fail} failed, ${row.skipped} skipped`).join('; ')}. The two skipped real-staging suites remain BLOCKED. **${dbPassed}/${database.rows.length} local PostgreSQL assertions passed**; these include negative historical-schema compatibility probes, not a complete Supabase restore. Build/static gates: ${gates.filter(row=>!['backend','frontend'].includes(row.name)).map(row=>`${row.name} exit ${row.exitCode}`).join('; ')}. [Gate evidence](${dir}/check-summary.json), [database assertions](${dir}/database.json), [verified runner outcome](${dir}/database-runner.json).

## All 16 prior failures investigated

[FAILED_TEST_REVIEW.md](FAILED_TEST_REVIEW.md) provides a separate row for each prior failed ID, current result, local counterpart, cause, action and evidence. Deployed unknown-role routes, mobile information overflow and missing CORS exposure remain separate from local corrections. No deployed failure was cleared by a local pass.

The local asset-denial issue was reproduced outside the application. An independent HTML/CSS/twenty-script fixture completed without failures in ${network.reports.map(r=>`${r.name} ${r.runs.filter(run=>run.loaded===20&&!run.failures.length).length}/${r.runs.length} contexts`).join(', ')}. Browser errors include ERR_NETWORK_ACCESS_DENIED; server/browser correlation is retained. This rules out LinawLetra code as a necessary cause, but does not identify a specific OS policy/browser defect. No firewall exception, security flag, static-response substitution or retry-until-pass loop was used. [Diagnostic details](NETWORK_DIAGNOSTICS.md).

Current failed IDs: ${all.filter(row=>row.status==='FAIL').map(row=>row.id).join(', ')}. An intermittent individual route can pass this run while its separate ten-context reliability case remains failed. New failures are retained rather than hidden by the previous status.

## Verified corrections in this phase

Migration 047 was reviewed and run locally. A new regression reproduced over-capacity insertion under REPEATABLE READ: its SELECT FOR UPDATE did not invalidate an older snapshot. [Before-fix evidence](${dir}/database-047-before-048.json) retains the failed assertion. New **048_section_capacity_snapshot_safety.sql** changes the section row version while holding its lock, causing stale snapshot writers to receive serialization_failure instead of exceeding capacity. Original migration files 001–047 were preserved. Normal capacity, duplicate retries, membership moves, grade/foreign-key constraints, rollback and privilege/RLS regressions were rerun. A service-role RPC concurrency case verifies the real SQL entry point under repeatable read.

The Admin assignment API returns 409 with retry guidance for serialization/deadlock conflicts. It keeps the single atomic RPC and does not fall back to separate partial writes. A real Express route-unit test with a substituted RPC boundary verifies that behavior; the SQL suite verifies persistence independently. This is not a real Supabase Auth/PostgREST end-to-end claim.

The embedded PostgreSQL dependency previously returned process exit 0 despite a failed assertion. The new parent runner accepts success only with a successful worker exit, fresh matching-run JSON, all planned cases present and no failed/blocked rows. A process exit alone is no longer accepted as database test success.

Existing responsive, wildcard-route and CORS source fixes were regression-tested. No dashboard redesign or unrelated functionality was added. [Phase-specific changed files](phase3-modified-files.txt); prior working-tree changes were preserved.

## Schema baseline and migration requirements

The source contract records ${schema.tables.length} literal table dependencies, ${schema.functions.length} RPC names and ${schema.migrations.length} stream-qualified SQL files/checksums. It includes optional/legacy source paths, so it is a review input, not a proof of enabled runtime scope. [SCHEMA_BASELINE_REVIEW.md](SCHEMA_BASELINE_REVIEW.md) records the exact incompatibilities and required source of truth. Original mobile 001 fails PostgreSQL parsing at unsupported policy syntax; its TEXT foundation also fails the UUID-dependent child RLS policy. These failures were reproduced in a separate local database, without editing historical SQL.

A reviewed schema-only snapshot of the actually installed shared schema is required to establish the complete baseline. Missing UUID-conversion history and the actual users key/lastLoginAt definitions must be reconciled; no guessed schema or altered historical migration was substituted. [ISOLATED_SCHEMA_PREFLIGHT.sql](ISOLATED_SCHEMA_PREFLIGHT.sql) queries only catalog metadata and was compiled/executed against the local projection. Its expected missing dependencies demonstrate that the projection cannot be mistaken for the full application. Executing this preflight against a complete isolated Supabase project remains blocked.

For a reviewed baseline matching 046, apply **047, then 048** to the isolated project and validate before testing/releasing the changed backend. No migration was applied to shared Supabase. Actual installed state must be reconciled before any later approved deployment; source fixes alone cannot update the deployed artifact.

## Blocked and unexecuted scope

All ${summary.BLOCKED} remaining BLOCKED cases retain status. [BLOCKED_TEST_REQUIREMENTS.md](BLOCKED_TEST_REQUIREMENTS.md) and [SAFE_TEST_ENVIRONMENT.md](SAFE_TEST_ENVIRONMENT.md) describe dedicated Admin/Teacher/Parent/Student and unrelated-user fixtures, safe private configuration, full schema/content/relationship requirements and gated provisioning. No isolated configuration is present; no real Auth fixtures were created. Local SQL role/claim fixtures are explicitly not Supabase accounts.

Complete authentication, refresh/revocation/account switching, disabled-token RLS, account creation, verification/recovery email OTP, CRUD/Storage/Realtime, every dashboard control, lessons/assessments/progress/rewards, real microphone Tagalog STT and actual provider TTS remain blocked at their full workflow scope. Unit/provider substitutions and selected SQL assertions do not clear them. No service-role client was used to pretend a browser RLS probe passed.

The three NOT RUN cases remain full assistive-technology/contrast evaluation on authenticated dashboards, representative load/query-plan testing and physical iOS/Android testing. Five NOT IMPLEMENTED entries remain teacher scheduling, bulk selection, the advancement badge predicate, measured parent engagement and separate login OTP/Google TTS. Existing parent calendar, signup/recovery OTP and ElevenLabs functionality are distinct implemented features.

## Browser and non-functional evidence

| Suite/version | Passed | Failed | Blocked |
|---|---:|---:|---:|
${browserTable}

Each normal suite checks 13 public routes at 375/768/1440px, 12 anonymous protected-route redirects, empty login/signup validation, keyboard password activation, OTP paste/navigation, input names and uncaught exceptions. Local suites add deliberately failed-bundle recovery and cold contexts with asset/overflow assertions. All local remote requests and all data-changing browser requests are blocked; deployed checks are anonymous GET/HEAD only. Resized desktop engines do not certify physical mobile devices or complete accessibility. Screenshots and request errors are in ${dir}.

Public request timings are individual network/TLS/cache observations, not database workload or load-test measurements. Security evidence establishes only the named middleware, input, grant and selected RLS boundaries. It does not certify every deployed policy, actual speech quality or full accessibility compliance.

## Outstanding risks and required external actions

- **High:** Word-of-day, nonsense-word, drill reward and promotion flows still span independent writes; full concurrency/failure recovery requires the complete isolated baseline. Badge atomicity is separately covered and does not certify the other flows.
- **High:** Full table/RPC/Storage RLS and disabled-account revocation require real isolated Auth tokens and unrelated-role/owner fixtures.
- **Medium:** Draft replacement and account enrollment/teacher-creation rollback, query-error feedback, direct browser PDF uploads, audit event deduplication and notification consistency still need service-backed verification.
- **Developer/environment action:** inspect local network denial on a clean approved host or with authorized endpoint logs; no blanket security exception is requested or applied.
- **Separate project/services:** obtain the schema-only baseline and isolated Supabase/API/frontend, seed synthetic users/content, connect test SMTP and a dedicated TTS provider, and use a real microphone/device for STT. Keep credentials only in private local configuration.
- **Approval required later:** any shared-database migration, destructive shared-data operation or production release. No such action was attempted; remaining local corrections and migration files are reviewable.

Capstone signoff requires passing complete role/ownership and learning workflows in isolation, closing high-risk transaction/RLS gaps, resolving native-browser reliability, and a separately approved release followed by deployed regression. Current evidence supports the listed local corrections and limited executed tests; it does not establish full capstone readiness.
`);
console.log(JSON.stringify(summary));
if (fs.existsSync(`${root}/evidence/main-post-migration/owner-reported-state.json`)) {
  await import('./qa-main-postmigration-report.mjs');
}
