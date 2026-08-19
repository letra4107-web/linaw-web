-- Seeds the first real story into Advanced's previously-empty "Kwento 1"
-- placeholder shell: "Isang Araw sa Bahay" (family theme, per the agreed 5-
-- story plan -- Pamilya / Paaralan / Pagkakaibigan / Kalikasan / Bayanihan,
-- increasing in vocabulary/affix complexity). Split into 4 reading_content
-- paragraphs so the student practices in digestible chunks, same pattern as
-- the phrase-level Intermediate modules.
--
-- Deliberately heavy on naka-/nag- prefixed words (nagluluto, naghahanda,
-- nagtutulungan, naglalaro, nakamasid, naramdaman...) -- Filipino affixation
-- is the specific decoding challenge this story targets, and it's exactly
-- what the new "Mga Salitang Hahamunin" warm-up (challengeWords.js) now
-- pulls out automatically before the student reads it.
--
-- Comprehension MC questions are not seeded yet -- story text only, per
-- explicit request to add the story first.
--
-- Applied directly via the service-role client on 2026-08-19; this file
-- documents that change and is a no-op if re-run.

DO $$
DECLARE
  v_module_id UUID := 'b96f03be-00f1-40b5-ad22-874798c87556';
  v_content_id UUID;
  v_paragraphs TEXT[] := ARRAY[
    'Maagang gumising si Ana upang tulungan ang kanyang ina sa bahay.',
    'Nakikita niyang nagluluto na ang kanyang ina ng almusal para sa buong pamilya. Habang naghahanda sila, dumating ang kanyang mga kapatid na sina Ben at Cathy.',
    'Nagtutulungan silang lahat sa paglilinis ng mesa bago kumain. Pagkatapos ng almusal, nagpasya ang kanilang ama na maglakad-lakad sila sa parke.',
    'Masayang naglalaro ang magkakapatid habang nakamasid ang kanilang mga magulang. Nang gumabi na, umuwi silang lahat nang puno ng saya. Naramdaman ni Ana na masuwerte siya dahil sa pagmamahalan ng kanyang pamilya.'
  ];
BEGIN
  IF EXISTS (SELECT 1 FROM public.reading_module_items WHERE module_id = v_module_id) THEN
    RETURN; -- already applied
  END IF;

  FOR i IN 1 .. array_length(v_paragraphs, 1) LOOP
    INSERT INTO public.reading_content (
      content_text, normalized_text, content_type, level, sequence_no,
      source_sheet, source_row, pattern_note, backend_category,
      is_assessment, is_active, syllable_hyphenation, definition, definition_needs_review
    ) VALUES (
      v_paragraphs[i], lower(v_paragraphs[i]), 'paragraph', 'Advanced', 30000 + i,
      'Advanced Kwento 1 - Isang Araw sa Bahay', i, 'Advanced M1 story -- family theme, naka-/nag- affix focus', 'advanced_story',
      false, true, NULL, NULL, false
    ) RETURNING id INTO v_content_id;

    INSERT INTO public.reading_module_items (module_id, content_id, item_order, role)
    VALUES (v_module_id, v_content_id, i, 'instruction');
  END LOOP;

  UPDATE public.reading_modules
  SET
    title = 'Kwento 1: Isang Araw sa Bahay',
    description = 'Basahin ang kwento tungkol sa isang masayang araw ng pamilya ni Ana.'
  WHERE id = v_module_id;
END $$;

NOTIFY pgrst, 'reload schema';
