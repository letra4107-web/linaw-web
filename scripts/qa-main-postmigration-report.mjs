import fs from 'node:fs';
import {redactConfiguredValues} from './qa-redaction.mjs';

const root='docs/qa',dir='evidence/main-post-migration';
const read=file=>JSON.parse(fs.readFileSync(`${root}/${file}`,'utf8'));
const owner=read(`${dir}/owner-reported-state.json`),main=read(`${dir}/main-readonly-results.json`),health=read(`${dir}/public-backend-status.json`),source=read(`${dir}/source-compatibility.json`),local=read(`${dir}/local-verifier-tests.json`),unit=read(`${dir}/safety-unit-and-api.json`),qa=read('test-results.json');
const clean=main.catalogStatus==='PASS'&&main.integrityStatus==='PASS';
const status=clean?'VERIFIED AT THE RECORDED LIMITED SCOPE':'HOLD — MAIN DATABASE NOT YET CLEARED';
const checkGroups=[
  ['047 RPC/signature/grants',main.catalogRead?main.checks.filter(r=>r.id.startsWith('MAIN-assign_')||r.id==='MAIN-assignment-rpc-grants'):null],
  ['048 trigger-function body/security',main.catalogRead?main.checks.filter(r=>r.id.startsWith('MAIN-validate_')):null],
  ['Membership trigger wiring',main.catalogRead?main.checks.filter(r=>r.id==='MAIN-section-trigger'):null],
  ['Required constraints/RLS/non-nullability',main.catalogRead?main.checks.filter(r=>!r.id.startsWith('MAIN-assign_')&&!r.id.startsWith('MAIN-validate_')&&!['MAIN-assignment-rpc-grants','MAIN-section-trigger'].includes(r.id)):null],
];
const groups=checkGroups.map(([scenario,rows])=>({scenario,status:!rows?.length?'BLOCKED':rows.every(r=>r.status==='PASS')?'PASS':'FAIL',actual:!rows?.length?main.reason||'No live catalog snapshot':`${rows.filter(r=>r.status==='PASS').length}/${rows.length} catalog assertions passed`}));
const integrity=main.aggregatesRead?main.integrity.map(r=>({scenario:r.check_name,status:r.violations===0?'PASS':'FAIL',actual:`${r.violations} violations in the proven scope`})):['Duplicate memberships','Section capacity','Student/section grade and foreign-key relationships','Teacher roster consistency'].map(scenario=>({scenario,status:'BLOCKED',actual:main.integrityScope?.reason||'No authorized full-visibility main-data inspection executed'}));
const report={timestamp:new Date().toISOString(),status,ownerStatement:owner,mainConnectionAttempted:main.connectionAttempted,catalogStatus:main.catalogStatus,integrityStatus:main.integrityStatus,groups,integrity,mainTestsNotRun:['Write-capable assignment RPC invocation','Enrollment/Auth changes','Concurrency/serialization injection on main','Storage operations'],localVerifier:{cases:local.rows.length,passed:local.rows.filter(r=>r.status==='PASS').length},unitAndApi:unit,priorApplicationQa:{...qa.summary,scope:'Last complete application QA run; unchanged by diagnostic-only tests in this review'},deploymentReady:false};
fs.writeFileSync(`${root}/${dir}/review-summary.json`,JSON.stringify(report,null,2)+'\n');
const table=rows=>rows.map(r=>`| ${r.scenario.replaceAll('|','\\|')} | ${r.status} | ${r.actual.replaceAll('|','\\|')} |`).join('\n');
const doc=`# Main Supabase post-migration review — 2026-10-18

**${status}. Deployment is not approved.** The owner reports manually applying migrations 047 and 048 to MAIN. Codex did not apply or rerun them. User-reported execution is distinct from an independently observed catalog result.

## Main verification results

- Main PostgreSQL connection attempted by this verifier: **${main.connectionAttempted?'yes':'no'}**.
- Catalog status: **${main.catalogStatus}**. Integrity status: **${main.integrityStatus}**.
- Current blocker: ${main.reason||main.integrityScope?.reason||'See individual results below'}.
- No application rows, Auth accounts, Storage objects, RLS policies, migrations, role grants or deployed configuration were changed by Codex. No write-capable main RPC was called. No administrator/service-role credential was used for main verification.

| Check | Result | Actual evidence / limit |
|---|---|---|
${table(groups)}
${table(integrity)}

Main index/trigger/dependency inventory is ${main.catalogRead?'captured at the recorded catalog scope':'not yet inspected'}. Without a pre-migration catalog snapshot, even a future expected-object match cannot prove that no unrelated object was introduced. Auth-user foreign-key data scans and main write/concurrency/enrollment tests were not performed. No zero violation count has been fabricated from blocked or RLS-filtered results. [Verifier result](../${dir}/main-readonly-results.json).

## Compatibility findings

The deployed health endpoint returned **${health.health?.httpStatus}**, version **${health.health?.version}**, API compatibility **${health.health?.apiCompatibilityVersion}**, and declared commit **${health.health?.commit}**. The health handler returns application metadata and does not validate Supabase objects. A healthy response is not a database-integrity result.

The matching local Git object is **${source.declaredCommit}**. Its server/src tree has ${source.declaredSectionReferences?.length??'unverified'} references to the section tables or changed functions, and ${source.declaredSectionRoutes?.length??'unverified'} section routes. The declared parent enrollment source has no direct reference to those changed objects. This supports **no direct new dependency in that declared revision**, not proof that a running image has no uncommitted/platform changes. Confirm the deployed artifact/SHA in Railway before using it as release evidence. [Source comparison](../${dir}/source-compatibility.json), [public health result](../${dir}/public-backend-status.json).

The local backend differs: its assignment handler calls \`public.assign_section_students(uuid,uuid[],uuid)\`, expects JSON success, and maps validation/not-found/serialization errors to 400/404/409. Its relevant route-unit regressions passed. If the declared commit accurately represents the running artifact, the new local section endpoints are absent from that revision; migrations alone do not add HTTP routes. No authenticated production request was made to prove route availability or write success.

Static review of the provided migration files finds:

- 047 introduces one service-role-only assignment RPC and replaces the membership validator/trigger. 048 replaces the validator body. Neither file executes top-level application-data DML or backfills existing section/roster records.
- 048's function performs a same-value parent-row update **when a future membership operation fires the trigger**. It can therefore fire any existing class_sections UPDATE triggers and can raise serialization/deadlock conflicts. Catalog review of those triggers and isolated functional testing are required; their main state remains unverified.
- Neither migration changes table column types or the existing SDK/API response contract. The new RPC is additive. The declared source does not reference it; the local source requires its live signature and service grant to be verified before release.
- The recorded package specifications have the same Supabase SDK range in declared/local source; the local Nodemailer major differs. Package ranges are not installed artifact/lockfile evidence or a current advisory audit. Release review must include all pending backend changes, not just these SQL functions.
- Database catalog presence would not by itself prove PostgREST schema-cache compatibility. No service-role RPC invocation was used to force that test through RLS. Main assignment/enrollment/serialization checks remain unexecuted.

## Local safety and affected-function tests

**${unit.pass} local unit/API cases passed, ${unit.fail} failed**, covering five connection/role/scope guards and six Express section-assignment route-unit cases. Their persistence boundary is substituted; they are not live main RPC tests. [TAP](../${dir}/safety-unit-and-api.tap).

**${local.rows.filter(r=>r.status==='PASS').length}/${local.rows.length} synthetic PostgreSQL verifier cases passed.** They test copied function signatures/body fingerprints/trigger/constraints, a dedicated nonprivileged reader, read-only enforcement, refusal of RLS-filtered false-clean results, and detection of seeded capacity/grade/roster defects. They run only in a new loopback database. The migration files themselves are not executed as migration scripts, and main is never contacted by the fixture. [Local results](../${dir}/local-verifier-tests.json).

The first rehearsal exposed PostgreSQL name-array decoding in the new verifier and an incorrect synthetic expected count. The catalog now casts attribute names to text arrays; the fixture expectation matches its two memberships and one roster link. Before/after evidence is retained. A transient local listen denial was not treated as a pass. The local database helper now catches startup errors so they can be reported as blocked diagnostics.

The last complete application QA inventory remains **${qa.summary.total} cases: ${qa.summary.PASS} passed, ${qa.summary.FAIL} failed, ${qa.summary.BLOCKED} blocked, ${qa.summary['NOT RUN']} not run, ${qa.summary['NOT IMPLEMENTED']} not implemented**. These are retained last-run outcomes, not newly executed main verification. The new diagnostic-only tests are reported separately rather than inflating that inventory. Previously reported deployed/browser failures and full authenticated Supabase/email/speech blockers have not been silently cleared.

## Required manual actions

1. Review [READONLY_SETUP.md](READONLY_SETUP.md). Creating a reader/login/grants/password is an owner-approved access-configuration change, not a read-only query. The [operator proposal](reader-role-operator-proposal.sql) is prepared but **has not been executed**. Do not rerun 047/048 or substitute an administrator/service-role connection.
2. The authorized operator creates/reviews the dedicated reader, sets its password privately, and obtains the main direct/session-pooler parameters and CA certificate. Enter them locally in the disabled ignored template or a private nonsynced file. Do not replace application/deployment credentials.
3. Set the private verification enable flag only after confirming the pinned target. Provide only the file path. The verifier can then execute the already authorized catalog inspection in a read-only transaction with verified TLS and bounded timeouts.
4. SELECT grants alone do not grant global visibility under RLS. If existing policies do not permit a complete aggregate audit, the global integrity checks remain blocked. Any new audit SELECT policy is a separate owner decision; no policy or bypass privilege was added here.
5. Follow [ISOLATED_QA_PLAN.md](ISOLATED_QA_PLAN.md) to provision a separate project with a reviewed schema-only baseline, synthetic role/ownership/content fixtures, test email credentials and real speech-device/provider access. The reported main migrations do not make main a staging environment.

No repair DML, migration rerun, Auth/Storage mutation, RLS bypass or deployment is authorized by this report. **Main consistency and release readiness cannot yet be confirmed.**
`;
fs.writeFileSync(`${root}/main-post-migration/REPORT.md`,redactConfiguredValues(doc));
const banner=`<!-- MAIN-SAFETY-STATUS -->\n> **Main post-migration hold:** The owner reports applying 047/048 to MAIN. Do not rerun them. Independent catalog verification is **${main.catalogStatus}** and main data-integrity verification is **${main.integrityStatus}**. See the [current safety report](main-post-migration/REPORT.md) and [private reader setup](main-post-migration/READONLY_SETUP.md). Counts below are the last complete application QA run, not a new main-database verification.\n<!-- END-MAIN-SAFETY-STATUS -->\n\n`;
const previous=fs.readFileSync(`${root}/REPORT.md`,'utf8').replace(/<!-- MAIN-SAFETY-STATUS -->[\s\S]*?<!-- END-MAIN-SAFETY-STATUS -->\s*/, '');
fs.writeFileSync(`${root}/REPORT.md`,banner+previous);
console.log(JSON.stringify({status,catalog:main.catalogStatus,integrity:main.integrityStatus,localUnitApi:unit.pass,localDatabasePassed:local.rows.filter(r=>r.status==='PASS').length}));
