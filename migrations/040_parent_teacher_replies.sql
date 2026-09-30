-- Enables a parent to reply to a teacher message without granting access to
-- unrelated teachers, children, or parent accounts.

CREATE TABLE IF NOT EXISTS public.parent_teacher_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_message_id UUID NOT NULL REFERENCES public.teacher_messages(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  message TEXT NOT NULL CHECK (char_length(trim(message)) BETWEEN 1 AND 500),
  attachment_name TEXT,
  attachment_path TEXT,
  attachment_type TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS parent_teacher_replies_parent_message_idx
  ON public.parent_teacher_replies (parent_id, teacher_message_id, created_at);
CREATE INDEX IF NOT EXISTS parent_teacher_replies_teacher_idx
  ON public.parent_teacher_replies (teacher_id, read, created_at DESC);

ALTER TABLE public.parent_teacher_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "parents_read_own_teacher_replies"
ON public.parent_teacher_replies FOR SELECT TO authenticated
USING (parent_id = auth.uid());

CREATE POLICY "parents_send_reply_to_own_teacher_message"
ON public.parent_teacher_replies FOR INSERT TO authenticated
WITH CHECK (
  parent_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.children c
    WHERE c.id = parent_teacher_replies.child_id AND c.parent_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1
    FROM public.teacher_messages tm
    WHERE tm.id = parent_teacher_replies.teacher_message_id
      AND tm.parent_id = auth.uid()
      AND tm.teacher_id = parent_teacher_replies.teacher_id
      AND tm.child_id = parent_teacher_replies.child_id
  )
);

CREATE POLICY "teachers_read_replies_addressed_to_them"
ON public.parent_teacher_replies FOR SELECT TO authenticated
USING (teacher_id = auth.uid());

CREATE POLICY "teachers_mark_own_replies_read"
ON public.parent_teacher_replies FOR UPDATE TO authenticated
USING (teacher_id = auth.uid())
WITH CHECK (teacher_id = auth.uid());

CREATE OR REPLACE FUNCTION public.notify_parent_teacher_reply()
RETURNS TRIGGER AS $$
DECLARE
  v_child_name TEXT;
BEGIN
  SELECT name INTO v_child_name FROM public.children WHERE id = NEW.child_id;
  INSERT INTO public.notifications (user_id, student_id, parent_id, title, body, message, type, is_read, read)
  VALUES (
    NEW.teacher_id,
    NEW.child_id::text,
    NEW.parent_id::text,
    'Bagong Reply mula sa Magulang',
    'Tungkol kay ' || COALESCE(v_child_name, 'mag-aaral') || ': ' || NEW.message,
    'Tungkol kay ' || COALESCE(v_child_name, 'mag-aaral') || ': ' || NEW.message,
    'parent_teacher_reply', false, false
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS notify_parent_teacher_reply_trigger ON public.parent_teacher_replies;
CREATE TRIGGER notify_parent_teacher_reply_trigger
AFTER INSERT ON public.parent_teacher_replies
FOR EACH ROW EXECUTE FUNCTION public.notify_parent_teacher_reply();

INSERT INTO storage.buckets (id, name, public)
VALUES ('parent-message-files', 'parent-message-files', false)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

CREATE POLICY "parents_upload_own_message_files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'parent-message-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "parents_read_own_message_files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'parent-message-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "teachers_read_message_files_addressed_to_them"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'parent-message-files'
  AND EXISTS (
    SELECT 1 FROM public.parent_teacher_replies reply
    WHERE reply.attachment_path = name AND reply.teacher_id = auth.uid()
  )
);

NOTIFY pgrst, 'reload schema';
