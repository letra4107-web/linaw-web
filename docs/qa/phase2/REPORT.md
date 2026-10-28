# LinawLetra QA continuation — 2026-10-18

**Not ready for formal capstone signoff.** All currently configured unit/route/HTTP checks and the available public-browser and selected real PostgreSQL cases were executed. Complete authenticated dashboards, real Supabase Auth/PostgREST/RLS, email delivery, and actual Tagalog audio/recognition remain unverified. The user confirmed the deployment is shared and instructed no database writes. No shared record/account/email/storage changes, migrations, commits, pushes or deployments were performed.

## Actual results

| Result | Count |
|---|---:|
| Total inventoried cases | 555 |
| Passed | 465 |
| Failed | 16 |
| Blocked | 66 |
| Not run | 3 |
| Not implemented | 5 |
| Executed | 481 |
| Pass rate of executed cases | 96.67% |

Previous inventory: 324 passed, 7 failed, 68 blocked, 3 not run, 5 not implemented. Additional browser/database/safety regressions expand the denominator. Counts use the latest outcome per stable ID, including failures; historical runs are not added again. Compatibility summary cases reference browser assertions already listed, so the total is an inventory of checks, not a count of independent user journeys. Blocked workflows retain their full scope despite partial local coverage. [All test cases](TEST_CASES.md), [machine-readable results](test-results.json), [original report](phase1/REPORT.md).

Node suites: backend: 164 passed, 0 failed, 2 skipped; frontend: 31 passed, 0 failed, 0 skipped. **195 automated Node cases passed.** The two skipped staging suites are BLOCKED, never PASS. These tests include isolated service substitutions and source assertions, not complete end-to-end dashboards.

## Seven previous failures and new findings

| Original ID | Latest result | Root cause and verification limit |
|---|---|---|
| BR-001 | PASS | Loopback asset requests intermittently return ERR_NETWORK_ACCESS_DENIED in Edge. Initial home rerun and the separate ten-context reliability case are reported independently; OS/browser cause is unresolved. |
| LIVE-BR-042 | FAIL | Deployed role route bundle lacks a wildcard fallback. Local routes redirect correctly; deployed artifact unchanged. |
| LIVE-BR-045 | FAIL | Deployed role route bundle lacks a wildcard fallback. Local routes redirect correctly; deployed artifact unchanged. |
| LIVE-BR-048 | FAIL | Deployed role route bundle lacks a wildcard fallback. Local routes redirect correctly; deployed artifact unchanged. |
| LIVE-BR-050 | FAIL | Deployed role route bundle lacks a wildcard fallback. Local routes redirect correctly; deployed artifact unchanged. |
| LIVE-BR-051 | FAIL | Deployed role route bundle lacks a wildcard fallback. Local routes redirect correctly; deployed artifact unchanged. |
| LIVE-025 | FAIL | Deployed CORS configuration omits Access-Control-Expose-Headers. Local API fix passes HTTP checks; deployed code unchanged. |

Five mobile information pages also overflowed at 375px in all three engines. The CSS grid's implicit minimum width expanded to its content width (587–714px); an explicit single flexible column, shrinkable panels and wrapping correct this locally. The previous CDP runner emulated a mobile layout with a different effective viewport, so its passing result did not expose this at a true 375px layout viewport. New Playwright checks assert innerWidth and scrollWidth. Before-fix JSON and screenshots remain in evidence/phase2/before-fixes and the phase2 failure images. The deployed pages still use the old layout; their failures are retained.

The loopback issue is intermittent in Edge and Chromium and affects multiple asset types. Request evidence includes exact localhost asset URLs and ERR_NETWORK_ACCESS_DENIED; blocked external fonts and deliberately blocked TeacherArea recovery requests are separately identifiable. No browser/OS security policy was disabled to force a pass. A failed cold-load screen does not prove a specific React defect; the app's retry recovery remains tested. The stricter targeted cold runs also check asset failures and overflow; they replace the earlier cold assertion for the same ID. Browser results below establish only their executed scope.

Current failed IDs: BR-044, LIVE-BR-008, LIVE-BR-009, LIVE-BR-010, LIVE-BR-011, LIVE-BR-012, LIVE-BR-042, LIVE-BR-045, LIVE-BR-048, LIVE-BR-050, LIVE-BR-051, LIVE-025, COMPAT-Chrome, BR-058, CHROME-BR-001, CHROME-BR-058.

## Database defect fixed and tested locally

Migration 046 allowed concurrent inserts to overfill a section because capacity was read without a row lock. Its BEFORE INSERT trigger also rejected an existing membership at capacity before ON CONFLICT DO NOTHING could skip it. The local PostgreSQL runner reproduced both defects before applying the fix (two members in a capacity-one section, and a rejected duplicate retry).

New **migrations/047_atomic_section_assignments.sql** serializes capacity decisions using a section row lock, permits idempotent duplicate retries and checks membership updates. Its service-role-only assign_section_students RPC commits membership and teacher roster together, so a roster grade failure rolls back the membership. The Admin API calls this RPC once, maps missing sections to 404 and validation errors to 400, and reports missing RPC/migration as an error. It does not fall back to unsafe partial writes. **047 must be reviewed/applied to the isolated database before testing the modified backend and must precede any future backend release. Nothing was applied to shared Supabase.** Historical migrations remain unchanged.

