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

Generated with the built-in image generation tool and saved in the repository:

| Asset | Use |
| --- | --- |
| `src/assets/parent/home-welcome-garden.png` | Welcome background; greeting, parent name, note and signpost remain HTML |
| `src/assets/parent/home-sidebar-reading.png` | Transparent mother and child sidebar illustration |
| `src/assets/parent/home-decorations.png` | Two decorative avatar portraits, hourglass and medal; individual SVG viewports keep neighboring cells separate |

The existing logo, lesson books, current-lesson illustration and badge catalog/artwork are reused. SVG viewports only display existing raster assets; they do not invent badges or change their IDs.

### Final prompts

**Garden banner:** Use case: illustration-story. Asset type: panoramic website welcome banner background for LinawLetra parent portal. New asset matching cheerful polished 3D Filipino children's reading app. Very wide 3:1 composition. A loving young Filipino mother long brown hair teal green cardigan and her happy little son with dark swept brown hair white school shirt, both large expressive brown eyes, reading an open teal book together outside in a magical sunny school garden. Mother and son grouped across center-right 54%-74% of canvas, upper bodies and faces fully visible near middle height so usable in a shallow banner. Colorful schoolhouse right background, blue sky fluffy white clouds, lush tropical emerald/teal green leaves, daisies, warm yellow sunlight and pink flowers at edges. Left 40% mostly clean pale blue sky and creamy clouds for dark live HTML greeting. Rightmost 17% green foliage around a clear sky area for live HTML wooden signpost. Few golden star and heart accents. High quality warm dimensional 3D storybook rendering, vivid cyan, teal, green, yellow, warm cream. No text, no letters, no words, no interface, no logos or watermark.

**Sidebar:** Use case: illustration-story. Asset type: transparent decorative sidebar cutout for LinawLetra parent portal, tall portrait composition. A loving young Filipino mother with long brown hair and teal green cardigan, big gentle warm brown eyes, and her smiling little boy with swept dark brown hair and large brown eyes, both looking at the viewer while holding one large open teal children's reading book together. Mother behind left, child lower right. Charming high quality polished dimensional 3D children's app illustration. Colorful sun yellow star on book, warm cream pages. Their shoulders and book emerge from lush tropical teal emerald green leaves and a few white daisies and small warm yellow stars along bottom. Tall narrow composition, entire character group fully visible with margin at edges, no text, no logos. Actual transparent background, clean alpha cutout, no backdrop or border.

**Decorations:** Use case: illustration-story. Asset type: 2 by 2 sprite atlas of four decorative 3D UI illustrations for a Filipino children's reading app. Actual transparent background. Precisely four equally sized separate objects, each centered in one equal quadrant with generous transparent margins, no contact and no shadows leaking into neighboring cell. Top left: circular portrait avatar of a smiling little Filipino boy with large brown eyes, dark swept brown hair, cream school shirt and teal backpack straps, pale mint circular background. Top right: circular portrait avatar of a smiling little Filipino girl with large brown eyes, warm brown shoulder length hair and small pink hair clips, cream school blouse, pale peach circular background. Bottom left: beautiful freestanding golden hourglass with polished warm orange-gold wooden top and bottom, shiny clear glass, sunny yellow sand and cyan blue glass edges. Bottom right: shiny gold star medal with scalloped golden circular edge and pink ribbon tails. Cohesive charming polished dimensional 3D storybook art, vivid teal, gold, cyan, coral pink. Perfectly square overall image. Each object fully contained in its quadrant with at least 8% padding to quadrant boundary. No letters, words, text, labels, logos, interface, watermark or borders.

## Verification scope

Production build, existing UI regression tests and lint are checked locally. Browser review uses the actual React UI and router with isolated synthetic parent/child data and blocked external services. It checks layouts from 320px through 1536px, actual computed values, child switching and reload, current-module and activity destinations, empty/error/retry states, explicit larger OpenDyslexic, theme previews and automated accessibility checks. This does not certify live Supabase records, production deployment or literal pixel identity with the supplied illustration.

Final local results: 93 existing UI tests passed; 23 isolated browser checks passed, including desktop/mobile WCAG checks without reported violations. Lint reports no errors and eight existing warnings in unrelated files. Review screenshots and the detailed browser result are saved under `.qa/parent-home-review/` (ignored local evidence).
