# Student Learn course list

The Learn tab presents all existing modules in their original numbered order, grouped into the five Beginner learning stages. Each course card combines its module number, original title and phonetic preview with the approved Tagalog picture, progress, server-provided status and appropriate action link. Stage headers use distinct soft colors, while the shared cream, purple and illustrated LinawLetra theme remains.

The first server-unlocked module is highlighted as the current step and initially expands its details. Clicking a module title toggles its details; at most one module is expanded at a time. The details show the existing description, content-item count, assessment availability and the reading practice sequence. A locked module can reveal its descriptive metadata but has no lesson-start link. Expanding, collapsing and jumping to the current step are local UI actions and do not send learning-completion claims.

The existing learning-path API, lesson routes, sequential unlocking, progress records, teacher PDFs and published drill flows are preserved. This change modifies only the frontend presentation; it introduces no backend or database changes. Other reading levels and additional modules retain all server-supplied records.

Validation uses the actual React UI with synthetic student data and isolated persistence. It covers module order, current-step selection, unlocked versus locked actions, keyboard-operated expansion, one-open-panel behavior, unchanged API calls during expansion, progress values, real module-ID navigation, teacher materials, responsive layouts and OpenDyslexic preferences. Automated accessibility checks are included; raster-background contrast still requires visual review.
