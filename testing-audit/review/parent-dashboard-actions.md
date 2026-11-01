# Parent Dashboard action audit

Reviewed on 2026-10-30. Scope: all Parent routes, shared navigation, profile menu, and supported actions. The user explicitly chose to hide controls whose services are not connected.

## Fixes

- Home, Progress, profile and empty-Calendar enrollment shortcuts open the actual enrollment wizard using `?enroll=1`. The parameter is consumed after opening. The wizard traps keyboard focus, supports Escape, blocks closure while submitting and refreshes shared child-list caches on success.
- Message drafts and attachments belong to their selected thread. Successful submission clears only that thread. Captured parent, child, teacher and message IDs continue to be used for persistence. Failed submissions preserve the draft/file and clean up failed uploads.
- Message attachment buttons prepare an authorized signed link and then expose a normal new-tab anchor, avoiding asynchronous popup blocking. Links reset before expiry and failures remain retryable.
- Voice/video call buttons and unsupported email/SMS preference switches are hidden. Stored email/SMS preferences survive edits unchanged.
- Saved in-app preferences now filter matching Parent notification categories and the shared unread badge. Missing settings default to showing notices. Account/security and unknown categories remain visible. Student/teacher notification behavior remains unchanged.
- Materials access responses are tied to the requested child and latest request. Child changes clear pending links/errors and invalidate old responses. Materials uses the same illustrated sidebar as Home.
- The primary sidebar retains five destinations. Account details, notifications and application settings remain in the profile menu.

## Verification

The browser checks run the actual React UI/router with isolated synthetic Supabase, API, storage and authentication boundaries. They do not send real messages, enroll real children, reset real passwords or change real MFA factors.

| Browser suite | Passed checks | Main actions covered |
| --- | ---: | --- |
| Home | 23 | Child selection, current module, activity links, retries and responsive layout |
| Progress | 27 | Child/month selection, four tabs, modules, sessions, recommendations and navigation |
| Calendar | 27 | Month/week/day navigation, date selection, event validation/save/status/details and retries |
| Children | 31 | Child selection, module pagination/details, enrollment, credentials and reading-support updates |
| Messages | 39 | Search/filter, replies, upload validation/cleanup, persisted reactions and error recovery |
| Account profile | 27 | Profile edits, photo validation/upload, password validation/reauthentication and shortcuts |
| App Settings | 35 | In-app preferences, themes, language, MFA setup/verification/cancellation and JSON export |
| Notifications | 29 | Categories/search/sort, read/read-all, details and failure recovery |
| Cross-tab actions | 12 | Enrollment shortcuts/cache refresh, thread drafts/files, signed attachments/expiry, notification badges, materials filters/stale-response handling, all primary routes and sign-out |
| **Total** | **250** | |

Each main tab includes desktop/mobile accessibility checks with no Axe WCAG violations. Layout checks include narrow widths, long names, empty/error states, alternate fonts and themes. Cross-tab actions run at 1536px and 375px.

Additional checks:

- Production TypeScript/Vite build passed.
- UI/unit tests: 104 passed, zero failed.
- Server tests: 520 passed, zero failed, two skipped.
- Lint: no errors; eight pre-existing warnings outside the changed UI.
- `git diff --check`: passed.
- Live read-only metadata/zero-row checks confirmed required parent settings fields, scheduled activities, profile avatar field, reply attachment columns, reaction table and reaction RPC are present. No live user records were mutated by those checks.

Local browser evidence is under `.qa/parent-*-review/`; these ignored folders contain synthetic fixtures/results and screenshots. Local runner entry points are `.qa/parent-*-preview.mjs`. Public project checks are `npm run build`, `npm run lint`, `npm run test:ui` and `npm run test:server`.

These results verify UI behavior and request contracts. Real-account message/file delivery and an actual authenticator-device enrollment were not performed; the isolated checks do not certify external service delivery or replace a live acceptance session.
