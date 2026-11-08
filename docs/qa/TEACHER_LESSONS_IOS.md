# Teacher lesson uploads and iOS visibility

The web upload form requires a title, description, grade (1–6), and PDF. Subject selection was removed from creation, editing, and the teacher library. New lessons retain the shared `lessons` contract: `subject: null`, `is_published: true`, the numeric grade stored as text, and a PDF URL plus storage location in `lesson-pdfs`.

The mobile checkout is `C:/Users/Samantha/OneDrive/Desktop/LinawLm/LinawLm`. Its student dashboard had the published lesson library inside a disabled JSX fragment. The fix renders `StudentLessonLibrary` in **Aralin → Galing sa Guro**, with the newest published PDFs first, a refresh button, and distinct loading, error, and empty states. Subject filters were removed. Existing directly assigned PDFs remain available.

The mobile service retains the grade-filtered API feed and uses an authenticated read of the shared `lessons` table if that endpoint fails. Lesson changes, including unpublishing and deletion, refresh the feed. Returning to Aralin refreshes lessons and assignments. Notification/progress failures after opening a PDF do not turn a successful file opening into an error.

## Validation

- Four web upload tests cover mobile-compatible metadata, invalid input, storage rejection, and cleanup after a confirmed database rejection.
- Seven mobile component/service tests cover visible published lessons without subjects, newest-first ordering, PDF actions, loading/error/empty feedback, refresh, grade filtering, API fallback, and Realtime changes.
- Web production build and mobile TypeScript checks passed.
- Browser checks verified creation and editing without a subject, the published upload metadata, and layouts at 375, 768, and 1440 pixels without horizontal overflow or runtime errors.
- A local iOS Hermes bundle exported successfully. This is a bundle verification, not a signed IPA or a TestFlight release.
- Read-only checks of the dedicated test teacher's existing lesson confirmed that the mobile API includes it and its PDF returns HTTP 200 with `application/pdf`. No live lesson was uploaded, modified, or deleted during these checks.

## Release requirement

The installed/TestFlight app needs a new signed iOS build containing the mobile source changes. No TestFlight build was submitted or published by this task, and no physical-iPhone verification is claimed. Deploying only the web changes does not update the installed app.
