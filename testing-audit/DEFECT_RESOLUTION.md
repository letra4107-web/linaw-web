> XP security follow-up (22 October 2026): OPEN-01 is fixed locally for the supported contract; shared rollout remains OPEN/BLOCKED. This document retains the prior audit baseline. See [current XP/progress status](XP_PROGRESS_FINAL_STATUS.md).

# Final defect resolution continuation

Updated: **2026-10-21, Asia/Manila**.

**Evidence boundary:** current working-tree source, including prior edits. PASS means only the named executed assertion. Mocks, rendered pages, coverage, compilation and anonymous redirects do not establish complete live functionality. No shared Supabase calls/mutations, real account creation, delivery, proposed Word-of-Day SQL execution, deployment, commit, push, ref deletion or Git maintenance occurred. Private environment values never appear in reports. Earlier reports are retained in [baseline-reports](evidence/final-verification/baseline-reports/).

**NOT READY — CRITICAL ISSUES REMAIN.** Local testing readiness improved, but credential revocation is uncertain, Word-of-Day database validation is unapproved/unexecuted, real Supabase role workflows remain blocked, and browser network reliability is unresolved.

| Existing ID | Severity | Disposition | Boundary |
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

| Executed check | Result | Evidence |
| --- | --- | --- |
| backend | 494 PASS, 0 FAIL, 2 skipped / 496 total | [evidence/final-verification/gates-release-review/backend.tap](evidence/final-verification/gates-release-review/backend.tap) |
| frontend | 54 PASS, 0 FAIL, 0 skipped / 54 total | [evidence/final-verification/gates-release-review/frontend.tap](evidence/final-verification/gates-release-review/frontend.tap) |
| lint | exit 0 | [evidence/final-verification/gates-release-review/lint.txt](evidence/final-verification/gates-release-review/lint.txt) |
| TypeScript build mode (tsc -b) | exit 0 | [evidence/final-verification/gates-release-review/build.txt](evidence/final-verification/gates-release-review/build.txt) |
| Normal production Vite build | exit 0 | [evidence/final-verification/gates-release-review/vite-build.txt](evidence/final-verification/gates-release-review/vite-build.txt) |
| diff | exit 0 | [evidence/final-verification/gates-release-review/diff.txt](evidence/final-verification/gates-release-review/diff.txt) |

| Measured area | Files | Lines | Functions | Branches | Scope |
| --- | --- | --- | --- | --- | --- |
| backend | 38 | 61.29% (2830/4617) | 79.72% | 68.53% | c8 --all for backend JS excluding tests and operator scripts; unloaded eligible files included |
| frontend | 12 | 77.98% (790/1013) | 59.57% | 75.43% | Source-mapped frontend TS units executed through the test loader; loaded modules only; excludes browser rendering coverage and unloaded pages |

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

| Group | Files |
| --- | --- |
| Production changes in this continuation only | server/routes/admin.js; server/routes/teacher.js; server/routes/parent.js; src/components/QueryErrorNotice.tsx; src/pages/admin/Dashboard.tsx; src/pages/teacher/Dashboard.tsx; src/pages/student/Dashboard.tsx; src/index.css; src/pages/parent/parent-dashboard-reference.css |
| Tests / verification tooling / review package | server/tests/sectionAssignmentQa.test.js; server/tests/finalApiContracts.test.js; server/tests/finalUploadContracts.test.js; server/tests/finalEnrollmentContracts.test.js; tests/finalClientContracts.test.mjs; tests/helpers/load-ts.mjs; scripts/qa-tools/package.json; scripts/qa-tools/package-lock.json; scripts/qa-playwright.mjs; testing-audit/fixtures/roleModel.mjs; testing-audit/fixtures/browserSupabase.mjs; testing-audit/role-browser.mjs; testing-audit/coverage-run.mjs; testing-audit/dependency-review.mjs; testing-audit/analytics-performance.mjs; testing-audit/final-local-checks.mjs; testing-audit/github-credential-scan.mjs; testing-audit/final-verification-report.mjs; testing-audit/review/WORD_OF_DAY_ISOLATED_VALIDATION.md; testing-audit/inventory.mjs; testing-audit/verify-final-reports.mjs |
| Generated reports/evidence | All readiness reports listed in FINAL_TESTING_REPORT; inventories, case CSV/JSON, coverage reports, TAP, browser JSON/screenshots and advisories under testing-audit/. Existing unrelated working-tree edits preserved. |

