# QA baseline — 2026-10-17 (Asia/Manila)

Recorded before application fixes. This is a source review and local baseline, not a certification of the deployed system.

The working tree was clean. The application has React 19/TypeScript/Vite, Express 4, Supabase Auth/Postgres/Storage/Realtime, browser speech recognition, and backend ElevenLabs synthesis. Node 22.19.0/npm 10.9.3 are installed. Tests use the built-in Node runner; several existing security tests assert source text, and route tests substitute the database. Those tests cannot prove real RLS, persistence, email delivery, or speech quality.

Baseline execution:

- Backend: 49 cases, 47 passed, 2 staging suites skipped, 0 failed.
- Frontend: 16 passed, 0 failed.
- Lint: exit 0, 12 warnings.
- Build: exit 0; 2,701 modules transformed; Vite reported 12.55 seconds (Vite phase only).
- No application database writes, emails, migrations, deployments, or commits performed.

Initial defects and risks to reproduce:

| ID | Severity / priority | Finding | Verification needed |
|---|---|---|---|
| BUG-001 | High / P1 | Signup upserts `users` even when email confirmation means Supabase returns no session. An authenticated-only profile policy rejects that request after Auth has already created the account. | Isolated signup behavior and real staging signup/email. |
| BUG-002 | High / P1 | `resolveRole` ignores profile/child lookup errors, then can upsert `parent` over an unknown role. It also ignores the repair result. | Unit failures for both lookups and repair; preserve authoritative roles. |
| BUG-003 | High / P1 | Express 4 async authentication/role middleware has no rejection handling; an upstream rejection can escape request error handling. Account status is absent from role validation. | Rejected-service and disabled/archived-account unit cases. |
| BUG-004 | High / P1 | PDF drill replacement treats a missing/non-array `items` as `[]`, then deletes saved items. Null items throw rather than producing 400. XP zero is accepted but silently saved as 25, despite the SQL constraint requiring positive XP. | Route unit cases proving invalid input cannot reach mutations. |
| RISK-001 | High / P1 | Drill replacement deletes before inserting, without a transaction. The drill-item FK uses `ON DELETE CASCADE` for attempts, so replacing a used drill removes its attempt history. | Dedicated DB rollback/history tests; requires a coordinated persistence change. |
| BUG-005 | Medium / P2 | Word-of-day uses Manila dates in the frontend but UTC dates for server streak accounting. | Midnight boundary regression. |
| BUG-006 | Medium / P2 | Email validator is unanchored and accepts whitespace/multiple addresses. Saved-profile parsing trusts array entries and can crash on null/corrupt entries. | Malformed and boundary unit cases. |
| BUG-007 | Medium / P2 | API compatibility header is not exposed through CORS; cross-origin browsers cannot read it and always report a mismatch. Oversize JSON is mapped to generic 500. | Real local HTTP checks. |
| BUG-008 | Medium / P2 | Role route bundles have no wildcard fallback, so unknown paths inside dashboards can render an empty area. | Route inventory and anonymous browser navigation. |
| BUG-009 | Medium / P2 | Root `npm test`/CI exclude frontend tests; staging safety checks accept a target merely because another URL contains `localhost`/`staging`. | Unified test execution and per-target safety unit cases. |
| RISK-002 | High / P1 | Word-of-day, nonsense-check, drill XP, and automatic promotion use multiple requests. Reward updates can be lost or partially committed on errors/concurrency. Word-of-day log target remains browser-writable according to the route documentation. | Dedicated database concurrency/RLS tests; review mobile compatibility before migration. |
| RISK-003 | Medium / P2 | Many pages lack explicit query-error UI; teacher roster checkboxes have no selection behavior. Dialog keyboard/focus behavior needs real browser checks. | Complete control inventory and authenticated browser tests. |
| RISK-004 | Medium / P2 | Build contains many 1–2.4 MB PNG assets; shared CSS is 400.83 kB uncompressed. | Browser/network measurements, preserving artwork. |

Plan: inventory all source routes, controls, API calls, tables, and migrations; add isolated regressions for verified defects; fix safe local issues; run real local HTTP/security checks and available-browser checks; document each live workflow separately as blocked unless dedicated staging configuration is available. Mocks remain confined to unit/route-unit tests. Historical migrations and production data remain untouched.
