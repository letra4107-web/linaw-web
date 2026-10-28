-- Apply only after 046. Backend section assignment now requires this RPC.
-- Serialize capacity decisions and commit section membership + teacher roster
-- together. Existing memberships and teacher links are preserved.
CREATE OR REPLACE FUNCTION public.validate_section_student()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE section_grade INT; student_grade INT; section_capacity INT; section_count INT;
BEGIN
  SELECT grade_level, capacity INTO section_grade, section_capacity
  FROM public.class_sections WHERE id = NEW.section_id FOR UPDATE;
  SELECT grade_level INTO student_grade FROM public.children WHERE id = NEW.student_id;
  IF section_grade IS NULL OR student_grade IS NULL OR section_grade <> student_grade THEN
    RAISE EXCEPTION 'Student grade must match section grade' USING ERRCODE = '22023';
  END IF;
  -- BEFORE INSERT also runs for ON CONFLICT DO NOTHING. A retry at capacity
  -- must reach the unique constraint without being treated as a new member.
  IF TG_OP = 'INSERT' AND EXISTS (
    SELECT 1 FROM public.section_students WHERE section_id = NEW.section_id AND student_id = NEW.student_id
  ) THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.section_id = OLD.section_id AND NEW.student_id = OLD.student_id THEN RETURN NEW; END IF;
  SELECT count(*) INTO section_count FROM public.section_students WHERE section_id = NEW.section_id;
  IF TG_OP = 'UPDATE' AND OLD.section_id = NEW.section_id THEN section_count := section_count - 1; END IF;
  IF section_count >= section_capacity THEN
    RAISE EXCEPTION 'This section is already at capacity' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS validate_section_student_trigger ON public.section_students;
CREATE TRIGGER validate_section_student_trigger BEFORE INSERT OR UPDATE ON public.section_students
FOR EACH ROW EXECUTE FUNCTION public.validate_section_student();

CREATE OR REPLACE FUNCTION public.assign_section_students(p_section_id UUID, p_student_ids UUID[], p_assigned_by UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE section_adviser UUID;
BEGIN
  IF p_student_ids IS NULL OR cardinality(p_student_ids) NOT BETWEEN 1 AND 35
     OR array_position(p_student_ids, NULL) IS NOT NULL THEN
    RAISE EXCEPTION 'Select one to 35 students' USING ERRCODE = '22023';
  END IF;
  SELECT adviser_id INTO section_adviser FROM public.class_sections WHERE id = p_section_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Section not found' USING ERRCODE = 'P0002'; END IF;
  INSERT INTO public.section_students(section_id, student_id)
  SELECT p_section_id, student_id FROM (SELECT DISTINCT unnest(p_student_ids) AS student_id) students
  ORDER BY student_id ON CONFLICT DO NOTHING;
  INSERT INTO public.teacher_student_links(teacher_id, student_id, assigned_by)
  SELECT section_adviser, student_id, p_assigned_by FROM (SELECT DISTINCT unnest(p_student_ids) AS student_id) students
  ORDER BY student_id ON CONFLICT DO NOTHING;
  RETURN jsonb_build_object('success', true);
END;
$$;
REVOKE ALL ON FUNCTION public.assign_section_students(UUID, UUID[], UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assign_section_students(UUID, UUID[], UUID) TO service_role;
NOTIFY pgrst, 'reload schema';
