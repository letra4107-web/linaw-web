-- Phonological-dyslexia-focused decoding check: after finishing a module's
-- real content, the student reads aloud a handful of made-up ("nonsense")
-- words built only from the syllables/letters that exact module taught.
-- Unlike the real assessment, correctly reading a nonsense word can't be
-- memorized/sight-read -- it only works if the student actually decoded the
-- sound pattern, which is the specific skill phonological dyslexia impairs.
--
-- The nonsense words themselves are generated on the fly server-side from
-- the module's own reading_content (see server/lib/nonsenseWords.js), not
-- stored -- there's nothing here to seed. This table only records that a
-- student completed a module's check once, so XP isn't re-farmable on
-- refresh and teachers/parents can eventually see the result. It references
-- the shared reading_modules/children tables (read-only FKs) but does not
-- alter them, so this stays entirely additive to the shared schema.

CREATE TABLE IF NOT EXISTS public.student_nonsense_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.reading_modules(id) ON DELETE CASCADE,
  score NUMERIC(5,2) NOT NULL,
  xp_awarded INT NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, module_id)
);

CREATE INDEX IF NOT EXISTS student_nonsense_checks_student_idx
  ON public.student_nonsense_checks(student_id);

ALTER TABLE public.student_nonsense_checks ENABLE ROW LEVEL SECURITY;

-- XP/completion writes are server-trusted (same convention as pdf_drill_items
-- and word_of_day_log's XP fields) -- the backend computes the score, the
-- client never writes this table directly.
DROP POLICY IF EXISTS "student_nonsense_checks service role" ON public.student_nonsense_checks;
CREATE POLICY "student_nonsense_checks service role"
ON public.student_nonsense_checks FOR ALL
USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Students read own nonsense checks" ON public.student_nonsense_checks;
CREATE POLICY "Students read own nonsense checks"
ON public.student_nonsense_checks FOR SELECT TO authenticated
USING (student_id IN (SELECT id FROM public.children WHERE auth_uid = auth.uid()));

NOTIFY pgrst, 'reload schema';
