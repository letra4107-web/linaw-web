# Option 1 XP policy verification

Verified 23 October 2026 (Asia/Manila).

Option 1 is VERIFIED LOCALLY for the supported practice/assessment contract. Formal staging/production status remains NOT READY / BLOCKED. No shared Supabase access/changes, shared migration execution, deployment, commits, pushes, history deletion or historical XP repair occurred. General-progress SQL and its prerequisites ran only in disposable local PostgreSQL. The separate WOD proposal remains unchanged and unexecuted.

## Approved policy and identities

One applicable base reward per first eligible server-verified content completion; repeats record practice and retries deduplicate the same attempt. Existing amounts/thresholds remain unchanged.

| Operation | Canonical identity and receipt | Base reward / status |
|---|---|---|
| Ordinary content practice | children.id + content_practice + reading_content.id; student_content_base_rewards primary key; awarded_event_id links the same student/content event | Existing mobile 50 XP at score >=88, once; existing web 0 base XP |
| Curriculum completion | student_content_completions(student_id,content_id); immutable qualifying_attempt_id | Existing >=75 non-paragraph completion rule; independent of 88-XP eligibility; permanent |
| Assessment answer | Owned assessment attempt UUID + configured assessment-item UUID, bound to reading_content.id and immutable content-attempt UUID | 0 base XP on both platforms; each new assessment run has distinct answer receipts |
| Module completion | student_id + reading_modules.id, qualifying submitted/passed assessment attempt | Existing weighted score and pass-percentage snapshot (default 75); no new module base reward invented |
| Badge | student_badge_awards(student_id,badge_id), existing once-only badge ledger | Existing approved verified badge rewards remain separate from base content XP |
| WOD | Owned daily word_of_day_log.id and Manila date; separate (log_id,attempt_number) receipt namespace | Separate approved eligible 25 XP, at most three attempts; RPC proposal uninstalled/unverified on shared project |
| Lesson/activity/PDF/nonsense payout | Their own database IDs; never interchangeable with reading_content.id | Unsupported verified reward operations continue to fail closed; read-only/formative behavior retained |

## First completion, repeats, retries and scoring

A server-issued event UUID alone does not establish eligibility. Authentication resolves the learner, the server scores the answer against the stored target, and SQL rechecks active content, ownership, level/module gates, assessment context, expiry and the locked target. Targets are locked FOR SHARE during consumption. The reading_content UUID primary key spans all existing content types (word, phonetic, phrase, sentence, paragraph); display text, words.id, module items and module IDs are not reward keys. Distinct content UUIDs/types with the same label pay independently when eligible. Putting one content UUID into another module cannot create another reward.

Each new practice action explicitly requests a fresh server-issued ticket (newAttempt=true), including simultaneous actions on separate devices and identical speech. This flag is only ticket-request mode; it cannot authorize XP or bypass eligibility. Pending retries never issue a fresh ticket. An interrupted start can leave an unused expiring ticket, without an attempt or payment. The legacy default still coalesces pending ticket starts for compatibility. It adds one immutable content attempt, one linked pronunciation session, the latest score and additive practice counters. An exact retry keeps its original pending event and input: one attempt, zero additional base XP, current official progress. Changed retries conflict; expired unconsumed tickets cannot pay. Both clients keep pending requests across reloads/account scopes; web now rejects a changed answer while another is in flight.

The structured baseReward response carries rewardType, contentId, status and xpAwarded. Statuses are awarded, already_rewarded, not_eligible, not_applicable and legacy_review_required; replayed separately identifies network retries. Mobile and web validate the canonical identity and consistency before treating a response as confirmed. Both backend adapters require database contract version 2 before issuing or consuming any ticket, so the older version-1 proposal cannot mutate first and then fail response validation.

