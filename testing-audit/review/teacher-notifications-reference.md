# Teacher Notifications verification — 2026-11-01

Implemented the supplied illustrated notification composition with the shared Home sidebar, actual notice cards, supported status/date/type filters, full details and read actions. Design behavior and limitations are documented in `docs/design/teacher-notifications-reference.md`.

## Verification

- Final production TypeScript/build and lint passed. Lint retains the existing unrelated server/testing-audit warnings without notification-source errors.
- UI/unit suite: 147 passed, 0 failed. Five new presentation tests cover supported protected-route destinations, unknown-type handling, faithful reply-prefix splitting, ordinary/empty/HTML-like text preservation, Manila calendar boundaries and invalid/future date handling.
- Final browser suite: 39 passed, 0 failed. Tested 1754×897 (reference size), 1586, 1280 with a large font preference, 1024, 768 and 375. Verified the reference composition, loaded artwork, real counts/read-state indicators, existing Home sidebar width, no page overflow, light/dark WCAG checks, search/clear, status/date/type/reset, inline expansion, native details and Messages navigation.
- Populated-category checks covered message, schedule, progress and system badges in both themes. Initial badge/mobile brand contrast issues were corrected and the full final suite rechecked them.
- Verified single-read and mark-all requests through the existing API, disabled already-read/all-read controls, full text beyond the collapsed excerpt, pending/failure truthfulness, failed request retry and confirmed unread-count updates. Existing account-scope mark-all semantics were preserved.
- Empty, failed-load/retry and invalid-date states were distinct. A new notification arrived through foreground polling without reloading. Teacher display preferences hid optional message notices while retaining security notices. Unknown types opened complete details without invented navigation targets.
- Browser checks ran the compiled React application with isolated synthetic auth, Supabase and API fixtures. No real notifications were changed or messages sent. Existing backend authorization remains in use; these checks are not a new live-database/RLS audit.
- Evidence: `.qa/teacher-notifications-ref-review/results.json` and screenshots in that folder. QA artifacts and fixtures remain ignored by Git.

No backend/database changes, commit, push or deployment were performed. Unrelated workspace changes, including the active environment example, were retained.
