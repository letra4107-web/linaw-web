-- Allow the same first-attempt practice reward on web and mobile.
-- The 88% threshold, word-only scope, and one-time reward ledger stay intact.
BEGIN;

DO $migration$
DECLARE
  definition text;
BEGIN
  IF to_regprocedure('public.record_student_progress_event(uuid,uuid,text,text,integer,integer,boolean)') IS NULL THEN
    RAISE EXCEPTION 'Progress event reward function is missing';
  END IF;

  SELECT pg_get_functiondef(
    'public.record_student_progress_event(uuid,uuid,text,text,integer,integer,boolean)'::regprocedure
  ) INTO definition;

  IF position($find$e.channel<>'mobile'$find$ IN definition) = 0 THEN
    RAISE EXCEPTION 'Expected mobile-only practice reward gate was not found';
  END IF;

  definition := replace(
    definition,
    $find$e.channel<>'mobile'$find$,
    $replace$e.channel NOT IN ('mobile','web')$replace$
  );

  EXECUTE definition;
END;
$migration$;

NOTIFY pgrst, 'reload schema';
COMMIT;