Failed practice attempts count toward practice totals and remain in history. The established curriculum >=75 completion rule is distinct from the existing native >=88 base-reward threshold. A first score of 75 can complete curriculum without earning base XP; a later verified score of 88 can earn the first eligible base reward. Poor repeat scores do not delete the permanent completion or replace its qualifying receipt. Assessment answers remain zero base XP; retakes create a new owned assessment run, while retries reuse the same answer/final-submit receipts. The existing scorer, native prefix penalty, module weighted scoring and pass snapshots are preserved. No separate new mastery threshold or XP amount is introduced.

Repeated practice can still unlock an independently earned, once-only badge. Therefore zero additional BASE XP does not promise that the overall XP total never changes on a repeat. Official totals include any legitimate new badge reward.

## PostgreSQL guarantees

The learner progress row is locked first, then the event and content claim. student_content_base_rewards has primary key (student_id,reward_type,content_id), fixed content_practice namespace, unique awarded_event_id, a composite foreign key binding that event to the same student/content, and constraints rejecting amount/receipt inconsistencies. Its claim, base XP, curriculum attempt/completion, linked pronunciation session, counters, verified badges and final event receipt commit in one SQL transaction. Failures at claim insert/update, session/progress update or final receipt roll everything back. Twenty independent sessions retrying one event produce one attempt. Twelve distinct tickets issued through the actual start RPC and consumed in separate PostgreSQL sessions produce twelve legitimate attempts and exactly one base payment; twelve concurrent repeats keep all scores and zero further base payment. These cases use the public RPC path, without seeding event-table rows.

anon/authenticated cannot write reward evidence or execute reward RPCs. New ledger/event table grants give service_role SELECT; SECURITY DEFINER RPCs perform the mutations. Read-only official progress and existing RLS remain available. Arithmetic updates and progress_revision protect cooperating concurrent writes and stale responses. This cannot protect against an old privileged deployment overwriting totals: draining/restricting all legacy writers remains a rollout prerequisite.

## Historical transition

Existing XP, attempts, sessions, completions, badge IDs and dates remain intact. The transaction freezes pre-contract completed-word labels once in progress_legacy_completed_words, then creates a zero-amount eligibility claim on first encounter. Pre-contract content attempts/completions, unlinked old sessions, or frozen matching labels mark legacy_review_required. Text is only a conservative veto for uncertainty; it never authorizes payment or defines content identity. Newly verified same-label content does not become false legacy history. A zero-amount row/old xp_awarded flag is not proof of payment. Web practice cannot launder an uncertain legacy claim into a mobile reward. New practice still records, with no automatic missed historical credit. Reconciliation requires independent records and separate approval; even a large suspect legacy total is preserved rather than corrected here.

## Mobile and web compatibility

Mobile Student Dashboard applies only official snapshots, displays first/repeat/retry/legacy-review feedback using the existing StudentText/theme, and retains loading, same-answer retry and duplicate-tap protection. Parent progress refresh is tested against stored totals, including a repeat increasing attempts while word count/XP stay unchanged. Existing navigation, parent UI, assessment and achievement regressions pass. Parangal/catalog rendering and historical badge reads remain intact; no new client award path was added.

The actual web checkout has the seven reviewed source/test changes applied and hash-verified, including the follow-up version guard. Practice/module feedback uses the same outcome meanings. Dashboard, assessment, achievements, parent, teacher and admin read consumers retain their existing official table/RPC contracts; no XP consumer was changed to derive rewards from attempt count. Existing backend/client role and read-contract regressions, types, lint and production build pass. This is local fixture/route evidence, not authenticated browser or physical-phone staging validation.

## Word-of-Day isolation

WOD keeps its existing separate 25-XP, three-attempt, server-authoritative proposed transaction and Manila streak ownership. Neither client converts WOD completion into a general-practice event, and the general API rejects a WOD reward type/source. Its daily-log namespace is separate from content_practice; ordinary deliberate practice is a separate action. General progress does not write WOD log/payment/streak fields. The WOD SQL file hash matches the preserved baseline and it was never executed, including on the disposable database. Local WOD adapter/client mocks still pass; they do not establish real WOD SQL atomicity. The 16 existing WOD SQL/coexistence cases remain BLOCKED. Its old comment mentioning mobile 50 XP is a review issue; the client/backend already share the approved 25-XP adapter without a 50-XP fallback. No WOD-dependent deployment is authorized before its RPC is separately approved and installed.

