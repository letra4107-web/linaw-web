# Progress version 2 installation review

Reviewed 29 October 2026 against the owner's supplied `progress_preflight` JSON.
During preparation, no shared database writes, learner-record reads, deployment, commit, or push occurred.

## Installation follow-up: 29 October 2026

The owner subsequently reported running the installation successfully and supplied the post-install catalog result. All three new tables exist with RLS enabled; all five public contract functions exist with service-role execution and no anon/authenticated execution; the retained assessment core and revision trigger are present.

The agent then ran the existing read-only `progress_contract_version` probe using the backend's configured Supabase service client. It returned **HTTP 200, version 2**, with frontend/backend project configuration matching. This confirms that PostgREST exposes the required version to the configured backend credentials and resolves the previously observed missing-contract dependency. The agent did not execute shared DDL or learner mutations.

An authenticated browser assessment start/answer/final-submit journey through the running API still requires confirmation. Local checks and the live version probe do not establish that all modules, speech recognition, or the separate Word-of-Day contract work in the shared deployment. The original review hashes and candidate SQL are preserved unchanged as preparation evidence.

## Confirmed cause

The owner previously confirmed `to_regprocedure('public.progress_contract_version()')` is NULL. The supplied catalog also shows all three new tables absent: `student_progress_events`, `student_content_base_rewards`, and `student_assessment_submit_receipts`. The six existing badge, content-attempt, progress, module-unlock, and assessment prerequisites are present. All 19 column/type checks in the existing proposal match the supplied catalog.

The backend requires contract version 2 before assessment start and verified-answer writes. Installing a version marker alone would still leave the required event/receipt implementation missing.

## Concrete SQL prepared for review

[`progress-v2-install.REVIEW.sql`](progress-v2-install.REVIEW.sql) contains the existing full version-2 proposal, with additional guards inside its transaction. The original [`progress-events.PROPOSED.sql`](../progress-events.PROPOSED.sql) remains unchanged.

The candidate:

- Creates three progress/reward/assessment receipt tables, adds revision and legacy-label metadata to `child_progress`, and links new pronunciation sessions to their verified event.
- Installs the version-2 ticket, recording, verified-badge and assessment-submit functions. Retains the existing assessment implementation under an internal name and wraps it with verified-answer and retry checks.
- Restricts client mutation privileges on progress/evidence tables. Backend service-role access and existing SELECT policies remain available.
- Includes schema-cache reload notification and commits as one transaction.
- Does not seed, reorder, or replace the 17 modules, their Filipino content, or their assessment configuration. Does not repair or backfill historical XP.

New guards reject changed definitions of the six reviewed prerequisite functions, existing/partial version-2 objects, missing module helpers, and absent defaults needed by existing INSERT statements. Fingerprints and source/candidate SHA-256 values are recorded in [`progress-install-catalog-review.json`](progress-install-catalog-review.json). This is a one-time installation; rerunning requires a separately reviewed upgrade.

The supplied preflight did not include default expressions. The migration checks their presence before schema changes. A populated or malicious default expression is not behaviorally proven by this metadata check.

## Local validation

[`progress-install-local-results.json`](progress-install-local-results.json) records **13 passed / 0 failed** checks in a disposable local PostgreSQL database. Exact prerequisite function bodies and relevant trigger definitions from the supplied catalog replaced the older foundation definitions. Synthetic identities and Filipino `ba, be, bi, bo, bu` content were used. Existing migration fixtures supplied other dependencies/defaults; this is not a complete clone of the shared database.

Checks cover installation and drift/default guards; preserving existing XP, streaks, historical labels and badge dates; rejecting a second install; client privilege restrictions; prerequisite completion gates; verified practice and assessment answers; weighted passing; sequential module unlocking; one final-submit receipt on retry; foreign learner rejection; and changed-retry rejection.

An initial sandbox attempt could not initialize PostgreSQL. The authorized local rerun passed. No SQL was applied to Supabase. Real Supabase JWT/PostgREST behavior and concurrent deployed-client traffic remain untested by these local cases.

## Shared rollout boundary

At preparation time, the original proposal explicitly said: `REVIEW ONLY: never run against a shared project without explicit approval.` The then-supplied diagnostic results did not authorize shared DDL, so the agent left the candidate unapplied. The owner-reported installation and subsequent read-only verification are recorded in the follow-up above; the agent has not performed shared DDL.

Before installation, coordinate existing web/mobile deployments that use the shared progress tables. In particular, old privileged writers must not overwrite totals after newer verified writes, and older clients that write progress directly will encounter the new restrictions. Current local web and mobile source searches do not establish what is actually deployed.

The catalog separately exposes `complete_word_of_day_attempt` and `complete_personalized_word_of_day_attempt` to client roles. Their supplied bodies accept caller-provided child IDs and correctness without an ownership check; the latter still uses its old 50-XP reward. These are existing Word-of-Day entry points and need a separate review/restriction and approved WOD migration. This candidate does not install the separate WOD contract or certify whole-app reward safety.

After explicit approval and the coordinated installation, run [`progress-v2-post-install.READONLY.sql`](progress-v2-post-install.READONLY.sql) in the same project's SQL Editor. All five function entries should be present, executable by `service_role`, and unavailable to `anon`/`authenticated`; all three tables should exist with RLS enabled; the retained core and revision trigger should be present. Then re-run the service-key version probe and perform an authenticated assessment with an approved test learner. A successful catalog check alone does not prove that an assessment journey works through the deployed API.
