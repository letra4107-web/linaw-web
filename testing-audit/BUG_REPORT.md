# Defect report

Updated: **2026-10-21, Asia/Manila**.

**Evidence boundary:** current working-tree source, including prior edits. PASS means only the named executed assertion. Mocks, rendered pages, coverage, compilation and anonymous redirects do not establish complete live functionality. No shared Supabase calls/mutations, real account creation, delivery, proposed Word-of-Day SQL execution, deployment, commit, push, ref deletion or Git maintenance occurred. Private environment values never appear in reports. Earlier reports are retained in [baseline-reports](evidence/final-verification/baseline-reports/).

**NOT READY — CRITICAL ISSUES REMAIN.** Local testing readiness improved, but credential revocation is uncertain, Word-of-Day database validation is unapproved/unexecuted, real Supabase role workflows remain blocked, and browser network reliability is unresolved.

## Previously documented issues

| ID | Severity | Current disposition | Actual boundary |
| --- | --- | --- | --- |
| AUD-001 | CRITICAL | OPEN | Four credential types remain in the retained local checkpoint blob; owner revocation incomplete/uncertain. Working tree/index/HEAD have zero recognized credential-shaped findings. No containing commit among scanned stored commits. No new remote read or validity probe. |
| AUD-002 | MEDIUM | FIXED LOCALLY | Notifications read-all ownership and >50 rows covered by the passing backend suite; live persistence BLOCKED. |
| AUD-003 / AUD-004 | MEDIUM | FIXED LOCALLY | Boolean settings validation, safe failure boundary and real mocked UI save remain covered. Enforcement of every setting is a separate requirement. |
| AUD-005 | HIGH | CODE PREPARED; SQL BLOCKED | One mandatory atomic RPC, exact web 25 XP contract, retry/concurrency/streak models pass. Proposed SQL and installed schema are not verified. Do not deploy backend alone; legacy lost-XP repair is unsafe to infer. |
| AUD-006 | HIGH | FIXED LOCALLY | Inactive account and role middleware regressions pass. Direct RLS and actual token revocation remain BLOCKED. |
| AUD-007 | HIGH | LOCALLY RECHECKED | Latest approved registry audits report zero vulnerabilities in root, server and QA-tools; no new application dependency upgrade in this continuation. |
| AUD-008 | MEDIUM / ENVIRONMENT | OPEN | Independent Node fixture: Edge routed 9/10 and native 9/10; Chromium routed 6/10 and native 9/10 complete. Node HTTP 200. Application/Vite absent. Exact policy/root cause unproven. |
| AUD-009 | ENVIRONMENT | RESOLVED for existing SQL scope | Fresh disposable PostgreSQL 18.4 run passed 28/28, with verified run ID and worker result. Restricted startup failure retained. WOD SQL remains deliberately excluded. |
| AUD-010 | MEDIUM | UI REGRESSION FOUND AND FIXED | Header CSS hid the prior navigation search; see AUD-018. Desktop action now has actual browser evidence; it searches page labels, not account records. |

## Newly reproduced and corrected issues

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

Original failure evidence and all later results remain under [final-verification](evidence/final-verification/). Local fixes do not establish live cross-service atomicity. Ambiguous PDF metadata acknowledgements and failed cleanup can leave objects requiring reconciliation; auto-deleting a possibly referenced file is unsafe. Parent enrollment compensation remains best effort and cannot prove deployed cascades/grants. Unrelated legacy read/replace XP writers, draft replacement failure, notification/audit consistency and preference enforcement remain database/integration risks, not newly proven failures.

| Group | Files |
| --- | --- |
| Production changes in this continuation only | server/routes/admin.js; server/routes/teacher.js; server/routes/parent.js; src/components/QueryErrorNotice.tsx; src/pages/admin/Dashboard.tsx; src/pages/teacher/Dashboard.tsx; src/pages/student/Dashboard.tsx; src/index.css; src/pages/parent/parent-dashboard-reference.css |
| Tests / verification tooling / review package | server/tests/sectionAssignmentQa.test.js; server/tests/finalApiContracts.test.js; server/tests/finalUploadContracts.test.js; server/tests/finalEnrollmentContracts.test.js; tests/finalClientContracts.test.mjs; tests/helpers/load-ts.mjs; scripts/qa-tools/package.json; scripts/qa-tools/package-lock.json; scripts/qa-playwright.mjs; testing-audit/fixtures/roleModel.mjs; testing-audit/fixtures/browserSupabase.mjs; testing-audit/role-browser.mjs; testing-audit/coverage-run.mjs; testing-audit/dependency-review.mjs; testing-audit/analytics-performance.mjs; testing-audit/final-local-checks.mjs; testing-audit/github-credential-scan.mjs; testing-audit/final-verification-report.mjs; testing-audit/review/WORD_OF_DAY_ISOLATED_VALIDATION.md; testing-audit/inventory.mjs; testing-audit/verify-final-reports.mjs |
| Generated reports/evidence | All readiness reports listed in FINAL_TESTING_REPORT; inventories, case CSV/JSON, coverage reports, TAP, browser JSON/screenshots and advisories under testing-audit/. Existing unrelated working-tree edits preserved. |


All preserved browser attempts, including initial fixture/setup failures and pre-fix runs: [execution index](BROWSER_EXECUTION_INDEX.csv). Raw statuses are retained; invalid fixtures do not establish successful data behavior.

