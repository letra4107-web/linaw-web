# XP and progress contract — local proposal v1

Recorded before implementation, 22 October 2026. Shared Supabase installation is unverified. No production execution or deployment is authorized.

## Ownership and inputs

Bearer authentication resolves `children.auth_uid` to the learner. Client identity, XP, counters, levels, badges, streaks and completion flags are rejected. `/progress/update` becomes a read-only compatibility refresh when its body is empty; any submitted fields return 400. `GET /progress` reads the official saved row without requiring reward migrations.

Practice and assessment answers use a database-issued ten-minute ticket bound to learner, active curriculum content and source. Assessment tickets also bind an owned, active assessment attempt and its configured question. A UUID alone is neither a completion nor an award. The backend scores the submitted answer against the stored target; the transaction rechecks that target, access, expiry and assessment state. Native/browser transcripts are untrusted answer text, not proof of spoken audio, identity or physical participation. An acoustic anti-cheating claim requires a separately verified speech provider and is outside this contract.

Only answer text and bounded duration are accepted when consuming a ticket. Reusing a ticket with changed input conflicts. An identical retry returns the committed receipt, zero additional award and current official progress, including after expiry. A new ticket cannot pay again for the same already-completed content. This deliberately closes repeat-completion XP farming: the existing mobile practice amount of 50 XP applies once to the first qualifying practice completion (server accuracy at least 88); assessment answers award zero base XP. Incorrect and repeat answers still persist legitimate attempts. Existing content-completion thresholds and official level calculation remain owned by `record_student_content_attempt`; paragraphs require a bound assessment ticket for a full submission.

## Transaction boundary

`start_student_progress_event` and `record_student_progress_event` require service role. All mutations lock the learner's `child_progress` row first, then the event/assessment. The consume RPC records the existing curriculum attempt/completion, pronunciation session, additive counters and optional first-completion reward, verified badges and receipt in one PostgreSQL transaction. A unique event key and the row lock serialize multiple workers; no in-memory lock provides integrity. Errors abort all changes. Arithmetic updates preserve other cooperating increments. Existing achievements and historical XP are retained, never reset/recomputed. New badge eligibility uses only post-contract verified receipts; old client-written totals/sessions are not evidence. Reuse the existing `student_badge_awards` ledger and `award_student_badges` function; skip IDs already present in historical achievements.

Lesson opens are authenticated and scoped. Client assertions of lesson/assignment completion cannot increment official totals; unsupported completion verification fails closed, with read-only progress retained. PDF/nonsense web rewards also fail closed until an atomic, independently validated workflow is installed; retaining their old multi-write reward logic would leave lost-update and partial-payment vulnerabilities.

## Word of the Day

Reuse the existing web `record_web_word_of_day_attempt` proposal and receipt namespace on both platforms: exactly 25 XP for eligible success, at most three attempts, zero XP for final incorrect completion, Manila dates, successful-day streak ownership, identical numbered retries and no guessing legacy payment. The existing proposal remains unexecuted. Remove mobile's 50 XP JavaScript and legacy-RPC fallbacks. The general event RPC never writes streak/date fields. Deployment requires reviewing/removing or restricting obsolete service-role WOD entry points and confirming shared lock order; do not deploy either backend before both database contracts are approved and installed.

## Client behavior

Only confirmed server snapshots update displayed official XP. No permanent optimistic totals, badge awards or earned-XP notification before confirmation. Keep the same pending ticket and input after an ambiguous timeout; offer a same-attempt retry. Session expiry/403, stale/409, missing dependency/503 and network failure have explicit messages. A receipt replay returns zero new award. Old clients posting totals receive 400 and require an app update.

## Rollout and rollback

Review installed schema, all grants/RLS/triggers/functions and every writer first. Install reviewed prerequisites and the general progress proposal; separately approve/install the existing WOD proposal. Validate real isolated SQL, then staging auth/RLS/PostgREST and simultaneous mobile/web writes. Update both backends and clients together. Preserve all event/badge/WOD receipts on rollback; disable reward routes rather than restoring arbitrary totals or nontransactional fallback. Historical suspect awards require independent records and separately approved reconciliation.

## Implemented contract clarification

The backend fixes the channel on ticket creation. Web practice retains zero base XP; native practice retains its existing server-mirrored score and threshold 88, capped to one verified 50-XP content reward. Mobile choice answers use server equality (100/0); web speech scoring is unchanged. Only verified practice events feed supported badge criteria; other categories remain blocked. A revision trigger covers all cooperating progress-row updates. Supported transactions reuse the existing curriculum/assessment implementation and badge ledger. Review the conservative repeat-reward cap before rollout.
