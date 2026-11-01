# Teacher Students reference

The Teacher Students page follows the supplied classroom reference: cream/lavender canvas, illustrated teacher-and-pupils banner, four pastel summary cards, a white search/filter bar, and an eight-column student roster with a lavender header, illustrated avatars, level/status badges, purple progress tracks and pagination. The existing Home sidebar and profile menu are reused without a Students-specific sidebar variant.

The banner uses `src/assets/teacher/students-classroom-banner.png`, generated with the imagegen skill. It is an illustration-only asset with no baked-in labels or learner data. The existing transparent Teacher illustration is reused in the foreground, and the pupils use an SVG viewport so their faces remain visible in the shallow desktop header. The note, heading and supporting text remain editable HTML. The artwork is a recreation in the reference's style, not a pixel-identical source image.

Student names, usernames, grades, levels, accuracy, completed activities, streaks and sessions come from existing authenticated queries. Illustrated portrait defaults reuse `src/assets/parent/home-decorations.png`; they are decorative placeholders, not claimed to be learner-uploaded photos or inferred gender data. No new avatar column or database migration is introduced.

The progress percentage retains the original page's calculation: `accuracy_sum / total_attempts`, rounded to a percentage, with zero when there are no attempts. Students with recorded accuracy below 70% receive Needs attention. The Active card matches the Active row/status filter, including rostered learners who have no recorded practice yet. There is no fabricated growth percentage or historical trend badge.

Search matches name, username or student ID. Grade filters include Kindergarten and use actual roster/profile grades. Reading levels include the existing levels and any additional values returned by progress records. Filtering resets pagination, and a sliding window keeps later page numbers reachable for larger rosters. Recent-session queries page through records so a heavily active student does not hide another learner's last activity.

Selection checkboxes work per visible page, with an indeterminate header checkbox and a selected-only view. Selection does not silently assign activities or alter learner records. The activity button opens the existing protected PDF-material/assignment workspace. Metric actions filter the roster or open the existing progress reports.

Student names and action buttons open the preserved practice, assignment and module detail queries in a native dialog. Escape, close, focus containment and focus restoration are supported. Empty, loading and failed queries are separate states; failed counts/accuracy are unavailable rather than fabricated zeros. Details have scoped retry controls.

The layout supports desktop, tablet, mobile, dark mode and the existing font preferences. Mobile keeps the full data table in a labelled horizontally scrollable region. No backend, database structure, sidebar navigation destinations or learner records are changed.
