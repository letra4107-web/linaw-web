# LinawLetra QA report — 2026-10-17

**Not ready for formal evaluation signoff.** Local corrections and passing automated checks do not establish authenticated dashboard correctness, live database integrity, email delivery or real speech quality. No deployed records, accounts, emails, migrations or hosting configuration were changed. Nothing was committed, pushed or deployed.

## Actual results

| Result | Count |
|---|---:|
| Total inventoried test cases | 407 |
| Executed | 331 |
| Passed | 324 |
| Failed | 7 |
| Blocked | 68 |
| Not run | 3 |
| Not implemented | 5 |
| Pass rate among executed cases | 97.89% |

Pass Rate = Passed / (Passed + Failed) × 100. Blocked, not-run and not-implemented cases are excluded. Counts use the latest outcome for each ID, with no double counting of earlier runs or targeted reruns. The detailed required-format table is [TEST_CASES.md](TEST_CASES.md); machine-readable results are [test-results.json](test-results.json).

- Backend: 159 passed, two environment-gated staging suites blocked (161 declared cases). Frontend: 28 passed. **187 automated cases passed; no failed automated cases.** These are Node cases, not 187 end-to-end workflows.
- Real local HTTP tests exercise all protected endpoints found in the six role/notification/auth route files with anonymous requests, plus health, TTS auth, CORS, malformed/oversized bodies and 404 behavior. Unit tests that substitute repositories or providers are explicitly separate from real service integration.
- Final Edge local production-build browser run: 56 passed, one failed. The cold first load of / at 375px received ERR_NETWORK_ACCESS_DENIED for a route script and displayed the new recovery screen. It is retained as a failed healthy-load case. No uncaught JavaScript exceptions occurred in that final run; deliberately blocking a route bundle then restoring it and choosing Retry recovered to login.
- Deployed Edge: 51 passed, five failed after targeted reruns. Anonymous unknown Admin/Teacher/Parent/Student routes, plus the unsupported student/settings URL, rendered blank instead of redirecting. Local fallback fixes pass these routes; the deployed artifact has not been updated. The initial keyboard failure was a harness focus/event issue; all five focused public-form reruns passed, and both evidence files are retained.
- Deployed public HTTP: 24 passed, one failed. The API does not expose the compatibility response header to the browser through CORS. Corrected locally and verified over real local HTTP; not deployed.
- Lint (including --deny-warnings), TypeScript, production bundling and diff whitespace checks all passed. Final TypeScript wall time: 12715 ms; Vite command wall time: 3268 ms. These are local machine measurements, not application latency benchmarks.
- Production dependency audits: frontend zero; backend initially seven affected dependency nodes, finally zero. Backend now resolves Express 4.22.3, Multer 2.4.0, Nodemailer 10.1.2, proxy-addr 2.0.8, qs 6.16.1 and ip-address 10.7.4. Nodemailer 10 requires Node 20+; this project uses Node 22. Mail composition and multipart filter/size-limit contracts were tested locally without email delivery or database writes.

## Scope and inspection evidence

React 19/TypeScript/Vite, Express 4, Supabase Auth/Postgres/Storage/Realtime, browser speech recognition and ElevenLabs TTS. AST/source inventory covers 222 code/SQL files, 137 API/UI route declarations (including middleware/layout declarations), 493 data-access calls and 45 migrations. It includes legacy/unreachable code; scanning a definition does not verify runtime behavior. High-risk authentication, authorization, learning, rewards, PDF, messaging and scheduling paths were read and traced.

[INITIAL_FINDINGS.md](INITIAL_FINDINGS.md) records the pre-fix baseline: 47 backend + 16 frontend passes, two skipped staging suites, 12 lint warnings and a passing build. [regression-before.tap](evidence/regression-before.tap) records 20 failing regression cases before fixes; [auth-race-before.tap](evidence/auth-race-before.tap) records the separately reproduced identity race. Assertions were preserved after fixes. No additional testing dependencies were introduced.

The complete [control inventory](CONTROL_INVENTORY.csv) lists 542 source control definitions with source location, handler and label/target. These are inventory entries, not passed test cases, and are not included in the test-case denominator. Every authenticated dashboard still needs its individual ten-point control audit (keyboard/action/API/database/feedback/reload/duplicate/responsive checks). Public form and keyboard checks cover only the behaviors named in the results table.

## Bugs and local corrections

Twenty grouped defects were identified and corrected in local source/lockfiles. Some groups contain related defects; this is not a claim that every deployed feature has been validated. Six deployed failures remain across two corrected behavior classes, plus one local cold-load network failure.

