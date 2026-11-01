# Teacher Home reference redesign — 2026-10-31

Implemented the supplied Teacher Home composition with a purple illustrated sidebar, classroom welcome banner, live identity/date/notification controls, four pastel summary links, progress/activity panels, and attention/tasks/quick-action panels. Added two imagegen assets and retained existing role routes, profile-menu actions, accessibility preferences and progress calculations.

## Functional scope

- Existing authenticated roster, child-progress, practice-session and PDF assignment/material queries supply the displayed records. Roster queries explicitly filter the current Teacher ID; dependent queries remain restricted to roster IDs/material IDs and existing RLS.
- Date-filtered chart queries aggregate 7-day or 30-day practice records, including pagination beyond the first 500 or 1,000 rows. All-time chart values retain existing progress totals. No learner records are modified.
- Home search opens the existing roster with the typed name/username. Summary cards, view-all links and quick actions navigate to existing protected Teacher pages. Roster management is labelled for the supported existing workflow.
- The date and greeting use Asia/Manila. The profile photo uses the Teacher's saved avatar with the existing illustration as fallback; notifications use the shared live unread count.
- Loading, empty, permission/network failure and retry are distinct. A failed count is displayed as unavailable, not a fabricated zero.
- The sidebar keeps its five tabs and profile menu across Teacher pages. Home uses a full-width header, and tablet/mobile reflow without horizontal overflow. The menu remains keyboard accessible; short desktop windows keep the profile control on screen.

## Verification

- Production build and lint: passed after final source edits.
- UI/unit suite: 114 passed, 0 failed.
- Initial application browser suite: 40 passed. Tested empty/populated records at widths 1562, 1024, 768 and 375; metrics, actual navigation, search, date filtering, query scoping, loaded artwork and light/dark WCAG checks.
- Final focused suite: 15 passed. Retested final desktop/mobile light/dark visuals and WCAG, menu focus and bounds, collapsed sidebar alignment, profile control at 650px height, no-roster query guards, failed-data retry and complete aggregation of 1,001 sessions.
- Browser verification used the actual compiled React application with isolated synthetic auth, API and Supabase records. No real messages, account updates or learner-progress writes were performed.
- Local evidence: `.qa/teacher-home-review/results.json`, `.qa/teacher-home-final-review/results.json`, with screenshots in those directories. These local QA files are ignored by Git.

No SQL installation, backend change, commit or deployment is part of this change. Illustration sources and the reference-art interpretation are documented in `docs/design/teacher-home-reference.md`.

## Screenshot repair follow-up

The follow-up screenshot exposed missing decorative artwork, a long saved display name making the banner too tall, and a sidebar quote clipped on an approximately 1600×818 CSS-pixel desktop viewport at 1.2 device scale.

- Replaced CSS-only atlas backgrounds with a Vite-imported image inside each clipped atlas cell. Images can now be checked for successful loading in both development and production. Kept the original generated asset unchanged.
- Added a smaller title for long names while retaining the complete saved name; reduced the header's vertical padding.
- Replaced the quote's fixed bottom offset with a flex scene that uses the sidebar's available height. Compact desktop windows receive smaller text/art; short windows keep the profile control visible.
- Scoped metric hover/visited colors and decoration so global link styles do not turn the text purple and underlined.
- Production build and lint passed. All 18 production browser checks passed across six viewport/font configurations, including the screenshot-equivalent scale, large fonts, desktop, tablet and mobile in light/dark mode. Verified actual image decoding, visible atlas bounds, header height, sidebar quote/profile bounds, hover decoration, no horizontal overflow and WCAG checks. Mobile image-bound checks exclude the intentionally hidden desktop sidebar; focused mobile reruns passed all six checks. Combined results are in `.qa/teacher-home-repair-review/combined-results.json`.
- Visually inspected the actual Vite development screenshot at the screenshot-equivalent size; illustrations, the full sidebar quote and smaller long-name greeting were visible. Development preview helpers use an isolated Vite cache and synthetic data, without changing the user's running server or account records.
- Additional Vite cold-start attempts timed out before the application mounted; the earlier inspected development screenshot and the completed production browser checks are the verification evidence. No claim is made that those later development startup attempts passed.
- Local evidence: `.qa/teacher-home-repair-review/`, `.qa/teacher-home-repair-mobile-review/`, `.qa/teacher-home-dev-repair-review/`.