The section endpoint also accepted malformed 36-character IDs and silently discarded invalid entries mixed with valid ones. A regression failed before the correction ([before log](evidence/phase2/section-validation-before.tap)); the endpoint now validates every ID with the existing UUID validator before persistence. The full Node rerun includes this regression.

Selected real PostgreSQL checks exercise RLS visibility for Teacher/other Teacher/Admin/Parent/Student/anonymous identities; denied browser writes and privileged RPC access; capacity/concurrent insertion; idempotency; grade constraints; foreign keys; membership/roster rollback; disposable cascades; atomic/idempotent/concurrent badge XP; and malformed badge rollback. [Database evidence](evidence/phase2/database.json). This is a minimal UUID fixture using exact roster SQL from 004, full 026/046 and new 047. It is not the full Supabase schema, JWT service, PostgREST or Storage. Database roles/claim helpers are test fixtures, not real Supabase authentication.

## Browser execution and non-functional checks

| Run / version | Passed | Failed | Blocked |
|---|---:|---:|---:|
| local-edge 155.0.4283.62 | 56 | 2 | 0 |
| local-chromium 156.0.8078.4 | 56 | 2 | 0 |
| local-firefox 157.0 | 58 | 0 | 0 |
| live-edge 155.0.4283.62 | 46 | 10 | 0 |

Each normal suite covers 13 public URLs at 375, 768 and 1440px, 12 anonymous protected-route redirects, empty form validation, password keyboard activation, OTP paste/navigation, visible input names and uncaught exceptions. Local suites additionally test deliberate route-bundle recovery and ten fresh mobile-sized contexts. Local tests block external networking; deployed checks use no tokens and allow only GET/HEAD. Desktop browser engines at resized viewports are not physical mobile testing or authenticated dashboard E2E. Screenshots and per-request errors are retained under evidence/phase2. The initial Firefox run stalled; only the completed rerun or explicitly blocked outcomes are counted.

Lint with warnings denied, TypeScript, production build and diff checks: lint exit 0; build exit 0; vite-build exit 0; diff exit 0. Exact logs/durations are in [check-summary.json](evidence/check-summary.json). The first restricted-process TypeScript run timed out after 180 seconds; its log remains in phase2/typecheck-timeout.txt and a direct approved rerun succeeded. Earlier dependency audit evidence is retained at its original scope/date; no new clean-audit claim is inferred from a build. Public HTTP measurements are single-client network observations, not load benchmarks. Stress/soak, full accessibility/screen reader and physical iOS/Android remain not run.

## Review of all 68 original blockers

[BLOCKED_TEST_REQUIREMENTS.md](BLOCKED_TEST_REQUIREMENTS.md) maps every original blocked ID to its current result and exact account/data/tooling requirements. [SAFE_TEST_ENVIRONMENT.md](SAFE_TEST_ENVIRONMENT.md) describes the environment, reproducible commands and safe Supabase account provisioning. Provisioning was attempted in guard-only mode and stopped before networking because no separate Supabase project/configuration exists; see [provisioning evidence](evidence/phase2/provisioning.json). Dedicated local SQL role fixtures exist. Real Auth role accounts were not created on the shared deployment.

The sibling mobile repository supplies historical schema SQL, but original TEXT IDs conflict with later UUID assumptions. A reviewed schema-only baseline including the missing conversion is required before full Supabase migration replay. No shared schema dump or user data was copied. Account creation, real email verification/recovery OTP, persisted login/logout/revocation, account switching, disabled-account direct RLS, all four complete dashboards, learning and assessment persistence, Storage/Realtime and real speech remain blocked at their stated full-workflow scope.

## Remaining issues and readiness

- **High:** WOD, nonsense-word, drill rewards and promotion still span multiple independent writes; full concurrency and failure recovery are unverified. The local badge RPC is atomic, but does not establish the other reward paths. Inspect/review transactional fixes using the full isolated baseline before signoff.
- **High:** Complete table/RPC/Storage RLS and account-status revocation need isolated real Auth tokens, including unrelated users and old disabled sessions. The selected section/badge policies tested here do not certify all policies or actual shared state.
- **Medium:** Draft drill replacement deletes then inserts; profile/roster/mail failure can leave partial teacher account creation. Enrollment rollback, query error feedback, direct browser PDF uploads, audit event deduplication and cross-role notifications still need service-backed validation.
- **Medium:** Local Edge asset denial and deployed route/CORS/responsive failures remain visible above. No deployment was authorized. Deployment alone cannot clear the blocked service workflows.
- **Not implemented:** Teacher session scheduling, teacher bulk selection, advancement badge predicate, measured parent engagement analytics, separate login OTP/Google TTS. Existing parent calendar, signup/recovery OTP and ElevenLabs are separate implemented features.

Capstone readiness requires a disposable Supabase environment and schema baseline; real role/email/speech fixtures; passing complete role/ownership and learning E2E workflows; reviewed transactional corrections; and a separately approved release followed by deployed smoke tests. The current evidence supports local improvements and named limited checks, not a fully functional or production-ready certification.
