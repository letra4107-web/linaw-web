-- Additive correction after 047; historical migration files stay unchanged.
-- SELECT FOR UPDATE serializes writers at READ COMMITTED, but cannot refresh
-- an existing REPEATABLE READ snapshot. Change the locked row's version so
-- stale snapshot writers receive serialization_failure instead of overfilling.
CREATE OR REPLACE FUNCTION public.validate_section_student()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE section_grade INT; student_grade INT; section_capacity INT; section_count INT;
BEGIN
  UPDATE public.class_sections SET capacity = capacity WHERE id = NEW.section_id
  RETURNING grade_level, capacity INTO section_grade, section_capacity;
  SELECT grade_level INTO student_grade FROM public.children WHERE id = NEW.student_id;
  IF section_grade IS NULL OR student_grade IS NULL OR section_grade <> student_grade THEN
    RAISE EXCEPTION 'Student grade must match section grade' USING ERRCODE = '22023';
  END IF;
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
NOTIFY pgrst, 'reload schema';
