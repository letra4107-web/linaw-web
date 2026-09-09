-- Guided, dyslexia-friendly reading for teacher-assigned short-story PDFs.
-- Additive: legacy PDFs continue in practice mode with one sentence per chunk.

ALTER TABLE public.pdf_materials
  ADD COLUMN IF NOT EXISTS reading_mode TEXT NOT NULL DEFAULT 'practice' CHECK (reading_mode IN ('practice', 'assessment', 'supported')),
  ADD COLUMN IF NOT EXISTS target_modules INTEGER[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS preview_words JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS chunk_size INTEGER NOT NULL DEFAULT 1 CHECK (chunk_size BETWEEN 1 AND 3),
  ADD COLUMN IF NOT EXISTS completion_threshold NUMERIC(5,2) NOT NULL DEFAULT 75 CHECK (completion_threshold >= 0 AND completion_threshold <= 100);

ALTER TABLE public.pdf_reading_attempts ADD COLUMN IF NOT EXISTS chunk_index INTEGER, ADD COLUMN IF NOT EXISTS chunk_text TEXT;
CREATE INDEX IF NOT EXISTS pdf_reading_attempts_assignment_chunk_idx ON public.pdf_reading_attempts(pdf_assignment_id, student_id, chunk_index, created_at DESC) WHERE chunk_index IS NOT NULL;
ALTER TABLE public.pdf_assignments ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ, ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ, ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL, ADD COLUMN IF NOT EXISTS teacher_feedback TEXT;

DO $$
DECLARE constraint_name TEXT;
BEGIN
  SELECT conname INTO constraint_name FROM pg_constraint WHERE conrelid = 'public.pdf_assignments'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) LIKE '%status%';
  IF constraint_name IS NOT NULL THEN EXECUTE format('ALTER TABLE public.pdf_assignments DROP CONSTRAINT %I', constraint_name); END IF;
END $$;

ALTER TABLE public.pdf_assignments ADD CONSTRAINT pdf_assignments_status_check CHECK (status IN ('assigned', 'in_progress', 'submitted', 'reviewed', 'needs_review', 'completed'));
DROP POLICY IF EXISTS "Students update own pdf assignment status" ON public.pdf_assignments;
CREATE POLICY "Students update own guided pdf progress" ON public.pdf_assignments FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.children c WHERE c.id = pdf_assignments.student_id AND c.auth_uid = auth.uid()))
WITH CHECK (status IN ('assigned', 'in_progress', 'submitted') AND reviewed_at IS NULL AND reviewed_by IS NULL AND teacher_feedback IS NULL);
NOTIFY pgrst, 'reload schema';
