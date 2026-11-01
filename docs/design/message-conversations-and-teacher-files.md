# Parent conversations and teacher attachments

Parent Messages now groups teacher messages by `teacher_id`, including messages about siblings. Each teacher has one inbox entry, one stable draft, the full chronological history, and a combined unread indicator. Searching and announcement filters operate on conversations. When there are multiple children, **Tungkol kay** selects which child's existing message receives the reply. New incoming messages do not change that choice or clear the draft.

HTTP/HTTPS and `www` links are clickable in Parent and Teacher message bubbles. Messages remain plain text; no HTML is rendered. Links open with `noopener noreferrer`.

Teacher Messages supports PDF, PNG/JPEG/WebP, Word (`.doc`, `.docx`) and TXT attachments up to 5 MB, with file-size/type/signature checks, per-recipient attachment drafts, removal, file-only messages, and retry after upload or save failure. Both participants see the file card and request a short-lived signed URL when opening it. The **May File** filter includes files sent by the teacher.

## Supabase installation

Run `migrations/050_teacher_message_attachments.sql` in the same Supabase project used by the application, after the previously installed 049. This is an additive update. It adds optional teacher-message attachment columns and uses the existing private `parent-message-files` bucket.

The update also prevents recipients from replacing message details through the existing read-status UPDATE permission, limits file access to the real message recipient, checks sender folder ownership, and protects referenced files from cleanup. The existing parent-reply file policy now verifies the parent's folder as well.

Then run `testing-audit/review/teacher-message-files-post-install.READONLY.sql`. Every reported value should be `true`. This metadata check does not send a message or change learner data.

Before 050 is installed, text/link messages and history remain usable through a schema compatibility fallback. Teacher attachment selection remains disabled instead of attempting an upload against missing columns. The normal message refresh detects the new columns after installation.

## Verification

- Unit coverage: `tests/messageConversationsAndFiles.test.mjs`, plus existing reply and teacher conversation tests.
- Actual migration 050 was executed and rerun on disposable local PostgreSQL with a minimal Auth/Storage foundation and existing 013/049 policies. Twelve assertions covered sender/recipient access, unrelated/anonymous denial, metadata tampering, forged reply paths, cleanup, and compatibility with parent files. This is not a live Supabase installation or full deployment certificate.
- Build and lint passed. The frontend unit suite passed 161 tests, including ten new conversation/link/file cases.
- Twenty-two new browser scenarios passed at desktop/mobile sizes, plus all 50 existing Teacher Messages browser checks. These cover duplicate conversation prevention, siblings, stable drafts, read status, link sending, file-only sending, attachment receipt/access, upload/save failures and retry, migration compatibility, responsiveness and light/dark accessibility.
- Browser evidence: `.qa/message-fix-review/results.json` and local screenshots. These use synthetic accounts and substituted storage/database responses, with no live messages or uploads.

After installing 050, verify with a test Teacher/Parent pair: send several messages about both children and confirm one conversation; send a link and a PDF; receive them without refreshing; open the attachment as its recipient. An unrelated account must not be able to obtain a signed URL for that file.
