# Parent Messages reference implementation

The Messages page follows the supplied composition: a family reading banner with teal/pink live heading and yellow encouragement note; a rounded left inbox with real search, category counts and mint selected cards; a right conversation with teacher identity, date divider, incoming blue bubbles, outgoing mint bubbles, parent initials, a decorative star/books corner and a bottom composer.

The illustrated sidebar is the same shared Home sidebar, including its mobile navigation and collapse/profile controls.

Artwork rendering follow-up: the family banner, chat mascot and shared sidebar illustration now use imported image elements with explicit sizing, stacking and decoding. The hero image is prioritized for loading. This makes each illustration's loaded/visible state directly verifiable rather than depending on a CSS background alone. Existing message data, reactions and reply behavior are unchanged by this rendering fix. A single-conversation layout is also reviewed to match the reported screenshot.

## Data and behavior

Teacher names, child names, messages, timestamps, read flags, replies and attachments continue to come from the existing Supabase queries. Existing polling, text-based announcement classification, 500-character limit, 5 MB attachment limit, upload cleanup, signed attachment links and captured-thread submission fields remain in place. Existing records are not rewritten. The reference's sample messages, unread counts, online presence and reactions are not invented as application data.

Conversation search and a six-choice emoji picker are functional. Filters support arrow/Home/End keys and labelled tab panels. Unsupported voice/video controls are hidden as requested. The inbox groups all messages and siblings by teacher, with one stable draft and unread indicator per teacher. A child selector chooses the reply topic without splitting the conversation. Teacher follow-ups do not clear the current draft. HTTP/HTTPS links are clickable, and teacher attachments appear after migration 050. See [conversation and file update](message-conversations-and-teacher-files.md). An inbox error offers a retry. No real messages were sent during verification.

Attachments first request an authorized private link, then expose a regular new-tab link that works with popup blockers. The UI resets the link before its 60-second expiry so it can be prepared again.

Comic Sans remains the default; explicit OpenDyslexic, text scaling, dark/high-contrast themes, reduced motion and narrow layouts remain supported. Mobile uses the shared Home menu; the conversation has its own bounded message scroller to keep the composer available.

## Artwork

Mode: built-in imagegen skill/tool. Assets are decorative, with all functional labels and data rendered as HTML.

- `src/assets/parent/messages-family-reading.png` — new family reading banner.
- `src/assets/parent/messages-star-books.png` — new transparent star/books corner.
- Shared Home sidebar artwork is reused unchanged.

### Final banner prompt

Use case: illustration-story. Asset type: panoramic background artwork for the LinawLetra Parent Messages banner, not a UI screenshot. Polished joyful dimensional 3D children's storybook illustration matching a colorful Filipino family reading education app. A loving young Filipino mother with flowing chestnut brown hair and teal green cardigan sitting beside her happy little son with swept brown hair, large warm brown eyes and white school shirt, looking together at an open book. The mother and child's expressive faces occupy the center-right at 65%-77% horizontally. Sunny indoor reading nook on the right with a window, warm wooden bookshelves and lush green plants; pale blue sky, soft fluffy white clouds and garden greenery on the left. Left 43% is uncluttered pale sky reserved for large live HTML text; rightmost 15% quiet warm leafy reading-room area reserved for an HTML yellow sticky note. Tiny coral pink hearts above the family. Bright cyan, emerald, teal and warm golden sunlight. Wide 4:1 panoramic composition with faces centered vertically for a shallow website crop. No text, letters, logos, numbers, UI elements, borders, watermark.

### Final corner prompt

Use case: illustration-story. Asset type: transparent decorative cutout for the bottom-right corner of a children's learning app chat panel. A cheerful small golden yellow five-point star mascot with glossy dimensional shading, tiny dark brown eyes, smiling open mouth and coral pink cheeks sitting on a short stack of three lavender, mint and cream storybooks. Lush teal and emerald leaves, two white daisies, a few tiny golden sparkles and a pale cyan cloud shape frame the bottom and right edge. Polished bright 3D storybook educational illustration, friendly soft rounded forms, similar to a Filipino family reading application. Composition: only the bottom-right corner cluster, all other areas transparent. Full subject in frame, no large top padding, books horizontal under star. No text, letters, numbers, logos or watermark. Genuinely transparent background.

## Verification

Actual React UI/router with isolated synthetic API/Supabase fixtures, no live messages or learner writes. Screenshots and check results are in `.qa/parent-messages-review/`. Automated checks cover desktop/mobile layouts, empty/error/long-message states, filter keyboard behavior, inbox and conversation search, thread selection/read state, compose focus, emoji length limits, attachment validation/removal, reply identities, failed-insert storage cleanup, shared-sidebar navigation, themes and WCAG checks. These checks do not certify live backend delivery or literal pixel identity with the supplied raster reference.

Completed: production build, 104 UI tests and 39 isolated Messages browser checks passed. Additional cross-tab checks verify independent drafts/files, attachment opening and link expiry. Desktop/mobile Axe WCAG checks reported no violations. Lint had no errors and eight existing warnings in unrelated files.
