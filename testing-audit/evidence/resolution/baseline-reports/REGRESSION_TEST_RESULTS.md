# Regression results

Audit date: **2026-10-21, Asia/Manila**. Working-tree source, including pre-existing edits, was audited. No shared Supabase requests, schema changes, record changes, account creation, email delivery, commit, push, or deployment were performed. PASS applies only to the named executed assertion. Source indexing, compilation, mocks, and anonymous redirects do not establish complete signed-in functionality.

| Final gate | Exit | Time ms | Counts |
| --- | --- | --- | --- |
| backend | 0 | 9811 | {"tests":421,"pass":419,"fail":0,"skipped":2} |
| frontend | 0 | 4305 | {"tests":39,"pass":39,"fail":0,"skipped":0} |
| lint | 0 | 2781 |  |
| build | 0 | 25413 |  |
| vite-build | 0 | 10261 |  |
| diff | 0 | 2262 |  |

| Browser recheck | Engine version | Case outcomes | Evidence |
| --- | --- | --- | --- |
| edge | 155.0.4283.62 | {"FAIL":2,"PASS":56} | [evidence/browser-recheck/local-edge.json](evidence/browser-recheck/local-edge.json) |
| chromium | 156.0.8078.4 | {"PASS":57,"FAIL":1} | [evidence/browser-recheck/local-chromium.json](evidence/browser-recheck/local-chromium.json) |
| firefox | 157.0 | {"PASS":58} | [evidence/browser-recheck/local-firefox.json](evidence/browser-recheck/local-firefox.json) |

Final Firefox run after dependency updates: {"PASS":58}; version 157.0. See [evidence/browser-final-approved/local-firefox.json](evidence/browser-final-approved/local-firefox.json). This is another run of the same cases, not additional independent requirements.

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
| Final gates | `$env:QA_EVIDENCE_DIR='testing-audit/evidence/final'; node scripts/qa-checks.mjs` | [evidence/final/check-summary.json](evidence/final/check-summary.json) |
| Backend coverage | `$env:E2E_ALLOW_STAGING_TESTS='false'; node --test --experimental-test-coverage '--test-coverage-include=server/**/*.js' '--test-coverage-exclude=server/tests/**' '--test-coverage-exclude=**/node_modules/**' server/tests/*.test.js` | [evidence/backend-coverage-final.tap](evidence/backend-coverage-final.tap) |
| Public browser recheck | `$env:QA_EVIDENCE_DIR='testing-audit/evidence/browser-recheck'; node scripts/qa-playwright.mjs` | [evidence/browser-recheck/](evidence/browser-recheck/) |
| Final Firefox artifact (outside sandbox; sandbox crash retained) | `$env:QA_EVIDENCE_DIR='testing-audit/evidence/browser-final-approved'; node scripts/qa-playwright.mjs --browser=firefox` | [evidence/browser-final/](evidence/browser-final/) |
| Advisories | `npm.cmd audit --json; npm.cmd --prefix server audit --json` | [evidence/frontend-dependencies-final.json](evidence/frontend-dependencies-final.json) |
| Failure characterization | `node testing-audit/probes.mjs` | [evidence/transaction-probes.json](evidence/transaction-probes.json) |
| Inventory/report | `node testing-audit/inventory.mjs; node testing-audit/report.mjs` | [inventory.json](inventory.json) |

Node/native V8 coverage requires the installed Node version (22.19.0 used here). The failure probe intentionally exits nonzero when it reproduces AUD-005. The database verifier also exits nonzero for BLOCKED setup. Browser suites exit nonzero on named failures; these are separate from npm test. No suite reads shared credentials to exercise successful service operations.
