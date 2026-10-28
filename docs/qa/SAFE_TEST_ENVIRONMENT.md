# Isolated QA environment and remaining setup

**Main-project update:** the owner subsequently reported manually applying 047/048 to MAIN. Do not rerun those migrations. Main catalog/data verification is pending a dedicated nonprivileged reader; see [the current safety review](main-post-migration/REPORT.md) and [reader setup](main-post-migration/READONLY_SETUP.md). This does not turn main into an isolated QA environment. Prior no-change statements below describe Codex's actions, not the owner's manual application.

The shared development deployment is not disposable. The user explicitly instructed **do not write to its database**. No shared accounts, Auth sessions, emails, migrations, Storage objects or database records were created or changed during this continuation. Public deployed checks use anonymous GET/HEAD requests only. Nothing was deployed.

Current phase 3 additions: [schema baseline review](SCHEMA_BASELINE_REVIEW.md), [read-only preflight](ISOLATED_SCHEMA_PREFLIGHT.sql), [individual failed-case review](FAILED_TEST_REVIEW.md), and additive migration 048 after 047. The selected SQL suite now also checks stale repeatable-read snapshots and the service-role assignment RPC. The complete Supabase environment remains unavailable; local SQL identities remain fixtures rather than real Auth accounts. Current evidence is under `evidence/phase3`; previous reports/evidence are preserved under `phase1` and `phase2`.

## What is available and executed

- A fresh PostgreSQL 18.4 cluster binds only to `127.0.0.1`, uses a randomly generated private password, and has a unique directory inside ignored `.qa/`. It stops after the suite; files remain for inspection. No OS account or persistent system service is installed. The helper does not load application environment files.
- Synthetic UUID identities represent Admin, Teacher, Parent, Student and unrelated Teacher/Student accounts. They are database fixtures, **not Supabase Auth accounts**. `auth.uid()` and `auth.role()` are emulated from test transaction settings. Real PostgreSQL roles, GRANTs, constraints, triggers and RLS execute; JWT issuance/validation and PostgREST are outside this fixture's scope.
- The suite executes the roster portion of migration 004, full migrations 026 and 046, and new migration 047 against an explicitly minimal UUID foundation. It does not replay the entire application's schema.
- Edge, Chrome for Testing and Playwright Firefox run the local production build without real API/Supabase credentials. External requests and non-GET/HEAD requests are blocked. Browser binaries are in the standard user Playwright cache; profiles, generated builds and private fixture files belong in ignored `.qa/`.
- QA tooling is installed separately under `scripts/qa-tools`. It adds no production dependencies. See its lockfile for exact versions. Embedded PostgreSQL is test tooling, not a replacement production database.

Run from the repository root (Windows may require permission to launch the local database/browser processes):

```powershell
npm.cmd ci --prefix scripts/qa-tools
node scripts/qa-tools/node_modules/playwright/cli.js install chromium firefox
node scripts/qa-database.mjs
node scripts/qa-playwright.mjs
node scripts/qa-checks.mjs
node scripts/qa-public-http.mjs
node scripts/qa-playwright.mjs --live
node scripts/qa-report.mjs
node scripts/qa-validate-report.mjs
```

The database runner now launches an isolated worker and accepts success only when its exit and fresh matching-run JSON agree, all planned cases are present, and every assertion passes. This avoids the embedded process library masking failed assertions with exit 0. Read `database-runner.json` and the individual rows; a process exit alone is insufficient. Browser failures also remain explicit in JSON.

## Requirements for real Supabase/dashboard tests

1. Provide a separate disposable Supabase project or a local Supabase stack, plus an API/frontend configured exclusively for it. Never copy the shared project's service role credentials into this test setup. There is no Docker, Podman, psql or Supabase CLI installed in the inspected environment; WSL is not configured.
2. Reconstruct and review the full shared schema baseline first. The sibling mobile repository contains historical migrations, but its original `users.id`/`children.id` definitions are TEXT while later SQL assumes UUID. The missing historical conversion prevents an honest claim that applying that directory reproduces the deployment. Export a **schema-only** baseline and policies into the isolated project; use entirely synthetic seed content, relationships, grades and progress.
3. Review and apply web migrations to that isolated project, including **047 before running the modified section-assignment API**. This continuation did not apply SQL to Supabase. Do not deploy the API change ahead of its migration; missing RPC is an error and has no unsafe multi-request fallback.
4. Copy `scripts/qa-staging.env.example` to ignored `.qa/staging.env`. Enter only isolated URLs/keys locally. `qa-environment.mjs` checks every origin independently, rejects known production hosts, and denies a Supabase/API origin matching configured shared application values even if explicitly allowlisted. It never falls back to shared keys. Leave fixture writes and baseline confirmation disabled until the isolated schema is verified.
5. Enable the two fixture setup flags only for the disposable project and run `node scripts/qa-provision-accounts.mjs`. It creates seven uniquely named test identities: Admin, Teacher, Parent, Student, second Parent/Teacher/Student. Random credentials and run IDs are written only into ignored `.qa/test-accounts.json`, with a recovery manifest after each creation. It refuses to overwrite an existing account manifest. Inspect any partial run before retrying. Windows file mode is not an ACL guarantee; keep `.qa/` private on the workstation.
6. Add synthetic children/parent links, teacher grade profiles, rosters, sections, curriculum, assessments, practice targets, achievements, PDFs, assignments, messages and schedules using the actual reviewed schema. Provisioning identities alone is insufficient. Record each expected count and ownership relation independently. Never use a service role client for the browser RLS probes.
7. Use a local/test SMTP inbox and disposable mail identities for real signup/recovery OTP delivery, expiry, reuse and password reset tests. Provisioned fixtures use confirmed accounts to establish roles; **that is not an email-verification test**. Connect an actual test mailbox/provider before claiming real delivery.
8. Configure a dedicated speech provider account/quota and verify actual Filipino audio with a listener. Test microphone permissions and actual Tagalog transcripts in supported browsers on real devices. Substituted provider tests and fake audio are not speech-quality evidence.

The existing staging Node suites expect `E2E_API_URL` without `/api`, `E2E_SUPABASE_URL`, `E2E_SUPABASE_ANON_KEY`, and role-specific `E2E_<ROLE>_EMAIL/PASSWORD` variables. Load values from the private fixture manifest in a private shell; do not paste them into chat or logs. They also require unrelated child/student IDs. Start with fixture writes disabled and inspect [BLOCKED_TEST_REQUIREMENTS.md](BLOCKED_TEST_REQUIREMENTS.md) before running each workflow. No automatic cleanup deletes accounts or records; destructive cleanup and deployment require separate confirmation.

## Limits of readiness

Local SQL checks establish only the named constraints/policies on the tested migrations and foundation. They do not certify the shared deployment's RLS, disabled-token revocation, every RPC, Storage/Realtime, transactional learning rewards, mobile compatibility or complete authenticated dashboards. The original baseline and screenshots are retained under `phase1/`; continuation evidence is under `evidence/phase2/`.
