-- READ ONLY: run after migrations/049_message_attachments_and_reactions.sql.
-- Metadata only; does not read messages, send replies, or create reactions.
SELECT jsonb_build_object(
  'read_only',true,
  'attachment_columns',(SELECT count(*)=3 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='parent_teacher_replies'
      AND column_name IN('attachment_name','attachment_path','attachment_type')),
  'reactions_table',to_regclass('public.message_reactions') IS NOT NULL,
  'reactions_rls',(SELECT relrowsecurity FROM pg_class WHERE oid=to_regclass('public.message_reactions')),
  'reaction_rpc',to_regprocedure('public.set_message_reaction(text,uuid,text)') IS NOT NULL,
  'rpc_uses_caller_permissions',(SELECT NOT prosecdef FROM pg_proc
    WHERE oid=to_regprocedure('public.set_message_reaction(text,uuid,text)')),
  'authenticated_can_react',CASE WHEN to_regprocedure('public.set_message_reaction(text,uuid,text)') IS NOT NULL
    THEN has_function_privilege('authenticated',to_regprocedure('public.set_message_reaction(text,uuid,text)'),'EXECUTE') ELSE false END,
  'anonymous_can_react',CASE WHEN to_regprocedure('public.set_message_reaction(text,uuid,text)') IS NOT NULL
    THEN has_function_privilege('anon',to_regprocedure('public.set_message_reaction(text,uuid,text)'),'EXECUTE') ELSE false END,
  'private_attachment_bucket',EXISTS(SELECT 1 FROM storage.buckets WHERE id='parent-message-files' AND NOT public)
) AS messages_post_install;
