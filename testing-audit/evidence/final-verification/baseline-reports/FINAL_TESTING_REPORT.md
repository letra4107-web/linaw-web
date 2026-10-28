# Final testing report

> **Defect-resolution continuation (2026-10-21):** current evidence is under `evidence/resolution/`. Existing local SQL: 28 PASS. Word of the Day: application code prepared and verified with an atomic-RPC contract model; SQL proposal deliberately NOT EXECUTED and installed schema/rollout remain BLOCKED. AUD-001 remains OPEN pending owner revocation. [Resolution details](DEFECT_RESOLUTION.md), [credential owner actions](CREDENTIAL_ROTATION.md), [SQL review boundary](WORD_OF_DAY_REVIEW.md).

Audit date: **2026-10-21, Asia/Manila**. Working-tree source, including pre-existing edits, was audited. No requests or changes were made to shared Supabase. Existing SQL ran only in a disposable synthetic local fixture. The new SQL proposal was not executed. No real-account creation, email delivery, commit, push or deployment occurred. PASS applies only to the named executed assertion. Source indexing, compilation, mocks, and anonymous redirects do not establish complete signed-in functionality.

## Readiness assessment

**NOT READY — CRITICAL ISSUES REMAIN.** Credential exposure remains OPEN pending owner revocation. Word of the Day application code is prepared and passes mocked atomic-RPC tests, but its new database dependency has not been executed or approved and the installed schema remains unverified. The endpoint fails closed if the RPC is unavailable. Existing local SQL is now verified at 28/28; full Supabase workflows remain BLOCKED.

## A. Project inventory

383 source/configuration/test/asset entries; 54 page files; 3078 function definitions including callbacks/test/tooling code (2143 product definitions); 74 API declarations plus the public TTS alias; 57 UI route declarations including layouts/fallbacks; 544 interactive source templates; 47 web migrations. Counts refer to source definitions and do not equal independent functional requirements. [PROJECT_INVENTORY.md](PROJECT_INVENTORY.md) and machine-readable CSV/JSON indexes provide locations, dependencies and classification for every discovered source entry.

## B. Functionality audit

All four implemented roles and shared/public modules are inventoried and classified. 33 whole-workflow cases and 74 full API cases remain BLOCKED. Every discovered interactive template has BLOCKED or NOT RUN status at its whole-control scope; passing focused subcases remain separately identified. [FUNCTIONALITY_AUDIT.md](FUNCTIONALITY_AUDIT.md) and [FUNCTIONAL_TEST_CASES.md](FUNCTIONAL_TEST_CASES.md) preserve preconditions, steps, expected/actual results and evidence. No full dashboard CRUD is marked PASS from an event handler, mock or anonymous redirect.

## C. Defects and corrections

Local fixes: example credential cleanup; notification read-all scope; Admin boolean validation and safe persistence errors; inactive-account enforcement on shared authenticated endpoints; compatible Vite/source-map-js security updates; working Admin page search. [BUG_REPORT.md](BUG_REPORT.md) includes root causes, affected files, before/after evidence and remaining limitations. Critical exposure rotation and database-dependent Word-of-Day rollout remain open; modeled application recovery passes. Other multiwrite/RLS risks need isolated verification.

## D. Actual testing results

