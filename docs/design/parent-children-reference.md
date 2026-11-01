# Parent Children reference

The Children tab follows the supplied family reference: illustrated garden banner, pastel child roster and encouragement card on the left; selected-child summary, module table and three supporting cards on the right. It uses the approved Home sidebar, selected through the persistent parent route class so navigation stays stable during loading.

## Existing data and controls

- `src/pages/parent/MyChildren.tsx` retains the child, reading-profile, learning-path, practice-session, credential-security and reading-support API queries. `children-overview-reference.css` supplies the reference composition while the original stylesheet retains account forms and the enrollment dialog.
- Only actual children from the existing API are listed. Child selection and reload retain the child URL; changing children clears expanded module details, resets pagination and closes the previous child's panels.
- Module numbers, titles, order, completion counts, lock states and level come from the existing learning path. All modules remain reachable through page size, previous/next controls and the page menu; default page size is five. Expanded details remain available.
- Phonetic previews use actual module titles. Only the Beginner introduction uses “Aa”; other curricula use a book symbol instead of an invented syllable.
- Summary activities, score, XP, streak and update date retain their existing data sources. The current module opens its actual parent report, and activity links carry the actual child, session and month.
- The gear button directly opens reading support. The small pencil opens the existing account/reading-support controls, including the confirmation-protected password reset. It does not offer an unsupported name-edit API.
- Reading-support updates retain captured-child mutation behavior. Enrollment retains its existing three steps, validation, duplicate-submission guard, supported grades and temporary-credential dismissal. No backend, database, reward, account-permission or unlocking changes are introduced.
- Browser QA uses synthetic accounts and mocked writes only; it does not enroll or modify live learners.

## Artwork and typography

`src/assets/parent/children-family-garden.png` was generated with the built-in image generation tool and saved in the project. Banner text and all learner data remain HTML. The existing Home family illustration, decorative avatar atlas and current-lesson artwork are reused. Default avatar illustrations follow a decorative sequence; they are not learner photos or stored gender information.

Comic Sans remains the site default. Explicit OpenDyslexic, larger text, themes, keyboard focus, reduced motion and responsive layouts remain supported. The module table scrolls within its own region on small screens.

### Final banner prompt

Use case: illustration-story. Asset type: panoramic welcome background for the LinawLetra parent's Children page. A tender young Filipino mother with flowing long chestnut-brown hair and teal green cardigan, smiling down while reading an open cream storybook with her happy little son with swept dark brown hair, blue backpack straps, white school shirt and very large warm brown eyes. They sit close together in a sunny magical family garden outside a cozy reading room. Polished joyful dimensional 3D storybook learning-app illustration. Center-right character group around horizontal 62%-74%, faces and top of open book near middle height so it crops well to a shallow 6:1 website banner. Left 40% uncluttered pale blue sky and fluffy cream clouds for live dark navy HTML title. Rightmost 15% leafy sunny garden, a reading-room window, colorful stacked books, white daisies and a clear light area for an HTML cream note. Vibrant cyan, teal, emerald green, sunny yellow and coral pink accents, golden heart-shaped sun motif and tiny pink hearts. Very wide 3:1 composition. Lush green leaves frame bottom corners. Friendly expressive faces and crisp dimensional shading. No text, letters, numbers, logos, UI, or watermark; only background artwork, not a screenshot.

## Verification scope

The actual React UI is reviewed with isolated API/Supabase adapters, synthetic records and blocked external services. Checks cover 320–1536px layouts, actual summary values, 17-module pagination, locked details, different child levels and URL reloads, captured-child reading-support updates, unchanged parent font, enrollment validation and mocked creation, temporary-credential dismissal, password-reset cancellation, module/activity destinations, shared-sidebar consistency, larger OpenDyslexic, themes, error/retry/empty states and automated WCAG checks. This does not certify live database writes, production deployment or literal pixel identity with the supplied raster reference.

Completed: production build, 93 existing UI tests and 31 isolated Children browser checks passed. Desktop/mobile WCAG checks reported no violations. Lint reported no errors and eight existing warnings in unrelated files. Local screenshots and detailed results are under `.qa/parent-children-review/`.
