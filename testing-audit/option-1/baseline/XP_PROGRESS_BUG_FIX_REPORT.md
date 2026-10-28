# XP/progress bug-fix report

| Defect | Local result | Production result |
| --- | --- | --- |
| OPEN-01 client XP/attempt/counter overwrite | FIXED within supported contract: rejected without writes; legitimate reward confirmed through real PostgreSQL | OPEN / BLOCKED FOR ROLLOUT |
| XP-02 forged accuracy/completion/assessment-source attempt | FIXED locally: stored target score, bound context and verified submission receipts | Requires approved RPC/grants and both backends |
| XP-03 duplicate/stale/concurrent progress writes | FIXED locally: exact request receipt, row lock, additive updates, revision snapshots | Real Supabase/PostgREST and legacy-writer coexistence blocked |
| XP-04 mobile WOD nontransactional 50-XP fallback | REMOVED locally; shared 25-XP service contract tested with mocks | Separate WOD SQL remains unapproved/unexecuted |
| XP-05 client badge awards / legacy-counter trust | FIXED for supported practice badges; existing XP/IDs preserved | Other new badge categories intentionally blocked |
| XP-06 unauthenticated/foreign lesson completion | FIXED locally: auth/ownership; unsupported completion fails closed | Verified lesson event implementation still needed |
| XP-07 web PDF/nonsense partial reward writes | Unsafe payouts disabled locally | Legitimate payouts blocked until an atomic contract is implemented |
| XP-08 stale UI/ambiguous retry | Official snapshots, persistent pending requests, revision guard, explicit retry/error copy | Real cross-device staging validation blocked |

Historical XP, attempts and achievement IDs were not reset or recomputed. New badge eligibility excludes old client-written history. A synthetic historical billion-XP row was deliberately retained in the SQL test, then incremented only by its legitimate new 50-XP reward; this is preservation evidence, not approval of suspect historical values.

Native practice scoring and its 88 passing threshold are mirrored on the backend and parity-tested. Mobile multiple-choice answers are compared on the server; web speech scoring stays unchanged. The conservative first-content mobile payout replaces repeat XP farming; owner review is a rollout prerequisite. Web practice keeps zero base XP.

778 automated cases PASS, 0 FAIL, 2 staging cases skipped/blocked; 10 additional backend regression programs. Build/type/lint gates are reported separately, without double-counting tests.

See [contract](XP_PROGRESS_CONTRACT.md), [regression results](XP_PROGRESS_REGRESSION_RESULTS.md), [database readiness](XP_PROGRESS_DATABASE_READINESS.md).
