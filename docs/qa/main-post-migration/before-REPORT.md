# LinawLetra software QA — 2026-10-18 (Asia/Manila)

**Not ready for formal capstone signoff.** All configured local Node gates, three public-browser suites, deployed anonymous checks and selected real PostgreSQL tests were rerun. The shared deployment/database was not modified. No account login, email, shared schema/data/Storage change, commit, push or deployment was performed. Complete authenticated dashboard/service workflows remain BLOCKED because there is no isolated Supabase project, complete authoritative schema snapshot or dedicated service credentials.

## Actual results

| Result | Count |
|---|---:|
| Inventoried cases | 561 |
| Passed | 472 |
| Failed | 15 |
| Blocked | 66 |
| Not run | 3 |
| Not implemented | 5 |
| Executed | 487 |
| Pass rate of executed cases | 96.92% |

The previous 555-case snapshot (465 PASS / 16 FAIL / 66 BLOCKED / 3 NOT RUN / 5 NOT IMPLEMENTED) is preserved in [phase2](phase2/REPORT.md). New transaction/schema regressions expand the inventory. Counts use the latest result per stable ID, not summed reruns. Compatibility summary rows reuse constituent cases and are not independent user journeys. Historical dependency audit results retain their original execution date; no new audit or full-service validation is inferred.

**196 Node tests passed**: backend 165 passed, 0 failed, 2 skipped; frontend 31 passed, 0 failed, 0 skipped. The two skipped real-staging suites remain BLOCKED. **28/28 local PostgreSQL assertions passed**; these include negative historical-schema compatibility probes, not a complete Supabase restore. Build/static gates: lint exit 0; build exit 0; vite-build exit 0; diff exit 0. [Gate evidence](evidence/phase3/check-summary.json), [database assertions](evidence/phase3/database.json), [verified runner outcome](evidence/phase3/database-runner.json).

## All 16 prior failures investigated

[FAILED_TEST_REVIEW.md](FAILED_TEST_REVIEW.md) provides a separate row for each prior failed ID, current result, local counterpart, cause, action and evidence. Deployed unknown-role routes, mobile information overflow and missing CORS exposure remain separate from local corrections. No deployed failure was cleared by a local pass.

The local asset-denial issue was reproduced outside the application. An independent HTML/CSS/twenty-script fixture completed without failures in Edge 5/10 contexts, Chromium 5/10 contexts. Browser errors include ERR_NETWORK_ACCESS_DENIED; server/browser correlation is retained. This rules out LinawLetra code as a necessary cause, but does not identify a specific OS policy/browser defect. No firewall exception, security flag, static-response substitution or retry-until-pass loop was used. [Diagnostic details](NETWORK_DIAGNOSTICS.md).

Current failed IDs: BR-001, LIVE-BR-008, LIVE-BR-009, LIVE-BR-010, LIVE-BR-011, LIVE-BR-012, LIVE-BR-042, LIVE-BR-045, LIVE-BR-048, LIVE-BR-050, LIVE-BR-051, LIVE-025, COMPAT-Chrome, BR-058, CHROME-BR-058. An intermittent individual route can pass this run while its separate ten-context reliability case remains failed. New failures are retained rather than hidden by the previous status.

## Verified corrections in this phase

Migration 047 was reviewed and run locally. A new regression reproduced over-capacity insertion under REPEATABLE READ: its SELECT FOR UPDATE did not invalidate an older snapshot. [Before-fix evidence](evidence/phase3/database-047-before-048.json) retains the failed assertion. New **048_section_capacity_snapshot_safety.sql** changes the section row version while holding its lock, causing stale snapshot writers to receive serialization_failure instead of exceeding capacity. Original migration files 001–047 were preserved. Normal capacity, duplicate retries, membership moves, grade/foreign-key constraints, rollback and privilege/RLS regressions were rerun. A service-role RPC concurrency case verifies the real SQL entry point under repeatable read.

The Admin assignment API returns 409 with retry guidance for serialization/deadlock conflicts. It keeps the single atomic RPC and does not fall back to separate partial writes. A real Express route-unit test with a substituted RPC boundary verifies that behavior; the SQL suite verifies persistence independently. This is not a real Supabase Auth/PostgREST end-to-end claim.

The embedded PostgreSQL dependency previously returned process exit 0 despite a failed assertion. The new parent runner accepts success only with a successful worker exit, fresh matching-run JSON, all planned cases present and no failed/blocked rows. A process exit alone is no longer accepted as database test success.

Existing responsive, wildcard-route and CORS source fixes were regression-tested. No dashboard redesign or unrelated functionality was added. [Phase-specific changed files](phase3-modified-files.txt); prior working-tree changes were preserved.

## Schema baseline and migration requirements

