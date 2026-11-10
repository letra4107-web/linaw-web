-- Give each incorrect word practice attempt 10 XP while keeping the one-time
-- 50 XP qualified first-attempt reward. Assessment and lesson-page rewards stay unchanged.
BEGIN;

DO $migration$
DECLARE
  definition text;
  original text;
BEGIN
  IF to_regprocedure('public.record_student_progress_event(uuid,uuid,text,text,integer,integer,boolean)') IS NULL THEN
    RAISE EXCEPTION 'Progress event reward function is missing';
  END IF;

  SELECT pg_get_functiondef(
    'public.record_student_progress_event(uuid,uuid,text,text,integer,integer,boolean)'::regprocedure
  ) INTO definition;

  -- Safe to run again after a successful application. Avoid adding a second
  -- variable or duplicate reward fields to the installed function body.
  IF position('attempt_reward integer := 0' IN definition) > 0 THEN
    IF position('''attemptReward''' IN definition) > 0
      AND position('reward+attempt_reward' IN definition) > 0
      AND position('cp.xp,0)+reward+attempt_reward' IN definition) > 0 THEN
      RETURN;
    END IF;
    RAISE EXCEPTION 'The practice XP reward function appears partially updated';
  END IF;

  original := definition;

  definition := replace(definition,
    'reward integer := 0; legacy boolean;',
    'reward integer := 0; attempt_reward integer := 0; legacy boolean;');
  definition := replace(definition,
    'IF reward_status=''awarded'' THEN',
    'attempt_reward := CASE WHEN e.source=''practice'' AND e.channel IN (''mobile'',''web'') AND c.content_type NOT IN (''paragraph'',''story'') AND p_accuracy<88 THEN 10 ELSE 0 END; IF reward_status=''awarded'' THEN');
  definition := replace(definition,
    'SET xp=coalesce(cp.xp,0)+reward,total_attempts=',
    'SET xp=coalesce(cp.xp,0)+reward+attempt_reward,total_attempts=');
  definition := replace(definition,
    '''xpAwarded'',reward,''replayed'',false,',
    '''xpAwarded'',reward+attempt_reward,''replayed'',false,''attemptReward'',jsonb_build_object(''xpAwarded'',attempt_reward),');
  definition := replace(definition,
    '''newlyPersistedAchievementIds'',''[]''::jsonb);',
    '''newlyPersistedAchievementIds'',''[]''::jsonb,''attemptReward'',jsonb_build_object(''xpAwarded'',0));');

  IF definition = original
    OR position('attempt_reward integer := 0' IN definition) = 0
    OR position('reward+attempt_reward' IN definition) = 0
    OR position('''attemptReward''' IN definition) = 0 THEN
    RAISE EXCEPTION 'Could not safely extend the installed practice reward function';
  END IF;

  EXECUTE definition;
END;
$migration$;

NOTIFY pgrst, 'reload schema';
COMMIT;
