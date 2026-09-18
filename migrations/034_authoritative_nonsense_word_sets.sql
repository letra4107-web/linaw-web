-- A nonsense-word set must be stable and server-owned between rendering and
-- submission. Persisting the issued set prevents the browser from choosing a
-- target word or asserting correctness when it requests XP.
CREATE TABLE IF NOT EXISTS public.student_nonsense_check_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.reading_modules(id) ON DELETE CASCADE,
  items JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, module_id)
);

ALTER TABLE public.student_nonsense_check_sets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.student_nonsense_check_sets FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.student_nonsense_check_sets TO service_role;

NOTIFY pgrst, 'reload schema';
