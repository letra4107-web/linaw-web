# Student assessment flashcards

The supplied screenshot guides the `/student/learn/assessment/:assessmentId` composition: cream canvas, existing purple sidebar with Aralin selected, illustrated school-garden banner, live module title and preview, purple question-position bar, white rounded question panel, large lavender speaker with two rings, pastel answer flashcards, and previous/next navigation. Artwork is a recreation; pixel identity with the supplied illustration is not claimed.

## Actual module data and assessment behavior

`Assessment.tsx` continues to start and submit through the existing authenticated assessment API. It reads the actual title and instructional previews from `/student/learn/module/:moduleId`, using the module ID returned by assessment start. The first-letter module, fifteen syllable-family modules, and Pagbuo ng Salita share this presentation. Question order, target strings, answer choices and question count come from the response. Four options produce four cards; authored five-option questions produce five cards. The reference's vowels and fixed question count are not embedded as a replacement curriculum.

Each screen displays one question. Selecting a choice records its exact text with `recordVerifiedAnswer`, the owned assessment attempt ID, and its assessment-item ID. Only a confirmed receipt enables Next. Previous restores the recorded selection for review. Confirmed answers remain locked, and correctness stays with the server's final result. The progress bar indicates question position, while its accessible text also reports how many answers are confirmed. Final submission sends only assessment-item and content-attempt IDs.

Ambiguous saves retain the original transcript and event for retry. An ambiguous final submission retains the same attempt and response IDs. Route changes cancel playback and microphone recognition; late answer/start responses cannot replace another assessment's state. Successful submission invalidates existing module/path/progress queries so the next screen can fetch official progress. Existing backend scoring, module gates, reward policy, API routes and database structures are preserved.

Multiple-choice audio speaks only the stored target through the existing Filipino TTS endpoint; options stay text-only. Phonetic prompts use rate 1. Explicit isolated vowels retain the existing natural-rate rule. Speaking questions, words with meanings after answering, phrases, paragraphs, microphone errors, loading, empty assessments, failed starts and final pass/fail feedback retain their supported paths. Missing title metadata offers a separate retry while delivered questions remain available.

Default assessment typography uses the locally bundled Baloo 2 font under its existing SIL OFL license. Explicit OpenDyslexic settings and font scaling remain effective. Styling is scoped to the assessment. Desktop cards use one row; phone layouts use two columns with a full-width last card for an odd option count. High contrast and reduced motion are supported.

The assessment uses the document's single vertical scroll. Its main container clips horizontal decoration with `overflow-x: clip` and keeps vertical overflow visible, avoiding the extra scroll area created by `overflow-x: hidden`. Corner artwork stays inside the page's bottom padding, including tablet and phone layouts. Longer content and larger type expand the page naturally. Six focused browser checks cover desktop, phone, large OpenDyslexic and story content at 320–1536px widths: the main container has no inner vertical scroll, the page responds to the wheel, and navigation stays reachable. Measurements and screenshots are in ignored `.qa/assessment-scroll-review`.

## Selected assets

Generated with the built-in `image_gen` tool using the imagegen skill, inspected, and copied into the repository:

- `src/assets/students/assessment-reference/assessment-garden-v2.png` — final garden header with complete mascot faces in the shallow crop. The generated card is blank; its decorative letters are rendered from the module's instructional preview. Other types show a book icon. This overlay is hidden on narrow screens.
- `src/assets/students/assessment-reference/garden-corners.png` — transparent bottom-corner foliage and flowers.

The first banner candidate is retained only in ignored `.qa/assessment-artwork-drafts`. Generated originals remain under the Codex generated-images directory. Existing module garden artwork is the header fallback; the existing owl cutout is reused for results. No generated image contains an assessment answer key.

## Validation

The isolated browser suite records **48 passed / 0 failed** checks in `.qa/assessment-design-review/results.json`. It uses the real React UI with synthetic authenticated fixtures, simulated TTS/microphone boundaries and a receipt model, without contacting Supabase or changing learner data. Coverage includes all seventeen module payloads, four/five choices, 320–1536px layouts, large OpenDyslexic, normal/high-contrast accessibility scans, source IDs, previous review, save/final-submit retry, an incorrect assessment, all twenty word questions, spoken/long-form content, cancellation, empty/failed starts, audio failure, title retry and a saved answer arriving after a different module opens.

Five focused audio tests cover the vowel rate, request/playback failures, stopping active playback and ignoring late audio after navigation. Existing module-presentation, learning-stage and font/logout regressions also pass: **20 unit tests total** in the focused run. Browser media doubles verify request/lifecycle behavior, not real-world pronunciation accuracy or a live assessment journey. Initial theme scans caught the missing dark canvas and then sampled before the theme repaint; the scoped dark canvas and a settled-render check pass the final scan.

## Final prompts

### Header generation

Create one project-bound illustrated website assessment HEADER BACKGROUND, using the existing LinawLetra garden banner for the boy and purple owl identities and rendering style. Panoramic 3:1 illustration suitable for a shallow 5.6:1 header crop. Polished vibrant soft 3D Filipino children's storybook game style, cyan sky, mint/lime foliage, warm cream and lavender accents. Left 45% pale blue sky with soft clouds and uncluttered space for a live title. Boy at x64%, fluffy dark brown hair, large brown eyes, cream school hoodie with navy trim, smiling and holding a blank white rounded flashcard. Purple-and-white owl at x76%. Small yellow school with terracotta roof at x89%, corner trees, tiny flowers and butterfly. Keep complete hair, eyes, mouths, owl head and blank card in the central safe vertical band. Absolutely no text, letters, vowels, digits, UI, badges, signboard or watermark.

### Selected header refinement

Edit only character framing in the existing generated banner. Preserve style, identities, colors, trees, sky, school and clear left space. The website keeps y23% through y77% when cropping. Fit every face and all hair inside y28% through y73%. Shrink boy, card and owl together by 25%. Boy at x64%, hair top y28%, eyes y43%, mouth y55%, torso behind flowers y76%. Move owl up so its entire head/beak fit y43% through y72%, x77%. Blank white rounded flashcard centered at x50%, y59%, about 9% canvas width and 19% height, tilted counterclockwise 12 degrees and held naturally. Keep school at x90%, left 43% empty sky. No text, letters, digits, logos or UI. Maintain 3:1 canvas and the safe crop band.

### Transparent corner foliage

Transparent PNG wide 3:1 footer border, two small separate clusters of lime, mint and teal rounded storybook 3D leaves with cream/pink daisy flowers. Match a joyful Filipino educational garden game. Clusters only at far bottom left and far bottom right, emerging from the bottom edge; no ground strip. Entire middle 65% fully transparent alpha zero. Each cluster occupies about 18% width and lower half of canvas. Layered leaves, one pink-white five-petal flower with golden center per cluster, a few small white daisies, soft dimensional modeling and clean edges. No characters, books, UI, text, backdrop, glow or colored matte. All top and center pixels fully transparent.
