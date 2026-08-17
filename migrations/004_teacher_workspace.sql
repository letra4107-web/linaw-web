-- LinawLetra Web: Teacher workspace tables (students roster, PDF reading
-- assignments, teacher-authored assessments, learning paths).
--
-- Design note: most writes here are direct-from-frontend (RLS-gated by
-- auth.uid() = teacher_id, anchored to an existing teacher_profiles row so a
-- non-teacher account can never claim teacher_id = their own uid). The only
-- thing that truly needs the backend's service-role is PDF upload + text
-- extraction (pdf_materials insert), because that requires multer + pdf-parse
-- running server-side. Cross-role notifications are handled by AFTER INSERT
-- triggers into the existing public.notifications table, matching its
-- established column shape (user_id, student_id, parent_id, title, body,
-- message, type, is_read, read) so they ride the existing Realtime
-- subscription with no new client plumbing.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- teacher_student_links
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.teacher_student_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(teacher_id, student_id)
);

CREATE OR REPLACE FUNCTION public.validate_teacher_student_link()
RETURNS TRIGGER AS $$
DECLARE
  student_grade INT;
  teacher_grades INT[];
BEGIN
  SELECT grade_level INTO student_grade FROM public.children WHERE id = NEW.student_id;
  SELECT grade_levels INTO teacher_grades FROM public.teacher_profiles WHERE user_id = NEW.teacher_id;

  IF student_grade IS NULL OR teacher_grades IS NULL OR NOT (student_grade = ANY(teacher_grades)) THEN
    RAISE EXCEPTION 'Student grade level (%) is outside this teacher''s assigned grades', student_grade;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS validate_teacher_student_link_trigger ON public.teacher_student_links;
CREATE TRIGGER validate_teacher_student_link_trigger
BEFORE INSERT ON public.teacher_student_links
FOR EACH ROW EXECUTE FUNCTION public.validate_teacher_student_link();

ALTER TABLE public.teacher_student_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers manage own roster" ON public.teacher_student_links;
CREATE POLICY "Teachers manage own roster"
ON public.teacher_student_links
FOR ALL
TO authenticated
USING (
  auth.uid() = teacher_id
  AND EXISTS (SELECT 1 FROM public.teacher_profiles tp WHERE tp.user_id = auth.uid())
)
WITH CHECK (
  auth.uid() = teacher_id
  AND EXISTS (SELECT 1 FROM public.teacher_profiles tp WHERE tp.user_id = auth.uid())
);

DROP POLICY IF EXISTS "teacher_student_links service role" ON public.teacher_student_links;
CREATE POLICY "teacher_student_links service role"
ON public.teacher_student_links FOR ALL
USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- pdf_materials  (insert only via backend service-role: needs multer + pdf-parse)
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('reading-materials', 'reading-materials', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

CREATE TABLE IF NOT EXISTS public.pdf_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_url TEXT NOT NULL,
  extracted_text TEXT,
  grade_level INT,
  level TEXT CHECK (level IS NULL OR level IN ('Beginner', 'Intermediate', 'Advanced')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pdf_materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers read own pdf materials" ON public.pdf_materials;
CREATE POLICY "Teachers read own pdf materials"
ON public.pdf_materials FOR SELECT TO authenticated
USING (auth.uid() = teacher_id);

DROP POLICY IF EXISTS "pdf_materials service role manage" ON public.pdf_materials;
CREATE POLICY "pdf_materials service role manage"
ON public.pdf_materials FOR ALL
USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Reading materials are readable" ON storage.objects;
CREATE POLICY "Reading materials are readable"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'reading-materials');

-- ---------------------------------------------------------------------------
-- pdf_assignments  (direct-from-frontend: teacher owns via joined pdf_materials)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pdf_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pdf_material_id UUID NOT NULL REFERENCES public.pdf_materials(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed')),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_date DATE
);

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

DROP TRIGGER IF EXISTS notify_pdf_assignment_trigger ON public.pdf_assignments;
CREATE TRIGGER notify_pdf_assignment_trigger
AFTER INSERT ON public.pdf_assignments
FOR EACH ROW EXECUTE FUNCTION public.notify_pdf_assignment();

ALTER TABLE public.pdf_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers manage own pdf assignments" ON public.pdf_assignments;
CREATE POLICY "Teachers manage own pdf assignments"
ON public.pdf_assignments FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.pdf_materials m WHERE m.id = pdf_material_id AND m.teacher_id = auth.uid())
)
WITH CHECK (
  auth.uid() = assigned_by
  AND EXISTS (SELECT 1 FROM public.pdf_materials m WHERE m.id = pdf_material_id AND m.teacher_id = auth.uid())
);

