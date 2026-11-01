-- Additive follow-up to 049. Existing messages, reply policies and reactions stay intact.
-- Run in the same Supabase project as the web app, after 049.
BEGIN;

ALTER TABLE public.teacher_messages
  ADD COLUMN IF NOT EXISTS attachment_name text,
  ADD COLUMN IF NOT EXISTS attachment_path text,
  ADD COLUMN IF NOT EXISTS attachment_type text;

-- A teacher can attach only objects in their own storage folder.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
    WHERE conrelid='public.teacher_messages'::regclass AND conname='teacher_message_attachment_owner') THEN
    ALTER TABLE public.teacher_messages ADD CONSTRAINT teacher_message_attachment_owner
      CHECK (attachment_path IS NULL OR (
        attachment_name IS NOT NULL AND length(attachment_name)>0
        AND split_part(attachment_path,'/',1)=teacher_id::text
        AND length(split_part(attachment_path,'/',2))>0
        AND attachment_path !~ '(^|/)\.\.(/|$)'
      ));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id='parent-message-files' AND NOT public) THEN
    RAISE EXCEPTION 'Install 049 first; parent-message-files must exist and be private.';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS teacher_messages_attachment_path_idx
  ON public.teacher_messages(attachment_path) WHERE attachment_path IS NOT NULL;

-- Existing parent UPDATE policies allow marking messages read. They must not
-- let a recipient replace sender/attachment fields to gain access to another file.
CREATE OR REPLACE FUNCTION public.protect_teacher_message_details()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
BEGIN
  IF current_user IN ('authenticated','anon')
    AND (to_jsonb(NEW)-'read') IS DISTINCT FROM (to_jsonb(OLD)-'read') THEN
    RAISE EXCEPTION 'Only message read status may be changed by a recipient.' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS protect_teacher_message_details ON public.teacher_messages;
CREATE TRIGGER protect_teacher_message_details BEFORE UPDATE ON public.teacher_messages
  FOR EACH ROW EXECUTE FUNCTION public.protect_teacher_message_details();

-- Recipient access requires a real addressed message and its sender's folder.
DROP POLICY IF EXISTS parents_read_teacher_message_files ON storage.objects;
CREATE POLICY parents_read_teacher_message_files ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id='parent-message-files' AND EXISTS (
    SELECT 1 FROM public.teacher_messages m
    WHERE m.attachment_path=name AND m.parent_id=auth.uid()
      AND (storage.foldername(name))[1]=m.teacher_id::text
  ));

-- Parent replies must point to the parent's folder. Otherwise a forged reply
-- path could make a different teacher's new attachment readable through 049.
DROP POLICY IF EXISTS teachers_read_message_files_addressed_to_them ON storage.objects;
CREATE POLICY teachers_read_message_files_addressed_to_them ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id='parent-message-files' AND EXISTS (
    SELECT 1 FROM public.parent_teacher_replies r
    WHERE r.attachment_path=name AND r.teacher_id=auth.uid()
      AND (storage.foldername(name))[1]=r.parent_id::text
  ));

-- The existing own-folder upload/read policies also serve teacher senders.
-- Prevent cleanup from removing a file after either kind of message references it.
DROP POLICY IF EXISTS parents_remove_unused_message_files ON storage.objects;
CREATE POLICY parents_remove_unused_message_files ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id='parent-message-files' AND (storage.foldername(name))[1]=auth.uid()::text
    AND NOT EXISTS (SELECT 1 FROM public.parent_teacher_replies r WHERE r.attachment_path=name)
    AND NOT EXISTS (SELECT 1 FROM public.teacher_messages m WHERE m.attachment_path=name));

NOTIFY pgrst,'reload schema';
COMMIT;
