-- LinawLetra Web: grade levels a teacher is assigned to (set by Admin at creation).
CREATE TABLE IF NOT EXISTS public.teacher_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  grade_levels INT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.teacher_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers read own profile" ON public.teacher_profiles;
CREATE POLICY "Teachers read own profile"
ON public.teacher_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "teacher_profiles service role manage" ON public.teacher_profiles;
CREATE POLICY "teacher_profiles service role manage"
ON public.teacher_profiles
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

NOTIFY pgrst, 'reload schema';
