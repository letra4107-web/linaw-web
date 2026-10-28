# Final testing report

Audit date: **2026-10-21, Asia/Manila**. Working-tree source, including pre-existing edits, was audited. No shared Supabase requests, schema changes, record changes, account creation, email delivery, commit, push, or deployment were performed. PASS applies only to the named executed assertion. Source indexing, compilation, mocks, and anonymous redirects do not establish complete signed-in functionality.

## Readiness assessment

**NOT READY — CRITICAL ISSUES REMAIN.** Useful local hardening is complete, but apparent exposed credentials need owner rotation and an executed Word-of-Day failure probe still violates reward recovery. Full database/authenticated workflows remain BLOCKED because the owner confirms no separate environment exists. This is not a 100% functionality claim, release approval or formal testing signoff.

## A. Project inventory

379 source/configuration/test/asset entries; 54 page files; 3032 function definitions including callbacks/test/tooling code (2139 product definitions); 74 API declarations plus the public TTS alias; 57 UI route declarations including layouts/fallbacks; 544 interactive source templates; 47 web migrations. Counts refer to source definitions and do not equal independent functional requirements. [PROJECT_INVENTORY.md](PROJECT_INVENTORY.md) and machine-readable CSV/JSON indexes provide locations, dependencies and classification for every discovered source entry.

## B. Functionality audit

All four implemented roles and shared/public modules are inventoried and classified. 33 whole-workflow cases and 74 full API cases remain BLOCKED. Every discovered interactive template has BLOCKED or NOT RUN status at its whole-control scope; passing focused subcases remain separately identified. [FUNCTIONALITY_AUDIT.md](FUNCTIONALITY_AUDIT.md) and [FUNCTIONAL_TEST_CASES.md](FUNCTIONAL_TEST_CASES.md) preserve preconditions, steps, expected/actual results and evidence. No full dashboard CRUD is marked PASS from an event handler, mock or anonymous redirect.

## C. Defects and corrections

Local fixes: example credential cleanup; notification read-all scope; Admin boolean validation and safe persistence errors; inactive-account enforcement on shared authenticated endpoints; compatible Vite/source-map-js security updates; working Admin page search. [BUG_REPORT.md](BUG_REPORT.md) includes root causes, affected files, before/after evidence and remaining limitations. Critical exposure rotation and high Word-of-Day transaction recovery remain open. Other multiwrite/RLS risks need isolated verification.

## D. Actual testing results

| Category | Actual result | Evidence |
| --- | --- | --- |
| Unit testing | Existing pure/business/auth/validation and isolated frontend units execute; the mixed backend suite is not mislabeled entirely as unit testing | [UNIT_TEST_READINESS.md](UNIT_TEST_READINESS.md) |
| Backend mixed unit/integration | {"tests":421,"pass":419,"fail":0,"cancelled":0,"skipped":2} | [evidence/final/backend.tap](evidence/final/backend.tap) |
| Frontend isolated units | {"tests":39,"pass":39,"fail":0,"cancelled":0,"skipped":0} | [evidence/final/frontend.tap](evidence/final/frontend.tap) |
| Integration testing | Actual local Express HTTP boundaries and mocked route/provider/Storage tests run. SQL setup BLOCKED; full Supabase workflow BLOCKED | [INTEGRATION_TEST_READINESS.md](INTEGRATION_TEST_READINESS.md) |
| Functional browser recheck | [{"browser":"edge","FAIL":2,"PASS":56},{"browser":"chromium","PASS":57,"FAIL":1},{"browser":"firefox","PASS":58}] | [REGRESSION_TEST_RESULTS.md](REGRESSION_TEST_RESULTS.md) |
| Failure-recovery integration probe | FAIL — first 500, retry 409, completion retained with 0 XP | [evidence/transaction-probes.json](evidence/transaction-probes.json) |
| Non-functional | Narrow security/accessibility/responsive/reliability checks run; production workload, physical devices and complete accessibility not certified | [NON_FUNCTIONAL_TEST_CASES.md](NON_FUNCTIONAL_TEST_CASES.md) |
| Regression gates | [{"name":"backend","exitCode":0},{"name":"frontend","exitCode":0},{"name":"lint","exitCode":0},{"name":"build","exitCode":0},{"name":"vite-build","exitCode":0},{"name":"diff","exitCode":0}] | [evidence/final/check-summary.json](evidence/final/check-summary.json) |
| Dependency advisory scans | [{"workspace":"frontend","info":0,"low":0,"moderate":0,"high":0,"critical":0,"total":0},{"workspace":"backend","info":0,"low":0,"moderate":0,"high":0,"critical":0,"total":0}] | [evidence/frontend-dependencies-final.json](evidence/frontend-dependencies-final.json) |

Local Node assertions: **458 passed, 0 failed, 2 skipped**. Skipped staging suites are classified BLOCKED. These totals exclude browser cases and the separate intentionally failing business-invariant probe. Final Firefox dependency-update smoke results, if available, are a rerun and not summed into new case coverage.

## E. Coverage

Actual Node/V8 loaded-backend coverage: 44.94% lines, 72.90% branches, 60.28% functions, excluding tests/node_modules. This denominator includes only loaded matching backend files; it excludes frontend TypeScript and unloaded source. No overall application code-coverage percentage or requirements-coverage percentage is claimed. Requirements overlap and some are blocked; source/template counts are not coverage.

## F. Remaining issues and blocked verification

- Apparent credentials were present in a tracked example. Values were removed locally; if real, rotate/revoke them and review history. No production credential changes were attempted.
- AUD-005: completion and reward writes require atomic failure recovery and concurrency guarantees. Mocked reproduction is retained; schema remediation was not guessed.
- Real Supabase Auth, role/owner RLS, database constraints/durability, enrollment compensation, Storage uploads/URLs, Realtime, email/OTP/MFA and provider audio quality remain BLOCKED. Direct Supabase access must be tested with non-service-role JWTs.
- Fresh disposable SQL assertions did not execute: Windows restricted-token startup and approved-retry loopback EACCES. Historical SQL passes are not current evidence.
- Edge/Chromium cold loading intermittently fails with ERR_NETWORK_ACCESS_DENIED; the recheck still contains failures. Root cause is unresolved. Firefox's selected public suite passed; complete dashboard/physical-device/browser-product compatibility is not established.
- Full assistive-technology/contrast evaluation, physical mobile/microphone tests, large-data/load/resource benchmarks and comprehensive penetration testing remain NOT RUN or BLOCKED as recorded.
- Unattributed per-function and conditional-control behavior stays NOT RUN/BLOCKED in the exhaustive indexes. A complete manual behavioral review of all 3032 definitions has not been established by this audit.

## G. Conditions for formal signoff

Resolve the credential exposure and atomic reward defect, restore safe local SQL execution or supply a separate Supabase environment with authoritative schema and test fixtures, then execute the blocked API/role/owner/storage/user journeys and browser reliability/assistive-technology cases. Local tests can enter formal unit/mock integration testing now; full functionality signoff still lacks evidence.

[Machine-readable current results](results.json) is generated from fresh evidence. Historical docs/qa reports remain reference-only and were preserved.
