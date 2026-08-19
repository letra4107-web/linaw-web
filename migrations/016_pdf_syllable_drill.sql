-- PDF Syllable Drill Checker: teacher-uploaded 3-column syllable-drill PDFs
-- (syllable breakdown | resulting word | illustration) get parsed server-side
-- into scored practice items. Reuses the existing pdf_materials/pdf_assignments
-- flow -- a drill is just a pdf_materials row with drill_status set and child
-- rows in pdf_drill_items -- so assignment, notifications, and RLS ownership
-- checks are inherited for free.

-- ---------------------------------------------------------------------------
-- pdf_materials: mark which rows are (still-being-reviewed / published) drills
-- ---------------------------------------------------------------------------
ALTER TABLE public.pdf_materials
  ADD COLUMN IF NOT EXISTS drill_status TEXT
  CHECK (drill_status IS NULL OR drill_status IN ('pending_review', 'published'));

-- ---------------------------------------------------------------------------
-- pdf_drill_items: one row per scoreable word, parsed from the source PDF
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pdf_drill_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pdf_material_id UUID NOT NULL REFERENCES public.pdf_materials(id) ON DELETE CASCADE,
  band_index INT NOT NULL,
  item_order INT NOT NULL,
  syllable_pattern TEXT NOT NULL,
  word TEXT NOT NULL,
  image_url TEXT,
  xp_value INT NOT NULL DEFAULT 25 CHECK (xp_value > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pdf_drill_items_material_order_idx
  ON public.pdf_drill_items(pdf_material_id, item_order);

ALTER TABLE public.pdf_drill_items ENABLE ROW LEVEL SECURITY;

-- Reuses the SECURITY DEFINER helpers from 007_fix_pdf_rls_recursion.sql so
-- this doesn't reintroduce the same pdf_materials <-> pdf_assignments RLS
-- recursion that migration already had to fix once.
DROP POLICY IF EXISTS "Teachers manage own pdf drill items" ON public.pdf_drill_items;
CREATE POLICY "Teachers manage own pdf drill items"
ON public.pdf_drill_items FOR ALL TO authenticated
USING (public.teacher_owns_pdf_material(pdf_material_id, auth.uid()))
WITH CHECK (public.teacher_owns_pdf_material(pdf_material_id, auth.uid()));

DROP POLICY IF EXISTS "Assigned students read published drill items" ON public.pdf_drill_items;
CREATE POLICY "Assigned students read published drill items"
ON public.pdf_drill_items FOR SELECT TO authenticated
USING (
  public.student_has_pdf_assignment(pdf_material_id, auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.pdf_materials m
    WHERE m.id = pdf_drill_items.pdf_material_id AND m.drill_status = 'published'
  )
);

DROP POLICY IF EXISTS "pdf_drill_items service role" ON public.pdf_drill_items;
CREATE POLICY "pdf_drill_items service role"
ON public.pdf_drill_items FOR ALL
USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- pdf_reading_attempts: extend with drill-scoring columns (nullable -- plain
-- PDF reading attempts, which predate this feature, leave these null)
-- ---------------------------------------------------------------------------
ALTER TABLE public.pdf_reading_attempts
  ADD COLUMN IF NOT EXISTS drill_item_id UUID REFERENCES public.pdf_drill_items(id) ON DELETE CASCADE;
ALTER TABLE public.pdf_reading_attempts
  ADD COLUMN IF NOT EXISTS correct BOOLEAN;
ALTER TABLE public.pdf_reading_attempts
  ADD COLUMN IF NOT EXISTS xp_awarded INT;

-- Belt-and-suspenders against double-awarding XP for the same item even if
-- server logic ever races: at most one "correct" attempt row per
-- student+item can exist.
CREATE UNIQUE INDEX IF NOT EXISTS pdf_reading_attempts_drill_correct_uniq
  ON public.pdf_reading_attempts(student_id, drill_item_id)
  WHERE correct = true;

NOTIFY pgrst, 'reload schema';
