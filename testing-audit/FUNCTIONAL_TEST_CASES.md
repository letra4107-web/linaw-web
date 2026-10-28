> XP security follow-up (22 October 2026): OPEN-01 is fixed locally for the supported contract; shared rollout remains OPEN/BLOCKED. This document retains the prior audit baseline. See [current XP/progress status](XP_PROGRESS_FINAL_STATUS.md).

# Executed functional cases and execution gaps

Updated: **2026-10-21, Asia/Manila**.

**Evidence boundary:** current working-tree source, including prior edits. PASS means only the named executed assertion. Mocks, rendered pages, coverage, compilation and anonymous redirects do not establish complete live functionality. No shared Supabase calls/mutations, real account creation, delivery, proposed Word-of-Day SQL execution, deployment, commit, push, ref deletion or Git maintenance occurred. Private environment values never appear in reports. Earlier reports are retained in [baseline-reports](evidence/final-verification/baseline-reports/).

Each case in [FINAL_CASE_REGISTER.csv](FINAL_CASE_REGISTER.csv) and [case-register.json](evidence/final-verification/case-register.json) contains case ID, role, module, feature, preconditions, steps, expected result, actual result, status, evidence and defect reference. Node cases:

| Status | Count |
| --- | --- |
| PASS | 548 |
| BLOCKED | 2 |

The two Node skipped staging cases are classified BLOCKED in the register. Browser repetitions receive a run-name prefix to avoid ID collisions. SQL cases execute only the existing disposable fixture. Full external workflows have explicit BLOCK records. [Visible controls](VISIBLE_CONTROL_EXECUTION_GAPS.csv) stay NOT RUN unless separately asserted; source-template/functions are indexed without blanket passes.

## New regression assertions

