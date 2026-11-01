# Messaging, dark mode and saved-profile login follow-up

Date: 2026-10-30 (Asia/Manila).

## Behavior

- Parent and Teacher chats subscribe to participant-scoped message/reply changes and authorized reaction changes. Reconnecting invalidates active chat queries. A two-second foreground polling fallback keeps messages current on deployments without these tables in the Realtime publication; no SQL installation is required for automatic refresh.
- Parent chat includes teacher follow-up records and their replies for the same teacher/child pair, in chronological order. An open conversation receives the new messages without reselecting a thread. Existing history stays visible during refresh and replies from a different teacher/child are not carried into it.
- An open chat follows the newest messages when already at the bottom. Refreshes preserve the current composer draft. Existing attachments, reactions, validation and compatibility fallbacks remain available.
- The Parent's nine routes share a dim teal/blue night palette. Cards, gradients, navigation, calendar cells/events, chart tracks, status chips, menus and dialogs use dark surfaces. Illustrations are dimmed separately from readable text. Light and high-contrast modes remain separate.
- Shared dark colors also apply to authentication screens and Teacher surfaces. Teacher chat, mobile controls, sidebar selection and timestamps use readable night colors.
- Parent and Teacher logout now use the saved-profile logout already used by Student. It clears the active local session/cache while retaining a re-login ticket. Parent/Teacher password login also saves a profile. The Login screen shows the profile picker first when a saved profile is available, with the password form reachable through “Gumamit ng ibang account.” Admin logout remains unchanged.
- Existing profile limits and expiry rules remain: one recent Student profile, five total profiles, seven days of Student disuse and thirty days for adult profiles. Passwords are not stored by the picker. Successful one-tap login replaces the rotated refresh ticket.

## Verification

All browser verification used the actual React/router code with synthetic API, database, storage, authentication and Realtime boundaries. No real messages were sent and the owner's test-account passwords were not changed.

- 28 desktop/mobile browser checks passed: all nine Parent pages in dark mode (including no bright large surfaces, layout and Axe WCAG checks), incoming Parent/Teacher messages through subscription callbacks and polling fallback, draft preservation, teacher/child separation, and two consecutive logout/one-tap cycles for Parent, Teacher and Student.
- Existing message regression checks cover layout, filters/search, sending, reactions, attachments, permissions/network failures and legacy schema behavior. One compatibility check's selector was updated to target a specific message because the chat now shows full conversation history; its focused rerun passed.
- Additional focused Teacher chat checks cover dark-mode accessibility, automatic replies, desktop/mobile layouts and saved-profile login.
- All four focused Teacher checks passed. Eight dark-dialog cases passed across desktop/mobile: password change, enrollment, MFA and notification details. The enrollment text corrections were verified in a focused rerun; the other six dialog cases passed in the initial dialog run.
- UI/unit tests: 114 passed, including conversation-wide reply scoping, narrow legacy fallbacks, participant subscription filters/cleanup and saved-ticket logout/fallback behavior.
- TypeScript/Vite production build and lint passed. Existing unrelated lint warnings remain.

Local browser artifacts: `.qa/parent-live-review/`, `.qa/teacher-live-review/`, `.qa/parent-dark-dialogs-review/`, `.qa/parent-enrollment-dark-review/`, `.qa/parent-messages-review/`, `.qa/parent-messages-missing-review/`. Tests simulate delivery and token rotation; they do not certify live Supabase WebSocket publication or external message delivery.
