# Word of the Day deployment and verification

The live configured Supabase project's REST metadata was checked on 9 November
2026. `record_web_word_of_day_attempt` and its receipt table are absent. The
required log/progress columns are exposed with the expected UUID, integer,
date and timestamp types. This explains the retryable HTTP 503 from the attempt
route; changing browsers cannot install the missing database dependency.

## Database installation

In the Supabase project used by the backend's `SUPABASE_URL`, open SQL Editor,
create a query and run the entire [migration 051](../../migrations/051_atomic_word_of_day_attempt.sql).
It validates required column types before making changes. It creates a private
receipt table and the service-only completion function in one transaction, then
reloads PostgREST's schema cache. It preserves existing logs and progress, and
does not modify legacy mobile functions or retroactively credit old completions.

The API's service-role key cannot install PostgreSQL schema changes. Installation
requires the project's SQL Editor or a database administrator connection; neither
is configured in this workspace. The migration has been tested locally, and has
**not been applied to the live project** by this change.

After installation, run:

```powershell
node server/scripts/verify-word-of-day.js
```

Expect `rpcAvailable`, `receiptAvailable`, and `ready` to be `true`. The verifier
reads API metadata and executes an empty SELECT only; it never reads student
rows, executes a reward RPC, or prints credentials. It exits unsuccessfully if
the database dependency is missing. Presence alone does not verify live grants,
triggers or a complete student attempt.

Deploy the frontend change for the **I-save muli ang sagot** button. If saving
fails, the current page retains the original transcript and numbered attempt in
memory. A retry resends that exact body without activating the microphone or
consuming another attempt. Accepted results update the query cache before the
microphone becomes available, including when the subsequent refresh fails.

## Verification performed

```powershell
node scripts/qa-word-of-day-sql.mjs
node scripts/qa-word-of-day-retry.mjs
node --test server/tests/wordOfDayAtomic.test.js
```

The SQL suite uses a fresh local PostgreSQL cluster and synthetic UUID-based
tables. It executes the actual migration: 13 checks cover reinstallation, 20
concurrent sessions, 25 XP/streak, repeated wrong attempts, lost responses,
next-day replay, rollback of each write, ownership/order/day validation, legacy
completion conflicts, denied browser-role access and repeatable-read conflicts.
It requires the existing `scripts/qa-tools` dependencies and permission to start
local PostgreSQL. It does not load application environment files.

The browser suite uses the actual React card and React Query with synthetic
speech/auth/API responses. It verifies unavailable-service retry, unchanged
transcript and attempt number, encouragement on successive wrong attempts,
lost-acknowledgement replay with one reward, and microphone state. It does not
exercise real microphone capture or the live speech provider.

The backend suite's 15 checks exercise the real route/service against a contract
model. These supplement the SQL checks; they do not replace them.
