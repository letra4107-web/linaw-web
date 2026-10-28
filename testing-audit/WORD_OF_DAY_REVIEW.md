> XP security follow-up (22 October 2026): OPEN-01 is fixed locally for the supported contract; shared rollout remains OPEN/BLOCKED. This document retains the prior audit baseline. See [current XP/progress status](XP_PROGRESS_FINAL_STATUS.md).

# AUD-005 — atomic web completion review

**Code prepared and locally verified with mocks; database-dependent resolution remains BLOCKED.** No shared database change, execution of the new SQL proposal, deployment or historical XP repair occurred. The SQL proposal has not been executed even in the now-working disposable cluster, following the owner's instruction to prepare it for review without execution.

## Source and schema evidence

The former web route finalized `word_of_day_log`, then separately updated XP/streaks. An XP failure left a completed log; the next call returned 409. The original [failure evidence](evidence/resolution/transaction-probes-before.json) is retained.

The sibling mobile repository contains source definitions in:

- `migration/migrations/002_new_tables.sql`: initial TEXT child keys and child/date uniqueness.
- `022_word_of_day_server_streak.sql`: transactional completion/streak function, without web reward handling.
- `034_fix_word_of_day_uuid_child_id.sql`: documents UUID drift and a personalized RPC awarding **50 XP**.
- `035_fix_ambiguous_longest_streak_column.sql`: corrects a legacy streak ambiguity.

These files were inspected read-only. They are source lineage, **not an authoritative snapshot of the installed shared catalog**. The existing 50 XP function cannot safely replace the web's 25 XP behavior. No real key or shared schema endpoint was queried. The installed column types, grants, policies, constraints, triggers and mobile compatibility remain to be measured privately by the owner.

## Prepared application correction

`server/services/wordOfDayAttempt.js` validates input/ownership, scores the stored word and invokes **one** service-only `record_web_word_of_day_attempt` RPC. The route makes no split log/progress writes and has no legacy fallback. It returns a sanitized retryable 503 if that RPC is missing or unavailable. Consequently, this local code must not be deployed before the reviewed database dependency is ready; on the current unverified schema, Word of the Day completion may be unavailable rather than partially persisted.

The proposed contract stores an attempt receipt and updates the log, 25 XP and Manila-day streak within one PostgreSQL transaction. A row lock on progress followed by the owned log serializes this child's requests across server processes. The `(log_id, attempt_number)` receipt allows the same attempt to replay after a lost response without adding XP again. Nonfinal attempts are replayable too. Stored-word rechecking prevents scoring a word changed between lookup and commit. Attempts must remain sequential, within three tries.

The proposal keeps existing mobile routines unchanged. It uses explicit UUID column preconditions, a fixed search path, a service-role check, denied browser grants and no raw transcript storage. It is [review-only SQL](review/word-of-day-atomic.PROPOSED.sql), outside `migrations/` and excluded from every audit runner.

Badge awards remain a separate idempotent operation. A badge outage now returns core success with `badgesPending: true`; a replay can retry badge checks without repeating the daily reward. This is not a durable badge-retry queue.

## Actual executed checks

The [Node tests](evidence/resolution/word-of-day-tests.tap) exercise the real service/router with an explicitly modeled atomic RPC boundary:

- Failures after modeled XP, log and receipt writes leave modeled state unchanged; retry succeeds once.
- Lost commit acknowledgement returns a safe error, then replays with zero additional XP.
- Twenty concurrent route calls yield one 25 XP credit and nineteen replays in the model.
- Repeated partial attempts, third incorrect attempt, ordering, ownership, forged scores, stale words, missing progress, missing RPC and malformed results are checked.
- Same-day, previous-day and broken-day streaks remain consistent on replay; badge failure does not reverse core success.

[Current probes](evidence/transaction-probes.json) separate application/model PASS results from `TX-SQL: BLOCKED`. A model's mutex and rollback behavior do **not** prove SQL locks, rollback, grants, trigger behavior or PostgREST durability.

## Required owner review and isolated validation

1. Obtain a private schema-only snapshot and verify every column in the proposal's preflight, child/date uniqueness, existing triggers/policies, table owner/default grants and mobile writers. Do not infer UUID types from identifier strings.
2. Review lock ordering against other progress/reward functions, and confirm SQLSTATE handling, fixed 25 XP, three sequential attempts and Manila date semantics.
3. After explicitly approving SQL execution in isolation, validate actual rollback on each failed write/trigger, simultaneous sessions, READ COMMITTED and REPEATABLE READ retries, missing progress, receipt uniqueness, next-day replay, and service-only access using real-role tokens.
4. Reconcile mobile coexistence and unrelated legacy read/replace XP writers, which can still overwrite other increments. The prepared web RPC cannot certify those other flows.
5. Approve migration/rollout separately. Do not deploy the backend alone expecting the old schema to support the new endpoint.

Previously completed logs without a new receipt return a conflict. The old `xp_awarded=25` field was written before actual credit, so it cannot prove whether historical XP was paid. No automatic backfill is safe. Owner-led reconciliation with independent records and an explicitly approved, auditable repair is required for already affected learners.


## Final functionality follow-up — 2026-10-21

Fresh source/TAP/coverage evidence is in [the final report](FINAL_TESTING_REPORT.md). No review SQL was executed. The isolated SQL plan now enumerates 16 real-database checks, all BLOCKED: [validation package](review/WORD_OF_DAY_ISOLATED_VALIDATION.md). Existing 28 SQL passes concern the older synthetic roster/section fixture only. Current backend TAP re-executes the WOD application/model tests. The code remains unsafe to deploy before its reviewed RPC dependency is installed and validated.
