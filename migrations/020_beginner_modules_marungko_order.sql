-- Reorders Beginner Modules 2-6 to match the Marungko Approach's actual
-- syllable-pair sequence: Ba, Da, Ga, Ha, Ka, La, Ma, Na, Nga, Pa, Ra, Sa,
-- Ta, Wa, Ya (source: https://depedtambayan.org/marungko-approach/). The
-- modules already existed with the right content, just numbered
-- Ba, Ka, Da, Ga, Ha instead -- only Ka/Da/Ga/Ha needed to move.
--
-- Applied directly via the service-role client on 2026-08-19 (verified zero
-- students had any completions on these modules at the time, so there was
-- no progression to disrupt). This file documents that change and is safe
-- to run again -- it's a no-op if the order already matches.

DO $$
BEGIN
  IF (SELECT title FROM public.reading_modules WHERE level = 'Beginner' AND module_number = 3) = 'Hanay ng Da' THEN
    RETURN; -- already applied
  END IF;

  -- Bump out of the way first to avoid colliding with the unique
  -- (level, module_number) constraint while reassigning.
  UPDATE public.reading_modules SET module_number = 103 WHERE id = '4a51582c-c69a-4fe5-8df3-c44efa5309a1'; -- Ka
  UPDATE public.reading_modules SET module_number = 104 WHERE id = 'b82d10a0-e206-41d1-8ddd-9ddb0b25adf8'; -- Da
  UPDATE public.reading_modules SET module_number = 105 WHERE id = '3599eb59-5de2-41f3-b07e-1606693aec40'; -- Ga
  UPDATE public.reading_modules SET module_number = 106 WHERE id = '3dd9f063-6f37-4797-9d7d-80095840d580'; -- Ha

  UPDATE public.reading_modules SET module_number = 3 WHERE id = 'b82d10a0-e206-41d1-8ddd-9ddb0b25adf8'; -- Da
  UPDATE public.reading_modules SET module_number = 4 WHERE id = '3599eb59-5de2-41f3-b07e-1606693aec40'; -- Ga
  UPDATE public.reading_modules SET module_number = 5 WHERE id = '3dd9f063-6f37-4797-9d7d-80095840d580'; -- Ha
  UPDATE public.reading_modules SET module_number = 6 WHERE id = '4a51582c-c69a-4fe5-8df3-c44efa5309a1'; -- Ka
END $$;

NOTIFY pgrst, 'reload schema';
