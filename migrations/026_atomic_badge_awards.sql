-- Atomic, idempotent badge/XP awards. Existing achievements and XP are not
-- rewritten. Rollback the backend first; retain this audit table even during
-- rollback so already-issued rewards are never lost or issued twice.

CREATE TABLE IF NOT EXISTS public.student_badge_awards (
  student_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL,
  xp_awarded INTEGER NOT NULL CHECK (xp_awarded >= 0 AND xp_awarded <= 500),
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, badge_id)
);

ALTER TABLE public.student_badge_awards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "student_badge_awards service role" ON public.student_badge_awards;
CREATE POLICY "student_badge_awards service role"
ON public.student_badge_awards FOR ALL
USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION public.award_student_badges(p_student_id UUID, p_awards JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_award JSONB;
  v_badge_id TEXT;
  v_xp INTEGER;
  v_inserted TEXT;
  v_total_xp INTEGER := 0;
  v_new JSONB := '[]'::JSONB;
  v_new_ids JSONB := '[]'::JSONB;
  v_new_xp INTEGER;
BEGIN
  IF jsonb_typeof(p_awards) <> 'array' OR jsonb_array_length(p_awards) > 50 THEN
    RAISE EXCEPTION 'invalid badge award payload' USING ERRCODE = '22023';
  END IF;

  PERFORM 1 FROM public.child_progress WHERE child_id = p_student_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('awarded_badge_ids', v_new_ids, 'new_xp', NULL); END IF;

  FOR v_award IN SELECT value FROM jsonb_array_elements(p_awards)
  LOOP
    v_badge_id := v_award->>'id';
    v_xp := (v_award->>'xp')::INTEGER;
    IF v_badge_id !~ '^[a-z0-9_]{1,80}$' OR v_xp < 0 OR v_xp > 500 THEN
      RAISE EXCEPTION 'invalid badge award' USING ERRCODE = '22023';
    END IF;
    v_inserted := NULL;
    INSERT INTO public.student_badge_awards(student_id, badge_id, xp_awarded)
    VALUES (p_student_id, v_badge_id, v_xp)
    ON CONFLICT DO NOTHING
    RETURNING badge_id INTO v_inserted;
    IF v_inserted IS NOT NULL THEN
      v_total_xp := v_total_xp + v_xp;
      v_new := v_new || jsonb_build_array(jsonb_build_object('id', v_badge_id, 'unlockedAt', now()));
      v_new_ids := v_new_ids || jsonb_build_array(v_badge_id);
    END IF;
  END LOOP;

  UPDATE public.child_progress
  SET achievements = COALESCE(achievements, '[]'::JSONB) || v_new,
      xp = COALESCE(xp, 0) + v_total_xp,
      updated_at = now()
  WHERE child_id = p_student_id
  RETURNING xp INTO v_new_xp;

  RETURN jsonb_build_object('awarded_badge_ids', v_new_ids, 'new_xp', v_new_xp);
END;
$$;

REVOKE ALL ON FUNCTION public.award_student_badges(UUID, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.award_student_badges(UUID, JSONB) TO service_role;

NOTIFY pgrst, 'reload schema';
