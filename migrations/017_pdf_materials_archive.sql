-- Lets a teacher archive a PDF (plain reading or syllable drill) so it
-- disappears from students' assignment lists without deleting it or its
-- history (attempts/scores stay intact for the teacher's own records).

ALTER TABLE public.pdf_materials
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Narrows the existing student-facing SELECT policy (from
-- 007_fix_pdf_rls_recursion.sql) to also exclude archived materials -- the
-- teacher's own "Teachers read own pdf materials" policy is untouched, since
-- teachers still need to see archived items in their own Archive view.
DROP POLICY IF EXISTS "Assigned students read pdf materials" ON public.pdf_materials;
CREATE POLICY "Assigned students read pdf materials"
ON public.pdf_materials FOR SELECT TO authenticated
USING (
  archived_at IS NULL
  AND public.student_has_pdf_assignment(id, auth.uid())
);

NOTIFY pgrst, 'reload schema';
