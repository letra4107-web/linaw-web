-- Real bug found via live testing: a parent could not read a linked teacher's
-- name at all, even though the underlying data was correct. Root cause: the
-- "Parents read linked teacher name" policy on `users` (012) checks EXISTS
-- against `teacher_student_links` JOIN `children` -- but that EXISTS subquery
-- runs AS the querying parent, subject to RLS on those two tables same as any
-- other query. `teacher_student_links` has no parent-facing SELECT policy at
-- all (only "Teachers manage own roster" and a service-role policy), so from
-- a parent's perspective that table is entirely empty, the EXISTS always
-- evaluates false, and the policy silently denies everyone -- same failure
-- shape as the PDF RLS recursion bug fixed in 007, for the same underlying
-- reason (a policy's subquery is not exempt from RLS on the tables it reads).
--
-- Fixed the same way 007 fixed it: a SECURITY DEFINER helper function whose
-- internal query bypasses RLS (it runs as the function owner), called from
-- the policy instead of a raw cross-table subquery.

CREATE OR REPLACE FUNCTION public.parent_has_linked_teacher(p_teacher_id UUID, p_parent_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.teacher_student_links tsl
    JOIN public.children c ON c.id = tsl.student_id
    WHERE tsl.teacher_id = p_teacher_id AND c.parent_id = p_parent_id
  );
$$;

REVOKE ALL ON FUNCTION public.parent_has_linked_teacher(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.parent_has_linked_teacher(UUID, UUID) TO authenticated, service_role;

DROP POLICY IF EXISTS "Parents read linked teacher name" ON public.users;
CREATE POLICY "Parents read linked teacher name"
ON public.users FOR SELECT TO authenticated
USING (
  role = 'teacher'
  AND public.parent_has_linked_teacher(users.id, auth.uid())
);

NOTIFY pgrst, 'reload schema';
