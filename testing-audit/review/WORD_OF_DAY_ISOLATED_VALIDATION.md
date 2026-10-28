# Word of the Day: isolated validation package — NOT EXECUTED

This document is a review checklist, not a runnable migration. The owner has not authorized executing `word-of-day-atomic.PROPOSED.sql`, even in the disposable cluster. None of the general audit, database, coverage or browser runners executes that proposal. A successful mocked RPC or the existing 28 SQL checks does not satisfy any check below.

## Prerequisites and isolation

1. Owner privately exports a schema-only snapshot: actual UUID/TEXT columns, defaults, unique child/date constraint, foreign keys, triggers, grants, RLS, existing RPC signatures and mobile migration versions. No learner records or production keys go in the repository.
2. Review the proposal against that snapshot. Preserve the mobile 50 XP contract and the web 25 XP contract separately. Review lock order against every other progress writer, including legacy read/replace XP updates. Verify ownership is checked again in the SQL transaction.
3. Obtain explicit approval to execute the proposal in a fresh local database or dedicated staging Supabase project. Use synthetic Admin, Teacher, Parent and Student identities and separate project keys. Confirm its project ID differs from the shared project before enabling any staging runner.
4. Provision only synthetic schema fixtures. The existing disposable runner is available with `QA_POSTGRES_USE_TEMP=true` outside the restricted sandbox. It currently validates existing section/roster SQL only and deliberately excludes the proposal.

## Required real PostgreSQL/PostgREST assertions

Each case needs a recorded before/after query, SQLSTATE/result, distinct session IDs for concurrency and a rollback/teardown limited to the isolated database. Reset only the fresh fixture between cases; do not adapt these instructions to shared production data.

| ID | Scenario | Required result | Current status |
| --- | --- | --- | --- |
| WSQL-01 | Correct first answer | Exactly 25 XP, one completed log and one receipt commit together | BLOCKED |
| WSQL-02 | First and second incorrect answers | Sequential attempt receipts; completion and XP remain absent | BLOCKED |
| WSQL-03 | Third incorrect answer | Final incorrect completion with zero reward and no successful-day streak increment, preserving the existing web contract; fourth new attempt conflicts | BLOCKED |
| WSQL-04 | Raise a trigger error on progress write | No log, receipt or progress changes survive; retry can succeed | BLOCKED |
| WSQL-05 | Raise on log write after progress update | Progress and receipt roll back with the log; retry credits once | BLOCKED |
| WSQL-06 | Raise on receipt insertion | Log and XP/streak roll back; receipt uniqueness cannot leave a partial reward | BLOCKED |
| WSQL-07 | Commit then discard the HTTP acknowledgement | Identical replay returns the receipt and zero additional XP | BLOCKED |
| WSQL-08 | Twenty independent simultaneous SQL sessions | One 25 XP credit; identical attempts replay; no duplicate receipt | BLOCKED |
| WSQL-09 | Race different attempt numbers | Out-of-order attempts cannot skip a try; retry follows the committed sequence | BLOCKED |
| WSQL-10 | Same-day, consecutive-day, broken-day, Manila midnight | Correct streak and longest streak; replay after midnight cannot increment again | BLOCKED |
| WSQL-11 | Missing progress, changed word, foreign child/log | Safe rejected operation with no partial write | BLOCKED |
| WSQL-12 | anon/authenticated browser roles and forged ownership | RPC/table grants and RLS deny unauthorized direct execution | BLOCKED |
| WSQL-13 | READ COMMITTED and REPEATABLE READ contention | Safe serialization/deadlock errors; application retries never duplicate credit | BLOCKED |
| WSQL-14 | Mobile routine before/after and simultaneous web/mobile writes | Explicitly reviewed coexistence; no duplicate or lost increments across contracts | BLOCKED |
| WSQL-15 | Badge service unavailable, then replay | Core reward remains committed once; badge retry is idempotent | BLOCKED |
| WSQL-16 | Legacy completed log without new receipt | Conflict without guessing historical reward payment or automatic backfill | BLOCKED |

After passing these checks, review deployment order and rollback with the owner. Deploying the prepared server before its reviewed RPC exists causes a sanitized, retryable 503; it is not a completed database fix. Historical `xp_awarded=25` values cannot prove that XP was actually paid. Any learner repair needs independent evidence and separate approval.
