# XP/progress security audit

OPEN-01 is **FIXED LOCALLY for the supported contract** and **OPEN / BLOCKED FOR ROLLOUT** on shared deployments. The original isolated exploit returned 200 and stored 1,000,000,000 XP/attempts; the final endpoint returns 400 with no write. A legitimate first practice answer also passed real HTTP -> backend scoring -> PostgreSQL and returned 50 base XP plus only verified badge awards.

Local mocked clients/providers, isolated Express HTTP and a fresh disposable PostgreSQL fixture. Real Supabase JWT/PostgREST, shared schema, physical-device reward integration and production compatibility remain unverified.

778 automated cases PASS, 0 FAIL, 2 staging cases skipped/blocked; 10 additional backend regression programs. Build/type/lint gates are reported separately, without double-counting tests.

## Writer and dependency inventory

The [complete source reference index](evidence/writer-references.json) contains 708 file/line references across both repositories. It includes historical migrations and readers; a reference alone is not a live write. The inventory below identifies the actual owner/caller/operation and risk.

| File / function and caller | Endpoint / persistence | Accepted authority and reward | Risk / correction / dependency |
| --- | --- | --- | --- |
| Mobile StudentDashboard practice -> readingContentService -> learningAttemptService | /progress/events/start, /events/:id; student_progress_events | Token-owned child, issued content/source ticket; server score; mobile 50 base XP once per first verified eligible content | Replaces client sessions/totals/badges; retry body persists per account; DB proposal required |
| Mobile StudentModules chooseAnswer -> same service | Bound assessment attempt/item -> existing curriculum and submit RPCs | Server compares selected answer; zero base XP | Forged accuracy/full-submission rejected; wrapper rejects legacy unverified attempts; final-submit receipt |
| Mobile progressService saveProgress / buildNextProgress | GET /progress only; old math helper has no persistence caller | Official saved row only | Pure legacy math retained for compatibility/tests; cannot serialize totals |
| Mobile achievementService / badge display | Receipt IDs + existing catalog | No client award; existing ledger and verified SQL predicates | Eight practice badges plus first-badge cascade supported; remaining new categories blocked pending evidence |
| Mobile StudentDashboard completeActivity | Local explicit unavailable state | No arbitrary counter mutation | Server completion evidence/workflow remains blocked |
| Mobile lessonProgressService -> lessonProgress router | authenticated own GET/open; complete returns 503 | Published lesson, token-derived child; open does not award | Former arbitrary childId/unauthenticated completion closed |
| Mobile GuidedPdfReader | Formative scoring/TTS + saved reads | No new official PDF writes/XP | Client accuracy/assignment-submit writes removed; verified workflow blocked |
| Mobile StudentWordOfDay -> wordOfDayAttemptService -> speech.js | record_web_word_of_day_attempt; shared WOD receipts/log/progress | Exactly 25 eligible XP, three attempts, Manila day, WOD-owned streak | Removed 50-XP and legacy SQL/JS fallbacks; missing RPC -> sanitized 503; proposal unexecuted |
| Both daily-word initialization helpers | server loadWordOfDay -> canonical active reading_content + owned daily log | Level from official reading-progress RPC; deterministic stable target | Direct client log creation/update removed; insert race preserves existing row |
| Web Module/Practice/Assessment -> progressEvents.ts | /student/progress/events; same DB contract | Backend chooses web policy: zero base practice XP; verified counters and badge rewards | Existing web scoring preserved; pending answer/ticket in account-scoped browser storage |
| Web student legacy content/practice/pilot endpoints | Rejected 400 | No client-authored completion accepted | Old clients require coordinated update |
| Web student PDF drill / nonsense submit | Explicit 503 | No separate attempt-then-XP updates | Nontransactional reward writers removed; legitimate payouts blocked |
| Web student PDF guided-reading attempts/submission | Server-owned assignment access and stored PDF target/chunks; no XP | Existing formative workflow; independently validated target | Not used as evidence for new XP/badges; full atomic reward extension remains blocked |
| Web badgeEngine -> reconcile_verified_student_badges | student_badge_awards + established award_student_badges | Eligible IDs/amounts computed inside DB from verified receipts | Skips historical achievement IDs; no legacy counter/session trust |
| Backend auth / web parent enrollment | Initial child_progress row at enrollment | Verified parent workflow, zero initial XP | Existing local OTP/enrollment tests retained; live enrollment intentionally not run |
| Parent/teacher/admin reports, profiles, dailyGoal | Official progress reads; daily goal from server-created practice sessions | Read-only summaries; no caller can submit official totals | Real provider RLS/storage remains blocked; historical analytics are not clean proof |
| SQL mobile 025/026/042, web 026 | Existing curriculum attempts/completions, module assessment, badge ledger | Existing official progression functions retained inside the new transaction | No duplicate ledger/reward authority introduced; historical rows preserved |
| SQL mobile 022/031/032/033/034/035 | Multiple historical WOD signatures and 50-XP routines | Historical source only; actual installed catalog unknown | Review/restrict obsolete entry points and drain old workers before rollout |
| SQL new proposal / revision trigger | Progress row -> event -> assessment locks; arithmetic updates; receipts | Service-role-only, restrictive direct-write grants | Atomicity verified on fresh PostgreSQL; proposal not installed on Supabase |

## Before/after evidence

[Original exploit](evidence/open-01-before.json), [six pre-fix vectors](evidence/before-vectors.json), current [router tests](evidence/backend-progress_security.test.js.log), [real transaction cases](evidence/sql-results.json). Non-finite HTTP JSON values are tested as null/string encodings; all client total fields are rejected. Unknown outcomes reuse the same ticket; stale totals never overwrite current progress.

No shared Supabase data or environment secrets were changed. No deployment, commit, push, credential rotation, history rewrite or automatic historical repair occurred. The WOD proposal was inspected, not executed.
