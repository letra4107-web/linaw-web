# XP/progress final status

**OPEN-01: FIXED LOCALLY for the supported contract. Production: OPEN / BLOCKED FOR ROLLOUT. Formal full-app testing: NOT READY.**

1. Local resolution: the billion-XP/attempt exploit and all arbitrary totals are rejected. Legitimate supported rewards work through actual Express and real isolated PostgreSQL.
2. Atomicity: verified for the new general-progress transaction on disposable PostgreSQL, including independent sessions and injected rollback failures. Shared Supabase/PostgREST and WOD atomicity remain unverified.
3. Mobile: practice/assessment services, OTP, parent journeys, role/navigation controls and official snapshots pass local regressions; native scoring is preserved. Missing DB support has explicit errors. Unsupported completion/badge operations are listed in database readiness; no physical reward test against shared data was performed.
4. Web: the patch is applied and source hashes verified in the actual web checkout. Its backend/UI tests, types, lint and fixture-configured production build pass. The [application receipt](evidence/web-application-receipt.json) records this local verification; no deployment occurred.
5. WOD: both prepared backends use exactly 25 eligible XP, three attempts and the same service-only receipt/RPC contract. Native 50-XP/JS fallback is removed. Mock compatibility passes; its SQL and cross-platform DB coexistence remain BLOCKED, not certified.
6. Tests: 778 automated cases PASS, 0 FAIL, 2 staging cases skipped/blocked; 10 additional backend regression programs. Build/type/lint gates are reported separately, without double-counting tests.
7. Blockers: approved schema/RPC/grant rollout, removal of old service-role writers, supported-policy review, unsupported legitimate reward workflows, actual staging auth/RLS/storage/provider checks and real mobile/browser integration.
8. Next action: follow [database readiness](XP_PROGRESS_DATABASE_READINESS.md) in order; approve/review proposals on an isolated target before formal staging testing or any deployment.

| Layer | Result | Evidence |
| --- | --- | --- |
| Mobile Jest | 116 pass / 0 fail | [JSON](evidence/mobile-jest.json) |
| Web backend/UI | 565 pass; 2 staging skipped | [server](evidence/web-server.log), [UI](evidence/web-ui.log) |
| Real isolated PostgreSQL | 28 pass | [cases](evidence/sql-results.json), [engine](evidence/sql-engine.json) |
| Backend programs | 13 pass programs (includes Node cases) | [programs](evidence/backend-checks.json) |
| Mobile lint | 0 errors / 18 warnings | [details](evidence/mobile-lint-summary.json) |

See [security audit](XP_PROGRESS_SECURITY_AUDIT.md), [contract](XP_PROGRESS_CONTRACT.md), [fix report](XP_PROGRESS_BUG_FIX_REPORT.md), [regression results](XP_PROGRESS_REGRESSION_RESULTS.md), and [case records](evidence/test-cases.csv).

No shared Supabase data or environment secrets were changed. No deployment, commit, push, credential rotation, history rewrite or automatic historical repair occurred. The WOD proposal was inspected, not executed.
