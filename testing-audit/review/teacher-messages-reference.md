# Teacher Messages verification — 2026-11-01

Implemented the supplied illustrated purple Messages composition with the existing Teacher Home sidebar, real roster-linked parent conversations, supported filters, native recipient dialog, chronological chat, reactions, private attachment access and a working composer. See `docs/design/teacher-messages-reference.md` for supported-control and data behavior details.

## Verification

- Production build, lint and UI/unit checks are recorded in the local verification logs. The final summary below uses the completed final runs.
- UI/unit suite: 135 passed, 0 failed. The five added teacher-message tests cover parent-scoped merged history and ordering, empty/tied timestamps, teacher-scoped attachment reads, legacy-schema fallback preserving identifiers, and propagation of permission/transport errors.
- Browser suite: 50 passed, 0 failed. Tested 1586×991 (reference size), 1756, 1280 with a large font preference, 1024, 768 and 375. Verified the page structure and loaded illustrations, real contact/filter counts, teacher query scope, preserved Home sidebar, no page overflow, light/dark WCAG checks, search and sorting, native recipient search/Escape/focus restoration, mobile list/chat navigation, and light/dark chat/dialog accessibility.
- Interactive checks covered conversation search, reaction add/remove through the existing RPC, signed attachment access, emoji insertion, the selected child and parent in actual insert payloads, and clearing a successful draft. Pending-send checks verified that switching contacts cannot redirect a message, newer drafts are retained, and repeated Enter submits once. Failure/retry preserves multiline drafts.
- Incoming replies were delivered by both the realtime callback and the foreground polling fallback without page reload. Empty roster, empty history, unavailable replies, legacy attachment columns and full load failure/retry had separate verified presentations.
- The first browser pass exposed an ambiguous textarea label; the final page has an explicit accessible composer name. A TypeScript error in the legacy reply cast was corrected before the final build.
- Browser tests ran the compiled React application with isolated synthetic auth, database, storage and API fixtures. No real messages, reactions, file uploads or account changes were sent. This is front-end verification, not a new live-database/RLS audit.
- Evidence: `.qa/teacher-messages-ref-review/results.json` and screenshots in that folder. Fixtures and evidence remain ignored by Git.

No backend/database installation, commit, push or deployment was performed. Unrelated workspace changes were retained.