DROP POLICY IF EXISTS "Students read own pdf assignments" ON public.pdf_assignments;
CREATE POLICY "Students read own pdf assignments"
ON public.pdf_assignments FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.children c WHERE c.id = pdf_assignments.student_id AND c.auth_uid = auth.uid()));

DROP POLICY IF EXISTS "Students update own pdf assignment status" ON public.pdf_assignments;
CREATE POLICY "Students update own pdf assignment status"
ON public.pdf_assignments FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.children c WHERE c.id = pdf_assignments.student_id AND c.auth_uid = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.children c WHERE c.id = pdf_assignments.student_id AND c.auth_uid = auth.uid()));

DROP POLICY IF EXISTS "Parents read child pdf assignments" ON public.pdf_assignments;
CREATE POLICY "Parents read child pdf assignments"
ON public.pdf_assignments FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.children c WHERE c.id = pdf_assignments.student_id AND c.parent_id = auth.uid()));

DROP POLICY IF EXISTS "pdf_assignments service role" ON public.pdf_assignments;
CREATE POLICY "pdf_assignments service role"
ON public.pdf_assignments FOR ALL
USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

ALTER TABLE public.pdf_assignments REPLICA IDENTITY FULL;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'pdf_assignments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pdf_assignments;
  END IF;
END$$;

-- Added here (not alongside pdf_materials' other policies above) because it
-- references pdf_assignments, which must exist first.
DROP POLICY IF EXISTS "Assigned students read pdf materials" ON public.pdf_materials;
CREATE POLICY "Assigned students read pdf materials"
ON public.pdf_materials FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.pdf_assignments a
    JOIN public.children c ON c.id = a.student_id
    WHERE a.pdf_material_id = pdf_materials.id AND c.auth_uid = auth.uid()
  )
);

-- ---------------------------------------------------------------------------
-- pdf_reading_attempts  (student records their own speech-vs-text accuracy)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pdf_reading_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pdf_assignment_id UUID NOT NULL REFERENCES public.pdf_assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  transcript TEXT,
  accuracy NUMERIC(5,2) CHECK (accuracy IS NULL OR (accuracy >= 0 AND accuracy <= 100)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pdf_reading_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students record own pdf reading attempts" ON public.pdf_reading_attempts;
CREATE POLICY "Students record own pdf reading attempts"
ON public.pdf_reading_attempts FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.children c WHERE c.id = pdf_reading_attempts.student_id AND c.auth_uid = auth.uid()));

DROP POLICY IF EXISTS "Students read own pdf reading attempts" ON public.pdf_reading_attempts;
CREATE POLICY "Students read own pdf reading attempts"
ON public.pdf_reading_attempts FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.children c WHERE c.id = pdf_reading_attempts.student_id AND c.auth_uid = auth.uid()));

DROP POLICY IF EXISTS "Teachers read assigned pdf reading attempts" ON public.pdf_reading_attempts;
CREATE POLICY "Teachers read assigned pdf reading attempts"
ON public.pdf_reading_attempts FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.pdf_assignments a
    JOIN public.pdf_materials m ON m.id = a.pdf_material_id
    WHERE a.id = pdf_assignment_id AND m.teacher_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Parents read child pdf reading attempts" ON public.pdf_reading_attempts;