| Case ID | Role | Executed contract | Status | Defect |
| --- | --- | --- | --- | --- |
| UNIT-backend-274 | admin | final API admin GET /operations: persistence outage returns a sanitized server error over real HTTP | PASS |  |
| UNIT-backend-275 | admin | final API admin GET /audit-logs: persistence outage returns a sanitized server error over real HTTP | PASS |  |
| UNIT-backend-276 | admin | final API admin GET /monitoring/users: persistence outage returns a sanitized server error over real HTTP | PASS |  |
| UNIT-backend-277 | admin | final API admin GET /monitoring/users/:id: persistence outage returns a sanitized server error over real HTTP | PASS |  |
| UNIT-backend-278 | admin | final API admin GET /monitoring/users/:id/notes: persistence outage returns a sanitized server error over real HTTP | PASS |  |
| UNIT-backend-279 | admin | final API admin GET /users: persistence outage returns a sanitized server error over real HTTP | PASS |  |
| UNIT-backend-280 | admin | final API admin GET /users/archived: persistence outage returns a sanitized server error over real HTTP | PASS |  |
| UNIT-backend-281 | admin | final API admin GET /credential-security: persistence outage returns a sanitized server error over real HTTP | PASS |  |
| UNIT-backend-282 | admin | final API admin GET /storage-readiness: persistence outage returns a sanitized server error over real HTTP | PASS |  |
| UNIT-backend-283 | admin | final API admin GET /sections: persistence outage returns a sanitized server error over real HTTP | PASS |  |
| UNIT-backend-284 | admin | final API admin GET /sections/:id/students: persistence outage returns a sanitized server error over real HTTP | PASS |  |
| UNIT-backend-285 | admin | final API admin GET /analytics/students: persistence outage returns a sanitized server error over real HTTP | PASS |  |
| UNIT-backend-286 | admin | final API admin GET /analytics: persistence outage returns a sanitized server error over real HTTP | PASS |  |
| UNIT-backend-287 | admin | final API admin GET /system-settings: persistence outage returns a sanitized server error over real HTTP | PASS |  |
| UNIT-backend-288 | teacher | final API teacher GET /students/:studentId/modules: persistence outage returns a sanitized server error over real HTTP | PASS |  |
| UNIT-backend-289 | teacher | final API teacher GET /pdf/:id/access-url: persistence outage returns a sanitized server error over real HTTP | PASS |  |
| UNIT-backend-290 | teacher | final API teacher GET /lessons/:id/access-url: persistence outage returns a sanitized server error over real HTTP | PASS |  |
| UNIT-backend-291 | teacher | final API teacher GET /pdf-drill/:materialId/items: persistence outage returns a sanitized server error over real HTTP | PASS |  |
| UNIT-backend-292 | parent | final API parent GET /children/credential-security: persistence outage returns a sanitized server error over real HTTP | PASS |  |
| UNIT-backend-293 | parent | final API parent GET /children: persistence outage returns a sanitized server error over real HTTP | PASS |  |
| UNIT-backend-294 | parent | final API parent GET /children/:id/reading-profile: persistence outage returns a sanitized server error over real HTTP | PASS |  |
| UNIT-backend-295 | parent | final API parent GET /children/:id/learning-path: persistence outage returns a sanitized server error over real HTTP | PASS |  |
| UNIT-backend-296 | parent | final API parent GET /children/:id/materials: persistence outage returns a sanitized server error over real HTTP | PASS |  |
| UNIT-backend-297 | parent | final API parent GET /children/:id/materials/:assignmentId/access-url: persistence outage returns a sanitized server error over real HTTP | PASS |  |
| UNIT-backend-298 | parent | final API parent GET /children/:id/settings: persistence outage returns a sanitized server error over real HTTP | PASS |  |
| UNIT-backend-299 | student | final API student GET /learn/path: persistence outage returns a sanitized server error over real HTTP | PASS |  |
| UNIT-backend-300 | student | final API student GET /learn/module/:moduleId: persistence outage returns a sanitized server error over real HTTP | PASS |  |
| UNIT-backend-301 | student | final API student GET /learn/module/:moduleId/nonsense-check: persistence outage returns a sanitized server error over real HTTP | PASS |  |
| UNIT-backend-302 | student | final API student GET /learn/module/:moduleId/challenge-words: persistence outage returns a sanitized server error over real HTTP | PASS |  |
| UNIT-backend-303 | student | final API student GET /reading-profile: persistence outage returns a sanitized server error over real HTTP | PASS |  |
| UNIT-backend-304 | student | final API student GET /pdf-drill/:assignmentId: persistence outage returns a sanitized server error over real HTTP | PASS |  |
| UNIT-backend-305 | student | final API student GET /pdf-materials/:assignmentId/access-url: persistence outage returns a sanitized server error over real HTTP | PASS |  |
| UNIT-backend-306 | student | final API student GET /pdf-reading/:assignmentId: persistence outage returns a sanitized server error over real HTTP | PASS |  |
| UNIT-backend-307 | student | final API student GET /lessons/:lessonId/access-url: persistence outage returns a sanitized server error over real HTTP | PASS |  |
| UNIT-backend-308 | shared | final API notifications GET /: persistence outage returns a sanitized server error over real HTTP | PASS |  |
| UNIT-backend-309 | shared | final API analytics refuses partial totals when children fails | PASS | AUD-012 |
| UNIT-backend-310 | shared | final API analytics refuses partial totals when users fails | PASS | AUD-012 |
| UNIT-backend-311 | shared | final API analytics refuses partial totals when child_progress fails | PASS | AUD-012 |
| UNIT-backend-312 | shared | final API analytics refuses partial totals when pronunciation_practice_sessions fails | PASS | AUD-012 |
| UNIT-backend-313 | parent | final API parent children combines grade fallback, stored progress and active override correctly | PASS |  |
| UNIT-backend-314 | shared | final enrollment: throw cleanup failure cannot prevent remaining cleanup or safe response | PASS | AUD-015 |
| UNIT-backend-315 | shared | final enrollment: returned-error cleanup failure cannot prevent remaining cleanup or safe response | PASS | AUD-015 |
| UNIT-backend-316 | shared | final enrollment: auth-throw cleanup failure cannot prevent remaining cleanup or safe response | PASS | AUD-015 |
| UNIT-backend-317 | shared | final enrollment: invalid input makes no account or database mutation | PASS | AUD-015 |
| UNIT-backend-318 | shared | final enrollment: duplicate child does not create an account | PASS | AUD-015 |
| UNIT-backend-319 | shared | final enrollment: successful account survives email failure=false | PASS | AUD-015 |
| UNIT-backend-320 | shared | final enrollment: successful account survives email failure=true | PASS | AUD-015 |
| UNIT-backend-321 | shared | final upload /pdf: metadata failure compensates only the new owned storage object | PASS | AUD-013/AUD-014 |
| UNIT-backend-322 | shared | final upload /pdf: rejected upload never deletes any object | PASS | AUD-013/AUD-014 |
| UNIT-backend-323 | shared | final upload /pdf: lost metadata acknowledgement never deletes a possibly referenced object | PASS | AUD-013/AUD-014 |
| UNIT-backend-324 | shared | final upload /pdf: compensation failure preserves a safe HTTP failure | PASS | AUD-013/AUD-014 |
| UNIT-backend-325 | shared | final upload /pdf: invalid bytes are rejected before storage access | PASS | AUD-013/AUD-014 |
| UNIT-backend-326 | shared | final upload /pdf: simultaneous same-name uploads use distinct owned paths | PASS | AUD-013/AUD-014 |
| UNIT-backend-327 | shared | final upload /pdf-drill: metadata failure compensates only the new owned storage object | PASS | AUD-013/AUD-014 |
| UNIT-backend-328 | shared | final upload /pdf-drill: rejected upload never deletes any object | PASS | AUD-013/AUD-014 |
| UNIT-backend-329 | shared | final upload /pdf-drill: lost metadata acknowledgement never deletes a possibly referenced object | PASS | AUD-013/AUD-014 |
| UNIT-backend-330 | shared | final upload /pdf-drill: compensation failure preserves a safe HTTP failure | PASS | AUD-013/AUD-014 |
| UNIT-backend-331 | shared | final upload /pdf-drill: invalid bytes are rejected before storage access | PASS | AUD-013/AUD-014 |
| UNIT-backend-332 | shared | final upload /pdf-drill: simultaneous same-name uploads use distinct owned paths | PASS | AUD-013/AUD-014 |
| UNIT-backend-457 | shared | final verification section assignment sanitizes unexpected persistence diagnostics | PASS | AUD-011 |
| UNIT-frontend-18 | shared | final dashboard query error feedback hides internal diagnostics and provides an accessible retry | PASS |  |
| UNIT-frontend-19 | shared | final frontend API adds the authenticated session and preserves JSON request/response contracts | PASS |  |
| UNIT-frontend-20 | shared | final frontend API handles expired/missing sessions without inventing an auth header | PASS |  |
| UNIT-frontend-21 | shared | final frontend API distinguishes JSON service failures and non-JSON gateway failures | PASS |  |
| UNIT-frontend-22 | shared | final frontend API warns once for version drift and handles non-JSON success | PASS |  |
| UNIT-frontend-23 | shared | final frontend Word of Day dates change exactly at Manila midnight | PASS |  |
| UNIT-frontend-24 | shared | final frontend Word of Day reuses a completed row without resetting attempts or writing | PASS |  |
| UNIT-frontend-25 | shared | final frontend Word of Day handles empty content and invalid reading levels without insertion | PASS |  |
| UNIT-frontend-26 | shared | final frontend Word of Day uses only published level-appropriate content and preserves a concurrent insert | PASS |  |
| UNIT-frontend-27 | shared | final frontend Word of Day propagates query errors and never reports a fabricated word | PASS |  |

## Role browser executions

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

## Dependency-gated cases

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

