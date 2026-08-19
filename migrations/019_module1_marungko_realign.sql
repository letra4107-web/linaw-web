-- Realigns Beginner Module 1 ("Mga Patinig") to start with the Marungko
-- Approach's actual first letter set -- m, s, a, i, o -- instead of the
-- alphabetical A-E-I-O-U it shipped with. Panel feedback: isolated vowel
-- sounds alone are hard for Grade 1-2 to produce, and the module wasn't
-- based on any citable reading-instruction source. Marungko starts with 2
-- functional consonants (m, s) alongside 3 vowels specifically so the very
-- first lesson can already form real simple syllables/words (e.g. "sa"),
-- not just isolated vowel sounds.
-- Source: https://depedtambayan.org/marungko-approach/ ("Instead of the
-- usual arrangement (order) of letters in the alphabet, it starts with
-- m, s, a, i, o...")
--
-- This is additive-only, on purpose: existing A/E/I/O/U reading_content
-- rows, their reading_module_items links, and the module's existing
-- assessment_items (which reference those exact module_item rows) are left
-- completely untouched -- deleting/replacing them would orphan a live
-- assessment and erase real students' existing completions on E and U.
-- Instead, M and S are added as two new instruction items, and item_order
-- is renumbered (a pure display-order change, not a content/FK change) so
-- the module now teaches m, s, a, i, o, e, u in that sequence.

DO $$
DECLARE
  v_module_id UUID := 'bf0bf84b-5dc5-4bbc-8892-8683c22c5170';
  v_m_content_id UUID;
  v_s_content_id UUID;
BEGIN
  -- Idempotent: skip entirely if this has already been applied.
  IF EXISTS (
    SELECT 1 FROM public.reading_content
    WHERE level = 'Beginner' AND content_type = 'phonetic' AND content_text = 'M'
  ) THEN
    RETURN;
  END IF;

  INSERT INTO public.reading_content (
    content_text, normalized_text, content_type, level, sequence_no,
    source_sheet, source_row, pattern_note, backend_category,
    is_assessment, is_active, syllable_hyphenation, definition, definition_needs_review
  ) VALUES (
    'M', 'm', 'phonetic', 'Beginner', 10006,
    'Marungko Realignment', 1, 'Marungko Approach first letter set (m, s, a, i, o)', 'marungko_first_letters',
    false, true, 'M', 'Isang katinig na unang itinuturo sa Marungko Approach.', false
  ) RETURNING id INTO v_m_content_id;

  INSERT INTO public.reading_content (
    content_text, normalized_text, content_type, level, sequence_no,
    source_sheet, source_row, pattern_note, backend_category,
    is_assessment, is_active, syllable_hyphenation, definition, definition_needs_review
  ) VALUES (
    'S', 's', 'phonetic', 'Beginner', 10007,
    'Marungko Realignment', 2, 'Marungko Approach first letter set (m, s, a, i, o)', 'marungko_first_letters',
    false, true, 'S', 'Isang katinig na unang itinuturo sa Marungko Approach.', false
  ) RETURNING id INTO v_s_content_id;

  -- (module_id, item_order) is uniquely constrained, and A currently already
  -- sits at item_order=1 -- bump the existing 5 out of the way first so the
  -- M/S insert below doesn't collide, then renumber down to their final spots.
  UPDATE public.reading_module_items SET item_order = 103 WHERE id = 'a8111782-aafa-4480-a82a-5a302f2eff05'; -- A
  UPDATE public.reading_module_items SET item_order = 104 WHERE id = '260d2933-64c9-4ea0-9c77-df787344d7e4'; -- I
  UPDATE public.reading_module_items SET item_order = 105 WHERE id = '63582872-cfe5-478e-adbc-88773e59b168'; -- O
  UPDATE public.reading_module_items SET item_order = 106 WHERE id = '405b7fba-14b7-4dfa-b243-cdc0cc36a78f'; -- E
  UPDATE public.reading_module_items SET item_order = 107 WHERE id = '5091cd2c-e51f-4ea7-8aec-29fdbddf4a2a'; -- U

  INSERT INTO public.reading_module_items (module_id, content_id, item_order, role)
  VALUES
    (v_module_id, v_m_content_id, 1, 'instruction'),
    (v_module_id, v_s_content_id, 2, 'instruction');

  -- Push the existing A/I/O/E/U items down to make room -- their content_id
  -- and module_item id are untouched, so completions/assessment_items keep
  -- pointing at exactly the same rows they always did.
  UPDATE public.reading_module_items SET item_order = 3 WHERE id = 'a8111782-aafa-4480-a82a-5a302f2eff05'; -- A
  UPDATE public.reading_module_items SET item_order = 4 WHERE id = '260d2933-64c9-4ea0-9c77-df787344d7e4'; -- I
  UPDATE public.reading_module_items SET item_order = 5 WHERE id = '63582872-cfe5-478e-adbc-88773e59b168'; -- O
  UPDATE public.reading_module_items SET item_order = 6 WHERE id = '405b7fba-14b7-4dfa-b243-cdc0cc36a78f'; -- E
  UPDATE public.reading_module_items SET item_order = 7 WHERE id = '5091cd2c-e51f-4ea7-8aec-29fdbddf4a2a'; -- U

  UPDATE public.reading_modules
  SET
    title = 'Unang mga Titik',
    description = 'Kilalanin at bigkasin ang m, s, a, i, o -- ang unang mga titik sa Marungko Approach.'
  WHERE id = v_module_id;
END $$;

NOTIFY pgrst, 'reload schema';
