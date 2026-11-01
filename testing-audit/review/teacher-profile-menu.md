# Teacher profile menu

The desktop, collapsed-sidebar and mobile profile menu now links to three Teacher-only destinations:

- `/teacher/profile`: personal details, photo upload, name editing, assigned grades and password change.
- `/teacher/settings`: existing theme actions and a link to the notification center.
- `/teacher/notifications`: authenticated notifications, unread/read filters, search, expandable details, read/read-all actions and live unread badge counts.

The primary five-item sidebar is unchanged. Existing saved-profile logout is retained. The menu has labelled controls, initial focus, arrow/Home/End navigation and Escape/outside dismissal.

The old combined settings view is split without changing the account/password/theme APIs. Teacher profile reads use the existing `grade_levels` and `avatar_url` fields. The old notification switches depended on unavailable fields or unconnected delivery; the new settings card links to working in-app notifications instead. No schema migration is required. Notifications also poll every five seconds while active as a fallback to Realtime.

Validation: production build, lint and 114 UI/unit tests passed. Sixteen isolated desktop/mobile browser checks passed, covering menu destinations/keyboard behavior, saved profile edits, separate profile/settings sections, theme actions, notification filters/search/read state, badge updates without reload, empty states, and light/dark layout and Axe WCAG checks. The browser used synthetic service boundaries; no real user profile or notification records were changed.

Local evidence: `.qa/teacher-menu-review/`.
