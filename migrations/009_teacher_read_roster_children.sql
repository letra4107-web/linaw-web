-- Fixes a real bug found via live testing: public.children's RLS only ever
-- granted SELECT to parents (parent_id = auth.uid()) and students
-- (auth_uid = auth.uid()) -- never to teachers. Every teacher page that
-- embeds `children(name, ...)` through teacher_student_links (My Students,
-- PDF assign/monitor, Assessments, Learning Paths, Activities, Progress
-- Reports) was silently getting `children: null` back from PostgREST
-- (embedded-resource RLS denial fails silently, not with an error), even
-- though the teacher_student_links row itself was visible.

DROP POLICY IF EXISTS "Teachers read roster children" ON public.children;
CREATE POLICY "Teachers read roster children"
ON public.children FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.teacher_student_links tsl
    WHERE tsl.student_id = children.id AND tsl.teacher_id = auth.uid()
  )
);

-- Same gap, same fix, for Teacher Progress Reports (reads child_progress
-- directly for the teacher's roster) -- child_progress's SELECT policy only
-- ever covered students (own row) and parents (own child), never teachers.
DROP POLICY IF EXISTS "Teachers read roster child progress" ON public.child_progress;
CREATE POLICY "Teachers read roster child progress"
ON public.child_progress FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.teacher_student_links tsl
    WHERE tsl.student_id = child_progress.child_id AND tsl.teacher_id = auth.uid()
  )
);

NOTIFY pgrst, 'reload schema';
