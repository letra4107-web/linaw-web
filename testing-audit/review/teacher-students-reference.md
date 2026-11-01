# Teacher Students reference verification — 2026-10-31

Implemented the supplied Teacher Students layout with the existing Home sidebar, an illustrated teacher/pupils banner, four pastel summary cards, search and grade/level/status filters, illustrated roster rows, functional selection, progress/status badges and pagination.

## Data and actions

- Existing authenticated roster, child-progress, practice-session and PDF-assignment reads remain the data sources. The roster query explicitly filters the current Teacher ID; dependent reads stay within roster or selected-student IDs, with the existing database RLS and protected backend module-summary endpoint.
- Progress/accuracy, completed activity and streak calculations remain based on existing records. Active means the row's existing Active status; learners below the existing 70% threshold use Needs attention. The Active summary and filter now agree. There is no fabricated trend percentage.
- Search supports actual name, username and student ID. Grade options include Kindergarten. Selection works on the current visible page, supports indeterminate state and selected-only review, and does not change learner records.
- Activity creation opens the existing PDF/assignment workspace. Completed-activity summary opens progress reports. Names/row actions open the existing student practice, assignments and module data in a native modal dialog with Escape, close, focus containment and focus restoration.
- Error/loading/empty/no-match states are distinct; failed progress is unavailable rather than falsely recorded as zero. Detail sections have independent retry controls.
- The shared Home sidebar and its profile menu remain unchanged. Styles are scoped to the Students page and its dialog. No backend route, migration, learner record or real message was changed.

## Verification

- Production build and lint passed; UI/unit suite: 114 passed, 0 failed.
- Main compiled-application browser run: 41 passed, 0 failed. Viewports: 1756, 1600 at 1.2 device scale, 1280 with large-font preference, 1024, 768 and 375. Used actual React/router/query components with isolated synthetic authentication, Supabase and API records.
- Verified summary/roster values, explicit teacher query scope, loaded artwork, light/dark layout and WCAG checks, no page overflow, search/filter/reset, individual/all-page selection, indeterminate state, selected-only review, detail queries, dialog WCAG, Escape/focus restoration, activity destination and shared Home/sidebar/profile controls.
- Edge cases included a 32-student roster and seventh-page navigation, Kindergarten/level/status/ID combinations, empty roster with no unscoped dependent reads, full request failure and retry, partial progress failure, and separate detail-section failures/retries.
- Final banner framing was refined to show the teacher's upper body/tablet and preserve pupil faces; all 12 focused desktop/mobile browser checks passed against that final source and are saved separately.
- Evidence: `.qa/teacher-students-review/results.json`, `.qa/teacher-students-final-review/results.json`, screenshots in those directories. Local QA artifacts are ignored by Git. No real account or learner data writes were performed.

Artwork provenance and the supported interaction behavior are documented in `docs/design/teacher-students-reference.md`. The illustrations recreate the reference's style; they are not claimed to be the reference's original pixel-identical artwork.
