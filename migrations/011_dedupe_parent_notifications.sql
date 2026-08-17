-- Live RLS testing after 010 found that a parent seeing TWO rows per event
-- (student-addressed + the new parent-addressed row from 010) wasn't a leak --
-- both were legitimately visible to the parent, confirmed via a cross-family
-- negative test (an unrelated parent could NOT see either row). But that also
-- revealed WHY: notifications already had a pre-existing `parent_id =
-- auth.uid()` SELECT policy (predating this project, from the original
-- mobile schema) that already grants a parent visibility into every
-- notification concerning their own child, regardless of who `user_id` is.
--
-- That makes the second "insert a row addressed directly to the parent"
-- change from 010 redundant: the parent already saw the student-addressed
-- row via that pre-existing policy, so the extra insert just produced two
-- near-identical entries in the parent's notification list for one event.
-- Reverting the three trigger functions back to a single insert.

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
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

NOTIFY pgrst, 'reload schema';
