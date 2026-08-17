-- Real bug found via live testing: a teacher with ZERO roster relationship to a
-- child could still successfully INSERT a teacher_messages row addressed to that
-- child's parent. 012's "teachers_insert_messages" policy (roster-scoped) was
-- created successfully, but a teacher could still bypass it -- because some
-- OTHER, more permissive INSERT policy (just `teacher_id = auth.uid()`, no
-- roster check) was already active on this table under a name that doesn't
-- match "teachers_insert_messages", so 012's `DROP POLICY IF EXISTS
-- "teachers_insert_messages"` silently found nothing to drop and the old loose
-- policy kept running alongside the new strict one. Postgres OR's multiple
-- PERMISSIVE policies for the same command together, so the loose one alone
-- was enough to let anything through.
--
-- This matches this project's now well-established pattern of live schema
-- (including policy names) drifting from whatever the documented migration
-- files say. Rather than guess another name, drop EVERY existing policy on
-- teacher_messages by querying pg_policies directly, then recreate the
-- intended set from scratch.

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'teacher_messages'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.teacher_messages', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "parents_read_messages"
ON public.teacher_messages FOR SELECT TO authenticated
USING (parent_id = auth.uid());

CREATE POLICY "parents_update_messages"
ON public.teacher_messages FOR UPDATE TO authenticated
USING (parent_id = auth.uid())
WITH CHECK (parent_id = auth.uid());

CREATE POLICY "teachers_read_own_sent_messages"
ON public.teacher_messages FOR SELECT TO authenticated
USING (teacher_id = auth.uid());

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

NOTIFY pgrst, 'reload schema';
