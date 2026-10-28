# XP/progress database readiness

**BLOCKED FOR SHARED ROLLOUT.** PostgreSQL 18.4 on x86_64-windows, compiled by msvc-19.44.35226, 64-bit ran only in a fresh disposable local database. The new proposal passed 28 real isolated cases. No shared migration was run.

The harness uses synthetic UUID children/content and real repository 025/026/042 curriculum/module SQL plus web 026 badge SQL, then the new [progress proposal](progress-events.PROPOSED.sql). It never loads the existing WOD proposal. This proves tested transaction behavior and fixture-role ACL/RLS, not catalog parity with Supabase or actual PostgREST/JWT integration.

## Exact rollout order

1. Obtain an approved isolated/staging target, run the [read-only preflight](progress-preflight.READONLY.sql), inspect all writers/functions/policies/triggers, verify row/key/column types and preserve a backup. Never blindly run both repositories' numbered migrations: numbers overlap and old WOD routines award 50 XP.
2. Review the supported reward policy and explicitly blocked operations below. Do not reset historical progress or trust old xp_awarded flags as payment evidence.
3. Drain/disable every older backend reward writer, including stale service-role processes and mobile's legacy JS WOD fallback. RLS on browser roles does not constrain an older service-role process. Review/restrict old personalized/legacy WOD RPC signatures.
4. Review prerequisites and approve/install the general progress proposal on staging. Its transaction validates schema and rolls back installation on incompatibility; missing functions/columns fail closed at the backend.
5. Separately review and explicitly approve the existing web testing-audit/review/word-of-day-atomic.PROPOSED.sql. Install/validate its shared 25-XP contract before either backend enables WOD. The proposal's historical mobile-50 comment must be reconciled with the new delegated mobile route.
6. Run the sixteen existing real WOD SQL scenarios, real JWT/PostgREST/ACL checks, mixed mobile/web contention and midnight/retry cases. The generic cooperating-writer test is not a substitute for this coexistence proof.
7. Update both backends and clients together; reject legacy total-posting clients. Verify the USB development app and browser against disposable staging learners. Formal testing follows these gates.
8. If rollback is needed, disable mutation routes with 503 and use the reviewed [shutdown rollback](progress-events-rollback.PROPOSED.sql). Retain all receipts, ledgers, XP, revisions and history; never restore arbitrary-total or multi-write fallback behavior.

## Legitimate operations currently blocked

- Lesson/activity completion counters and awards require trustworthy completion evidence.
- Web PDF-drill and nonsense-check payouts require atomic attempt/reward receipts.
- New reading/consistency/promotion/all-badges awards require verified evidence; existing badges remain visible.
- WOD's former separate pronunciation-session/curriculum side effects need review inside an atomic extension. Core 25-XP/streak contract remains a separate unexecuted proposal.
- Historical repairs need independent records and separate approval.
- Native repeat practice records legitimate attempts, but repeat base-XP payment is capped to the first verified content reward in this conservative candidate policy. Owner acceptance is required before rollout.

Read-only progress, supported practice/assessment attempt flows, pending-request retries and existing design remain locally available. Mutation dependencies have explicit unavailable states. Real permissions, storage, provider speech, accessibility on a newly installed build and cross-device integration remain blocked/not run.

No shared Supabase data or environment secrets were changed. No deployment, commit, push, credential rotation, history rewrite or automatic historical repair occurred. The WOD proposal was inspected, not executed.
