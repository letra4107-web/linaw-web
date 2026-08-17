-- Fixes a real bug found via live testing: public.children has its own
-- (pre-existing, apparently unused) column literally named `student_id`.
-- Every RLS policy in migration 004 that wrote
--   EXISTS (SELECT 1 FROM public.children c WHERE c.id = student_id AND ...)
-- had its unqualified `student_id` silently resolve to `c.student_id`
-- (always NULL) instead of the outer table's `student_id` column, per
-- normal SQL scoping rules -- inner-query column names shadow outer ones on
-- a naming collision. The condition became `c.id = NULL`, always false, so
-- every one of these policies silently denied everyone (including the
-- rightful owner) instead of throwing an error, which is why it wasn't
-- caught until an actual insert was attempted.
--
-- Fix: qualify the outer table's student_id explicitly everywhere this
-- pattern was used. Affects pdf_assignments (3 policies),
-- pdf_reading_attempts (3 policies), teacher_assessment_scores (2 policies),
-- and learning_path_assignments (2 policies).

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

DROP POLICY IF EXISTS "Students record own pdf reading attempts" ON public.pdf_reading_attempts;
CREATE POLICY "Students record own pdf reading attempts"
ON public.pdf_reading_attempts FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.children c WHERE c.id = pdf_reading_attempts.student_id AND c.auth_uid = auth.uid()));

DROP POLICY IF EXISTS "Students read own pdf reading attempts" ON public.pdf_reading_attempts;
CREATE POLICY "Students read own pdf reading attempts"
ON public.pdf_reading_attempts FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.children c WHERE c.id = pdf_reading_attempts.student_id AND c.auth_uid = auth.uid()));

DROP POLICY IF EXISTS "Parents read child pdf reading attempts" ON public.pdf_reading_attempts;
CREATE POLICY "Parents read child pdf reading attempts"
ON public.pdf_reading_attempts FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.children c WHERE c.id = pdf_reading_attempts.student_id AND c.parent_id = auth.uid()));

DROP POLICY IF EXISTS "Students read own assessment scores" ON public.teacher_assessment_scores;
CREATE POLICY "Students read own assessment scores"
ON public.teacher_assessment_scores FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.children c WHERE c.id = teacher_assessment_scores.student_id AND c.auth_uid = auth.uid()));

DROP POLICY IF EXISTS "Parents read child assessment scores" ON public.teacher_assessment_scores;
CREATE POLICY "Parents read child assessment scores"
ON public.teacher_assessment_scores FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.children c WHERE c.id = teacher_assessment_scores.student_id AND c.parent_id = auth.uid()));

DROP POLICY IF EXISTS "Students read own path assignments" ON public.learning_path_assignments;
CREATE POLICY "Students read own path assignments"
ON public.learning_path_assignments FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.children c WHERE c.id = learning_path_assignments.student_id AND c.auth_uid = auth.uid()));

DROP POLICY IF EXISTS "Parents read child path assignments" ON public.learning_path_assignments;
CREATE POLICY "Parents read child path assignments"
ON public.learning_path_assignments FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.children c WHERE c.id = learning_path_assignments.student_id AND c.parent_id = auth.uid()));

NOTIFY pgrst, 'reload schema';
