# Parent Home reference

The approved Home reference uses a garden welcome banner, a teal illustrated sidebar, child cards, four pastel summaries, then a two-column arrangement of learning progress, recent activity, the current lesson and earned badges. The existing Progress page keeps its own layout.

Implementation: `src/pages/parent/Dashboard.tsx`, `parent-dashboard-reference.css` and `ParentHomeArtwork.tsx`. Home content styling is scoped to `.parent-home-reference`; `parent-illustrated-sidebar.css` shares the approved sidebar with Progress and Calendar. Comic Sans remains the existing default; explicit OpenDyslexic and theme preferences remain supported.

## Existing data and actions

- Child selection uses `/parent/children` and the `child` URL parameter. Reloading keeps the selected child.
- Completed and total lessons come from the existing learning-path response. Module titles, numbers, ordering and completion records are unchanged.
- Average score and weekly trend use the existing reading-profile response. Time sums practice durations for the current Monday–Sunday week through the present time.
- Recent activity uses the existing pronunciation practice query. Each record opens its actual child, session and month in the Progress report.
- The current lesson opens that module's parent report. A phonetic preview is displayed only when its existing title identifies a syllable, or when it is the Beginner introductory module.
- Only earned badge IDs are illustrated. The count is the existing normalized earned count; the preview shows up to five earned catalog entries.
- Child cards use decorative default avatar illustrations. These are not photos or gender information from learner records. Names and grade/level labels remain actual data.
- Loading, empty and retry states remain available. No backend, database, award, assessment or unlocking logic changes are required.

## Artwork

The Parent portal uses a teal, coral and cream family-guidance theme with human parent-and-child reading illustrations. The Student portal retains the purple owl, the Teacher portal uses human educators and classroom artwork, and Admin uses blue/gold school-management artwork.

Parent banners, sidebar cutouts, learner illustrations and decorative portraits are saved under `src/assets/illustrations/role-themes/`. The built-in image-generation prompts, source filenames, dimensions and sprite layouts are recorded in [generation.json](../../src/assets/illustrations/role-themes/generation.json). All new artwork uses HD 2D storybook linework and simple cel shading.

- `family-banner.png`: home-garden parent-and-child reading scene, with space for HTML headings.
- `parent-family.png`: complete mother-and-child cutout for sidebar, settings and empty states.
- `young-reader.png`: learner illustration for current-module and practice reminders.
- `family-icons.png`: two human learner portraits, hourglass and medal.

Shared books, clocks, plants and earned student badges retain their existing meanings. Sprite bounds are recorded in `src/lib/illustrationSprites.ts`; sidebar art uses contain sizing to keep faces and hands visible.

## Verification scope

Production build, existing UI regression tests and lint are checked locally. Browser review uses the actual React UI and router with isolated synthetic parent/child data and blocked external services. It checks layouts from 320px through 1536px, actual computed values, child switching and reload, current-module and activity destinations, empty/error/retry states, explicit larger OpenDyslexic, theme previews and automated accessibility checks. This does not certify live Supabase records, production deployment or literal pixel identity with the supplied illustration.

Final local results: 93 existing UI tests passed; 23 isolated browser checks passed, including desktop/mobile WCAG checks without reported violations. Lint reports no errors and eight existing warnings in unrelated files. Review screenshots and the detailed browser result are saved under `.qa/parent-home-review/` (ignored local evidence).
