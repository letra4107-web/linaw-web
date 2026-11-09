# Web teacher lessons and reading feedback

Verified on November 9, 2026 (Asia/Manila).

Teacher uploads were published in `lessons`, while the student tab only loaded
legacy `pdf_assignments`. The tab now also loads published lessons through
`GET /student/lessons`, filtered by the authenticated student's stored grade.
Opening a lesson checks the same grade and publication rules before returning
its existing public or signed PDF URL. No migration is needed.

Practice and module feedback now displays encouragement without the save/XP
receipt text. Saving and authoritative reward calculations are unchanged.
Both correct and incorrect answers autoplay their positive message, and the
student can replay it. Incorrect answers then play the prompt and target word.
Each repeated attempt has a distinct playback trigger. Starting another attempt
or navigating away stops pending feedback; old word-audio responses cannot play
after the learner moves on.

Every new correct or incorrect attempt also launches pastel canvas confetti from
both sides, based on [Magic UI Side Cannons](https://magicui.design/docs/components/confetti).
The shared overlay uses `canvas-confetti`, ignores pointer events, respects
reduced motion, and clears its canvas and timers when the attempt changes or
the feedback closes. Historical results do not replay the celebration.

TTS uses Eleven v3 with `language_code: fil`, including retries without an
unavailable dictionary. Vowels stay at natural speed; the fallback sound for I
is `ee`. Browser synthesis only uses installed Filipino/Tagalog voices.
The provider documents that language enforcement is unavailable on
multilingual_v2: [Create speech](https://elevenlabs.io/docs/api-reference/text-to-speech/convert).

Validation:

- Production build passed.
- Full automated suite passed with two existing staging-only tests skipped.
- After the playback and confetti changes, 15 focused client tests and 28 server tests passed.
- All 185 UI tests passed after the confetti update.
- The configured live TTS service returned nonempty MP3 audio for A, E, I, O, U,
  `ano`, and an encouragement message. Every vowel response used rate 1.
- A read-only live database check found the existing published Baitang 1 lesson;
  the new service returned it for a linked Baitang 1 student.
- Browser checks cover published-lesson display, opening its PDF, positive
  feedback for correct/incorrect readings, the corrective spoken sequence, and
  confetti for both outcomes with cleanup on the next word, at desktop/mobile
  widths (1280 and 375 pixels). These use synthetic authentication
  and transcripts. The harness supplies the built stylesheet directly because
  local browser resource delivery was unreliable. Real microphone capture and
  human listening on the student's device remain manual checks.

The backend and frontend must both run the updated code. Restart a backend that
does not watch source changes, and refresh the web app. No deployment was made
as part of this local repository change.
