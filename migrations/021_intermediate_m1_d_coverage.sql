-- Intermediate Module 1 ("Mga Parirala: A/B/K/D") promised coverage of the
-- letters A, B, K, and D, but a programmatic check found zero occurrences of
-- D anywhere in its 5 phrases ("Buo ang kubo.", "Ang baka ko.", "Buko at
-- ube.", "Baba na.", "Kubo ba o kabibi?") -- a real content gap against its
-- own stated scope. Adds one more simple phrase using D (plus the module's
-- other letters, K and B) to close it.
--
-- Applied directly via the service-role client on 2026-08-19 (verified via
-- get_reading_module_content afterward -- the new phrase appears as a 6th
-- instruction item). This file documents that change and is a no-op if
-- re-run.

DO $$
DECLARE
  v_module_id UUID := 'b6fcba74-8563-41c5-b131-b6d4077ab004';
  v_content_id UUID;
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.reading_content WHERE level = 'Intermediate' AND content_text = 'Dito ang kubo.'
  ) THEN
    RETURN; -- already applied
  END IF;

  INSERT INTO public.reading_content (
    content_text, normalized_text, content_type, level, sequence_no,
    source_sheet, source_row, pattern_note, backend_category,
    is_assessment, is_active, syllable_hyphenation, definition, definition_needs_review
  ) VALUES (
    'Dito ang kubo.', 'dito ang kubo', 'phrase', 'Intermediate', 20001,
    'Intermediate M1 D-coverage fix', 1, 'Intermediate M1 (A/B/K/D group) -- adds missing D coverage', 'intermediate_phrase_fix',
    false, true, NULL, NULL, false
  ) RETURNING id INTO v_content_id;

  INSERT INTO public.reading_module_items (module_id, content_id, item_order, role)
  VALUES (v_module_id, v_content_id, 6, 'instruction');
END $$;

NOTIFY pgrst, 'reload schema';
