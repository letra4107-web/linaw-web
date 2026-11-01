-- Read-only: run after 050 in the same Supabase project as the web app.
-- Reads metadata only; no messages, uploads, reactions, or learner records change.
SELECT jsonb_build_object(
  'attachment_columns_ready', (SELECT count(*)=3 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='teacher_messages'
      AND column_name IN ('attachment_name','attachment_path','attachment_type')),
  'bucket_private', EXISTS (SELECT 1 FROM storage.buckets WHERE id='parent-message-files' AND NOT public),
  'sender_folder_constraint', EXISTS (SELECT 1 FROM pg_constraint
    WHERE conrelid=to_regclass('public.teacher_messages') AND conname='teacher_message_attachment_owner'),
  'message_details_guard', EXISTS (SELECT 1 FROM pg_trigger
    WHERE tgrelid=to_regclass('public.teacher_messages') AND tgname='protect_teacher_message_details'
      AND NOT tgisinternal AND tgenabled='O'),
  'recipient_file_policy', EXISTS (SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects' AND policyname='parents_read_teacher_message_files')
) AS teacher_message_files_post_install;
