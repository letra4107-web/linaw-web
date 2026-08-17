-- teacher_messages already exists (from mobile's own migration/migrations/002_new_tables.sql:
-- id, teacher_id, parent_id, child_id, message, read, created_at) but was completely dormant
-- in production (0 rows) and, on live probe, even a teacher's own INSERT was rejected by RLS
-- (42501) -- the file's documented policies evidently never actually got applied. There was
-- also no teacher SELECT policy anywhere, meaning a teacher could never read back messages
-- they'd sent even if INSERT worked. Asserting working RLS here so the new web messaging UI
-- (teacher compose/sent list, parent inbox) can function.
--
-- Teacher INSERT is additionally scoped to their own roster (teacher_student_links) so a
-- teacher can't message an arbitrary parent outside their assigned students, matching the
-- roster-scoping convention already used elsewhere in this schema (teacher_student_links,
-- pdf_assignments, etc).

ALTER TABLE public.teacher_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "parents_read_messages" ON public.teacher_messages;
CREATE POLICY "parents_read_messages"
ON public.teacher_messages FOR SELECT TO authenticated
USING (parent_id = auth.uid());

DROP POLICY IF EXISTS "parents_update_messages" ON public.teacher_messages;
CREATE POLICY "parents_update_messages"
ON public.teacher_messages FOR UPDATE TO authenticated
USING (parent_id = auth.uid())
WITH CHECK (parent_id = auth.uid());

DROP POLICY IF EXISTS "teachers_read_own_sent_messages" ON public.teacher_messages;
CREATE POLICY "teachers_read_own_sent_messages"
ON public.teacher_messages FOR SELECT TO authenticated
USING (teacher_id = auth.uid());

DROP POLICY IF EXISTS "teachers_insert_messages" ON public.teacher_messages;
CREATE POLICY "teachers_insert_messages"
ON public.teacher_messages FOR INSERT TO authenticated
WITH CHECK (
  teacher_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.teacher_student_links tsl
    WHERE tsl.teacher_id = auth.uid() AND tsl.student_id = teacher_messages.child_id
  )
  AND EXISTS (
    SELECT 1 FROM public.children c
    WHERE c.id = teacher_messages.child_id AND c.parent_id = teacher_messages.parent_id
  )
);

-- Parents need the teacher's display name for the inbox UI, but have no existing RLS access
-- to any row in `users` besides their own. Scope this narrowly: only the teacher(s) actually
-- linked to one of the parent's own children, via the same teacher_student_links join used
-- elsewhere.
DROP POLICY IF EXISTS "Parents read linked teacher name" ON public.users;
CREATE POLICY "Parents read linked teacher name"
ON public.users FOR SELECT TO authenticated
USING (
  role = 'teacher'
  AND EXISTS (
    SELECT 1 FROM public.teacher_student_links tsl
    JOIN public.children c ON c.id = tsl.student_id
    WHERE tsl.teacher_id = users.id AND c.parent_id = auth.uid()
  )
);

-- Notify the parent through the existing shared bell when a teacher sends a message.
CREATE OR REPLACE FUNCTION public.notify_teacher_message()
RETURNS TRIGGER AS $$
DECLARE
  v_child_name TEXT;
BEGIN
  SELECT name INTO v_child_name FROM public.children WHERE id = NEW.child_id;

  INSERT INTO public.notifications (user_id, student_id, parent_id, title, body, message, type, is_read, read)
  VALUES (
    NEW.parent_id,
    NEW.child_id::text,
    NEW.parent_id::text,
    'Bagong Mensahe mula sa Guro',
    'Tungkol kay ' || COALESCE(v_child_name, 'anak mo') || ': ' || NEW.message,
    'Tungkol kay ' || COALESCE(v_child_name, 'anak mo') || ': ' || NEW.message,
    'teacher_message',
    false,
    false
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS notify_teacher_message_trigger ON public.teacher_messages;
CREATE TRIGGER notify_teacher_message_trigger
AFTER INSERT ON public.teacher_messages
FOR EACH ROW EXECUTE FUNCTION public.notify_teacher_message();

NOTIFY pgrst, 'reload schema';