## Results, coverage and evidence

842 automated cases PASS, 0 FAIL, 2 staging cases skipped/blocked. 10 additional backend regression programs PASS. Total recorded: 852 PASS / 0 FAIL / 30 BLOCKED / 0 NOT RUN.

All 778 previous automated passes remain passing. 64 new cases: 13 mobile, 13 backend, 12 web client, 26 real PostgreSQL. SQL total: 28 retained + 26 new = 54. Assertions, builds and test programs are not counted as additional individual automated cases.

Mobile Jest: 129 PASS; mobile backend individual cases: 82; web backend: 511 PASS / 2 SKIP; web client: 66 PASS; PostgreSQL: 54 PASS. Mobile types/ESLint (0 errors, 18 existing warnings), Android production Hermes export, web app/node types, lint and production build all pass. The Android output is a bundle export, not an installed APK test.

Coverage: 65.77% of 1852 instrumented mobile source lines in 30 imported source files. This is a bounded subset, not whole-app coverage; backend/web totals are case counts, not coverage percentages. Full parent/teacher/admin browser flows, real Supabase JWT/RLS/storage/provider behavior and phone staging remain blocked. Earlier mobile audit NOT RUN records remain historical and are not relabeled by this follow-up.

Initial new SQL fixtures failed real word-link/content-type/curriculum constraints and were corrected to the actual schema; those failed fixture results are retained in [fixture-development evidence](option-1/evidence/sql-fixture-failures.json). Windows sandbox loopback/Git/Hermes failures were rerun with authorized execution; final gates passed without removing assertions. Test-process cleanup stopped only the inspected disposable runner/orphan worker. The 778-pass pre-change evidence is preserved under [baseline](option-1/baseline/evidence/summary.json).

[Case records with IDs, scenarios, expected/actual outcomes and evidence](evidence/xp-progress/test-cases.csv). [Machine-readable cases](evidence/xp-progress/test-cases.json). [Option 1 summary](option-1/evidence/summary.json). [Changed files](option-1/evidence/changed-files.json). [Actual web application receipt](option-1/web-application-receipt.json).

## Remaining blockers and exact next steps

The owner policy decision is resolved. 28 rollout/unsupported-operation cases and two staging tests remain blocked.

1. With an explicitly approved target, run the READONLY catalog preflight and review actual column types, constraints, RLS, grants, triggers and every legacy privileged writer. The disposable fixture is not proof of deployed Supabase parity.
2. Review the revised one-time version-2 general-progress proposal and its badge/curriculum prerequisites. Obtain separate explicit SQL approval; do not install either the old version-1 proposal or a second copy over an existing installation. An already-installed variant requires a separately reviewed upgrade migration.
3. Coordinate draining legacy backend/client writers and restricting obsolete RPC entry points. Approve/install the reviewed general contract, then validate real JWT/PostgREST roles and ownership before enabling reward traffic.
4. Separately review/approve the unchanged WOD proposal, resolve its legacy comments/writer coexistence, install only with explicit approval, and run its 16 real SQL cases including rollback, concurrent workers, midnight and streak behavior.
5. After deployment is separately authorized, run simultaneous mobile/browser staging journeys with disposable learner/parent/teacher/admin accounts, timeout/restart/retry tests and the USB phone. Confirm cross-device official progress and accessibility.
6. Resolve unsupported lesson/activity/PDF/nonsense and remaining badge proof dependencies as separately scoped work. Reconcile uncertain history only with independent proof and new authorization. Formal testing remains blocked until the applicable prerequisites pass.
