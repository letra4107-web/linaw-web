# XP/progress regression results

Updated 23 October 2026. Option 1 is VERIFIED LOCALLY for the supported practice/assessment contract. Formal staging/production status remains NOT READY / BLOCKED. No shared Supabase access/changes, shared migration execution, deployment, commits, pushes, history deletion or historical XP repair occurred. General-progress SQL and its prerequisites ran only in disposable local PostgreSQL. The separate WOD proposal remains unchanged and unexecuted.

## Current results

842 automated cases PASS, 0 FAIL, 2 staging cases skipped/blocked. 10 additional backend regression programs PASS. Total recorded: 852 PASS / 0 FAIL / 30 BLOCKED / 0 NOT RUN.

All 778 previous automated passes remain passing. 64 new cases: 13 mobile, 13 backend, 12 web client, 26 real PostgreSQL. SQL total: 28 retained + 26 new = 54. Assertions, builds and test programs are not counted as additional individual automated cases.

Mobile Jest: 129 PASS; mobile backend individual cases: 82; web backend: 511 PASS / 2 SKIP; web client: 66 PASS; PostgreSQL: 54 PASS. Mobile types/ESLint (0 errors, 18 existing warnings), Android production Hermes export, web app/node types, lint and production build all pass. The Android output is a bundle export, not an installed APK test.

Coverage: 65.77% of 1852 instrumented mobile source lines in 30 imported source files. This is a bounded subset, not whole-app coverage; backend/web totals are case counts, not coverage percentages. Full parent/teacher/admin browser flows, real Supabase JWT/RLS/storage/provider behavior and phone staging remain blocked. Earlier mobile audit NOT RUN records remain historical and are not relabeled by this follow-up.

Initial new SQL fixtures failed real word-link/content-type/curriculum constraints and were corrected to the actual schema; those failed fixture results are retained in [fixture-development evidence](option-1/evidence/sql-fixture-failures.json). Windows sandbox loopback/Git/Hermes failures were rerun with authorized execution; final gates passed without removing assertions. Test-process cleanup stopped only the inspected disposable runner/orphan worker. The 778-pass pre-change evidence is preserved under [baseline](option-1/baseline/evidence/summary.json).

[Case records with IDs, scenarios, expected/actual outcomes and evidence](evidence/xp-progress/test-cases.csv). [Machine-readable cases](evidence/xp-progress/test-cases.json). [Option 1 summary](option-1/evidence/summary.json). [Changed files](option-1/evidence/changed-files.json). [Actual web application receipt](option-1/web-application-receipt.json).

See [complete Option 1 verification](XP_OPTION_1_POLICY_VERIFICATION.md). [Preserved previous report](option-1/baseline/XP_PROGRESS_REGRESSION_RESULTS.md).
