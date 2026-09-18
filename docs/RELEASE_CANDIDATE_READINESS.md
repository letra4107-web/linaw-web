# LinawLetra Release-Candidate Readiness

**Status:** Release candidate for thesis defense. It is not represented as fully production-validated while the explicitly listed live and device checks remain pending.

## Product and architecture

LinawLetra is an AI-assisted Tagalog phonological reading **support** system for Grades 1-6 Filipino students, including the intended learner population with dyslexia. It does not diagnose, treat, cure, or clinically measure dyslexia.

The React/Vite client presents role-specific learning and management workflows. Express authenticates bearer tokens, resolves roles, validates requests, and performs sensitive operations with a server-only Supabase service-role client. Supabase Auth, PostgreSQL, RLS, Storage, and ordered migrations provide the managed data layer. Google Cloud Text-to-Speech is called only by the authenticated server; browser speech recognition supplies a transcript when the browser supports it.

"AI-assisted" means speech technologies assist interaction: browser speech recognition captures a spoken response and Google Cloud TTS provides auditory support. Trusted educational scoring is deterministic, server-authoritative comparison of a submitted transcript against stored content. LinawLetra does not claim a custom trained diagnostic model.

## Role and route inventory

| Role | Primary routes and workflow | Authorization boundary |
| --- | --- | --- |
| Student | `/student`, `/student/learn`, module/assessment, practice, achievements, profile | `ProtectedRoute` plus `/api/student` authenticated student middleware; server resolves the `children` record from the bearer token. |
| Teacher | `/teacher`, students, lessons/PDFs, reports, messages, settings | `ProtectedRoute` plus `/api/teacher` teacher/admin middleware; teacher/student ownership is checked for privileged API operations and RLS scopes browser reads. |
| Parent | `/parent`, children, progress, schedule, messages, settings | `ProtectedRoute` plus `/api/parent` parent middleware; child IDs are rechecked against the authenticated parent before service-role reads/writes. |
| Admin | `/admin`, users, archived accounts, teachers, analytics, audit, operations | `ProtectedRoute` plus `/api/admin` admin middleware. |
| Anonymous | landing, authentication, public legal/accessibility pages | Role routes redirect to login or the user’s allowed dashboard. |

Unknown frontend routes render the application’s Not Found page. Browser route protection is usability only; API middleware and database policy are the data boundary.

## Trusted learning-result flow

For Word of Day, practice, module responses, assessments, PDF drills, guided PDF reading, and nonsense words, the browser supplies a raw response such as a transcript or selection. The server derives the authenticated student, loads eligible stored content, normalizes and scores the response, persists the trusted result, and returns only a safe result for display. The browser does not establish correctness, accuracy, XP, completion, target text, or another student identity.

Nonsense-word checks use a server-issued, student/module-scoped set in `student_nonsense_check_sets` (migration 034). Submission accepts opaque item IDs and transcripts, rejects duplicate or foreign items, scores against the stored issued target, and persists one check per student/module. Badge awards use the unique `(student_id, badge_id)` boundary in migration 026 and are service-role-only.

## Security controls

- Bearer authentication and role middleware guard Express routers.
- Authorization helpers recheck parent-child, teacher-student, and student-assignment relationships before privileged service-role data access.
- RLS remains the direct-Supabase boundary. Migrations 032-034 remove obsolete hardened student mutation paths; no Phase 6 RLS change was needed.
- `SUPABASE_SERVICE_ROLE_KEY` and `GOOGLE_TTS_API_KEY` are server-only variables. No `VITE_*` service-role variable is permitted.
- Request-size limits, UUID/bounded-input validation, PDF validation, global API limiting, and tighter TTS/credential/upload/assessment limiters protect sensitive endpoints.
- Server responses use safe messages; detailed errors are retained only in server logging.
- React Query is cleared when the authenticated user changes or signs out, preventing in-memory data from a saved-profile switch appearing in a subsequent session.

## Analytics integrity

Displayed pronunciation accuracy is a recorded-practice metric sourced from `pronunciation_practice_sessions.accuracy_percentage`; it is not labelled as reading ability, diagnosis, or clinical proficiency. Teacher detail averages use recorded attempts only. Parent trends use the selected child’s recorded sessions. Empty data is shown as no recorded activity rather than poor performance. Progress ratios guard zero denominators before rendering.

## Storage and live validation boundary

The current compatibility configuration keeps legacy PDF material URLs/buckets public while paths are transitioned; this must not be described as private storage. `STORAGE_SIGNED_URLS_ENABLED` supports ownership-checked signed URLs when all consumers are ready. No malware scanning is claimed.

Static source/tests cannot prove the deployed policy state. The following need safe, dedicated staging credentials and configuration:

- student own-row versus cross-student RLS and direct blocked mutations for migrations 032-034;
- teacher roster/report/PDF assignment IDOR substitution;
- parent linked-child versus unlinked-child access, including assignment reads;
- admin-only data/actions versus ordinary roles;
- authorized versus unauthorized storage/PDF access; and
- a direct browser-equivalent insert into `pronunciation_practice_sessions` (must be denied) followed by the legitimate API path (must succeed).

Until those execute against staging, the required status is **LIVE SECURITY VALIDATION PENDING**.

## Environment and deployment checklist

1. Configure the frontend only with `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL`, and optional public version/analytics values from `.env.example`.
2. Configure the backend from `server/.env.example`, including private `SUPABASE_SERVICE_ROLE_KEY`, Google TTS configuration, exact `CORS_ORIGIN`, and production HTTPS URLs. Never copy secrets into client variables, source, logs, screenshots, or documentation.
3. Apply migrations in numeric order, including 032, 033, and 034. Do not edit applied migration history.
4. Confirm backend reachability, exact CORS, HTTPS, rate limiting, service-role isolation, storage configuration, and the frontend API URL.
5. Prepare least-privilege demo accounts, a teacher roster, linked parent/student, published PDF material, and a real assignment. Grant microphone permission on the demo device.
6. Run the commands below and perform the live staging tests above before any production claim.

## Verification commands

```powershell
node node_modules/typescript/bin/tsc -b --pretty false
npm.cmd test
npm.cmd run lint
node node_modules/vite/bin/vite.js build
git diff --check
```

`npm.cmd test` includes the focused security/business-critical suite. Its two staging-gated tests remain skipped unless explicitly enabled with dedicated non-production credentials. Do not treat a skip as a live pass.

## Known limitations and future work

- Browser speech recognition availability and transcript quality vary by browser, device, network, and speaker. It is interaction support, not a clinical assessment.
- Google TTS requires valid server configuration and network access; the UI surfaces a safe failure state if it is unavailable.
- Offline use is not represented as supported.
- Manual device, assistive-technology, and rendered browser QA remain required outside this static release-candidate review.
- Live staging authorization/RLS and storage tests remain required as listed above.
- Future work may include broader device/accessibility validation, stronger Filipino speech evaluation, offline support, expanded linguistic datasets, and longitudinal educational research. These are not current capabilities.