| ID | Severity / priority | Root cause | Correction and verification limit |
|---|---|---|---|
| BUG-001 | High / P1 | Signup attempted an unauthenticated profile upsert | Write only with a session; confirmed identity repair uses signup name metadata. Corrected locally; live behavior after deployment is unverified. |
| BUG-002 | High / P1 | Role lookup ignored errors and could repair over an unknown authoritative role | Lookup/repair errors propagate; existing unknown role is rejected; repair cannot overwrite a concurrent profile. Corrected locally; live behavior after deployment is unverified. |
| BUG-003 | High / P1 | Async auth rejections escaped Express 4; role checks ignored account status | Safe 503 for service failures and 403 for disabled/archived profiles. Corrected locally; live behavior after deployment is unverified. |
| BUG-004 | High / P1 | Malformed drill edits reached delete; invalid XP/order values reached persistence | Validate arrays/items and SQL-compatible bounds before mutations. Corrected locally; live behavior after deployment is unverified. |
| BUG-005 | Medium / P2 | Word-of-day server streak used UTC against a Manila frontend date | Shared server calendar helper uses Asia/Manila, with midnight/year boundary tests. Corrected locally; live behavior after deployment is unverified. |
| BUG-006 | Medium / P2 | Email validation accepted embedded addresses; corrupt optional profile storage broke auth | Anchored validation, saved-profile shape validation and optional storage failure handling. Corrected locally; live behavior after deployment is unverified. |
| BUG-007 | Medium / P2 | Browser could not read cross-origin compatibility header; oversized JSON became 500 | Expose response headers through CORS; map oversized JSON to 413. Corrected locally; live behavior after deployment is unverified. |
| BUG-008 | Medium / P2 | Unknown role URLs rendered a blank page | Authenticated route bundles include wildcard NotFound routes; anonymous access reaches login. Corrected locally; live behavior after deployment is unverified. |
| BUG-009 | Medium / P2 | CI excluded UI tests; combined-URL staging checks could admit unrelated live hosts | npm test includes both suites; staging guard validates each host independently. Corrected locally; live behavior after deployment is unverified. |
| BUG-010 | High / P1 | Teacher password used randomInt(57) against a 56-character alphabet | Bounded cryptographic generator guarantees twelve allowed characters, uppercase and a digit. Corrected locally; live behavior after deployment is unverified. |
| BUG-011 | High / P1 | Missing-SMTP fallback logged plaintext credential emails and claimed success | No body/recipient log; missing transport reports failure; one-time on-screen student delivery remains supported. Corrected locally; live behavior after deployment is unverified. |
| BUG-012 | High / P1 | Previous account lookup could overwrite the current asynchronous identity | Identity request versions, identity clearing and stale completion guards. Corrected locally; live behavior after deployment is unverified. |
| BUG-013 | High / P1 | Student assignment endpoints did not reject archived materials centrally | Ownership lookup joins material archive state and denies archived assignments. Corrected locally; live behavior after deployment is unverified. |
| BUG-014 | High / P1 | Replacing published drill items could cascade-delete attempts; attempt endpoint did not enforce publication | Published drills cannot be replaced; direct drill attempts require active published material. Corrected locally; live behavior after deployment is unverified. |
| BUG-015 | Medium / P2 | Teacher monitoring action button only stopped propagation | Button selects the teacher detail; unfinished roster selection is explicitly disabled. Corrected locally; live behavior after deployment is unverified. |
| BUG-016 | Medium / P2 | Unmeasured parent engagement was presented as factual zero | Untracked analytics display unavailable; no invented tracking added. Corrected locally; live behavior after deployment is unverified. |
| BUG-017 | Medium / P2 | Failed lazy module download left no recoverable page | App error boundary displays retry feedback; reload recovery is browser-tested. Corrected locally; live behavior after deployment is unverified. |
| BUG-018 | Critical advisory / P1 | Backend lockfile had seven affected dependency nodes (one critical, two high) | Compatible updates plus required Nodemailer major security update; final npm audit reports zero. Corrected locally; live behavior after deployment is unverified. |
| BUG-019 | High / P1 | Generic error logging could include a malformed request body | Expected parser/CORS errors handled before logging; unexpected errors log only safe metadata. Corrected locally; live behavior after deployment is unverified. |
| BUG-020 | Low / P3 | Twelve baseline lint warnings and a redundant student monitoring database query | Hook dependencies cleaned up, data prop clarified and duplicate query removed; lint denies warnings. Corrected locally; live behavior after deployment is unverified. |

## Remaining issues and blockers

