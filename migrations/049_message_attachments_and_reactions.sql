-- Additive compatibility update for the deployed mobile reply table.
-- Does not replay 040, change existing messages, or replace existing reply policies.
BEGIN;

ALTER TABLE public.parent_teacher_replies
  ADD COLUMN IF NOT EXISTS attachment_name text,
  ADD COLUMN IF NOT EXISTS attachment_path text,
  ADD COLUMN IF NOT EXISTS attachment_type text;

CREATE TABLE IF NOT EXISTS public.message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  teacher_message_id uuid REFERENCES public.teacher_messages(id) ON DELETE CASCADE,
  parent_reply_id uuid REFERENCES public.parent_teacher_replies(id) ON DELETE CASCADE,
  emoji text NOT NULL CHECK (emoji IN ('❤️','👍','😊','🎉','🙏')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT message_reactions_one_target CHECK (num_nonnulls(teacher_message_id,parent_reply_id)=1)
);
CREATE UNIQUE INDEX IF NOT EXISTS message_reactions_teacher_user_idx
  ON public.message_reactions(user_id,teacher_message_id) WHERE teacher_message_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS message_reactions_reply_user_idx
  ON public.message_reactions(user_id,parent_reply_id) WHERE parent_reply_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS message_reactions_teacher_idx ON public.message_reactions(teacher_message_id);
CREATE INDEX IF NOT EXISTS message_reactions_reply_idx ON public.message_reactions(parent_reply_id);
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.message_reactions FROM anon;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.message_reactions TO authenticated;
GRANT ALL ON public.message_reactions TO service_role;

-- Membership is checked against the actual addressed message, never a supplied
-- parent/teacher ID. Existing message RLS also applies to these subqueries.
DROP POLICY IF EXISTS message_participants_read_reactions ON public.message_reactions;
CREATE POLICY message_participants_read_reactions ON public.message_reactions
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.teacher_messages m
      WHERE m.id=teacher_message_id AND auth.uid() IN (m.teacher_id,m.parent_id))
    OR EXISTS (SELECT 1 FROM public.parent_teacher_replies r
      WHERE r.id=parent_reply_id AND auth.uid() IN (r.teacher_id,r.parent_id))
  );
DROP POLICY IF EXISTS message_participants_insert_reactions ON public.message_reactions;
CREATE POLICY message_participants_insert_reactions ON public.message_reactions
  FOR INSERT TO authenticated WITH CHECK (
    user_id=auth.uid() AND (
      EXISTS (SELECT 1 FROM public.teacher_messages m
        WHERE m.id=teacher_message_id AND auth.uid() IN (m.teacher_id,m.parent_id))
      OR EXISTS (SELECT 1 FROM public.parent_teacher_replies r
        WHERE r.id=parent_reply_id AND auth.uid() IN (r.teacher_id,r.parent_id))
    )
  );
DROP POLICY IF EXISTS message_participants_update_own_reactions ON public.message_reactions;
CREATE POLICY message_participants_update_own_reactions ON public.message_reactions
  FOR UPDATE TO authenticated USING (user_id=auth.uid()) WITH CHECK (
    user_id=auth.uid() AND (
      EXISTS (SELECT 1 FROM public.teacher_messages m
        WHERE m.id=teacher_message_id AND auth.uid() IN (m.teacher_id,m.parent_id))
      OR EXISTS (SELECT 1 FROM public.parent_teacher_replies r
        WHERE r.id=parent_reply_id AND auth.uid() IN (r.teacher_id,r.parent_id))
    )
  );
DROP POLICY IF EXISTS message_participants_delete_own_reactions ON public.message_reactions;
CREATE POLICY message_participants_delete_own_reactions ON public.message_reactions
  FOR DELETE TO authenticated USING (user_id=auth.uid());

-- Invoker rights: normal authenticated RLS governs all operations. Setting
-- null removes only the caller's reaction; repeating an emoji is idempotent.
CREATE OR REPLACE FUNCTION public.set_message_reaction(p_kind text,p_message_id uuid,p_emoji text)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
  IF p_kind NOT IN ('teacher','reply') OR p_kind IS NULL THEN RAISE EXCEPTION 'Invalid reaction target'; END IF;
  IF p_emoji IS NOT NULL AND p_emoji NOT IN ('❤️','👍','😊','🎉','🙏') THEN RAISE EXCEPTION 'Invalid reaction'; END IF;
  IF p_emoji IS NULL THEN
    DELETE FROM public.message_reactions WHERE user_id=auth.uid()
      AND ((p_kind='teacher' AND teacher_message_id=p_message_id)
        OR (p_kind='reply' AND parent_reply_id=p_message_id));
  ELSIF p_kind='teacher' THEN
    INSERT INTO public.message_reactions(user_id,teacher_message_id,emoji)
      VALUES(auth.uid(),p_message_id,p_emoji)
      ON CONFLICT(user_id,teacher_message_id) WHERE teacher_message_id IS NOT NULL
      DO UPDATE SET emoji=EXCLUDED.emoji;
  ELSE
    INSERT INTO public.message_reactions(user_id,parent_reply_id,emoji)
      VALUES(auth.uid(),p_message_id,p_emoji)
      ON CONFLICT(user_id,parent_reply_id) WHERE parent_reply_id IS NOT NULL
      DO UPDATE SET emoji=EXCLUDED.emoji;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.set_message_reaction(text,uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_message_reaction(text,uuid,text) TO authenticated;

INSERT INTO storage.buckets(id,name,public) VALUES('parent-message-files','parent-message-files',false)
  ON CONFLICT(id) DO NOTHING;
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM storage.buckets WHERE id='parent-message-files' AND public) THEN
    RAISE EXCEPTION 'parent-message-files must be private; review existing bucket consumers before installing';
  END IF;
END $$;
DROP POLICY IF EXISTS parents_upload_own_message_files ON storage.objects;
CREATE POLICY parents_upload_own_message_files ON storage.objects FOR INSERT TO authenticated
  WITH CHECK(bucket_id='parent-message-files' AND (storage.foldername(name))[1]=auth.uid()::text);
DROP POLICY IF EXISTS parents_read_own_message_files ON storage.objects;
CREATE POLICY parents_read_own_message_files ON storage.objects FOR SELECT TO authenticated
  USING(bucket_id='parent-message-files' AND (storage.foldername(name))[1]=auth.uid()::text);
DROP POLICY IF EXISTS teachers_read_message_files_addressed_to_them ON storage.objects;
CREATE POLICY teachers_read_message_files_addressed_to_them ON storage.objects FOR SELECT TO authenticated
  USING(bucket_id='parent-message-files' AND EXISTS(SELECT 1 FROM public.parent_teacher_replies r WHERE r.attachment_path=name AND r.teacher_id=auth.uid()));
DROP POLICY IF EXISTS parents_remove_unused_message_files ON storage.objects;
CREATE POLICY parents_remove_unused_message_files ON storage.objects FOR DELETE TO authenticated
  USING(bucket_id='parent-message-files' AND (storage.foldername(name))[1]=auth.uid()::text
    AND NOT EXISTS(SELECT 1 FROM public.parent_teacher_replies r WHERE r.attachment_path=name));

NOTIFY pgrst,'reload schema';
COMMIT;
