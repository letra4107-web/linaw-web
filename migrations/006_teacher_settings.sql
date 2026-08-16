-- LinawLetra Web: teacher-editable notification preference, and a policy
-- letting a teacher update only that preference on their own profile row
-- (grade_levels stays admin-controlled -- enforced by trigger below).
ALTER TABLE public.teacher_profiles ADD COLUMN IF NOT EXISTS notify_by_email BOOLEAN NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.protect_teacher_grade_levels()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.role() <> 'service_role' AND NEW.grade_levels IS DISTINCT FROM OLD.grade_levels THEN
    RAISE EXCEPTION 'grade_levels can only be changed by an admin.';
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS protect_teacher_grade_levels_trigger ON public.teacher_profiles;
CREATE TRIGGER protect_teacher_grade_levels_trigger
BEFORE UPDATE ON public.teacher_profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_teacher_grade_levels();

DROP POLICY IF EXISTS "Teachers update own notification prefs" ON public.teacher_profiles;
CREATE POLICY "Teachers update own notification prefs"
ON public.teacher_profiles FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
