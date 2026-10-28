# Regression verification

Updated: **2026-10-21, Asia/Manila**.

**Evidence boundary:** current working-tree source, including prior edits. PASS means only the named executed assertion. Mocks, rendered pages, coverage, compilation and anonymous redirects do not establish complete live functionality. No shared Supabase calls/mutations, real account creation, delivery, proposed Word-of-Day SQL execution, deployment, commit, push, ref deletion or Git maintenance occurred. Private environment values never appear in reports. Earlier reports are retained in [baseline-reports](evidence/final-verification/baseline-reports/).

| Executed check | Result | Evidence |
| --- | --- | --- |
| backend | 494 PASS, 0 FAIL, 2 skipped / 496 total | [evidence/final-verification/gates-release-review/backend.tap](evidence/final-verification/gates-release-review/backend.tap) |
| frontend | 54 PASS, 0 FAIL, 0 skipped / 54 total | [evidence/final-verification/gates-release-review/frontend.tap](evidence/final-verification/gates-release-review/frontend.tap) |
| lint | exit 0 | [evidence/final-verification/gates-release-review/lint.txt](evidence/final-verification/gates-release-review/lint.txt) |
| TypeScript build mode (tsc -b) | exit 0 | [evidence/final-verification/gates-release-review/build.txt](evidence/final-verification/gates-release-review/build.txt) |
| Normal production Vite build | exit 0 | [evidence/final-verification/gates-release-review/vite-build.txt](evidence/final-verification/gates-release-review/vite-build.txt) |
| diff | exit 0 | [evidence/final-verification/gates-release-review/diff.txt](evidence/final-verification/gates-release-review/diff.txt) |

Baseline 478 PASS and 2 skipped; final 548 PASS and 2 skipped, **70 new passing regressions**. [New tests by name](NEW_REGRESSION_CASES.csv); [all test cases](FINAL_CASE_REGISTER.csv).

| ID | Severity | Status | Files | Reproduced problem | Correction / limitation | Evidence under final-verification |
| --- | --- | --- | --- | --- | --- | --- |
| AUD-011 | MEDIUM | FIXED LOCALLY | server/routes/admin.js | Section assignment catch returned raw unexpected persistence diagnostics. | Sanitized 500; validation-specific errors retained. | sections-before.tap: 6P/1F; sections-after.tap: 7P/0F |
| AUD-012 | MEDIUM | FIXED LOCALLY | server/routes/admin.js | Analytics ignored failed queries and returned HTTP 200 with plausible zero/partial totals. | Check all four query errors before aggregation; safe 500 on any failure. | analytics-before.tap: 35P/5F; api-contracts-after.tap: 40P/0F |
| AUD-013 | MEDIUM | FIXED LOCALLY; real Storage BLOCKED | server/routes/teacher.js | Definite metadata rejection left a new unreferenced PDF object. | Best-effort deletion only of the new owned object after a definitive SQL rejection. Ambiguous commit acknowledgement retains file for reconciliation. | uploads-before.tap: 4P/6F; uploads-final.tap: 12P/0F; removal failure/lost acknowledgement regressions included |
| AUD-014 | MEDIUM | FIXED LOCALLY | server/routes/teacher.js | Same filename and millisecond collided in PDF/PDF-drill object keys. | Random UUID keys retain the owner prefix and sanitized name. | Both upload endpoints tested concurrently with Date.now fixed; uploads-final.tap |
| AUD-015 | MEDIUM | FIXED LOCALLY; distributed rollback BLOCKED | server/routes/parent.js | Rejected/throwing cleanup could prevent later compensation and sanitized enrollment response. | Attempt each cleanup independently; inspect returned errors and catch rejections. | enrollment-before.tap: 6P/1F; enrollment-after.tap: 7P/0F |
| AUD-016 | MEDIUM | FIXED LOCALLY; mocked browser verified | src/components/QueryErrorNotice.tsx; Admin/Teacher/Student Dashboard.tsx | Failed dashboard data queries lacked consistent user-visible error feedback and retry. | Sanitized accessible alert and retry of affected dashboard queries. | dashboard-outage-before/firefox-error.json; roles-outage-final/firefox-error.json; student-outage-fixed-port/firefox-error.json |
| AUD-017 | MEDIUM | FIXED LOCALLY for measured nodes | src/index.css; src/pages/parent/parent-dashboard-reference.css | Automated dashboard scan found text contrast below WCAG AA on muted text, links, calendar, badges/avatar and the restored header. | Scoped text/background colors meet the measured threshold. | dashboard-data-before/ and roles-final-firefox/; admin-header-final/ and roles-verified-firefox/; incomplete scan nodes still require manual review |
| AUD-018 / AUD-010 | MEDIUM | FIXED LOCALLY for desktop search | src/index.css | Existing display:none!important hid the utility header, making the previously added navigation search unreachable. | Remove the overriding hide rule; existing responsive classes retain desktop-only header visibility. | roles-chromium/chromium-populated.json search FAIL; roles-verified-firefox/ search PASS; admin-header-final/ after evidence |

