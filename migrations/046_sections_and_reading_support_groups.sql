-- Explicit classroom sections replace grade-wide roster sharing for new
-- assignments. Existing teacher/student links are intentionally preserved.
CREATE TABLE IF NOT EXISTS public.class_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 80),
  grade_level INT NOT NULL CHECK (grade_level BETWEEN 1 AND 6),
  adviser_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  capacity INT NOT NULL DEFAULT 30 CHECK (capacity BETWEEN 1 AND 35),
  is_reading_support BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (grade_level, name)
);

CREATE TABLE IF NOT EXISTS public.section_students (
  section_id UUID NOT NULL REFERENCES public.class_sections(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (section_id, student_id)
);

CREATE OR REPLACE FUNCTION public.validate_section_student()
RETURNS TRIGGER AS $$
DECLARE section_grade INT; student_grade INT; section_capacity INT; section_count INT;
BEGIN
  SELECT grade_level, capacity INTO section_grade, section_capacity FROM public.class_sections WHERE id = NEW.section_id;
  SELECT grade_level INTO student_grade FROM public.children WHERE id = NEW.student_id;
  SELECT count(*) INTO section_count FROM public.section_students WHERE section_id = NEW.section_id;
  IF section_grade IS NULL OR student_grade IS NULL OR section_grade <> student_grade THEN RAISE EXCEPTION 'Student grade must match section grade'; END IF;
  IF section_count >= section_capacity THEN RAISE EXCEPTION 'This section is already at capacity'; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS validate_section_student_trigger ON public.section_students;
CREATE TRIGGER validate_section_student_trigger BEFORE INSERT ON public.section_students FOR EACH ROW EXECUTE FUNCTION public.validate_section_student();

ALTER TABLE public.class_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.section_students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sections service role" ON public.class_sections FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "section students service role" ON public.section_students FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "teachers read own sections" ON public.class_sections FOR SELECT TO authenticated USING (adviser_id = auth.uid());
CREATE POLICY "teachers read own section students" ON public.section_students FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.class_sections s WHERE s.id = section_id AND s.adviser_id = auth.uid()));
NOTIFY pgrst, 'reload schema';
