import fs from 'node:fs';
import assert from 'node:assert/strict';
import {redactConfiguredValues} from './qa-redaction.mjs';

if (fs.existsSync('docs/qa/evidence/phase3/database-runner.json') && fs.existsSync('docs/qa/evidence/phase3/check-summary.json')) {
  await import('./qa-phase3-report.mjs');
  process.exit(0);
}

const root='docs/qa';
const reportDate=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const read=file=>JSON.parse(fs.readFileSync(`${root}/${file}`,'utf8').replace(/^\uFEFF/,''));
const baseline=read('phase1/test-results.json');
const cases=new Map(baseline.cases.map(row=>[row.id,{...row,evidence:row.evidence?`phase1/${row.evidence}`:undefined}]));
const add=row=>cases.set(row.id,row);
for(const [suite,prefix] of [['backend','BE'],['frontend','UI']]){
  const tap=fs.readFileSync(`${root}/evidence/${suite}.tap`,'utf8');
  const previous=new Map(baseline.cases.filter(row=>row.id.startsWith(prefix+'-')).map(row=>[row.scenario,row]));
  let next=Math.max(...[...previous.values()].map(row=>Number(row.id.split('-')[1]))),count=0;
  for(const match of tap.matchAll(/^(not ok|ok) \d+ - (.+)$/gm)){
    const scenario=match[2].replace(/ # SKIP.*$/,'');const skip=match[2].includes('# SKIP');const old=previous.get(scenario);
    add({id:old?.id||`${prefix}-${String(++next).padStart(3,'0')}`,module:old?.module||`${suite} isolated unit/route assertions`,scenario,expected:skip?'Isolated Supabase accounts and complete schema':'Assertions succeed',actual:skip?'Not executed: no isolated Supabase project; user prohibits shared database writes':match[1]==='ok'?'Node assertions passed':'Node assertions failed',status:skip?'BLOCKED':match[1]==='ok'?'PASS':'FAIL',evidence:`evidence/${suite}.tap`});count++;
  }
  assert.equal(count,Number(tap.match(/^# tests (\d+)$/m)?.[1]));
}
const browserFiles=['local-edge','local-chromium','local-firefox','live-edge'];
const browserReports={};
for(const name of browserFiles){const result=read(`evidence/phase2/${name}.json`);for(const row of result.rows)row.evidence=`evidence/phase2/${name}.json`;const coldFile=`evidence/phase2/${name.replace('local-','cold-')}.json`;if(name.startsWith('local-')&&fs.existsSync(`${root}/${coldFile}`)){for(const row of read(coldFile).rows){const index=result.rows.findIndex(old=>old.id===row.id);if(index>=0)result.rows[index]={...row,evidence:coldFile};else result.rows.push({...row,evidence:coldFile});}}browserReports[name]=result;for(const row of result.rows)add(row);}
for(const row of read('evidence/deployed-public-http.json').rows)add({...row,scenario:row.url,evidence:'evidence/deployed-public-http.json'});
for(const row of read('evidence/phase2/database.json').rows)add(row);
const gates=read('evidence/check-summary.json');
for(const gate of gates.filter(row=>!['backend','frontend'].includes(row.name)))add({id:`GATE-${gate.name}`,module:'Build/static checks',scenario:gate.name,expected:'Exit 0; lint denies warnings',actual:`Exit ${gate.exitCode}; ${gate.durationMs} ms`,status:gate.exitCode===0?'PASS':'FAIL',evidence:`evidence/${gate.name}.txt`});
for(const [browser,file] of [['Chrome','local-chromium'],['Firefox','local-firefox']]){
  const result=browserReports[file],passed=result.rows.length===58&&result.rows.every(row=>row.status==='PASS');
  add({id:`COMPAT-${browser}`,module:'Compatibility',scenario:`Public functional browser suite in ${browser}`,expected:'Complete anonymous/responsive/form suite passes; authenticated coverage remains separate',actual:`${result.version}; ${result.rows.filter(row=>row.status==='PASS').length}/${result.rows.length} assertions passed. Desktop engine at resized viewports; no physical mobile or authenticated dashboard certification.`,status:passed?'PASS':result.rows.some(row=>row.status==='FAIL')?'FAIL':'BLOCKED',evidence:`evidence/phase2/${file}.json`});
}
const prerequisites=[
  'Four dedicated role Auth accounts with confirmed profiles and role-specific frontend/API landing URLs.',
  'Disposable existing/new emails, valid/invalid passwords, and a real isolated Auth endpoint with rate-limit observations.',
  'Test SMTP inbox, signup-enabled isolated Auth, controllable OTP TTL and disposable addresses; verify inbox, expiry and replay.',
  'Test inbox, known account, recovery redirect allowlist and expired/reused OTP fixtures; verify old password denial.',
  'Two independent browser profiles, two accounts per role, short-lived JWT configuration and token revocation; verify storage after switch/reload.',
  'Active/disabled/archived fixtures per role plus direct anon-key clients; verify both API and direct RLS using old tokens.',
  'Admin session, seeded users/activities and independently queried expected aggregate counts.',
  'Admin session; linked/unlinked students, parents, grade/reading-level/status fixtures and known progress.',
  'Admin session; multiple parents with overlapping names and distinct owned children.',
  'Admin session; teachers across grade assignments and a verified detail/roster fixture.',
  'Admin session, dedicated email inbox, unique/duplicate addresses and fault injection at Auth/profile/roster/mail steps.',
  'Admin and Teacher sessions; grade-aligned/misaligned children, grade profiles, sections and membership fixtures.',
  'Admin-authenticated isolated API plus complete section schema; repeated/duplicate/concurrent HTTP assignment runs. Local SQL and API-unit evidence are partial.',
  'Admin session; more than 1,000 synthetic students/attempts, known aggregates and empty datasets.',
  'Dedicated actors, controlled timestamps and actual audit triggers/Realtimes; compare each action to stored actor/action/redaction.',
  'At least two dedicated admins and active/archived role fixtures; real Auth ban/unban and transaction failure injection.',
  'Disposable archived accounts, complete FK graph and before/after relationship counts. Destructive execution requires confirmation.',
  'Admin session, test inbox, editable profile/settings/notifications fixtures and reload/session checks.',
  'Authenticated Admin browser; every control in CONTROL_INVENTORY.csv, screen reader and keyboard/error/responsive review.',
  'Teacher session, owned roster/progress/assignments and independent expected counts.',
  'Teacher session; several pages of linked/unlinked students with modules and attempts.',
  'Two Teachers, owned/unowned children, API tokens and direct anon-key RLS queries.',
  'Teacher session, isolated Storage buckets/policies, valid PDFs and missing/archive/object fixtures.',
  'Teacher session; valid/spoofed/truncated/oversized PDFs, abortable uploads and isolated Storage cleanup verification.',
  'Teacher session; parsed draft and published drills, answer/item histories, storage fixtures and failure injection.',
  'Teacher/Parent/Student sessions, roster-linked/unlinked students, assignments, due dates and duplicate requests.',
  'Teacher session; known module, assessment and practice totals and downloadable reports.',
  'Teacher and two Parent sessions; linked/unlinked child recipients, real persisted messages/Realtime and read states.',
  'Teacher session, isolated avatar bucket, test inbox and preference/notification rows.',
  'Authenticated Teacher browser, control inventory, screen reader, keyboard and viewport/device review.',
  'Parent session with two synthetic children whose activities, progress and recommendations differ.',
  'Parent session, unique/duplicate child identities, grades 1–6 and dedicated Auth create capability; inspect credential hashes privately.',
  'Parent session with controlled failures at each enrollment boundary and independent orphan/relationship queries.',
  'Parent/Student sessions, disposable passwords and test credential delivery; verify old/new login after reset.',
  'Two Parents, separately owned children, Student session and synced accessibility settings.',
  'Parent session; known module, assessment, practice, badge and drill fixtures across months.',
  'Parent session; synthetic calendar activities across day/week/month with invalid date/time/status requests.',
  'Parent/Teacher/Student sessions, linked/unlinked child assignments/calendar rows and Realtime/reload checks.',
  'Parent/Teacher sessions; conversations, private attachments, ownership-denied cases and read-state fixtures.',
  'Parent session; assigned/unassigned, archived/missing PDFs and Storage access URLs.',
  'Parent session, test mail, editable profile/settings/notifications and reload checks.',
  'Authenticated Parent browser, control inventory, screen reader, error injection and device/viewports.',
  'Student session with known progress, profile, reading level and recommendation fixtures.',
  'Student session; complete curriculum, locked/frontier/completed modules and equipped slots.',
  'Student session, authoritative content/scoring RPCs, completed/incomplete attempts and atomic XP snapshots.',
  'Student session, real assessment RPCs, spoken/choice input, passing/failing and resumed fixtures.',
  'Two Student tokens, unrelated assessment/content IDs and direct browser-role RPC/RLS calls.',
  'Student session, curriculum for all levels, threshold-boundary progress, overrides and parallel completion clients.',
  'Student session, server-issued nonsense sets, two children, duplicate/concurrent calls and persistence failure injection.',
  'Student session, known daily targets, Manila midnight clock fixtures, 3 tries and parallel/failing XP writes.',
  'Student session, supported physical microphone, actual Tagalog speech and independent score/progress/badge snapshots.',
  'Student session; owned/unowned PDFs, resume chunks and server-scored completion fixtures.',
  'Student/Teacher/Parent sessions; active/archived drafts/published items, repeated correct attempts and concurrent reward checks.',
  'Student/Parent/Teacher sessions; real achievement criteria, legacy data, XP and visibility snapshots. Local badge transaction tests are partial.',
  'Student and Parent sessions, settings sync, keyboard and actual assistive technology.',
  'Student token, separate ElevenLabs account/quota, supported Filipino voice and human listening; controlled provider failures.',
  'Student session, real microphone, actual spoken Tagalog, browser permissions and supported/unsupported devices.',
  'Authenticated Student browser, complete control inventory, physical touch devices, keyboard and reduced-motion settings.',
  'Reviewed schema-only shared baseline including missing historical TEXT-to-UUID conversion; isolated Supabase migration replay.',
  'Full isolated schema/policies and a table/RPC access matrix with every role/owner/unrelated/anonymous token. Selected local SQL policies are partial.',
  'Full disposable relationship graph and before/after CRUD/archive/delete checks; destructive execution requires confirmation. Local section FK/cascade checks are partial.',
  'Reviewed atomic learning/reward RPCs, parallel sessions and injected failures for WOD/drills/nonsense/promotion. Local badges are covered separately.',
  'Isolated Storage policies/buckets, private/public object fixtures, all ownership tokens and coordinated mobile build.',
  'Parent scheduling fixtures plus Admin sections; parallel duplicate/capacity transactions. Section-only PostgreSQL checks are partial.',
];
assert.equal(prerequisites.length,64);
const originalBlocked=baseline.cases.filter(row=>row.status==='BLOCKED');assert.equal(originalBlocked.length,68);
for(const original of originalBlocked.filter(row=>row.id.startsWith('WF-'))){
  const n=Number(original.id.slice(3));const row=cases.get(original.id);row.actual=`BLOCKED: shared database writes prohibited; no independent Supabase stack. Requires: ${prerequisites[n-1]}`;row.evidence='BLOCKED_TEST_REQUIREMENTS.md; SAFE_TEST_ENVIRONMENT.md';
}
const escape=value=>String(value??'').replace(/\|/g,'\\|').replace(/\r?\n/g,'<br>');
const blockedTable=originalBlocked.map(old=>{const current=cases.get(old.id);let requirement;
  if(old.id.startsWith('WF-'))requirement=prerequisites[Number(old.id.slice(3))-1];
  else if(old.id==='BE-013')requirement='Dedicated isolated API, real role Auth accounts and complete schema; run gated staging suite.';
  else if(old.id==='BE-014')requirement='Complete isolated policies and credentials for owned/unrelated children; direct anon-key probes without service role.';
  else requirement='Portable browser installed and executed against the local anonymous production build. Authenticated browser cases remain in the corresponding workflows.';
  return `| ${old.id} | ${escape(old.scenario)} | ${current.status} | ${escape(requirement)} |`;
}).join('\n');
fs.writeFileSync(`${root}/BLOCKED_TEST_REQUIREMENTS.md`,redactConfiguredValues(`# Review of all 68 originally blocked cases\n\nEach original case remains visible. Local SQL/route-unit assertions do not clear complete authenticated dashboard workflows. The shared database is read-only for this task; see [safe environment setup](SAFE_TEST_ENVIRONMENT.md).\n\n| ID | Original scenario | Current status | Requirements / partial coverage |\n|---|---|---|---|\n${blockedTable}\n`));
const all=[...cases.values()];const summary=Object.fromEntries(['PASS','FAIL','BLOCKED','NOT RUN','NOT IMPLEMENTED'].map(status=>[status,all.filter(row=>row.status===status).length]));summary.total=all.length;summary.executed=summary.PASS+summary.FAIL;summary.passRate=Number((summary.PASS/summary.executed*100).toFixed(2));
const results={date:reportDate,timestamp:new Date().toISOString(),timezone:'Asia/Manila',summary,baseline:baseline.summary,scope:'Continuation; latest outcome per stable case ID. No shared database writes or deployment. Complete authenticated workflows remain blocked.',cases:all};
fs.writeFileSync(`${root}/test-results.json`,redactConfiguredValues(JSON.stringify(results,null,2)+'\n'));
fs.writeFileSync(`${root}/TEST_CASES.md`,redactConfiguredValues(`# Actual QA test cases — continuation\n\nLatest outcomes per stable ID; original results retained in [phase1](phase1/TEST_CASES.md). A passed local unit or selected PostgreSQL case does not certify a blocked complete workflow.\n\n| ID | Module | Scenario | Expected result | Actual result | Status | Evidence |\n|---|---|---|---|---|---|---|\n${all.map(row=>`| ${[row.id,row.module,row.scenario,row.expected,row.actual,row.status,row.evidence].map(escape).join(' | ')} |`).join('\n')}\n`));
const suiteStats=gates.filter(row=>['backend','frontend'].includes(row.name));
const rowsSummary=Object.entries(browserReports).map(([name,r])=>`| ${name} ${r.version} | ${r.rows.filter(row=>row.status==='PASS').length} | ${r.rows.filter(row=>row.status==='FAIL').length} | ${r.rows.filter(row=>row.status==='BLOCKED').length} |`).join('\n');
const seven=baseline.cases.filter(row=>row.status==='FAIL').map(old=>{const current=cases.get(old.id);return `| ${old.id} | ${current.status} | ${escape(old.id==='BR-001'?'Loopback asset requests intermittently return ERR_NETWORK_ACCESS_DENIED in Edge. Initial home rerun and the separate ten-context reliability case are reported independently; OS/browser cause is unresolved.':old.id==='LIVE-025'?'Deployed CORS configuration omits Access-Control-Expose-Headers. Local API fix passes HTTP checks; deployed code unchanged.':'Deployed role route bundle lacks a wildcard fallback. Local routes redirect correctly; deployed artifact unchanged.')} |`;}).join('\n');
const failed=all.filter(row=>row.status==='FAIL');
const report=`# LinawLetra QA continuation — ${reportDate}

**Not ready for formal capstone signoff.** All currently configured unit/route/HTTP checks and the available public-browser and selected real PostgreSQL cases were executed. Complete authenticated dashboards, real Supabase Auth/PostgREST/RLS, email delivery, and actual Tagalog audio/recognition remain unverified. The user confirmed the deployment is shared and instructed no database writes. No shared record/account/email/storage changes, migrations, commits, pushes or deployments were performed.

## Actual results

| Result | Count |
|---|---:|
| Total inventoried cases | ${summary.total} |
| Passed | ${summary.PASS} |
| Failed | ${summary.FAIL} |
| Blocked | ${summary.BLOCKED} |
| Not run | ${summary['NOT RUN']} |
| Not implemented | ${summary['NOT IMPLEMENTED']} |
| Executed | ${summary.executed} |
| Pass rate of executed cases | ${summary.passRate}% |

Previous inventory: 324 passed, 7 failed, 68 blocked, 3 not run, 5 not implemented. Additional browser/database/safety regressions expand the denominator. Counts use the latest outcome per stable ID, including failures; historical runs are not added again. Compatibility summary cases reference browser assertions already listed, so the total is an inventory of checks, not a count of independent user journeys. Blocked workflows retain their full scope despite partial local coverage. [All test cases](TEST_CASES.md), [machine-readable results](test-results.json), [original report](phase1/REPORT.md).

Node suites: ${suiteStats.map(row=>`${row.name}: ${row.pass} passed, ${row.fail} failed, ${row.skipped} skipped`).join('; ')}. **${suiteStats.reduce((sum,row)=>sum+row.pass,0)} automated Node cases passed.** The two skipped staging suites are BLOCKED, never PASS. These tests include isolated service substitutions and source assertions, not complete end-to-end dashboards.

## Seven previous failures and new findings

| Original ID | Latest result | Root cause and verification limit |
|---|---|---|
${seven}

Five mobile information pages also overflowed at 375px in all three engines. The CSS grid's implicit minimum width expanded to its content width (587–714px); an explicit single flexible column, shrinkable panels and wrapping correct this locally. The previous CDP runner emulated a mobile layout with a different effective viewport, so its passing result did not expose this at a true 375px layout viewport. New Playwright checks assert innerWidth and scrollWidth. Before-fix JSON and screenshots remain in evidence/phase2/before-fixes and the phase2 failure images. The deployed pages still use the old layout; their failures are retained.

The loopback issue is intermittent in Edge and Chromium and affects multiple asset types. Request evidence includes exact localhost asset URLs and ERR_NETWORK_ACCESS_DENIED; blocked external fonts and deliberately blocked TeacherArea recovery requests are separately identifiable. No browser/OS security policy was disabled to force a pass. A failed cold-load screen does not prove a specific React defect; the app's retry recovery remains tested. The stricter targeted cold runs also check asset failures and overflow; they replace the earlier cold assertion for the same ID. Browser results below establish only their executed scope.

Current failed IDs: ${failed.map(row=>row.id).join(', ')}.

## Database defect fixed and tested locally

Migration 046 allowed concurrent inserts to overfill a section because capacity was read without a row lock. Its BEFORE INSERT trigger also rejected an existing membership at capacity before ON CONFLICT DO NOTHING could skip it. The local PostgreSQL runner reproduced both defects before applying the fix (two members in a capacity-one section, and a rejected duplicate retry).

New **migrations/047_atomic_section_assignments.sql** serializes capacity decisions using a section row lock, permits idempotent duplicate retries and checks membership updates. Its service-role-only assign_section_students RPC commits membership and teacher roster together, so a roster grade failure rolls back the membership. The Admin API calls this RPC once, maps missing sections to 404 and validation errors to 400, and reports missing RPC/migration as an error. It does not fall back to unsafe partial writes. **047 must be reviewed/applied to the isolated database before testing the modified backend and must precede any future backend release. Nothing was applied to shared Supabase.** Historical migrations remain unchanged.

The section endpoint also accepted malformed 36-character IDs and silently discarded invalid entries mixed with valid ones. A regression failed before the correction ([before log](evidence/phase2/section-validation-before.tap)); the endpoint now validates every ID with the existing UUID validator before persistence. The full Node rerun includes this regression.

Selected real PostgreSQL checks exercise RLS visibility for Teacher/other Teacher/Admin/Parent/Student/anonymous identities; denied browser writes and privileged RPC access; capacity/concurrent insertion; idempotency; grade constraints; foreign keys; membership/roster rollback; disposable cascades; atomic/idempotent/concurrent badge XP; and malformed badge rollback. [Database evidence](evidence/phase2/database.json). This is a minimal UUID fixture using exact roster SQL from 004, full 026/046 and new 047. It is not the full Supabase schema, JWT service, PostgREST or Storage. Database roles/claim helpers are test fixtures, not real Supabase authentication.

## Browser execution and non-functional checks

| Run / version | Passed | Failed | Blocked |
|---|---:|---:|---:|
${rowsSummary}

Each normal suite covers 13 public URLs at 375, 768 and 1440px, 12 anonymous protected-route redirects, empty form validation, password keyboard activation, OTP paste/navigation, visible input names and uncaught exceptions. Local suites additionally test deliberate route-bundle recovery and ten fresh mobile-sized contexts. Local tests block external networking; deployed checks use no tokens and allow only GET/HEAD. Desktop browser engines at resized viewports are not physical mobile testing or authenticated dashboard E2E. Screenshots and per-request errors are retained under evidence/phase2. The initial Firefox run stalled; only the completed rerun or explicitly blocked outcomes are counted.

Lint with warnings denied, TypeScript, production build and diff checks: ${gates.filter(row=>!['backend','frontend'].includes(row.name)).map(row=>`${row.name} exit ${row.exitCode}`).join('; ')}. Exact logs/durations are in [check-summary.json](evidence/check-summary.json). The first restricted-process TypeScript run timed out after 180 seconds; its log remains in phase2/typecheck-timeout.txt and a direct approved rerun succeeded. Earlier dependency audit evidence is retained at its original scope/date; no new clean-audit claim is inferred from a build. Public HTTP measurements are single-client network observations, not load benchmarks. Stress/soak, full accessibility/screen reader and physical iOS/Android remain not run.

## Review of all 68 original blockers

[BLOCKED_TEST_REQUIREMENTS.md](BLOCKED_TEST_REQUIREMENTS.md) maps every original blocked ID to its current result and exact account/data/tooling requirements. [SAFE_TEST_ENVIRONMENT.md](SAFE_TEST_ENVIRONMENT.md) describes the environment, reproducible commands and safe Supabase account provisioning. Provisioning was attempted in guard-only mode and stopped before networking because no separate Supabase project/configuration exists; see [provisioning evidence](evidence/phase2/provisioning.json). Dedicated local SQL role fixtures exist. Real Auth role accounts were not created on the shared deployment.

The sibling mobile repository supplies historical schema SQL, but original TEXT IDs conflict with later UUID assumptions. A reviewed schema-only baseline including the missing conversion is required before full Supabase migration replay. No shared schema dump or user data was copied. Account creation, real email verification/recovery OTP, persisted login/logout/revocation, account switching, disabled-account direct RLS, all four complete dashboards, learning and assessment persistence, Storage/Realtime and real speech remain blocked at their stated full-workflow scope.

## Remaining issues and readiness

- **High:** WOD, nonsense-word, drill rewards and promotion still span multiple independent writes; full concurrency and failure recovery are unverified. The local badge RPC is atomic, but does not establish the other reward paths. Inspect/review transactional fixes using the full isolated baseline before signoff.
- **High:** Complete table/RPC/Storage RLS and account-status revocation need isolated real Auth tokens, including unrelated users and old disabled sessions. The selected section/badge policies tested here do not certify all policies or actual shared state.
- **Medium:** Draft drill replacement deletes then inserts; profile/roster/mail failure can leave partial teacher account creation. Enrollment rollback, query error feedback, direct browser PDF uploads, audit event deduplication and cross-role notifications still need service-backed validation.
- **Medium:** Local Edge asset denial and deployed route/CORS/responsive failures remain visible above. No deployment was authorized. Deployment alone cannot clear the blocked service workflows.
- **Not implemented:** Teacher session scheduling, teacher bulk selection, advancement badge predicate, measured parent engagement analytics, separate login OTP/Google TTS. Existing parent calendar, signup/recovery OTP and ElevenLabs are separate implemented features.

Capstone readiness requires a disposable Supabase environment and schema baseline; real role/email/speech fixtures; passing complete role/ownership and learning E2E workflows; reviewed transactional corrections; and a separately approved release followed by deployed smoke tests. The current evidence supports local improvements and named limited checks, not a fully functional or production-ready certification.
`;
fs.writeFileSync(`${root}/REPORT.md`,redactConfiguredValues(report));
console.log(JSON.stringify(summary));
