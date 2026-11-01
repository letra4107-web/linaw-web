# Teacher Dashboard action verification

Date: November 1, 2026.

The Teacher Dashboard was exercised in the actual application using an isolated Edge browser and synthetic accounts, database records, storage, authentication, and API responses. No live learner records, messages, or uploads were changed by these checks. This verifies the UI and its request handling; it does not certify every deployed service or live Supabase policy.

## Corrections

- PDF uploads validate the existing 15 MB API contract, reject malformed files before upload, preserve failed drafts, disable pending controls, and reset the native file input after confirmed success.
- The PDF roster has a separate teacher-scoped query key. Opening Students or Reports first no longer risks reusing an incompatible roster cache.
- Assignments refresh the open monitor, Home assignment count, and student assignment details without reloading. Successful uploads refresh the Home material count.
- Library, roster, monitor, and drill load failures have explicit retry controls rather than appearing as empty results.
- Drill editing preserves unsaved changes during refetch, validates words and XP before writing, rebuilds unique row order after removal/addition, and prevents duplicate pending save/publish requests. Published drills are read-only, matching the existing API restriction.
- Teacher PDF previews finish with a completion status. Student-only recording and submission controls are not shown in previews.
- Read-aloud handles rejected playback promises, browser fallback failures, retry, and cancellation. Closing a preview or changing its text stops playback and prevents delayed responses from starting audio. Slow read-aloud reports service/playback failures instead of silently returning to idle.

Existing Teacher routes, Home sidebar, data ownership checks, APIs, and database structures are preserved.

## Browser results

| Area | Passed checks |
| --- | ---: |
| Home and profile menu | 15 |
| Students, filters, selection, pagination and details | 41 |
| Lesson creation, library and PDF navigation | 36 |
| Lesson formatting, validation and error recovery | 12 |
| Progress reports | 41 |
| Messages, reactions, drafts, files and incoming replies | 50 |
| Profile, password, avatar, MFA, sessions and export | 42 |
| Settings, themes, preferences, export and logout | 20 |
| Notifications, filters, details, read status and polling | 19 |
| PDF/drill actions, assignment monitor, audio and failure recovery | 24 |
| **Total** | **300** |

Checks include desktop/mobile layouts, keyboard interactions and light/dark accessibility checks across the reference pages. The PDF actions were tested at 1600 px and 375 px. UI scenarios cover successful and failed requests; these counts represent scenarios, not a count of individual buttons.

The existing Students and Settings browser scripts contained selectors for replaced designs. Those assertions were updated in the audit copies to target current controls. The notification accessibility check was repeated after the full page rendered; final light/dark checks pass.

Local evidence: `.qa/teacher-actions-audit/summary.json` and each area's `results.json`, screenshots and logs. These are private local QA artifacts.

## Repository checks

- `npm run build`: passed.
- `npm run lint`: passed; existing warnings remain in unrelated server/audit files.
- `npm run test:ui`: 151 passed, zero failed.
- `npm run test:server`: 520 passed, zero failed, two skipped.
- `git diff --check`: passed.

The skipped backend checks are `staging role smoke checks` and `staging Supabase RLS isolation checks`. Live end-to-end behavior, actual audio output and deployed permissions still require those environment-backed checks. No claim of universal or 100% live verification is made.

The new PDF contract tests are in `tests/teacherPdfTools.test.mjs` and run with the normal frontend test suite.