The source contract records 36 literal table dependencies, 9 RPC names and 101 stream-qualified SQL files/checksums. It includes optional/legacy source paths, so it is a review input, not a proof of enabled runtime scope. [SCHEMA_BASELINE_REVIEW.md](SCHEMA_BASELINE_REVIEW.md) records the exact incompatibilities and required source of truth. Original mobile 001 fails PostgreSQL parsing at unsupported policy syntax; its TEXT foundation also fails the UUID-dependent child RLS policy. These failures were reproduced in a separate local database, without editing historical SQL.

A reviewed schema-only snapshot of the actually installed shared schema is required to establish the complete baseline. Missing UUID-conversion history and the actual users key/lastLoginAt definitions must be reconciled; no guessed schema or altered historical migration was substituted. [ISOLATED_SCHEMA_PREFLIGHT.sql](ISOLATED_SCHEMA_PREFLIGHT.sql) queries only catalog metadata and was compiled/executed against the local projection. Its expected missing dependencies demonstrate that the projection cannot be mistaken for the full application. Executing this preflight against a complete isolated Supabase project remains blocked.

For a reviewed baseline matching 046, apply **047, then 048** to the isolated project and validate before testing/releasing the changed backend. No migration was applied to shared Supabase. Actual installed state must be reconciled before any later approved deployment; source fixes alone cannot update the deployed artifact.

## Blocked and unexecuted scope

All 66 remaining BLOCKED cases retain status. [BLOCKED_TEST_REQUIREMENTS.md](BLOCKED_TEST_REQUIREMENTS.md) and [SAFE_TEST_ENVIRONMENT.md](SAFE_TEST_ENVIRONMENT.md) describe dedicated Admin/Teacher/Parent/Student and unrelated-user fixtures, safe private configuration, full schema/content/relationship requirements and gated provisioning. No isolated configuration is present; no real Auth fixtures were created. Local SQL role/claim fixtures are explicitly not Supabase accounts.

Complete authentication, refresh/revocation/account switching, disabled-token RLS, account creation, verification/recovery email OTP, CRUD/Storage/Realtime, every dashboard control, lessons/assessments/progress/rewards, real microphone Tagalog STT and actual provider TTS remain blocked at their full workflow scope. Unit/provider substitutions and selected SQL assertions do not clear them. No service-role client was used to pretend a browser RLS probe passed.

The three NOT RUN cases remain full assistive-technology/contrast evaluation on authenticated dashboards, representative load/query-plan testing and physical iOS/Android testing. Five NOT IMPLEMENTED entries remain teacher scheduling, bulk selection, the advancement badge predicate, measured parent engagement and separate login OTP/Google TTS. Existing parent calendar, signup/recovery OTP and ElevenLabs functionality are distinct implemented features.

## Browser and non-functional evidence

| Suite/version | Passed | Failed | Blocked |
|---|---:|---:|---:|
| local-edge 155.0.4283.62 | 56 | 2 | 0 |
| local-chromium 156.0.8078.4 | 57 | 1 | 0 |
| local-firefox 157.0 | 58 | 0 | 0 |
| live-edge 155.0.4283.62 | 46 | 10 | 0 |

Each normal suite checks 13 public routes at 375/768/1440px, 12 anonymous protected-route redirects, empty login/signup validation, keyboard password activation, OTP paste/navigation, input names and uncaught exceptions. Local suites add deliberately failed-bundle recovery and cold contexts with asset/overflow assertions. All local remote requests and all data-changing browser requests are blocked; deployed checks are anonymous GET/HEAD only. Resized desktop engines do not certify physical mobile devices or complete accessibility. Screenshots and request errors are in evidence/phase3.

Public request timings are individual network/TLS/cache observations, not database workload or load-test measurements. Security evidence establishes only the named middleware, input, grant and selected RLS boundaries. It does not certify every deployed policy, actual speech quality or full accessibility compliance.

## Outstanding risks and required external actions

- **High:** Word-of-day, nonsense-word, drill reward and promotion flows still span independent writes; full concurrency/failure recovery requires the complete isolated baseline. Badge atomicity is separately covered and does not certify the other flows.
- **High:** Full table/RPC/Storage RLS and disabled-account revocation require real isolated Auth tokens and unrelated-role/owner fixtures.
- **Medium:** Draft replacement and account enrollment/teacher-creation rollback, query-error feedback, direct browser PDF uploads, audit event deduplication and notification consistency still need service-backed verification.
- **Developer/environment action:** inspect local network denial on a clean approved host or with authorized endpoint logs; no blanket security exception is requested or applied.
- **Separate project/services:** obtain the schema-only baseline and isolated Supabase/API/frontend, seed synthetic users/content, connect test SMTP and a dedicated TTS provider, and use a real microphone/device for STT. Keep credentials only in private local configuration.
- **Approval required later:** any shared-database migration, destructive shared-data operation or production release. No such action was attempted; remaining local corrections and migration files are reviewable.

Capstone signoff requires passing complete role/ownership and learning workflows in isolation, closing high-risk transaction/RLS gaps, resolving native-browser reliability, and a separately approved release followed by deployed regression. Current evidence supports the listed local corrections and limited executed tests; it does not establish full capstone readiness.
