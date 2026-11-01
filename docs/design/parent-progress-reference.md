# Parent Progress reference

The parent Progress tab follows the supplied indoor reading reference: illustrated banner, child cards and month picker, violet/green/gold/rose summaries, four report tabs, pastel module rows, a progress chart, weekly practice, earned badges and recommendations. The sidebar uses the same artwork, dimensions, navigation colors and profile card as the approved Home design.

## Implementation and existing behavior

- `src/pages/parent/ProgressReference.tsx` keeps the existing queries, all four report panels, keyboard tab navigation, selected-record support, module details and retry actions.
- `progress-overview-reference.css` supplies the reference composition while the existing `progress-reference-layout.css` retains detailed report styles.
- `parent-illustrated-sidebar.css`, imported by `ParentLayout.tsx`, shares the Home/Progress/Calendar sidebar rules. The persistent route class keeps it stable while lazy report content is loading. Page content keeps its own design.
- All server-provided modules remain accessible in their original order. The overview starts with six rows; “Tingnan Lahat” expands the list and it can be collapsed again. Lock indicators show server state; opening a parent report does not unlock student lessons.
- Phonetic previews are derived from actual module titles. Only the Beginner introduction uses the decorative “Aa” preview; other titles use a book symbol.
- Selecting a child preserves the current report and month, clears stale module/session detail state and resets expanded lists. URL state survives reloads.
- Summary score and practice duration use the selected month's real practice rows. The comparison is explicitly labeled as a change from the previous month. Learning-path completion, level, categories and awards retain their existing scope.
- Weekly checks use actual practice dates. Current-month reports show the current week; historical reports show the week containing the month's last day. Calendar links retain child and day.
- The badge preview shows up to five actually earned IDs. The Results report retains the full catalog, actual locked states and criteria.
- No backend, database, assessment, reward or unlocking changes are required.

## Artwork and typography

`src/assets/parent/progress-reading-banner.png` is the selected indoor mother-and-child reading illustration, generated earlier with the built-in image generation tool and copied into the project. Parent name/child labels, greetings and encouragement notes remain live HTML. It reuses the Home default avatars, book illustration and existing illustrated badge catalog. Decorative avatar artwork does not represent learner photos or stored gender.

The site default Comic Sans remains in use. Explicit OpenDyslexic, larger text, dark/high-contrast preferences, keyboard focus and reduced motion remain supported.

`src/assets/parent/progress-pink-clock.png` is a transparent decorative clock generated with the built-in image generation tool for the time summary. It does not encode or replace the actual duration value.

### Clock prompt

Use case: stylized-concept. Asset type: small decorative 3D dashboard illustration on a transparent background for LinawLetra parent progress summary. One charming polished pink and coral analog alarm clock, rounded shiny pink body with twin golden-pink alarm bells, tiny coral feet, warm pale cream clock face, slim rose hour and minute hands, tiny simple gold tick marks without numerals. Three-quarter front view, vivid hot-pink outline details and a small golden star sparkle above. Cute warm 3D children's reading app style with soft dimensional shading, crisp silhouette, yellow, blush pink and coral palette. Fully visible whole clock with at least 10% transparent margin on all sides. Genuine transparent alpha background. No text, numerals, logos, interface, watermark, shadows outside the small object.

### Indoor banner prompt

Use case: illustration-story. Asset type: wide panoramic background illustration for LinawLetra Filipino parent dashboard banner. Create a beautifully polished friendly 3D children's storybook illustration matching a colorful learning app: warm Filipino mother with long flowing brown hair, teal green cardigan, smiling gently while reading an open teal storybook with her young son with large warm brown eyes, dark brown swept hair and white shirt. They sit together in a bright cozy reading room, sunlit window with blue sky and soft clouds, warm wooden bookshelf on the right, stacks of colorful books, lush teal-green houseplants and white daisies. Composition: extra-wide panoramic landscape, 3:1 or wider. Mother and boy grouped at horizontal 62%-75% with both full heads visible and open book below them, plenty of uncluttered pale cream and pale sky negative space across the entire left 40% for real HTML headline, a clear small blank cream zone upper far right for an HTML note. Keep faces centered vertically so artwork can be cropped into a shallow 6:1 banner. A few small pink hearts and golden star sparkles at right. Vibrant teal, cyan, sunny yellow, warm cream, polished dimensional shading, crisp joyful expressive faces. No text, no letters, no interface, no logos, no watermark. This is only the background artwork, not a screenshot.

## Local verification

The actual React UI and router are reviewed with isolated synthetic parent/child records and blocked external services. This checks 320–1536px layouts, all 17 modules, completed/unlocked/locked states, expansion and collapse, selected child/month and reload, score/time filtering, all report tabs, keyboard navigation, recommendations, error/retry and empty states, shared-sidebar consistency, OpenDyslexic at 116%, theme layouts and automated WCAG checks. It does not validate live database records or certify literal pixel identity with a supplied raster reference.

Completed: production build, 93 existing UI tests, 27 isolated Progress browser checks and 10 Home integration checks passed. Automated desktop/mobile WCAG checks reported no violations. Lint reported no errors and eight existing warnings in unrelated files. Local screenshots and detailed results are under `.qa/parent-progress-review/` and `.qa/parent-home-progress-integration/`.
