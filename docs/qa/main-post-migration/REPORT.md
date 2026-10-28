# Main Supabase post-migration review — 2026-10-18

**HOLD — MAIN DATABASE NOT YET CLEARED. Deployment is not approved.** The owner reports manually applying migrations 047 and 048 to MAIN. Codex did not apply or rerun them. User-reported execution is distinct from an independently observed catalog result.

## Main verification results

- Main PostgreSQL connection attempted by this verifier: **no**.
- Catalog status: **BLOCKED**. Integrity status: **BLOCKED**.
- Current blocker: Private read-only connection configuration is incomplete..
- No application rows, Auth accounts, Storage objects, RLS policies, migrations, role grants or deployed configuration were changed by Codex. No write-capable main RPC was called. No administrator/service-role credential was used for main verification.

| Check | Result | Actual evidence / limit |
|---|---|---|
| 047 RPC/signature/grants | BLOCKED | Private read-only connection configuration is incomplete. |
| 048 trigger-function body/security | BLOCKED | Private read-only connection configuration is incomplete. |
| Membership trigger wiring | BLOCKED | Private read-only connection configuration is incomplete. |
| Required constraints/RLS/non-nullability | BLOCKED | Private read-only connection configuration is incomplete. |
| Duplicate memberships | BLOCKED | No authorized full-visibility main-data inspection executed |
| Section capacity | BLOCKED | No authorized full-visibility main-data inspection executed |
| Student/section grade and foreign-key relationships | BLOCKED | No authorized full-visibility main-data inspection executed |
| Teacher roster consistency | BLOCKED | No authorized full-visibility main-data inspection executed |

Main index/trigger/dependency inventory is not yet inspected. Without a pre-migration catalog snapshot, even a future expected-object match cannot prove that no unrelated object was introduced. Auth-user foreign-key data scans and main write/concurrency/enrollment tests were not performed. No zero violation count has been fabricated from blocked or RLS-filtered results. [Verifier result](../evidence/main-post-migration/main-readonly-results.json).

## Compatibility findings

The deployed health endpoint returned **200**, version **0.1.0**, API compatibility **3**, and declared commit **51ce3ce**. The health handler returns application metadata and does not validate Supabase objects. A healthy response is not a database-integrity result.

The matching local Git object is **51ce3ce17daf2f9bd7f2398851125845c353e730**. Its server/src tree has 0 references to the section tables or changed functions, and 0 section routes. The declared parent enrollment source has no direct reference to those changed objects. This supports **no direct new dependency in that declared revision**, not proof that a running image has no uncommitted/platform changes. Confirm the deployed artifact/SHA in Railway before using it as release evidence. [Source comparison](../evidence/main-post-migration/source-compatibility.json), [public health result](../evidence/main-post-migration/public-backend-status.json).

The local backend differs: its assignment handler calls `public.assign_section_students(uuid,uuid[],uuid)`, expects JSON success, and maps validation/not-found/serialization errors to 400/404/409. Its relevant route-unit regressions passed. If the declared commit accurately represents the running artifact, the new local section endpoints are absent from that revision; migrations alone do not add HTTP routes. No authenticated production request was made to prove route availability or write success.

Static review of the provided migration files finds:

- 047 introduces one service-role-only assignment RPC and replaces the membership validator/trigger. 048 replaces the validator body. Neither file executes top-level application-data DML or backfills existing section/roster records.
- 048's function performs a same-value parent-row update **when a future membership operation fires the trigger**. It can therefore fire any existing class_sections UPDATE triggers and can raise serialization/deadlock conflicts. Catalog review of those triggers and isolated functional testing are required; their main state remains unverified.
- Neither migration changes table column types or the existing SDK/API response contract. The new RPC is additive. The declared source does not reference it; the local source requires its live signature and service grant to be verified before release.
- The recorded package specifications have the same Supabase SDK range in declared/local source; the local Nodemailer major differs. Package ranges are not installed artifact/lockfile evidence or a current advisory audit. Release review must include all pending backend changes, not just these SQL functions.
- Database catalog presence would not by itself prove PostgREST schema-cache compatibility. No service-role RPC invocation was used to force that test through RLS. Main assignment/enrollment/serialization checks remain unexecuted.

## Local safety and affected-function tests

**11 local unit/API cases passed, 0 failed**, covering five connection/role/scope guards and six Express section-assignment route-unit cases. Their persistence boundary is substituted; they are not live main RPC tests. [TAP](../evidence/main-post-migration/safety-unit-and-api.tap).

**6/6 synthetic PostgreSQL verifier cases passed.** They test copied function signatures/body fingerprints/trigger/constraints, a dedicated nonprivileged reader, read-only enforcement, refusal of RLS-filtered false-clean results, and detection of seeded capacity/grade/roster defects. They run only in a new loopback database. The migration files themselves are not executed as migration scripts, and main is never contacted by the fixture. [Local results](../evidence/main-post-migration/local-verifier-tests.json).

The first rehearsal exposed PostgreSQL name-array decoding in the new verifier and an incorrect synthetic expected count. The catalog now casts attribute names to text arrays; the fixture expectation matches its two memberships and one roster link. Before/after evidence is retained. A transient local listen denial was not treated as a pass. The local database helper now catches startup errors so they can be reported as blocked diagnostics.

The last complete application QA inventory remains **561 cases: 472 passed, 15 failed, 66 blocked, 3 not run, 5 not implemented**. These are retained last-run outcomes, not newly executed main verification. The new diagnostic-only tests are reported separately rather than inflating that inventory. Previously reported deployed/browser failures and full authenticated Supabase/email/speech blockers have not been silently cleared.

## Required manual actions

1. Review [READONLY_SETUP.md](READONLY_SETUP.md). Creating a reader/login/grants/password is an owner-approved access-configuration change, not a read-only query. The [operator proposal](reader-role-operator-proposal.sql) is prepared but **has not been executed**. Do not rerun 047/048 or substitute an administrator/service-role connection.
2. The authorized operator creates/reviews the dedicated reader, sets its password privately, and obtains the main direct/session-pooler parameters and CA certificate. Enter them locally in the disabled ignored template or a private nonsynced file. Do not replace application/deployment credentials.
3. Set the private verification enable flag only after confirming the pinned target. Provide only the file path. The verifier can then execute the already authorized catalog inspection in a read-only transaction with verified TLS and bounded timeouts.
4. SELECT grants alone do not grant global visibility under RLS. If existing policies do not permit a complete aggregate audit, the global integrity checks remain blocked. Any new audit SELECT policy is a separate owner decision; no policy or bypass privilege was added here.
5. Follow [ISOLATED_QA_PLAN.md](ISOLATED_QA_PLAN.md) to provision a separate project with a reviewed schema-only baseline, synthetic role/ownership/content fixtures, test email credentials and real speech-device/provider access. The reported main migrations do not make main a staging environment.

No repair DML, migration rerun, Auth/Storage mutation, RLS bypass or deployment is authorized by this report. **Main consistency and release readiness cannot yet be confirmed.**
