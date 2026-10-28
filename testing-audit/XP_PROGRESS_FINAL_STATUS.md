# XP/progress final status

Updated 23 October 2026. Option 1 is VERIFIED LOCALLY for the supported practice/assessment contract. Formal staging/production status remains NOT READY / BLOCKED. No shared Supabase access/changes, shared migration execution, deployment, commits, pushes, history deletion or historical XP repair occurred. General-progress SQL and its prerequisites ran only in disposable local PostgreSQL. The separate WOD proposal remains unchanged and unexecuted.

## Current disposition

842 automated cases PASS, 0 FAIL, 2 staging cases skipped/blocked. 10 additional backend regression programs PASS. Total recorded: 852 PASS / 0 FAIL / 30 BLOCKED / 0 NOT RUN.

All 778 previous automated passes remain passing. 64 new cases: 13 mobile, 13 backend, 12 web client, 26 real PostgreSQL. SQL total: 28 retained + 26 new = 54. Assertions, builds and test programs are not counted as additional individual automated cases.

Repeat practice is recorded with no additional base reward; retries create neither duplicate attempt nor payment. Mobile/web local regressions pass; existing XP/history remain preserved. General-progress atomicity is verified in real isolated PostgreSQL. WOD eligibility/code is unchanged by this follow-up; its separate SQL atomicity remains blocked.

Owner approval for the Option 1 policy is satisfied. It does not authorize shared SQL execution or deployment.

[Case records with IDs, scenarios, expected/actual outcomes and evidence](evidence/xp-progress/test-cases.csv). [Machine-readable cases](evidence/xp-progress/test-cases.json). [Option 1 summary](option-1/evidence/summary.json). [Changed files](option-1/evidence/changed-files.json). [Actual web application receipt](option-1/web-application-receipt.json).

## Before formal testing

1. With an explicitly approved target, run the READONLY catalog preflight and review actual column types, constraints, RLS, grants, triggers and every legacy privileged writer. The disposable fixture is not proof of deployed Supabase parity.
2. Review the revised one-time version-2 general-progress proposal and its badge/curriculum prerequisites. Obtain separate explicit SQL approval; do not install either the old version-1 proposal or a second copy over an existing installation. An already-installed variant requires a separately reviewed upgrade migration.
3. Coordinate draining legacy backend/client writers and restricting obsolete RPC entry points. Approve/install the reviewed general contract, then validate real JWT/PostgREST roles and ownership before enabling reward traffic.
4. Separately review/approve the unchanged WOD proposal, resolve its legacy comments/writer coexistence, install only with explicit approval, and run its 16 real SQL cases including rollback, concurrent workers, midnight and streak behavior.
5. After deployment is separately authorized, run simultaneous mobile/browser staging journeys with disposable learner/parent/teacher/admin accounts, timeout/restart/retry tests and the USB phone. Confirm cross-device official progress and accessibility.
6. Resolve unsupported lesson/activity/PDF/nonsense and remaining badge proof dependencies as separately scoped work. Reconcile uncertain history only with independent proof and new authorization. Formal testing remains blocked until the applicable prerequisites pass.

See [complete Option 1 verification](XP_OPTION_1_POLICY_VERIFICATION.md). [Preserved previous report](option-1/baseline/XP_PROGRESS_FINAL_STATUS.md).
