# Reply compatibility and saved message reactions

## Confirmed live cause

A read-only Supabase REST schema inspection found the mobile version of `parent_teacher_replies`: core text/read/timestamp fields are present, while `attachment_name`, `attachment_path` and `attachment_type` are absent. The web previously requested optional columns on every reply read and inserted them even on text-only replies. The shared project also does not yet expose `message_reactions`.

The web now falls back to core reply fields only for confirmed missing attachment-column errors (`42703`/`PGRST204`). Text-only inserts omit all attachment keys. Missing tables, network errors and access failures remain real errors with retry controls. Attachment upload is disabled until the schema supports it; existing attachment data is retained on upgraded schemas.

## Install in the same Supabase project

1. Open `migrations/049_message_attachments_and_reactions.sql` and run the entire transaction in Supabase SQL Editor. Do not replay historical migration 040 over the deployed mobile table.
2. Run `testing-audit/review/messages-post-install.READONLY.sql`. Expect attachment columns/table/RLS/RPC/authenticated permission/private bucket checks to be true; `anonymous_can_react` must be false.
3. Reload the web app. Parent and Teacher messages show the saved reaction controls. Click a reaction again to remove your own reaction; choose another emoji to replace it.

The migration adds the optional attachment columns, private file storage policies and a reaction table. Existing messages, replies and reply policies are preserved. The reaction function uses caller permissions, one target per row and one reaction per caller/target. Only the addressed parent/teacher can read or add reactions. One user cannot modify another user's reaction. The UI shows actual saved counts, errors on failed persistence, and refreshes the counterpart's reactions while the conversation is open.

This task prepared and locally tested the SQL. It did not execute a shared-project schema change or send a live message.

## Verification

- 97 UI/unit tests, including deployed-schema fallback, rich attachments and error propagation.
- Seven disposable local PostgreSQL checks: additive/rerunnable installation, participant access, replacement/idempotency, cross-family isolation/forgery, invalid targets/emoji, removal/anonymous denial, and private attachment cleanup.
- 39 isolated Parent browser checks, including real React reply sending against the legacy contract and persisted reaction add/replace/remove/failure behavior on desktop/mobile.
- Teacher-side browser checks cover reading counterpart reactions and reacting to a parent reply.
- Production build and lint; no live learner or message mutations.

Local evidence is under `.qa/parent-messages-review/`, `.qa/teacher-message-review/` and `.qa/message-migration-results.json`.
