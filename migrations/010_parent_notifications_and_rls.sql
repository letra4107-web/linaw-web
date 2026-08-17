-- Web had zero UI for the shared `notifications` table despite the original
-- plan calling for cross-role notifications to ride it with no new plumbing.
-- Building that UI surfaced two real gaps:
--
-- 1. RLS on `notifications` was never confirmed/asserted from this project's
--    side (it predates this project, created by mobile). Assert it explicitly
--    so every role can read/mark-read their own notifications from web.
--
-- 2. The three notify_* trigger functions added in 004_teacher_workspace.sql
--    (pdf assignment, assessment graded, learning path assignment) only ever
--    address the STUDENT (user_id = student's auth_uid). Live data shows
--    mobile's own convention already sometimes addresses the PARENT directly
--    (e.g. "XP Update"/"Practice Result" rows have user_id = parent's auth
--    id), so a parent gets zero notification today when a teacher assigns a
--    PDF, grades an assessment, or assigns a learning path to their child.
--    Fixed by inserting a second row addressed to the parent (when one
--    exists) in each of the three trigger functions.

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own notifications" ON public.notifications;
CREATE POLICY "Users read own notifications"
ON public.notifications FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users mark own notifications read" ON public.notifications;
CREATE POLICY "Users mark own notifications read"
ON public.notifications FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.notify_pdf_assignment()
RETURNS TRIGGER AS $$
DECLARE
  v_parent_id UUID;
  v_auth_uid UUID;
  v_title TEXT;
BEGIN
  SELECT parent_id, auth_uid INTO v_parent_id, v_auth_uid FROM public.children WHERE id = NEW.student_id;
  SELECT title INTO v_title FROM public.pdf_materials WHERE id = NEW.pdf_material_id;

  INSERT INTO public.notifications (user_id, student_id, parent_id, title, body, message, type, is_read, read)
  VALUES (
    v_auth_uid,
    NEW.student_id::text,
    v_parent_id::text,
    'Bagong PDF na Babasahin',
    'May bagong babasahing PDF: ' || COALESCE(v_title, ''),
    'May bagong babasahing PDF: ' || COALESCE(v_title, ''),
    'pdf_assignment',
    false,
    false
  );

  IF v_parent_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, student_id, parent_id, title, body, message, type, is_read, read)
    VALUES (
      v_parent_id,
      NEW.student_id::text,
      v_parent_id::text,
      'Bagong PDF para sa Anak Mo',
      'May bagong babasahing PDF na naka-assign: ' || COALESCE(v_title, ''),
      'May bagong babasahing PDF na naka-assign: ' || COALESCE(v_title, ''),
      'pdf_assignment',
      false,
      false
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.notify_assessment_graded()
RETURNS TRIGGER AS $$
DECLARE
  v_parent_id UUID;
  v_auth_uid UUID;
  v_title TEXT;
BEGIN
  SELECT parent_id, auth_uid INTO v_parent_id, v_auth_uid FROM public.children WHERE id = NEW.student_id;
  SELECT title INTO v_title FROM public.teacher_assessments WHERE id = NEW.assessment_id;

  INSERT INTO public.notifications (user_id, student_id, parent_id, title, body, message, type, is_read, read)
  VALUES (
    v_auth_uid,
    NEW.student_id::text,
    v_parent_id::text,
    'May Marka na sa Pagsusulit',
    COALESCE(v_title, 'Assessment') || ': ' || NEW.score::text,
    COALESCE(v_title, 'Assessment') || ': ' || NEW.score::text,
    'assessment_graded',
    false,
    false
  );

  IF v_parent_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, student_id, parent_id, title, body, message, type, is_read, read)
    VALUES (
      v_parent_id,
      NEW.student_id::text,
      v_parent_id::text,
      'May Marka na ang Anak Mo',
      COALESCE(v_title, 'Pagsusulit') || ': ' || NEW.score::text,
      COALESCE(v_title, 'Pagsusulit') || ': ' || NEW.score::text,
      'assessment_graded',
      false,
      false
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.notify_learning_path_assignment()
RETURNS TRIGGER AS $$
DECLARE
  v_parent_id UUID;
  v_auth_uid UUID;
  v_title TEXT;
BEGIN
  SELECT parent_id, auth_uid INTO v_parent_id, v_auth_uid FROM public.children WHERE id = NEW.student_id;
  SELECT title INTO v_title FROM public.learning_paths WHERE id = NEW.path_id;

  INSERT INTO public.notifications (user_id, student_id, parent_id, title, body, message, type, is_read, read)
  VALUES (
    v_auth_uid,
    NEW.student_id::text,
    v_parent_id::text,
    'Bagong Learning Path',
    'Naka-assign sa iyo: ' || COALESCE(v_title, ''),
    'Naka-assign sa iyo: ' || COALESCE(v_title, ''),
    'learning_path_assigned',
    false,
    false
  );

  IF v_parent_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, student_id, parent_id, title, body, message, type, is_read, read)
    VALUES (
      v_parent_id,
      NEW.student_id::text,
      v_parent_id::text,
      'Bagong Learning Path para sa Anak Mo',
      'Naka-assign kay ' || 'anak mo: ' || COALESCE(v_title, ''),
      'Naka-assign kay ' || 'anak mo: ' || COALESCE(v_title, ''),
      'learning_path_assigned',
      false,
      false
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

NOTIFY pgrst, 'reload schema';
