# XP/progress regression results

778 automated cases PASS, 0 FAIL, 2 staging cases skipped/blocked; 10 additional backend regression programs. Build/type/lint gates are reported separately, without double-counting tests.

| Layer | Result | Evidence |
| --- | --- | --- |
| Mobile Jest | 116 pass / 0 fail | [JSON](evidence/mobile-jest.json) |
| Web backend/UI | 565 pass; 2 staging skipped | [server](evidence/web-server.log), [UI](evidence/web-ui.log) |
| Real isolated PostgreSQL | 28 pass | [cases](evidence/sql-results.json), [engine](evidence/sql-engine.json) |
| Backend programs | 13 pass programs (includes Node cases) | [programs](evidence/backend-checks.json) |
| Mobile lint | 0 errors / 18 warnings | [details](evidence/mobile-lint-summary.json) |

Complete per-case IDs, features, preconditions, steps, expected/actual results, status, evidence and defect references are in [JSON](evidence/test-cases.json) and [CSV](evidence/test-cases.csv). The prior mobile 165 PASS / 1 FAIL / 24 BLOCKED / 294 NOT RUN record set remains a historical baseline, not a new full-app certification. Its 102 Jest tests and 66.26% source-line coverage are superseded only by the scoped current run. No baseline tests were removed; changed assertions now exercise server ownership instead of client award behavior.

The real PostgreSQL tests include twenty independent sessions consuming one event, different events plus another additive writer, rollback at progress/session/receipt boundaries, actual authenticated-role permissions/own-row reads, assessment membership, submission replay, historic IDs/counters and an actual Express-to-PostgreSQL legitimate reward. Authentication in that HTTP-to-DB test is a fixture substitute; it is not a real JWT/provider test.

Build/type/lint/program gates:

- mobile-jest: **PASS**, exit 0 ([log](evidence/mobile-jest.log)).
- mobile-types: **PASS**, exit 0 ([log](evidence/mobile-types.log)).
- mobile-lint: **PASS**, exit 0 ([log](evidence/mobile-lint.log)).
- backend-date_utils.test.js: **PASS**, exit 0 ([log](evidence/backend-date_utils.test.js.log)).
- backend-env_validation.test.js: **PASS**, exit 0 ([log](evidence/backend-env_validation.test.js.log)).
- backend-mobile_auth_audit.test.js: **PASS**, exit 0 ([log](evidence/backend-mobile_auth_audit.test.js.log)).
- backend-personalization.test.js: **PASS**, exit 0 ([log](evidence/backend-personalization.test.js.log)).
- backend-practice_auth.test.js: **PASS**, exit 0 ([log](evidence/backend-practice_auth.test.js.log)).
- backend-progress_auth.test.js: **PASS**, exit 0 ([log](evidence/backend-progress_auth.test.js.log)).
- backend-progress_security.test.js: **PASS**, exit 0 ([log](evidence/backend-progress_security.test.js.log)).
- backend-pronunciation_tests.js: **PASS**, exit 0 ([log](evidence/backend-pronunciation_tests.js.log)).
- backend-reading_insights.test.js: **PASS**, exit 0 ([log](evidence/backend-reading_insights.test.js.log)).
- backend-server_smoke.test.js: **PASS**, exit 0 ([log](evidence/backend-server_smoke.test.js.log)).
- backend-words_level_isolation.test.js: **PASS**, exit 0 ([log](evidence/backend-words_level_isolation.test.js.log)).
- backend-word_of_day_progress_security.test.js: **PASS**, exit 0 ([log](evidence/backend-word_of_day_progress_security.test.js.log)).
- backend-word_of_day_scoring.test.js: **PASS**, exit 0 ([log](evidence/backend-word_of_day_scoring.test.js.log)).
- open-01-probe: **PASS**, exit 0 ([log](evidence/open-01-probe.log)).
- web-server: **PASS**, exit 0 ([log](evidence/web-server.log)).
- web-ui: **PASS**, exit 0 ([log](evidence/web-ui.log)).
- web-types-app: **PASS**, exit 0 ([log](evidence/web-types-app.log)).
- web-types-node: **PASS**, exit 0 ([log](evidence/web-types-node.log)).
- web-lint: **PASS**, exit 0 ([log](evidence/web-lint.log)).
- web-build: **PASS**, exit 0 ([log](evidence/web-build.log)).
- mobile-production-export: **PASS**, exit 0 ([log](evidence/mobile-production-export.log)).

The first broad Jest crawl timed out; another run exposed two existing parent UI test timeouts under concurrent load. The final scoped source run uses a 30-second per-case budget without removing assertions. Web harness omissions (.env.example/Git ignore context) were corrected inside the isolated copy; read-only API error status behavior was preserved. Initial intermediate failures were resolved before the final reported run.

Mobile source coverage is 65.64% of lines across 29 instrumented/imported source files ([source-only summary](evidence/coverage/source-summary.json)); it does not cover all application screens or every line of the app. [Raw coverage](evidence/coverage/coverage-summary.json) includes asset mocks/backend parity modules; do not label its aggregate full-app coverage.

Local mocked clients/providers, isolated Express HTTP and a fresh disposable PostgreSQL fixture. Real Supabase JWT/PostgREST, shared schema, physical-device reward integration and production compatibility remain unverified.

Actual-checkout validation also passed. Initial Windows loopback-listener/Git-access restrictions were resolved with authorized local reruns; no source assertion was removed. [Application receipt](evidence/web-application-receipt.json).
