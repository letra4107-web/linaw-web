-- Teacher Messages UI now lists parents (not students) as the send-to target, so the
-- teacher needs to read each linked parent's display name/email. No existing policy
-- grants this (012_teacher_messages.sql only granted the reverse: parent reading the
-- teacher's name). Scoped narrowly, mirroring that same pattern: only parents of a
-- child currently on this teacher's roster (teacher_student_links).

DROP POLICY IF EXISTS "Teachers read linked parent name" ON public.users;
CREATE POLICY "Teachers read linked parent name"
ON public.users FOR SELECT TO authenticated
USING (
  role = 'parent'
  AND EXISTS (
    SELECT 1 FROM public.teacher_student_links tsl
    JOIN public.children c ON c.id = tsl.student_id
    WHERE tsl.teacher_id = auth.uid() AND c.parent_id = users.id
  )
);

NOTIFY pgrst, 'reload schema';
