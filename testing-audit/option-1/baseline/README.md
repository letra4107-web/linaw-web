# XP/progress follow-up

Start with [final status](XP_PROGRESS_FINAL_STATUS.md), [contract](XP_PROGRESS_CONTRACT.md) and [database readiness](XP_PROGRESS_DATABASE_READINESS.md). Per-case evidence is in `evidence/test-cases.csv` and `evidence/test-cases.json`.

Safe local validation entry points (from the mobile repository):

- `node testing-audit/xp-progress/run-checks.cjs mobile`
- `node testing-audit/xp-progress/run-checks.cjs backend`
- `node testing-audit/xp-progress/run-checks.cjs web` — isolated web copy
- `node testing-audit/xp-progress/run-checks.cjs bundle` — fixture-configured production Android/Hermes export
- `node testing-audit/xp-progress/database-tests.mjs` — creates a fresh local PostgreSQL fixture using the existing web QA binary; never connects to Supabase
- `node testing-audit/xp-progress/build-reports.cjs` — rebuilds scoped reports from saved evidence

The implementation/prepare scripts preserve the task's edit history; they are one-time authoring helpers, not test commands. Do not rerun them over a prepared workspace. The bounded `apply-web-patch.cjs` requires the reviewed manifest and outside-workspace write permission; it refuses concurrent edits and preserves original files.

All `.PROPOSED.sql` files are review artifacts. General-progress SQL was tested only against fresh disposable synthetic schema. The separate Word-of-Day proposal was not executed, including in the local fixture. Follow readiness ordering and obtain explicit approval before any shared SQL or deployment.
