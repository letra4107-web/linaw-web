-- Fixes a real bug found via live testing: pdf_materials' "Assigned students
-- read pdf materials" policy subqueries pdf_assignments, and pdf_assignments'
-- "Teachers manage own pdf assignments" policy subqueries pdf_materials --
-- Postgres detects this as infinite recursion (42P17) the moment either
-- table's RLS is evaluated, because evaluating one policy requires
-- evaluating the other table's RLS, which requires the first again.
--
-- Fixed the same way this schema already breaks equivalent cycles elsewhere
-- (see get_reading_module_content, submit_module_assessment, etc.): a small
-- SECURITY DEFINER helper function executes its internal query as the
-- function owner (which bypasses RLS in this project, same as every other
-- SECURITY DEFINER function here), so calling it from a policy no longer
-- re-triggers the other table's row security.

CREATE OR REPLACE FUNCTION public.teacher_owns_pdf_material(p_material_id UUID, p_teacher_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pdf_materials WHERE id = p_material_id AND teacher_id = p_teacher_id
  );
$$;

CREATE OR REPLACE FUNCTION public.student_has_pdf_assignment(p_material_id UUID, p_auth_uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pdf_assignments a
    JOIN public.children c ON c.id = a.student_id
    WHERE a.pdf_material_id = p_material_id AND c.auth_uid = p_auth_uid
  );
$$;

REVOKE ALL ON FUNCTION public.teacher_owns_pdf_material(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.teacher_owns_pdf_material(UUID, UUID) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.student_has_pdf_assignment(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.student_has_pdf_assignment(UUID, UUID) TO authenticated, service_role;

DROP POLICY IF EXISTS "Assigned students read pdf materials" ON public.pdf_materials;
CREATE POLICY "Assigned students read pdf materials"
ON public.pdf_materials FOR SELECT TO authenticated
USING (public.student_has_pdf_assignment(id, auth.uid()));

DROP POLICY IF EXISTS "Teachers manage own pdf assignments" ON public.pdf_assignments;
CREATE POLICY "Teachers manage own pdf assignments"
ON public.pdf_assignments FOR ALL TO authenticated
USING (public.teacher_owns_pdf_material(pdf_material_id, auth.uid()))
WITH CHECK (auth.uid() = assigned_by AND public.teacher_owns_pdf_material(pdf_material_id, auth.uid()));

NOTIFY pgrst, 'reload schema';
