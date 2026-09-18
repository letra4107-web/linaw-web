# LinawLetra Thesis Demo and Defense Guide

## Demo preconditions

Prepare non-production demonstration accounts: one teacher with a rostered student, one parent linked to that student, and one administrator. Publish a real PDF resource, create or be ready to create an assignment, verify the backend/Supabase environment, and allow microphone access in a compatible browser. Do not place credentials in this guide or on slides.

## Five-step demonstration

1. **Teacher — `/teacher/students`**: Select the rostered student. Show recorded activity, practice history, assignment status, and the **Mag-assign ng PDF** continuation. The visible result is a roster-scoped Student Detail view.
2. **Student — `/student/learn`**: Open the assigned PDF activity and read/speak a supported item. The visible result is safe feedback based on the server’s stored target; the browser contributes a transcript, not an authoritative score.
3. **Teacher review — `/teacher/students`**: Reopen the same student detail or the existing report/PDF workflow. The visible result is the recorded status/activity connection, not a manually entered score.
4. **Parent — `/parent` then `/parent/progress`**: Select the linked child. Show current context, recorded pronunciation-practice activity, pending PDF work where present, and the progress report. The visible result is a parent-scoped understanding of recorded progress.
5. **Admin — `/admin/users` or `/admin/audit-logs`**: Show role/status management or a scannable audit entry. The visible result is an administrator-only management view without exposing credentials or raw authentication data.

Keep the spoken explanation focused on structured Filipino reading support, speech-assisted interaction, trusted server results, and role-scoped visibility.

## Truthful failure plan

| Situation | Presenter response |
| --- | --- |
| Microphone denied or unavailable | Explain that the browser needs permission and that speech recognition support varies; do not fabricate a transcript or result. |
| Speech recognition transcript is poor | Repeat the supported activity clearly or explain that the transcript is reviewed by deterministic server comparison, not a clinical voice model. |
| TTS unavailable | Show the existing safe audio error state; do not claim audio played. |
| Network/staging unavailable | Use the prepared non-network UI path only if it is already available; do not present unpersisted data as saved. |
| PDF unavailable | Return to the assignment list/teacher workflow and state that a published assigned resource is a precondition. |
| Session expired | Sign in through the regular flow; protected routes redirect safely. |

## Defense talking points

**Where is the AI?** Speech recognition assists with spoken-response capture and Google Cloud TTS assists auditory reading. Educational scoring is deterministic server-side logic; LinawLetra does not claim a custom trained diagnostic model.

**How is pronunciation scored?** A supported browser provides a transcript. The authenticated server loads the stored activity target, normalizes text consistently, derives accuracy/correctness, and stores the trusted result. The client cannot send a final score or XP value as authority.

**Does it diagnose dyslexia?** No. It is a reading-support system for the intended learner population, not a diagnostic, treatment, or clinical measurement tool.

**Why server-authoritative scoring?** Browser fields can be changed. The server resolves the student identity, verifies content/assignment eligibility, uses stored targets, and controls persistence/rewards. This prevents a learner from simply submitting `correct: true` or arbitrary XP.

**How are role boundaries protected?** Browser navigation is only a convenience layer. Express authenticates bearer tokens and checks roles/ownership; Supabase RLS remains an additional direct-data boundary. Parent child IDs and teacher student IDs are rechecked server-side.

**How do parents see only their child?** Parent APIs verify the requested child belongs to the authenticated parent. The selected child is a UI choice, not authorization.

**How do teachers see only their students?** Teacher workflow data is roster-scoped; privileged server operations check the teacher-student relationship, and RLS scopes browser queries.

**What happens when speech recognition is wrong or unsupported?** The learner can retry where the activity permits. Browser support and transcript quality are limitations; the system does not claim diagnostic certainty.

**What happens without internet?** Current browser speech/API/TTS and persistence workflows require configured network services. Offline operation is future work.

**Why Supabase?** It provides managed authentication, PostgreSQL, row-level security, storage, and a practical database layer for the role-based application. The server remains responsible for service-role actions.

**How was it tested?** The release-candidate suite verifies TypeScript, focused server/security regressions, lint, build, and diff integrity. Live staging RLS/storage and manual device QA remain explicitly pending until dedicated credentials/devices are available.

**What differentiates it from a generic reading app?** It combines structured Filipino reading activities, speech-assisted interaction, role-scoped assignment/progress workflows, accessible controls, and server-authoritative educational result handling.

## Migration status

- **032:** applied to staging; removes obsolete browser mutations for guided PDF reading attempts and status.
- **033:** applied to staging; revokes authenticated-browser inserts for pronunciation practice sessions.
- **034:** applied to staging; stores server-issued nonsense-word sets outside browser access.
- **035+:** not required for this release candidate.
