# Critical defect resolution continuation

Date: 2026-10-21, Asia/Manila. Earlier working-tree changes, fixes and baseline evidence were preserved. No shared Supabase requests/changes, new SQL proposal execution, real-account creation, email delivery, live environment changes, key use/rotation, commit, push or deployment occurred.

## Current disposition

- **AUD-001 OPEN:** both examples use placeholders. The [GitHub cleanup continuation](GITHUB_CREDENTIAL_CLEANUP.md) locates the four-type credential blob in two local Codex checkpoint tree refs, with no containing commit among 206 scanned commits; GitHub's advertised main matches local HEAD. Owner revocation is unconfirmed. [Exact provider instructions](CREDENTIAL_ROTATION.md). The earlier object-only scan did not prove committed/pushed exposure.
- **AUD-005 CODE PREPARED / SQL BLOCKED:** the actual route/service uses one mandatory RPC and no split writes; mocked rollback/retry/concurrency checks pass. Missing RPC returns safe 503. SQL proposal/preflight remain deliberately unexecuted; shared schema is unverified and historical lost XP is not auto-repaired. [Review and approval boundary](WORD_OF_DAY_REVIEW.md).
- **AUD-008 OPEN / ENVIRONMENT REPRODUCED:** a plain Node HTML/CSS/script fixture reproduces browser denials in native and intercepted modes. React, Vite, Supabase and application source are absent. Node HTTP gets 200; failed paths are correlated against server logs. Root host/browser policy still needs operator logs. [40-context evidence](evidence/resolution/browser-diagnostic/network-diagnostic.json).
- **AUD-009 RESOLVED for existing local SQL:** new disposable UTF-8/C cluster with explicit IPv4 clients and a temporary root passed all 28 existing assertions. Restricted-sandbox initdb remains limited; full Supabase and WOD proposal are separate. [Actual SQL](evidence/resolution/database/database.json), [runner verifier](evidence/resolution/database/database-runner.json).
- Earlier AUD-002/003/004/006/007/010 regressions remain in the passing Node suites. No additional dependency update was required by the latest advisory scans.

## Actual executed results

- Node: **475 PASS, 0 FAIL, 2 SKIPPED**. Backend {"tests":436,"pass":434,"fail":0,"cancelled":0,"skipped":2}; frontend {"tests":41,"pass":41,"fail":0,"cancelled":0,"skipped":0}. Skipped staging suites remain BLOCKED.
- Lint, TypeScript, production Vite build and diff checks: [{"name":"backend","exitCode":0},{"name":"frontend","exitCode":0},{"name":"lint","exitCode":0},{"name":"build","exitCode":0},{"name":"vite-build","exitCode":0},{"name":"diff","exitCode":0}].
- Existing disposable PostgreSQL: **28/28 PASS**; selected RLS/constraints/rollback/concurrency checks with synthetic claims, not a full Supabase restore.
- Node/V8 loaded-backend coverage: 46.61% lines, 74.17% branches, 61.17% functions; excludes tests/dependencies/unloaded source and frontend TypeScript.
- Both npm application-workspace scans: [{"workspace":"frontend","info":0,"low":0,"moderate":0,"high":0,"critical":0,"total":0},{"workspace":"backend","info":0,"low":0,"moderate":0,"high":0,"critical":0,"total":0}]. Registry findings are not a general security certification.

| Browser public suite | Results |
| --- | --- |
| edge 155.0.4283.62 | {"FAIL":2,"PASS":56} |
| chromium 156.0.8078.4 | {"PASS":57,"FAIL":1} |
| firefox 157.0 | {"PASS":58} |

Independent fixture diagnostics (overlapping diagnostic observations, not extra requirements): [{"browser":"Edge","routing":true,"nodeHttpStatus":200,"contexts":10,"complete":4,"deniedPaths":9,"deniedPathsAbsentAtServer":9},{"browser":"Edge","routing":false,"nodeHttpStatus":200,"contexts":10,"complete":7,"deniedPaths":3,"deniedPathsAbsentAtServer":3},{"browser":"Chromium","routing":true,"nodeHttpStatus":200,"contexts":10,"complete":7,"deniedPaths":6,"deniedPathsAbsentAtServer":6},{"browser":"Chromium","routing":false,"nodeHttpStatus":200,"contexts":10,"complete":8,"deniedPaths":3,"deniedPathsAbsentAtServer":3}]. Do not add duplicate browser reruns to a requirements-coverage percentage.

## Modified files in this continuation

Production source: `server/services/wordOfDayAttempt.js` (new); `server/routes/student.js` (daily handler only); `server/.env.example` (placeholder hygiene only). Local tooling: `scripts/qa-postgres.mjs` (temporary-root option, UTF-8 locale, IPv4 clients). Tests: `server/tests/wordOfDayAtomic.test.js`, `server/tests/helpers/wordOfDayHarness.js`, `server/tests/security.test.js`, `server/tests/auditExampleConfig.test.js`, `tests/credentialClassifier.test.mjs`. Audit tooling/docs: credential classifier/review, browser/environment diagnostics, current probe wrapper/model probes, inventory/report/finalization updates, this report, CREDENTIAL_ROTATION.md, WORD_OF_DAY_REVIEW.md, ISOLATED_TEST_SETUP.md, review-only SQL/preflight and nine refreshed reports/evidence. No active migration was added.

## Remaining BLOCKED checks and owner actions

1. Confirm revocation/replacement for the exposed credential types; never send values as evidence.
2. Supply an authoritative schema-only isolated baseline; review grants, triggers, types and mobile coexistence. Explicitly approve isolated execution of the proposal before real SQL transaction tests. Do not deploy the dependent backend alone.
3. Validate actual rollback, receipt uniqueness, real concurrent sessions, serialization recovery and non-service-role permissions for the proposed function. The modeled tests do not clear these checks. Reconcile already completed legacy logs separately with owner-approved evidence.
4. Complete full Auth/owner/RLS/Storage/Realtime/OTP/MFA, dashboard CRUD, microphone/provider, assistive-technology, physical-device and representative-load workflows in isolation.
5. Have the owner/IT operator correlate host filtering/browser logs for recorded fixture ports/times; security event 5157 was unreadable here. Do not disable machine security to force passes.

## Readiness

**NOT READY — CRITICAL ISSUES REMAIN.** Local unit/mocked integration readiness is improved and existing local SQL testing works. Credential revocation, the unapproved database-dependent reward rollout, browser cold-load failures and full service evidence still prevent signoff. No 100% application functionality or complete requirements coverage is claimed.
