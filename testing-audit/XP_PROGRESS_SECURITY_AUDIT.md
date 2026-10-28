# XP/progress security audit

Updated 23 October 2026. Option 1 is VERIFIED LOCALLY for the supported practice/assessment contract. Formal staging/production status remains NOT READY / BLOCKED. No shared Supabase access/changes, shared migration execution, deployment, commits, pushes, history deletion or historical XP repair occurred. General-progress SQL and its prerequisites ran only in disposable local PostgreSQL. The separate WOD proposal remains unchanged and unexecuted.

## Option 1 security findings

OPEN-01 remains fixed locally. The dedicated ledger closes uncertain legacy-payment backfill, and contract version 2 prevents the older proposal from consuming an event without the new ledger. Client XP/counters/completion flags remain rejected; the newAttempt ticket-request mode cannot establish eligibility.

| Operation | Canonical identity and receipt | Base reward / status |
|---|---|---|
| Ordinary content practice | children.id + content_practice + reading_content.id; student_content_base_rewards primary key; awarded_event_id links the same student/content event | Existing mobile 50 XP at score >=88, once; existing web 0 base XP |
| Curriculum completion | student_content_completions(student_id,content_id); immutable qualifying_attempt_id | Existing >=75 non-paragraph completion rule; independent of 88-XP eligibility; permanent |
| Assessment answer | Owned assessment attempt UUID + configured assessment-item UUID, bound to reading_content.id and immutable content-attempt UUID | 0 base XP on both platforms; each new assessment run has distinct answer receipts |
| Module completion | student_id + reading_modules.id, qualifying submitted/passed assessment attempt | Existing weighted score and pass-percentage snapshot (default 75); no new module base reward invented |
| Badge | student_badge_awards(student_id,badge_id), existing once-only badge ledger | Existing approved verified badge rewards remain separate from base content XP |
| WOD | Owned daily word_of_day_log.id and Manila date; separate (log_id,attempt_number) receipt namespace | Separate approved eligible 25 XP, at most three attempts; RPC proposal uninstalled/unverified on shared project |
| Lesson/activity/PDF/nonsense payout | Their own database IDs; never interchangeable with reading_content.id | Unsupported verified reward operations continue to fail closed; read-only/formative behavior retained |

The learner progress row is locked first, then the event and content claim. student_content_base_rewards has primary key (student_id,reward_type,content_id), fixed content_practice namespace, unique awarded_event_id, a composite foreign key binding that event to the same student/content, and constraints rejecting amount/receipt inconsistencies. Its claim, base XP, curriculum attempt/completion, linked pronunciation session, counters, verified badges and final event receipt commit in one SQL transaction. Failures at claim insert/update, session/progress update or final receipt roll everything back. Twenty independent sessions retrying one event produce one attempt. Twelve distinct tickets issued through the actual start RPC and consumed in separate PostgreSQL sessions produce twelve legitimate attempts and exactly one base payment; twelve concurrent repeats keep all scores and zero further base payment. These cases use the public RPC path, without seeding event-table rows.

anon/authenticated cannot write reward evidence or execute reward RPCs. New ledger/event table grants give service_role SELECT; SECURITY DEFINER RPCs perform the mutations. Read-only official progress and existing RLS remain available. Arithmetic updates and progress_revision protect cooperating concurrent writes and stale responses. This cannot protect against an old privileged deployment overwriting totals: draining/restricting all legacy writers remains a rollout prerequisite.

See [complete Option 1 verification](XP_OPTION_1_POLICY_VERIFICATION.md). [Preserved previous report](option-1/baseline/XP_PROGRESS_SECURITY_AUDIT.md).


## Historical writer inventory and audit

The following is the retained pre-Option-1 audit; current status and contract above supersede its counts/policy-review blocker.

# XP/progress security audit

OPEN-01 is **FIXED LOCALLY for the supported contract** and **OPEN / BLOCKED FOR ROLLOUT** on shared deployments. The original isolated exploit returned 200 and stored 1,000,000,000 XP/attempts; the final endpoint returns 400 with no write. A legitimate first practice answer also passed real HTTP -> backend scoring -> PostgreSQL and returned 50 base XP plus only verified badge awards.

Local mocked clients/providers, isolated Express HTTP and a fresh disposable PostgreSQL fixture. Real Supabase JWT/PostgREST, shared schema, physical-device reward integration and production compatibility remain unverified.

778 automated cases PASS, 0 FAIL, 2 staging cases skipped/blocked; 10 additional backend regression programs. Build/type/lint gates are reported separately, without double-counting tests.

## Writer and dependency inventory

The [complete source reference index](evidence/xp-progress/writer-references.json) contains 708 file/line references across both repositories. It includes historical migrations and readers; a reference alone is not a live write. The inventory below identifies the actual owner/caller/operation and risk.

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

[Original exploit](evidence/xp-progress/open-01-before.json), [six pre-fix vectors](evidence/xp-progress/before-vectors.json), current [router tests](evidence/xp-progress/backend-progress_security.test.js.log), [real transaction cases](evidence/xp-progress/sql-results.json). Non-finite HTTP JSON values are tested as null/string encodings; all client total fields are rejected. Unknown outcomes reuse the same ticket; stale totals never overwrite current progress.

No shared Supabase data or environment secrets were changed. No deployment, commit, push, credential rotation, history rewrite or automatic historical repair occurred. The WOD proposal was inspected, not executed.
