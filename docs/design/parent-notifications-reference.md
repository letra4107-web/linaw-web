# Parent Notifications / Mga Abiso reference

The page follows the supplied composition: a warm family reading banner with navy/teal heading, golden bell and cream encouragement note; six icon filters; a full-width search and sorting control; and stacked pastel notice rows with category badges, dates, unread dots and detail chevrons. Pink, gold, blue, mint, violet and orange rows use actual notification types. Read rows keep their category color but lose the unread dot.

The sidebar is the shared illustrated Home sidebar. Notifications and Settings are absent from both primary desktop and mobile navigation. The existing profile menu still links to Mga Abiso and shows the actual unread badge.

## Real data and retained behavior

- Uses the existing `useNotifications` hook and authenticated `/notifications`, `/:id/read` and `/read-all` endpoints. Backend ownership checks, realtime invalidation and the fetched notification window are unchanged.
- Titles, bodies, timestamps, unread state and counts come from actual records. No reference sample messages or fixed counts are added to the app.
- Row categories and filter counts now use one presentation mapping. Completed reading, assessments, practice, streaks and rewards are Progress; assignments/reminders are Schedule; explicit teacher messages/replies and legacy message notices are Messages; login/new-lesson/other system notices are System. Motivation remains a Progress subcategory badge.
- Search uses actual title/body/message text. Sorting is chronological across the whole filtered list, including different dates.
- Notification details preserve full text, focus trapping, focus restoration, Escape/backdrop close and authenticated read updates. Failed reads remain unread and show an error. Mark all remains available beneath the list and retains the existing authorized-scope behavior.
- Loading, empty, no-search-match, load failures and retry states remain distinct.

Comic Sans stays the default, with explicit OpenDyslexic, larger text, dark/high-contrast themes and reduced motion. Mobile rows wrap their text, badge and timestamp; category filters scroll within their own region.

## Reused artwork

The banner uses the existing project illustration `src/assets/parent/messages-family-reading.png`. The shared Home sidebar uses `home-sidebar-reading.png`. Images are imported as explicit image elements; critical artwork uses synchronous decoding. No new generated asset was required for this page.

## Verification

Production build, 101 UI/unit tests and 29 isolated browser checks passed. Desktop/mobile Axe WCAG checks reported no violations. Lint has no errors and eight existing warnings in unrelated files.

Browser checks use the actual React app/router with synthetic notification APIs. They cover 320–1536px layouts, loaded artwork, all category counts/filters, unread filtering, search, chronological sorting, detail/read behavior, focus trap/restoration, profile-menu-only access, shared Home sidebar consistency, mark-all, empty/all-read/long-content states, load retry, read failure, fonts/themes and reduced motion. No live notification was marked read during verification.

Screenshots and results: `.qa/parent-notifications-review/`. The implementation does not claim literal pixel identity with the supplied raster reference; real data lengths and responsive wrapping are preserved.