CREATE POLICY "Parents read child pdf reading attempts"
ON public.pdf_reading_attempts FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.children c WHERE c.id = pdf_reading_attempts.student_id AND c.parent_id = auth.uid()));

DROP POLICY IF EXISTS "pdf_reading_attempts service role" ON public.pdf_reading_attempts;
CREATE POLICY "pdf_reading_attempts service role"
ON public.pdf_reading_attempts FOR ALL
USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- teacher_assessments + teacher_assessment_scores
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.teacher_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  subject TEXT,
  grade_level INT,
  file_url TEXT,
  max_score NUMERIC(6,2) NOT NULL DEFAULT 100,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.touch_teacher_assessments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS touch_teacher_assessments_updated_at ON public.teacher_assessments;
CREATE TRIGGER touch_teacher_assessments_updated_at
BEFORE UPDATE ON public.teacher_assessments
FOR EACH ROW EXECUTE FUNCTION public.touch_teacher_assessments_updated_at();

ALTER TABLE public.teacher_assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers manage own assessments" ON public.teacher_assessments;
CREATE POLICY "Teachers manage own assessments"
ON public.teacher_assessments FOR ALL TO authenticated
USING (auth.uid() = teacher_id)
WITH CHECK (
  auth.uid() = teacher_id
  AND EXISTS (SELECT 1 FROM public.teacher_profiles tp WHERE tp.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Students read published assessments" ON public.teacher_assessments;
CREATE POLICY "Students read published assessments"
ON public.teacher_assessments FOR SELECT TO authenticated
USING (is_published = true);

DROP POLICY IF EXISTS "teacher_assessments service role" ON public.teacher_assessments;
CREATE POLICY "teacher_assessments service role"
ON public.teacher_assessments FOR ALL
USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE TABLE IF NOT EXISTS public.teacher_assessment_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.teacher_assessments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  score NUMERIC(6,2) NOT NULL CHECK (score >= 0),
  feedback TEXT,
  graded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(assessment_id, student_id)
);

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

DROP TRIGGER IF EXISTS notify_assessment_graded_trigger ON public.teacher_assessment_scores;
CREATE TRIGGER notify_assessment_graded_trigger
AFTER INSERT OR UPDATE ON public.teacher_assessment_scores
FOR EACH ROW EXECUTE FUNCTION public.notify_assessment_graded();

ALTER TABLE public.teacher_assessment_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers manage own assessment scores" ON public.teacher_assessment_scores;
CREATE POLICY "Teachers manage own assessment scores"
ON public.teacher_assessment_scores FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.teacher_assessments a WHERE a.id = assessment_id AND a.teacher_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.teacher_assessments a WHERE a.id = assessment_id AND a.teacher_id = auth.uid()));

DROP POLICY IF EXISTS "Students read own assessment scores" ON public.teacher_assessment_scores;
CREATE POLICY "Students read own assessment scores"
ON public.teacher_assessment_scores FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.children c WHERE c.id = teacher_assessment_scores.student_id AND c.auth_uid = auth.uid()));

DROP POLICY IF EXISTS "Parents read child assessment scores" ON public.teacher_assessment_scores;
CREATE POLICY "Parents read child assessment scores"
ON public.teacher_assessment_scores FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.children c WHERE c.id = teacher_assessment_scores.student_id AND c.parent_id = auth.uid()));

DROP POLICY IF EXISTS "teacher_assessment_scores service role" ON public.teacher_assessment_scores;
CREATE POLICY "teacher_assessment_scores service role"
ON public.teacher_assessment_scores FOR ALL
USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

ALTER TABLE public.teacher_assessment_scores REPLICA IDENTITY FULL;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'teacher_assessment_scores'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.teacher_assessment_scores;
  END IF;
END$$;

