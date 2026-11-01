# Parent App Settings reference

The `/parent/app-settings` page follows the supplied composition: family reading banner with navy/teal heading and golden gear, notification preferences with aligned channel columns, illustrated Light/Dark/System theme cards, language selector, a violet owl encouragement panel, privacy/security controls and a data-export card.

The page uses the same shared Home sidebar. Notifications, account Settings and App Settings remain accessible through the profile menu; none is added to the primary desktop/mobile navigation.

## Preserved data and actions

- Existing parent-scoped settings query, default initialization, update patches, pending guards and cache invalidation are retained.
- The four in-app switches now filter the Parent's notification list and unread badge using saved preferences. Account/security and unknown notice types remain visible. Unsupported email/SMS switches are hidden, as requested; existing stored email/SMS values are preserved.
- Light/Dark mode still saves the existing supported theme values. System Theme applies the device's current color scheme using the existing behavior; it does not introduce a new database value or claim persistent automatic following.
- Language uses the original saved preference and the existing parent translation behavior.
- Password changes link to the original profile password dialog.
- MFA remains based on actual verified factors. Enrollment, code verification, cancellation, disabled/pending guards, focus management and verified-factor authority after a preferences-write failure are retained.
- Data export keeps the original account/profile/children/progress/message/activity/reply fields and download guards. A narrow compatibility fallback omits the optional attachment name only when the deployed mobile reply table lacks that column. Other query errors still fail the export.
- Loading, failed updates, retry states and security/export statuses remain visible.

Comic Sans remains the default. Larger OpenDyslexic, dark/high-contrast themes, reduced motion and narrow layouts are supported. On phones, channel labels remain next to their switches and action buttons wrap below descriptive text so the text has enough width.

## Artwork

Built-in imagegen tool/skill mode was used for the new transparent mascot.

Saved asset: `src/assets/parent/app-settings-owl-laptop.png`.

The header reuses `src/assets/parent/messages-family-reading.png`; the sidebar reuses the Home illustration. Sun, moon, monitor, flag and UI icons are native SVG/CSS using the existing icon system.

### Final mascot prompt

Use case: illustration-story. Asset type: transparent decorative cutout for a LinawLetra family learning app settings encouragement banner. An adorable small round violet-purple owl mascot with very large glossy warm brown eyes, cream face and belly, orange little beak and feet, short purple feather tufts, sitting happily behind an open small deep indigo laptop. Its friendly wings rest near the keyboard. Bright polished dimensional 3D children's storybook educational app illustration, soft rounded forms, cheerful expression, crisp highlights, lilac and royal purple plumage. A few tiny golden star sparkles and small coral-pink flower shapes around its head, with subtle emerald leaves framing only the lower right corner. Full owl and laptop fully visible, compact square composition, minimal padding, genuinely transparent background. No text, letters, numbers, logos, UI or watermark.

## Verification

Production build, 104 UI/unit tests and 35 isolated App Settings browser checks passed. Additional cross-tab checks verify notification filtering and badge updates after changing preferences. Desktop/mobile Axe WCAG checks reported no violations. Lint has no errors and eight existing warnings in unrelated files.

The browser runs the actual React UI/router against synthetic Supabase/API boundaries. Coverage includes 320–1536px layouts, loaded artwork, stored preferences, owner-scoped updates, preservation of other channels, theme save/device snapshot/rollback, language save, pending and verified MFA states, failed cancellation/verification, factor authority when preferences cannot save, data download, legacy reply schema export, default initialization, loading failures, profile-only navigation, Home sidebar consistency, alternate fonts/themes and reduced motion. No live preference, password, MFA or export mutation was made during the checks.

Local evidence and screenshots: `.qa/parent-app-settings-review/`. Real account state and responsive text wrapping take precedence over literal pixel identity with the raster reference.