| ID | Severity / priority | Outstanding work |
|---|---|---|
| RISK-001 | High / P1 | Word-of-day, nonsense-word, drill rewards and promotion span multiple database requests. Concurrency can lose XP or leave partially committed results. Implement reviewed transactional/idempotent database operations and verify failure rollback in an isolated database. Badge awarding itself already uses an atomic RPC. |
| RISK-002 | High / P1 | Word-of-day target/attempt data is still documented as directly browser-writable. Probe actual RLS and coordinate mobile changes before changing shared write policies. No live exploit or actual deployed policy state is claimed. |
| RISK-003 | High / P1 | Section insertion checks capacity without a row lock and checks duplicates before ON CONFLICT can skip an existing membership. Section membership and teacher roster updates are separate requests. Verify capacity/duplicate/concurrent behavior and correct it transactionally in a disposable DB. |
| RISK-004 | Medium / P2 | Draft drill replacement still deletes then inserts without a transaction. Published history is now guarded at the API, but draft edit rollback and direct-table policy behavior still need database validation. |
| RISK-005 | Medium / P2 | Teacher creation can leave a partial account when profile/roster/SMTP steps fail. Audit timestamps/sign-in event deduplication, parent accessibility GET initialization, account status/RLS consistency and credential-rotation metadata also need real-service checks. Some nominal reads (e.g. parent settings GET) can initialize records, so no authenticated live GETs were assumed read-only. |
| RISK-006 | Medium / P2 | Several dashboard queries render empty-state values without a distinct query-error view; many dialogs/controls need authenticated focus, keyboard and screen reader review. Direct lesson-pdfs browser uploads bypass the server PDF-validation path. Public material buckets remain a documented compatibility choice; no bucket policies were changed. |
| RISK-007 | Medium / P2 | Many PNG assets remain 1–2.4 MB; shared CSS and charts are substantial. No load/soak test, production query plan, large-data report reconciliation or asset transformation was performed. |
| BLOCK-001 | High / P1 | User confirmed there is no separate staging environment. No dedicated role credentials or disposable-data confirmation was provided. All four authenticated dashboard workflows, CRUD, RLS and cross-role persistence tests remain blocked. |
| BLOCK-002 | High / P1 | Web migrations extend a shared existing schema and RPCs; the repository alone is not proof of a complete reproducible database baseline. Restore/seed the shared baseline into a dedicated test project before migration/constraint tests. Historical migrations were not modified or applied. |
| BLOCK-003 | Medium / P2 | SMTP and TTS variable presence is recorded without values. Actual mail delivery, OTP expiry, provider audio, microphone permissions and real Tagalog recognition were not exercised. |
| BLOCK-004 | Medium / P2 | Only Edge 155.0.4283.62 was exercised. Chrome/Firefox executables were not found in inspected locations. Viewport tests are not real mobile-device or full accessibility certification. |

Not-implemented functionality is listed separately in TEST_CASES.md: teacher session scheduling, teacher bulk selection, the advancement badge, engagement tracking, and separate login OTP/Google TTS support. Existing parent calendar and ElevenLabs features were preserved.

## Measurements and non-functional limits

The 24 successful deployed public HTTP requests measured 54–441 ms, median 61.5 ms. These sequential single-client end-to-end request timings include network/TLS/cache effects and measure public/middleware responses, not database workloads. Individual measurements, response headers, content sizes and outcomes are in [deployed-public-http.json](evidence/deployed-public-http.json). Local browser navigation timings are in [local-browser.json](evidence/local-browser.json); no invented live page-load statistics are supplied.

Edge checked public pages at 375, 768 and 1440 px, including horizontal overflow, anonymous role redirects, empty login/signup validation, password keyboard activation, OTP paste/arrow navigation and form input names. Screenshots are retained for login at all widths and mobile signup. Local runs deliberately blocked remote font/service hosts and used dummy Supabase/API configuration; deployed browser checks used fresh guest profiles and no credentials. Initial Edge setup and development-server timing failures were corrected in the harness; final JSON files contain the reported outcomes.

Security tests establish named local middleware, ownership, input-boundary and source-policy properties. They do not establish every deployed RLS policy, CSRF/XSS resistance, attack exploitability, or complete privacy/accessibility compliance. The dependency advisory sources include [proxy-addr](https://github.com/advisories/GHSA-jqcg-44mw-7w3h), [Nodemailer](https://github.com/advisories/GHSA-v53p-9fqp-m79j), and [Multer](https://github.com/advisories/GHSA-3pph-fpjx-jg34). Findings depend on actual package use/configuration; the app's numeric trust-proxy setting differs from the subnet configuration described in the proxy-addr advisory.

## Reproduction and handoff

Run from the repository root:

```powershell
npm.cmd ci
npm.cmd --prefix server ci
npm.cmd test
npm.cmd run lint
npm.cmd run build
node scripts/qa-checks.mjs
node scripts/qa-inventory.mjs
node scripts/qa-browser.mjs
node scripts/qa-public-http.mjs
node scripts/qa-browser.mjs --live
node scripts/qa-browser.mjs --live --actions-only
node scripts/qa-report.mjs
```

The report generator consumes existing evidence and does not execute tests. The public HTTP/browser scripts issue anonymous GETs/empty-form checks only; local browser builds use synthetic configuration. Browser/network commands may require sandbox permission. .qa/ profiles/builds are ignored by Git. Do not enable the existing staging suites against the shared live database merely because it is used by developers.

Before evaluation: provide a dedicated Supabase/API test environment (including shared baseline), four test role accounts and confirmed disposable fixtures; run every blocked workflow and individual control audit; resolve/retest transaction/RLS risks; verify real emails/audio/speech; complete other-browser/device/accessibility/load checks. Review and deploy the local fixes through the project's normal release process, then rerun deployed checks. No production readiness signoff is given until those results exist.

All modified/new files are listed in [modified-files.txt](modified-files.txt). Sensitive environment values and student records are not included in this report.
