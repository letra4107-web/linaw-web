# Project inventory and inspection scope

Updated: **2026-10-21, Asia/Manila**.

**Evidence boundary:** current working-tree source, including prior edits. PASS means only the named executed assertion. Mocks, rendered pages, coverage, compilation and anonymous redirects do not establish complete live functionality. No shared Supabase calls/mutations, real account creation, delivery, proposed Word-of-Day SQL execution, deployment, commit, push, ref deletion or Git maintenance occurred. Private environment values never appear in reports. Earlier reports are retained in [baseline-reports](evidence/final-verification/baseline-reports/).

React/TypeScript/Vite frontend, React Router, TanStack Query and direct Supabase client calls; Express backend with Supabase Auth/PostgreSQL/Storage/Realtime boundaries, SMTP/Brevo, TTS and browser speech. Real deployment settings and live schema were not changed or queried.

| Source index | Count | Artifact |
| --- | --- | --- |
| Indexed source/config/assets/tests/tool files | 389 | [inventory.json](inventory.json) |
| Functions/callbacks including tests and scripts | 3221 | [FUNCTION_INVENTORY.csv](FUNCTION_INVENTORY.csv) |
| Product functions/callbacks | 2149 | src/server excluding tests/operator scripts |
| API declarations | 74 | [API_AND_ROUTE_INVENTORY.csv](API_AND_ROUTE_INVENTORY.csv) |
| UI route declarations incl. layouts/fallbacks | 57 | [API_AND_ROUTE_INVENTORY.csv](API_AND_ROUTE_INVENTORY.csv) |
| Interactive source templates | 545 | [CONTROL_INVENTORY.csv](CONTROL_INVENTORY.csv) |
| Data-access expressions incl. utility calls | 510 | [DATABASE_DEPENDENCIES.csv](DATABASE_DEPENDENCIES.csv) |
| Migration source files | 47 | inventory.json; not full shared schema |
| Test cases in fresh Node run | 550 | [FINAL_CASE_REGISTER.csv](FINAL_CASE_REGISTER.csv) |

The source index was refreshed after the final CSS/header fix; the index is an inspection record, not behavioral execution. Static inventory is an inspection index, not complete behavioral execution. Older reports are archived before replacement. Existing Operations.tsx and ProgressReport.tsx have no recorded direct import in this index; verify reachability before treating them as supported routes. Historical docs are evidence/reference artifacts, not new passes.

| Role | Implemented modules inspected | Executed local/model subset | Remaining real workflow checks |
| --- | --- | --- | --- |
| admin | Dashboard, users, archive, teacher creation, sections, analytics, notifications, profile, audit trail and role monitoring | Analytics query failures, settings validation/save, section failure sanitization, search keyboard flow, ownership/status and existing section SQL | Live account creation/archive/restore, audit/notification consistency, durable settings enforcement, complete monitoring actions |
| teacher | Dashboard, roster, lessons/materials, progress reports, messages and settings | Message send in actual UI with fake persistence; upload byte validation/failure/cleanup/collision; existing role/material guards | Real Storage/RLS, PDF extraction service behavior on representative private documents, assignments/drill publication transactionality, Realtime delivery |
| parent | Dashboard, children, progress, schedule, messages, settings, notifications, app settings and materials | Enrollment validation/duplicate/mail-outage/cleanup models; grade/progress/override precedence; responsive pages and dashboard retry | Real Auth enrollment and compensation, receipt of credentials, MFA, direct upload/access policy, full schedule/message/prefs mutations |
| student | Dashboard, learning path, module, assessment, practice, achievements and profile | Actual assessment UI answer/submit with fake API, daily-word retry/concurrency/XP/streak models, outages and role redirects | Atomic WOD SQL, real progression/XP across legacy writers, badges durability, actual speech/TTS/microphone, data persistence |

| Group | Files |
| --- | --- |
| Production changes in this continuation only | server/routes/admin.js; server/routes/teacher.js; server/routes/parent.js; src/components/QueryErrorNotice.tsx; src/pages/admin/Dashboard.tsx; src/pages/teacher/Dashboard.tsx; src/pages/student/Dashboard.tsx; src/index.css; src/pages/parent/parent-dashboard-reference.css |
| Tests / verification tooling / review package | server/tests/sectionAssignmentQa.test.js; server/tests/finalApiContracts.test.js; server/tests/finalUploadContracts.test.js; server/tests/finalEnrollmentContracts.test.js; tests/finalClientContracts.test.mjs; tests/helpers/load-ts.mjs; scripts/qa-tools/package.json; scripts/qa-tools/package-lock.json; scripts/qa-playwright.mjs; testing-audit/fixtures/roleModel.mjs; testing-audit/fixtures/browserSupabase.mjs; testing-audit/role-browser.mjs; testing-audit/coverage-run.mjs; testing-audit/dependency-review.mjs; testing-audit/analytics-performance.mjs; testing-audit/final-local-checks.mjs; testing-audit/github-credential-scan.mjs; testing-audit/final-verification-report.mjs; testing-audit/review/WORD_OF_DAY_ISOLATED_VALIDATION.md; testing-audit/inventory.mjs; testing-audit/verify-final-reports.mjs |
| Generated reports/evidence | All readiness reports listed in FINAL_TESTING_REPORT; inventories, case CSV/JSON, coverage reports, TAP, browser JSON/screenshots and advisories under testing-audit/. Existing unrelated working-tree edits preserved. |


All preserved browser attempts, including initial fixture/setup failures and pre-fix runs: [execution index](BROWSER_EXECUTION_INDEX.csv). Raw statuses are retained; invalid fixtures do not establish successful data behavior.

