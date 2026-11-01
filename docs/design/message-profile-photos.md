# Profile photos in Parent and Teacher messages

Both message pages now display the uploaded account photo in conversation lists, the chat header, and incoming/outgoing message bubbles. The Teacher recipient picker also displays each parent's photo. The same `parents.avatar_url` and `teacher_profiles.avatar_url` fields supply the account/profile pages and the saved-login photo.

The shared avatar renderer clips photos to the existing circular design and uses the person's initials if their photo is absent, unsafe, or cannot load. A changed image URL is retried independently. Photos and chat headers remain visible at desktop, tablet and mobile sizes.

The frontend uses authenticated `GET /api/parent/message-profile-photos` or `GET /api/teacher/message-profile-photos`. The server discovers permitted counterpart IDs itself: parents get only teachers who sent them messages; teachers get only parents linked through their current roster. Request-supplied account IDs are ignored. It returns only the image URL map and the caller's own image, with private/no-store response headers. It does not expose profile tables, emails, settings, tokens or unrelated account records.

The photo query cache includes the signed-in account and role. Photos refresh while the message page is open, on focus/reconnect, and on message updates. Photo uploads invalidate the current account's photo query. If a photo read fails, messages and drafts remain usable and a separate retry action is available.

No SQL migration is required. The updated API server must be running; restart it if it was started without watch mode. The existing public avatar buckets and existing profile records are reused. A local saved-login ticket is never used to identify or authenticate another message participant.

Backend coverage is in `server/tests/messageProfilePhotos.test.js`: authenticated/role checks, owner scoping, repeated-message pagination, empty rosters, safe URLs, and sanitized errors over actual loopback HTTP. Browser evidence lives in `.qa/message-photo-review/` and uses synthetic accounts and substituted profile/database/API responses, with no live account changes.

Verification passed: production build, lint, 168 frontend unit tests, and 539 backend tests (two existing staging checks skipped). All 42 browser scenarios passed across Parent/Teacher pages at 1600, 768 and 375 px, including normal/missing/broken images, refresh/polling, error retry, retained drafts, message sending, and light/dark WCAG checks. These checks do not claim live Supabase verification.
