> XP security follow-up (22 October 2026): OPEN-01 is fixed locally for the supported contract; shared rollout remains OPEN/BLOCKED. This document retains the prior audit baseline. See [current XP/progress status](XP_PROGRESS_FINAL_STATUS.md).

# Nonfunctional verification

Updated: **2026-10-21, Asia/Manila**.

**Evidence boundary:** current working-tree source, including prior edits. PASS means only the named executed assertion. Mocks, rendered pages, coverage, compilation and anonymous redirects do not establish complete live functionality. No shared Supabase calls/mutations, real account creation, delivery, proposed Word-of-Day SQL execution, deployment, commit, push, ref deletion or Git maintenance occurred. Private environment values never appear in reports. Earlier reports are retained in [baseline-reports](evidence/final-verification/baseline-reports/).

| Area | Actual result | Limit |
| --- | --- | --- |
| Security | 548 passing Node cases include role/status/ownership/input and sanitized failure assertions; current credential-shaped scan 0; three advisory counts 0 | Revocation OPEN; live RLS/token/Storage policies BLOCKED; heuristic scans are incomplete |
| Performance | PASS: 10 concurrent real local HTTP analytics requests, four 10,000-row synthetic inputs; p50 693.2ms, p95 758.9ms | No service latency/auth cost or load SLA asserted; not production capacity |
| Usability/reliability | Dashboard error/retry and assessment answer/submit actions executed with synthetic services; safe rollback failures unit tested | Full UAT, real persistence and durable badge retry queue absent |
| Accessibility | Actual axe-core WCAG A/AA dashboard scans; measured contrast failures fixed and targeted after evidence retained | Incomplete nodes, keyboard/screen-reader coverage and all other pages require manual checks |
| Compatibility | Firefox/Edge/Chromium desktop engines; phone/tablet viewport renders and public forms tested | Physical mobile, microphone and complete cold-context reliability not certified |

[Actual performance evidence](evidence/final-verification/performance/analytics.json). Timing is a measurement under this local workload, not a pass against an invented SLA.

## Browser compatibility and environment

| Run (separate scope; no retry-until-pass) | PASS / FAIL / BLOCKED | Evidence |
| --- | --- | --- |
| role-desktop-final | 46 / 1 / 0 | [evidence/final-verification/roles-verified-firefox/firefox-populated.json](evidence/final-verification/roles-verified-firefox/firefox-populated.json) |
| admin-header-final | 6 / 0 / 0 | [evidence/final-verification/admin-header-final/firefox-populated.json](evidence/final-verification/admin-header-final/firefox-populated.json) |
| role-responsive | 135 / 5 / 0 | [evidence/final-verification/roles-responsive-firefox/firefox-populated-empty.json](evidence/final-verification/roles-responsive-firefox/firefox-populated-empty.json) |
| role-edge | 43 / 4 / 0 | [evidence/final-verification/roles-edge/edge-populated.json](evidence/final-verification/roles-edge/edge-populated.json) |
| role-chromium | 46 / 1 / 0 | [evidence/final-verification/roles-chromium/chromium-populated.json](evidence/final-verification/roles-chromium/chromium-populated.json) |
| dashboard-outage | 6 / 2 / 0 | [evidence/final-verification/roles-outage-final/firefox-error.json](evidence/final-verification/roles-outage-final/firefox-error.json) |
| student-outage-settled | 2 / 0 / 0 | [evidence/final-verification/student-outage-fixed-port/firefox-error.json](evidence/final-verification/student-outage-fixed-port/firefox-error.json) |
| public-firefox | 58 / 0 / 0 | [evidence/final-verification/public-final/local-firefox.json](evidence/final-verification/public-final/local-firefox.json) |
| public-edge | 55 / 3 / 0 | [evidence/final-verification/public-edge-fixed-port/local-edge.json](evidence/final-verification/public-edge-fixed-port/local-edge.json) |
| public-chromium | 57 / 1 / 0 | [evidence/final-verification/public-chromium-fixed-port/local-chromium.json](evidence/final-verification/public-chromium-fixed-port/local-chromium.json) |

Every original run is retained. Early unsafe-port (:9) API fixtures, missing MFA/listFactors/table shapes, an overly strict message locator and React Query retry-settling errors were harness limitations; they are not application PASS evidence. The corrected browser suite uses relative /api, explicit synthetic contracts, unexpected-call assertions and the actual AuthProvider/router/components. No source fixture enters the normal build (artifact scan confirms no QA role markers). Some raw browser rows remain FAIL because of denied/aborted asset loads, navigation/refused-connection failures or the subsequently corrected hidden Admin header. The earlier all-role student outage assertion checked too early between retries; the fixed-port student run waits for terminal query errors and verifies recovery. The ephemeral-port EACCES setup failures are retained even when verified fixed ports work. No application asset was substituted and no security policy was disabled. Automated accessibility scans cover four dashboards only and retain incomplete nodes for manual review; zero reported violations is not full WCAG certification.

[Independent 40-context diagnostic](evidence/final-verification/network-final/network-diagnostic.json): Edge routed 9/10, native 9/10; Chromium routed 6/10, native 9/10 loaded all 20 scripts with zero failed requests. Node HTTP returned 200 for each fixture. Denials occur without React, Vite, Supabase or application assets, including native loading without interception. This disproves a need for application source to trigger the failure, but does not identify a particular firewall/browser policy. Fixed loopback ports passed an independent binding probe after ephemeral-port EACCES; netsh listed only excluded TCP port 2869, which does not explain the observed dynamic ports. Do not disable security controls. Owner should correlate Windows network/browser/event logs and rerun on an isolated host.

Local PostgreSQL passed 28 existing assertions outside the restricted sandbox with a fresh UTF-8/C temporary cluster and IPv4. The restricted failure is retained in database-restricted/. No shared fallback was attempted.

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


All preserved browser attempts, including initial fixture/setup failures and pre-fix runs: [execution index](BROWSER_EXECUTION_INDEX.csv). Raw statuses are retained; invalid fixtures do not establish successful data behavior.

