# Integration testing readiness

Updated: **2026-10-21, Asia/Manila**.

**Evidence boundary:** current working-tree source, including prior edits. PASS means only the named executed assertion. Mocks, rendered pages, coverage, compilation and anonymous redirects do not establish complete live functionality. No shared Supabase calls/mutations, real account creation, delivery, proposed Word-of-Day SQL execution, deployment, commit, push, ref deletion or Git maintenance occurred. Private environment values never appear in reports. Earlier reports are retained in [baseline-reports](evidence/final-verification/baseline-reports/).

**NOT READY — CRITICAL ISSUES REMAIN.** Local testing readiness improved, but credential revocation is uncertain, Word-of-Day database validation is unapproved/unexecuted, real Supabase role workflows remain blocked, and browser network reliability is unresolved.

## Actually executed integration boundaries

- Real Express HTTP/router/JSON validation and synthetic persistence outages across 35 GET declarations; four analytics partial failures; parent progression precedence.
- Real multipart/Multer/PDF byte checks with explicit parser/Storage/PostgREST mocks; unique upload paths, safe failure responses and limited compensation.
- Real enrollment handler with mocked Auth, hashing, database and mail; failure of one cleanup does not prevent later compensation or the safe response.
- Real frontend role routing, auth context, React Query and page/components with synthetic sessions and mocked API/Supabase client; selected settings/message/search/assessment/retry flows.
- Real disposable PostgreSQL existing roster/section/credential-minimization SQL: 28 PASS; auth helpers emulate claims and are not real Supabase Auth/RLS end-to-end.
- WOD actual application service/router with an explicitly atomic RPC model: exact web 25 XP, three tries, failure rollback, retry, lost acknowledgement, twenty concurrent requests, streaks and badge outage. SQL implementation itself was not executed.

## Work still blocked

| ID | Role/module | Blocked work | Specific prerequisite | Plan |
| --- | --- | --- | --- | --- |
| BLOCK-001 | owner/security | Credential revocation | Owner answered revocation incomplete or uncertain. Old credentials must be revoked; removing references does not secure a credential. | [CREDENTIAL_ROTATION.md](CREDENTIAL_ROTATION.md) |
| BLOCK-002 | student/mobile | Real Word-of-Day SQL atomicity, locks, grants, isolation and mobile coexistence | Proposed RPC deliberately unexecuted; owner approval and private authoritative schema are absent. Model rollback/mutexes are not SQL evidence. | [review/WORD_OF_DAY_ISOLATED_VALIDATION.md](review/WORD_OF_DAY_ISOLATED_VALIDATION.md) |
| BLOCK-003 | all roles | Real Auth sessions, token revocation, MFA, direct RLS and cross-role access | Requires separate Supabase project and dedicated synthetic accounts; no shared requests authorized. | [INTEGRATION_TEST_READINESS.md](INTEGRATION_TEST_READINESS.md) |
| BLOCK-004 | admin/parent/teacher | Durable account enrollment/archive/restore/sections/materials and rollback | Auth, PostgreSQL and Storage span separate services; mocked compensation is not distributed atomicity. | [INTEGRATION_TEST_READINESS.md](INTEGRATION_TEST_READINESS.md) |
| BLOCK-005 | all roles | SMTP/Brevo email, ElevenLabs, browser microphone and physical-device audio | External delivery and provider credentials were not exercised. Needs dedicated service test credentials/devices. | [INTEGRATION_TEST_READINESS.md](INTEGRATION_TEST_READINESS.md) |
| BLOCK-006 | all roles | Realtime delivery, actual upload permissions, signed URL expiry and production configuration | Local fake channels and file stores do not measure live RLS, bucket policies, triggers or networking. | [INTEGRATION_TEST_READINESS.md](INTEGRATION_TEST_READINESS.md) |
| BLOCK-007 | browser environment | Reliable cold loading and host network diagnosis | Independent fixture still reproduces ERR_NETWORK_ACCESS_DENIED; some runs also hit loopback EACCES/CONNECTION_REFUSED. Host logs/policy attribution absent. | [NON_FUNCTIONAL_TEST_CASES.md](NON_FUNCTIONAL_TEST_CASES.md) |
| BLOCK-008 | accessibility/performance | Full assistive-technology, load, physical mobile and formal UAT signoff | Automated scans have incomplete contrast nodes; synthetic local timings omit service latency. No screen-reader/device/load environment. | [NON_FUNCTIONAL_TEST_CASES.md](NON_FUNCTIONAL_TEST_CASES.md) |
| BLOCK-009 | student | Historical missed-XP repair | Old xp_awarded flags cannot establish actual payment. Needs independent records and separately approved repair. | [WORD_OF_DAY_REVIEW.md](WORD_OF_DAY_REVIEW.md) |

## Safe isolated setup

Create a separate Supabase project; provide only the private configuration file location, never credentials in chat or reports. Obtain a schema-only baseline privately and review installed constraints/triggers/grants, role/status policies, RPCs, bucket policies and mobile writers. Seed dedicated synthetic Admin, Teacher, Parent and Student accounts and owned/foreign resources. Configure SMTP/TTS test credentials without delivery to real users. Keep staging runner project-ID guards enabled and E2E_ALLOW_STAGING_TESTS false until the isolated target is verified. Execute WOD proposal only after explicit approval using [its isolated validation package](review/WORD_OF_DAY_ISOLATED_VALIDATION.md). No shared database record or schema is an acceptable fallback.

PDF cleanup is not a cross-service transaction: failed cleanup/ambiguous metadata needs reconciliation. Enrollment compensation is not proof of installed cascades or rollback under a lost Auth acknowledgement. Realtime fake subscriptions do not prove delivery; user preference UI does not prove enforcement. Formal test execution must include these failure branches with actual isolated services.

All preserved browser attempts, including initial fixture/setup failures and pre-fix runs: [execution index](BROWSER_EXECUTION_INDEX.csv). Raw statuses are retained; invalid fixtures do not establish successful data behavior.

