# Parent Calendar reference

The Calendar follows the supplied family-planner reference: an illustrated banner, month grid, activity details, child picker, upcoming activities, reminders and a compact encouragement card. It shares the approved Home sidebar with Progress. The sidebar is selected by the persistent parent layout's route class so it stays consistent while a report is loading.

## Implementation and data

`src/pages/parent/Schedule.tsx` keeps the existing schedule queries, mutation guards, validation and parent/child ownership fields. `calendar-overview-reference.css` supplies the reference composition while the original calendar stylesheet retains form, table and detail behavior. `parent-illustrated-sidebar.css` shares navigation styling across Home, Progress and Calendar.

- The current day is selected on first visit. A valid requested `date` parameter takes priority.
- Month, week and day navigation remain available. Month cells show one activity chip with an overflow count; selecting the date shows every matching activity, and day view lists every activity.
- Each chip uses its existing category's icon and color. The legend and form use the four activity types supported by the existing app: module/lesson, practice, reminder/assignment and appointment/session. No unsupported database categories are added to copy the six-item example legend.
- Activity details show time for a selected date, and date plus time for broader views. Titles, dates, durations and statuses come from actual records.
- The upcoming preview shows four real upcoming activities with expansion/collapse. It does not populate past or fictional events to imitate the illustration.
- Child selection, add/cancel/save, time validation, activity details and status updates retain their existing behavior. Mutations capture the submitted child and author and disable conflicting controls while pending.
- Only synthetic browser records are used for QA saves/status changes. No live schedule, learner, schema, reward or assessment records are modified for the redesign.

## Artwork and accessibility

`src/assets/parent/calendar-family-planner.png` was generated with the built-in image generation tool. All interface text, dates and records remain HTML. The approved Home avatar illustrations and existing `src/assets/students/profile/waving-student.png` are reused. Decorative avatars do not represent learner photos or stored gender.

Comic Sans remains the site default. Explicit larger OpenDyslexic, dark/high-contrast themes, reduced motion, visible keyboard focus and mobile/tablet layouts remain supported. On small screens, the activity table keeps its own horizontal scroll instead of widening the page.

### Final banner prompt

Use case: illustration-story. Asset type: panoramic hero background for LinawLetra parent calendar, matching a cheerful dimensional 3D Filipino children's learning app. A loving young Filipino mother with long flowing brown hair and teal-green cardigan and her smiling little son with swept dark brown hair, blue backpack straps and cream school shirt, large warm brown eyes, looking at a small open paper calendar planner/notebook together in a sunny cozy reading room. Mother and child in center-right around horizontal 62%-75%, faces and top edge of notebook near the middle height for a shallow banner crop. Leftmost 38% is uncluttered soft cream and pale blue window/sky with fluffy white clouds, plenty of contrast for live dark teal HTML title. Rightmost 15% wooden shelves, books, bright green potted plant, a little green frog toy, soft daylight, space for a live cream HTML encouragement note. Lush teal and lime leaves and daisies frame lower corners, a few tiny warm yellow leaf shapes and pink hearts. Very wide 3:1 composition. Vivid teal, cyan, sunny gold, warm cream and coral pink palette. High quality polished 3D storybook rendering with friendly expressive faces. No writing, letters, numbers, dates, logos, UI or watermark. Calendar pages have small blank colored squares only. This is background artwork, not an interface screenshot.

## Verification scope

The actual React UI is checked with isolated API/Supabase adapters, synthetic records and blocked external services. The review covers calendar dates and range changes, selected-day details, upcoming expansion, child isolation, add-form validation, submitted-child ownership, status changes, error/retry and empty states, sidebar consistency, larger fonts, mobile menu, themes and automated accessibility. It does not certify live RLS, production deployment or literal pixel identity with a supplied reference image.

Completed: production build, 93 existing UI tests and 27 isolated Calendar browser checks passed. Checks include live SPA navigation between Home/Progress/Calendar without changing sidebar width, 320–1536px layouts and desktop/mobile WCAG checks without reported violations. Lint reports no errors and eight existing warnings in unrelated files. Local screenshots and detailed results are under `.qa/parent-calendar-review/`.
