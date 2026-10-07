-- Private notes written by admins for individual student accounts.
CREATE TABLE IF NOT EXISTS public.admin_student_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content TEXT NOT NULL CHECK (char_length(trim(content)) BETWEEN 1 AND 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_student_notes_student_created_idx
  ON public.admin_student_notes (student_id, created_at DESC);

ALTER TABLE public.admin_student_notes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.admin_student_notes FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.admin_student_notes TO service_role;

NOTIFY pgrst, 'reload schema';