-- ---------------------------------------------------------------------------
-- learning_paths + learning_path_items + learning_path_assignments
-- (built from existing public.lessons rows)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.learning_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.touch_learning_paths_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS touch_learning_paths_updated_at ON public.learning_paths;
CREATE TRIGGER touch_learning_paths_updated_at
BEFORE UPDATE ON public.learning_paths
FOR EACH ROW EXECUTE FUNCTION public.touch_learning_paths_updated_at();

ALTER TABLE public.learning_paths ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers manage own learning paths" ON public.learning_paths;
CREATE POLICY "Teachers manage own learning paths"
ON public.learning_paths FOR ALL TO authenticated
USING (auth.uid() = teacher_id)
WITH CHECK (
  auth.uid() = teacher_id
  AND EXISTS (SELECT 1 FROM public.teacher_profiles tp WHERE tp.user_id = auth.uid())
);

DROP POLICY IF EXISTS "learning_paths service role" ON public.learning_paths;
CREATE POLICY "learning_paths service role"
ON public.learning_paths FOR ALL
USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE TABLE IF NOT EXISTS public.learning_path_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path_id UUID NOT NULL REFERENCES public.learning_paths(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  item_order INT NOT NULL CHECK (item_order > 0),
  UNIQUE(path_id, lesson_id),
  UNIQUE(path_id, item_order)
);

ALTER TABLE public.learning_path_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers manage own path items" ON public.learning_path_items;
CREATE POLICY "Teachers manage own path items"
ON public.learning_path_items FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.learning_paths p WHERE p.id = path_id AND p.teacher_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.learning_paths p WHERE p.id = path_id AND p.teacher_id = auth.uid()));

DROP POLICY IF EXISTS "learning_path_items service role" ON public.learning_path_items;
CREATE POLICY "learning_path_items service role"
ON public.learning_path_items FOR ALL
USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE TABLE IF NOT EXISTS public.learning_path_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path_id UUID NOT NULL REFERENCES public.learning_paths(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(path_id, student_id)
);

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

DROP TRIGGER IF EXISTS notify_learning_path_assignment_trigger ON public.learning_path_assignments;
CREATE TRIGGER notify_learning_path_assignment_trigger
AFTER INSERT ON public.learning_path_assignments
FOR EACH ROW EXECUTE FUNCTION public.notify_learning_path_assignment();

ALTER TABLE public.learning_path_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers manage own path assignments" ON public.learning_path_assignments;
CREATE POLICY "Teachers manage own path assignments"
ON public.learning_path_assignments FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.learning_paths p WHERE p.id = path_id AND p.teacher_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.learning_paths p WHERE p.id = path_id AND p.teacher_id = auth.uid()));

DROP POLICY IF EXISTS "Students read own path assignments" ON public.learning_path_assignments;
CREATE POLICY "Students read own path assignments"
ON public.learning_path_assignments FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.children c WHERE c.id = learning_path_assignments.student_id AND c.auth_uid = auth.uid()));

DROP POLICY IF EXISTS "Parents read child path assignments" ON public.learning_path_assignments;
CREATE POLICY "Parents read child path assignments"
ON public.learning_path_assignments FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.children c WHERE c.id = learning_path_assignments.student_id AND c.parent_id = auth.uid()));

DROP POLICY IF EXISTS "learning_path_assignments service role" ON public.learning_path_assignments;
CREATE POLICY "learning_path_assignments service role"
ON public.learning_path_assignments FOR ALL
USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Added here (not alongside learning_path_items' other policies above) because
-- it references learning_path_assignments, which must exist first.
DROP POLICY IF EXISTS "Students read assigned path items" ON public.learning_path_items;
CREATE POLICY "Students read assigned path items"
ON public.learning_path_items FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.learning_path_assignments pa
    JOIN public.children c ON c.id = pa.student_id
    WHERE pa.path_id = learning_path_items.path_id AND c.auth_uid = auth.uid()
  )
);

NOTIFY pgrst, 'reload schema';