Existing fixes for scoped notification read-all, boolean settings, inactive accounts, role matrix, PDF validation, numeric validation, protected routes, error boundaries and WOD contract-model recovery remain in passing TAP. Existing SQL: 28/28 in the fresh isolated cluster; proposed WOD SQL excluded.

| Run (separate scope; no retry-until-pass) | PASS / FAIL / BLOCKED | Evidence |
| --- | --- | --- |
| role-desktop-final | 46 / 1 / 0 | [evidence/final-verification/roles-verified-firefox/firefox-populated.json](evidence/final-verification/roles-verified-firefox/firefox-populated.json) |
| admin-header-final | 6 / 0 / 0 | [evidence/final-verification/admin-header-final/firefox-populated.json](evidence/final-verification/admin-header-final/firefox-populated.json) |
| role-responsive | 135 / 5 / 0 | [evidence/final-verification/roles-responsive-firefox/firefox-populated-empty.json](evidence/final-verification/roles-responsive-firefox/firefox-populated-empty.json) |
| role-edge | 43 / 4 / 0 | [evidence/final-verification/roles-edge/edge-populated.json](evidence/final-verification/roles-edge/edge-populated.json) |
| role-chromium | 46 / 1 / 0 | [evidence/final-verification/roles-chromium/chromium-populated.json](evidence/final-verification/roles-chromium/chromium-populated.json) |
| dashboard-outage | 6 / 2 / 0 | [evidence/final-verification/roles-outage-final/firefox-error.json](evidence/final-verification/roles-outage-final/firefox-error.json) |
| student-outage-settled | 2 / 0 / 0 | [evidence/final-verification/student-outage-fixed-port/firefox-error.json](evidence/final-verification/student-outage-fixed-port/firefox-error.json) |
| public-firefox | 58 / 0 / 0 | [evidence/final-verification/public-final/local-firefox.json](evidence/final-verification/public-final/local-firefox.json) |
| public-edge | 55 / 3 / 0 | [evidence/final-verification/public-edge-fixed-port/local-edge.json](evidence/final-verification/public-edge-fixed-port/local-edge.json) |
| public-chromium | 57 / 1 / 0 | [evidence/final-verification/public-chromium-fixed-port/local-chromium.json](evidence/final-verification/public-chromium-fixed-port/local-chromium.json) |

Every original run is retained. Early unsafe-port (:9) API fixtures, missing MFA/listFactors/table shapes, an overly strict message locator and React Query retry-settling errors were harness limitations; they are not application PASS evidence. The corrected browser suite uses relative /api, explicit synthetic contracts, unexpected-call assertions and the actual AuthProvider/router/components. No source fixture enters the normal build (artifact scan confirms no QA role markers). Some raw browser rows remain FAIL because of denied/aborted asset loads, navigation/refused-connection failures or the subsequently corrected hidden Admin header. The earlier all-role student outage assertion checked too early between retries; the fixed-port student run waits for terminal query errors and verifies recovery. The ephemeral-port EACCES setup failures are retained even when verified fixed ports work. No application asset was substituted and no security policy was disabled. Automated accessibility scans cover four dashboards only and retain incomplete nodes for manual review; zero reported violations is not full WCAG certification.

| Measured area | Files | Lines | Functions | Branches | Scope |
| --- | --- | --- | --- | --- | --- |
| backend | 38 | 61.29% (2830/4617) | 79.72% | 68.53% | c8 --all for backend JS excluding tests and operator scripts; unloaded eligible files included |
| frontend | 12 | 77.98% (790/1013) | 59.57% | 75.43% | Source-mapped frontend TS units executed through the test loader; loaded modules only; excludes browser rendering coverage and unloaded pages |

Coverage was measured with c8/V8, not estimated from test count. [Backend HTML](evidence/final-verification/coverage-final/backend/index.html), [frontend unit HTML](evidence/final-verification/coverage-final/frontend/index.html), [raw summary](evidence/final-verification/coverage-final/summary.json). Frontend **whole-application coverage is not available**: only executed unit modules are measured, and CSS/browser rendering is outside that denominator. Backend --all includes unexecuted eligible files. These percentages cannot be combined or compared with the former loaded-module 46.61% figure as if scopes were identical. c8 and axe-core are QA-only tooling; official measurement/tool scope: [c8](https://github.com/bcoe/c8), [axe-core](https://github.com/dequelabs/axe-core).

Fresh approved dependency advisories are zero for frontend/backend/QA tooling. [Final preservation and production scan](evidence/final-verification/gates-release-review/). Do not treat skipped staging cases as passes.

All preserved browser attempts, including initial fixture/setup failures and pre-fix runs: [execution index](BROWSER_EXECUTION_INDEX.csv). Raw statuses are retained; invalid fixtures do not establish successful data behavior.