| ID | Role/module | Blocked work | Specific prerequisite | Plan |
| --- | --- | --- | --- | --- |
| BLOCK-001 | owner/security | Credential revocation | Owner answered revocation incomplete or uncertain. Old credentials must be revoked; removing references does not secure a credential. | [CREDENTIAL_ROTATION.md](CREDENTIAL_ROTATION.md) |
| BLOCK-002 | student/mobile | Real Word-of-Day SQL atomicity, locks, grants, isolation and mobile coexistence | Proposed RPC deliberately unexecuted; owner approval and private authoritative schema are absent. Model rollback/mutexes are not SQL evidence. | [review/WORD_OF_DAY_ISOLATED_VALIDATION.md](review/WORD_OF_DAY_ISOLATED_VALIDATION.md) |
| BLOCK-003 | all roles | Real Auth sessions, token revocation, MFA, direct RLS and cross-role access | Requires separate Supabase project and dedicated synthetic accounts; no shared requests authorized. | [INTEGRATION_TEST_READINESS.md](INTEGRATION_TEST_READINESS.md) |
| BLOCK-004 | admin/parent/teacher | Durable account enrollment/archive/restore/sections/materials and rollback | Auth, PostgreSQL and Storage span separate services; mocked compensation is not distributed atomicity. | [INTEGRATION_TEST_READINESS.md](INTEGRATION_TEST_READINESS.md) |
| BLOCK-005 | all roles | SMTP/Brevo email, ElevenLabs, browser microphone and physical-device audio | External delivery and provider credentials were not exercised. Needs dedicated service test credentials/devices. | [INTEGRATION_TEST_READINESS.md](INTEGRATION_TEST_READINESS.md) |
| BLOCK-006 | all roles | Realtime delivery, actual upload permissions, signed URL expiry and production configuration | Local fake channels and file stores do not measure live RLS, bucket policies, triggers or networking. | [INTEGRATION_TEST_READINESS.md](INTEGRATION_TEST_READINESS.md) |
| BLOCK-007 | browser environment | Reliable cold loading and host network diagnosis | Independent fixture still reproduces ERR_NETWORK_ACCESS_DENIED; some runs also hit loopback EACCES/CONNECTION_REFUSED. Host logs/policy attribution absent. | [NON_FUNCTIONAL_TEST_CASES.md](NON_FUNCTIONAL_TEST_CASES.md) |
| BLOCK-008 | accessibility/performance | Full assistive-technology, load, physical mobile and formal UAT signoff | Automated scans have incomplete contrast nodes; synthetic local timings omit service latency. No screen-reader/device/load environment. | [NON_FUNCTIONAL_TEST_CASES.md](NON_FUNCTIONAL_TEST_CASES.md) |
| BLOCK-009 | student | Historical missed-XP repair | Old xp_awarded flags cannot establish actual payment. Needs independent records and separately approved repair. | [WORD_OF_DAY_REVIEW.md](WORD_OF_DAY_REVIEW.md) |

Full consolidated evidence and readiness: [FINAL_TESTING_REPORT.md](FINAL_TESTING_REPORT.md).

All preserved browser attempts, including initial fixture/setup failures and pre-fix runs: [execution index](BROWSER_EXECUTION_INDEX.csv). Raw statuses are retained; invalid fixtures do not establish successful data behavior.