| Category | Actual result | Evidence |
| --- | --- | --- |
| Unit testing | Existing pure/business/auth/validation and isolated frontend units execute; the mixed backend suite is not mislabeled entirely as unit testing | [UNIT_TEST_READINESS.md](UNIT_TEST_READINESS.md) |
| Backend mixed unit/integration | {"tests":436,"pass":434,"fail":0,"cancelled":0,"skipped":2} | [evidence/resolution/gates/backend.tap](evidence/resolution/gates/backend.tap) |
| Frontend isolated units | {"tests":41,"pass":41,"fail":0,"cancelled":0,"skipped":0} | [evidence/resolution/gates/frontend.tap](evidence/resolution/gates/frontend.tap) |
| Integration testing | Actual local Express boundaries and mocked routes/providers execute; existing local SQL 28 PASS. Full Supabase and new WOD SQL remain BLOCKED | [Integration readiness](INTEGRATION_TEST_READINESS.md) |
| Functional browser recheck | [{"browser":"edge","FAIL":2,"PASS":56},{"browser":"chromium","PASS":57,"FAIL":1},{"browser":"firefox","PASS":58}] | [REGRESSION_TEST_RESULTS.md](REGRESSION_TEST_RESULTS.md) |
| Failure-recovery integration probe | 2 PASS against explicit RPC contract model; actual SQL TX-SQL BLOCKED, not executed | [Current probe results](evidence/transaction-probes.json) |
| Non-functional | Narrow security/accessibility/responsive/reliability checks run; production workload, physical devices and complete accessibility not certified | [NON_FUNCTIONAL_TEST_CASES.md](NON_FUNCTIONAL_TEST_CASES.md) |
| Regression gates | [{"name":"backend","exitCode":0},{"name":"frontend","exitCode":0},{"name":"lint","exitCode":0},{"name":"build","exitCode":0},{"name":"vite-build","exitCode":0},{"name":"diff","exitCode":0}] | [evidence/resolution/gates/check-summary.json](evidence/resolution/gates/check-summary.json) |
| Dependency advisory scans | [{"workspace":"frontend","info":0,"low":0,"moderate":0,"high":0,"critical":0,"total":0},{"workspace":"backend","info":0,"low":0,"moderate":0,"high":0,"critical":0,"total":0}] | [evidence/resolution/frontend-dependencies.json](evidence/resolution/frontend-dependencies.json) |

Local Node assertions: **475 passed, 0 failed, 2 skipped**. Skipped staging suites are classified BLOCKED. These totals exclude browser cases and the separate RPC contract-model probes and unexecuted SQL case. Final Firefox dependency-update smoke results, if available, are a rerun and not summed into new case coverage.

## E. Coverage

Actual Node/V8 loaded-backend coverage: 46.61% lines, 74.17% branches, 61.17% functions, excluding tests/node_modules. This denominator includes only loaded matching backend files; it excludes frontend TypeScript and unloaded source. No overall application code-coverage percentage or requirements-coverage percentage is claimed. Requirements overlap and some are blocked; source/template counts are not coverage.

## F. Remaining issues and blocked verification

- AUD-001: one retained local checkpoint blob contains four credential types; current examples in working tree/index/HEAD contain placeholders. The [GitHub cleanup review](GITHUB_CREDENTIAL_CLEANUP.md) found no containing commit in 206 scanned commits and corrected the earlier history scope. Owner revocation/rotation confirmation is still required. [Exact instructions](CREDENTIAL_ROTATION.md).
- AUD-005: prepared code requires the new atomic RPC; missing RPC returns 503 without split writes. SQL proposal/preflight were NOT executed and must be reviewed against an authoritative isolated schema before rollout. Legacy completed logs cannot be safely auto-credited. [Review](WORD_OF_DAY_REVIEW.md).
- AUD-008: independent HTML/CSS/20-script fixture reproduces access denials in native and intercepted Edge/Chromium loading; application code is not a necessary cause. Latest public browser failures remain recorded. Specific host/browser policy is unresolved; operator logs are needed.
- AUD-009: existing local SQL blocker is resolved with 28 actual assertions passed. This does not establish full Supabase Auth/PostgREST/Storage/RLS correctness or the unexecuted proposal.
- Real Auth/email/OTP/MFA, all owner/role/bucket workflows, enrollment compensation, Realtime, audio quality, full accessibility, physical devices, representative load and unrelated multiwrite rewards remain BLOCKED/NOT RUN at their documented scope.
- No deployment, commit, push, live environment change, credential use/rotation or shared record/schema modification occurred.

## G. Conditions for formal signoff

Confirm credential revocation, review and explicitly approve isolated execution of the atomic reward proposal, provide an authoritative separate Supabase baseline and execute the blocked API/role/owner/storage/user journeys and browser reliability/assistive-technology cases. Existing local SQL execution is restored. Local tests can enter formal unit/mock integration testing now; full functionality signoff still lacks evidence.

[Machine-readable current results](results.json) is generated from fresh evidence. Historical docs/qa reports remain reference-only and were preserved.
