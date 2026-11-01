# Parent Settings / Aking Detalye reference

The `/parent/settings` account page follows the supplied composition: a panoramic family garden banner, navy/teal heading with sunny icon and paper note, personal account panel beside a family encouragement illustration, pastel connected-child cards, and two lower contact/security panels.

The sidebar uses the same shared illustrated Home navigation and existing collapse/mobile/profile controls. Account details and App Settings are accessed through the profile menu; Settings is not a primary sidebar or mobile navigation item. The related App Settings page also remains available through the contact/security links.

## Existing data and behavior

- Account name and initials come from the resolved identity. Email, phone and verification status come from the signed-in Supabase user. No example parent identity or verified status is hardcoded.
- The existing parent photo upload (2 MB image limit, owner path, profile update and shared cache invalidation) is retained. The blue action is honestly labelled “Palitan ang Larawan”; no unsupported name/contact editor is simulated.
- Connected children come from the original parent-scoped child query. Each card uses that child's existing learning-path and reading-profile endpoints for actual completed/total counts, effective level and average accuracy. Loading or missing observations are not replaced with sample scores.
- Child links and menu options preserve the actual child ID. Enrollment links to the existing Children page and its enrollment workflow.
- The password dialog keeps current-password verification, strength and confirmation rules, pending guards, focus trap, Escape handling and the `?password=change` entry point.
- Two-factor state comes from verified Supabase factors. Its action links to the existing MFA setup controls; no factor is enrolled or disabled merely by opening this account page.
- Notification preferences use the existing App Settings destination.
- Empty children, loading, progress failures and child-list retry states remain distinct. Kindergarten and varying reading levels are supported.

Comic Sans remains the default. Explicit OpenDyslexic, larger text, dark/high-contrast themes and reduced motion are supported. Layouts stack on smaller screens. Decorative images use explicit imported image elements and predictable layers, with critical profile/sidebar artwork decoded synchronously for initial painting.

## Artwork

Mode: built-in imagegen skill/tool.

Saved new asset: `src/assets/parent/settings-family-hug.png`.

Reused project assets: `src/assets/parent/children-family-garden.png` for the banner, `home-sidebar-reading.png` for the shared Home sidebar, and the existing `ParentHomeArtwork` portraits as decorative child defaults. All text and account information are live HTML.

### Final generated illustration prompt

Use case: illustration-story. Asset type: decorative right-hand encouragement card background for the LinawLetra Parent Settings page. Polished bright dimensional 3D children's storybook educational illustration, warm, expressive and colorful. A loving young Filipino mother with long flowing chestnut brown hair and a teal green cardigan warmly hugging her cheerful little boy with swept dark brown hair, a white school shirt, closed happy eyes, and a wide smile. Mother and child group occupy the right 55% of a landscape 3:2 composition; their faces centered in the right half. Left 45% mostly uncluttered soft pale buttery cream background for live navy HTML encouragement text. Lush emerald and teal leaves, small pink and white daisies along bottom edge; tiny coral hearts and golden sparkles frame the family without clutter. Warm sunny yellow glow. All main characters fully within the frame. No text, letters, numbers, logos, UI, border or watermark.

## Verification

Actual React UI/router with synthetic Supabase/API fixtures only; no real profile-photo upload, password change, enrollment or MFA mutation. Evidence and screenshots: `.qa/parent-settings-review/`.

Checks cover desktop/tablet/mobile widths, actual per-child counts and scores, one/zero children, long names, verified MFA, child-load errors, image decoding, owner-scoped photo upload and validation, password validation/reauthentication, focus trap/URL cleanup, child/settings destinations, Home sidebar consistency/collapse, alternate fonts/themes and Axe WCAG checks.

Completed: production build, 97 existing UI/unit tests and 27 isolated browser checks passed. Desktop/mobile Axe checks reported no violations. Lint has no errors and only the eight existing warnings in unrelated files. The sidebar collapse check uses reduced motion because the test clock pauses CSS animation timing.

This implementation does not claim literal pixel identity with the raster reference; account data, available actions and responsive wrapping remain real.
