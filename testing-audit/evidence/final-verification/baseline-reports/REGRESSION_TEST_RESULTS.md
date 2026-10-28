# Regression results

> **Defect-resolution continuation (2026-10-21):** current evidence is under `evidence/resolution/`. Existing local SQL: 28 PASS. Word of the Day: application code prepared and verified with an atomic-RPC contract model; SQL proposal deliberately NOT EXECUTED and installed schema/rollout remain BLOCKED. AUD-001 remains OPEN pending owner revocation. [Resolution details](DEFECT_RESOLUTION.md), [credential owner actions](CREDENTIAL_ROTATION.md), [SQL review boundary](WORD_OF_DAY_REVIEW.md).

Audit date: **2026-10-21, Asia/Manila**. Working-tree source, including pre-existing edits, was audited. No requests or changes were made to shared Supabase. Existing SQL ran only in a disposable synthetic local fixture. The new SQL proposal was not executed. No real-account creation, email delivery, commit, push or deployment occurred. PASS applies only to the named executed assertion. Source indexing, compilation, mocks, and anonymous redirects do not establish complete signed-in functionality.

| Final gate | Exit | Time ms | Counts |
| --- | --- | --- | --- |
| backend | 0 | 2931 | {"tests":436,"pass":434,"fail":0,"skipped":2} |
| frontend | 0 | 1547 | {"tests":41,"pass":41,"fail":0,"skipped":0} |
| lint | 0 | 156 |  |
| build | 0 | 17422 |  |
| vite-build | 0 | 9730 |  |
| diff | 0 | 156 |  |

| Browser recheck | Engine version | Case outcomes | Evidence |
| --- | --- | --- | --- |
| edge | 155.0.4283.62 | {"FAIL":2,"PASS":56} | [evidence/resolution/browser/local-edge.json](evidence/resolution/browser/local-edge.json) |
| chromium | 156.0.8078.4 | {"PASS":57,"FAIL":1} | [evidence/resolution/browser/local-chromium.json](evidence/resolution/browser/local-chromium.json) |
| firefox | 157.0 | {"PASS":58} | [evidence/resolution/browser/local-firefox.json](evidence/resolution/browser/local-firefox.json) |

Final Firefox run after dependency updates: {"PASS":58}; version 157.0. See [evidence/resolution/browser/local-firefox.json](evidence/resolution/browser/local-firefox.json). This is another run of the same cases, not additional independent requirements.

## Reproduction and retest ledger

| Correction | Before | After |
| --- | --- | --- |
| Notifications >50 | 1 failed / 2 passed; 25 of 75 owned notices remained unread | Targeted and full backend regressions pass |
| Admin toggle validation and error status | 2 failed / 1 passed | 3 targeted tests and full backend regressions pass |
| Shared endpoint inactive accounts | Notifications/Auth event cases failed; original TTS fixture lacked global.fetch and was corrected | Actual role/status middleware denies inactive accounts and permits active control cases |
| Example credential literals | Source inspection identified credential-shaped values; no credential validation attempted | Placeholder regression passes; rotation remains unverified |
| Frontend advisory packages | 2 high reported affected packages | Final root and server npm audits report zero |
| Admin search | Source-only inspection: unbound input | 3 isolated interaction tests pass; authenticated DOM workflow remains BLOCKED |

The early HTTP role matrix recorded 164 PASS / 71 FAIL due fetch failures. The in-process replacement recorded 235 PASS. Both artifacts are retained and the scopes are explicit. Final Node suite passes do not prove the host HTTP issue fixed. Initial browser failure details and initial failed DB setup remain under evidence/; approved rechecks have separate directories. No obsolete failed assertion is silently replaced by an unrelated scope.

## Reproduction commands

| Purpose | PowerShell command | Evidence |
| --- | --- | --- |
| Final gates | `$env:QA_EVIDENCE_DIR='testing-audit/evidence/final'; node scripts/qa-checks.mjs` | [evidence/resolution/gates/check-summary.json](evidence/resolution/gates/check-summary.json) |
| Backend coverage | `$env:E2E_ALLOW_STAGING_TESTS='false'; node --test --experimental-test-coverage '--test-coverage-include=server/**/*.js' '--test-coverage-exclude=server/tests/**' '--test-coverage-exclude=**/node_modules/**' server/tests/*.test.js` | [evidence/resolution/backend-coverage.tap](evidence/resolution/backend-coverage.tap) |
| Public browser recheck | `$env:QA_EVIDENCE_DIR='testing-audit/evidence/browser-recheck'; node scripts/qa-playwright.mjs` | [evidence/resolution/browser/](evidence/resolution/browser/) |
| Final Firefox artifact (outside sandbox; sandbox crash retained) | `$env:QA_EVIDENCE_DIR='testing-audit/evidence/browser-final-approved'; node scripts/qa-playwright.mjs --browser=firefox` | [evidence/browser-final/](evidence/browser-final/) |
| Advisories | `npm.cmd audit --json; npm.cmd --prefix server audit --json` | [evidence/resolution/frontend-dependencies.json](evidence/resolution/frontend-dependencies.json) |
| Failure characterization | `node testing-audit/probes.mjs` | [evidence/transaction-probes.json](evidence/transaction-probes.json) |
| Inventory/report | `node testing-audit/inventory.mjs; node testing-audit/report.mjs` | [inventory.json](inventory.json) |

Node/native V8 coverage requires the installed Node version (22.19.0 used here). The updated failure probe exits nonzero only on a failed assertion; current application/model checks pass while actual WOD SQL remains BLOCKED. Original failing evidence is preserved. The database verifier also exits nonzero for BLOCKED setup. Browser suites exit nonzero on named failures; these are separate from npm test. No suite reads shared credentials to exercise successful service operations.

## Resolution continuation

Existing disposable SQL: **28 PASS**, verified fresh matching run. Word of Day: real route/service with atomic-RPC contract model passes failures, replay, lost acknowledgement, streak and twenty-call concurrency cases; proposal remains unexecuted. Independent browser fixture: [{"browser":"Edge","routing":true,"nodeHttpStatus":200,"contexts":10,"complete":4,"deniedPaths":9,"deniedPathsAbsentAtServer":9},{"browser":"Edge","routing":false,"nodeHttpStatus":200,"contexts":10,"complete":7,"deniedPaths":3,"deniedPathsAbsentAtServer":3},{"browser":"Chromium","routing":true,"nodeHttpStatus":200,"contexts":10,"complete":7,"deniedPaths":6,"deniedPathsAbsentAtServer":6},{"browser":"Chromium","routing":false,"nodeHttpStatus":200,"contexts":10,"complete":8,"deniedPaths":3,"deniedPathsAbsentAtServer":3}]; these observations retain failed contexts. Credential scan and classifier regression distinguish empty placeholders from historical exposures. [Detailed scope and owner actions](DEFECT_RESOLUTION.md).
