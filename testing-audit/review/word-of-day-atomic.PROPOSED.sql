-- REVIEW ONLY. DO NOT EXECUTE without explicit owner approval.
-- Not part of migrations/. Not installed by any audit/test runner.
-- Requires measured UUID log/child keys and columns below; the installed shared
-- catalog is unverified. Mobile 002/022/034/035 describe the source lineage,
-- not proof of installed state. Existing mobile routines remain unchanged.
-- Preserves the WEB reward of 25 XP; mobile's personalized reward is 50 XP.
BEGIN;

DO $preflight$
DECLARE required record; actual text;
BEGIN
  FOR required IN SELECT * FROM (VALUES
    ('children','id','uuid'),
    ('word_of_day_log','id','uuid'), ('word_of_day_log','child_id','uuid'),
    ('word_of_day_log','word','text'), ('word_of_day_log','date','date'),
    ('word_of_day_log','attempts','int4'), ('word_of_day_log','accuracy','int4'),
    ('word_of_day_log','correct','bool'), ('word_of_day_log','xp_awarded','int4'),
    ('word_of_day_log','completed_at','timestamptz'),
    ('child_progress','child_id','uuid'), ('child_progress','xp','int4'),
    ('child_progress','streak','int4'), ('child_progress','longest_streak','int4'),
    ('child_progress','last_practice_date','date'), ('child_progress','updated_at','timestamptz')
  ) AS contract(table_name,column_name,type_name)
  LOOP
    SELECT c.udt_name INTO actual FROM information_schema.columns c
    WHERE c.table_schema='public' AND c.table_name=required.table_name AND c.column_name=required.column_name;
    IF actual IS DISTINCT FROM required.type_name THEN
      RAISE EXCEPTION 'Unverified/incompatible schema: %.%', required.table_name, required.column_name;
    END IF;
  END LOOP;
END;
$preflight$;

-- One committed response per log/attempt. No transcript or audio is retained.
-- A completed legacy log without a receipt is deliberately NOT auto-credited:
-- its old xp_awarded field cannot prove whether XP was actually persisted.
CREATE TABLE public.word_of_day_web_attempt_receipts (
  log_id uuid NOT NULL REFERENCES public.word_of_day_log(id) ON DELETE CASCADE,
  attempt_number integer NOT NULL CHECK (attempt_number BETWEEN 1 AND 3),
  student_id uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  response jsonb NOT NULL CHECK (jsonb_typeof(response) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (log_id, attempt_number)
);
ALTER TABLE public.word_of_day_web_attempt_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.word_of_day_web_attempt_receipts FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.record_web_word_of_day_attempt(
  p_student_id uuid, p_log_id uuid, p_expected_word text,
  p_attempt_number integer, p_accuracy integer, p_is_correct boolean
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_log public.word_of_day_log%ROWTYPE;
  v_progress public.child_progress%ROWTYPE;
  v_response jsonb;
  v_today date;
  v_final boolean;
  v_reward integer;
  v_streak integer;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Service role required' USING ERRCODE='42501';
  END IF;
  IF p_student_id IS NULL OR p_log_id IS NULL OR p_attempt_number IS NULL
     OR p_attempt_number NOT BETWEEN 1 AND 3 OR p_accuracy IS NULL
     OR p_accuracy NOT BETWEEN 0 AND 100 OR p_is_correct IS NULL THEN
    RAISE EXCEPTION 'Invalid attempt' USING ERRCODE='22023';
  END IF;

  -- Consistent lock order serializes this child's attempts/XP/streak across
  -- workers. Arithmetic UPDATE preserves increments from cooperating writers.
  SELECT p.* INTO v_progress FROM public.child_progress p
  WHERE p.child_id=p_student_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Missing progress' USING ERRCODE='PT503'; END IF;
  SELECT l.* INTO v_log FROM public.word_of_day_log l
  WHERE l.id=p_log_id AND l.child_id=p_student_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No owned log' USING ERRCODE='P0002'; END IF;

  SELECT r.response INTO v_response FROM public.word_of_day_web_attempt_receipts r
  WHERE r.log_id=p_log_id AND r.attempt_number=p_attempt_number AND r.student_id=p_student_id;
  IF FOUND THEN
    RETURN v_response || jsonb_build_object('replayed',true,'originalXpAwarded',v_response->'xpAwarded',
      'xpAwarded',0,'newXp',v_progress.xp,'newStreak',v_progress.streak);
  END IF;
  IF v_log.completed_at IS NOT NULL OR v_log.correct IS TRUE OR COALESCE(v_log.xp_awarded,0) <> 0 THEN
    RAISE EXCEPTION 'Completed before receipt; review required' USING ERRCODE='PT409';
  END IF;
  -- Decide the day after acquiring locks: a request waiting across midnight
  -- must not move last_practice_date backwards after a newer day's reward.
  v_today := (clock_timestamp() AT TIME ZONE 'Asia/Manila')::date;
  IF v_log.date IS DISTINCT FROM v_today OR v_log.word IS DISTINCT FROM p_expected_word
     OR p_attempt_number <> COALESCE(v_log.attempts,0)+1 THEN
    RAISE EXCEPTION 'Stale attempt' USING ERRCODE='PT409';
  END IF;
  v_final := p_is_correct OR p_attempt_number=3;
  v_reward := CASE WHEN p_is_correct THEN 25 ELSE 0 END;

  IF p_is_correct THEN
    v_streak := CASE
      WHEN v_progress.last_practice_date=v_today THEN GREATEST(COALESCE(v_progress.streak,0),1)
      WHEN v_progress.last_practice_date=v_today-1 THEN COALESCE(v_progress.streak,0)+1
      ELSE 1 END;
    UPDATE public.child_progress p
    SET xp=COALESCE(p.xp,0)+v_reward, streak=v_streak,
        longest_streak=GREATEST(COALESCE(p.longest_streak,0),v_streak),
        last_practice_date=v_today, updated_at=now()
    WHERE p.child_id=p_student_id RETURNING p.* INTO v_progress;
  END IF;
  UPDATE public.word_of_day_log l
  SET attempts=p_attempt_number, accuracy=p_accuracy,
      correct=CASE WHEN v_final THEN p_is_correct ELSE l.correct END,
      xp_awarded=CASE WHEN v_final THEN v_reward ELSE l.xp_awarded END,
      completed_at=CASE WHEN v_final THEN now() ELSE NULL END
  WHERE l.id=p_log_id;

  v_response := jsonb_build_object('success',true,'isFinal',v_final,
    'correct',CASE WHEN v_final THEN p_is_correct ELSE NULL END,
    'accuracy',p_accuracy,'xpAwarded',v_reward,'replayed',false,
    'newXp',CASE WHEN p_is_correct THEN v_progress.xp ELSE NULL END,
    'newStreak',CASE WHEN p_is_correct THEN v_progress.streak ELSE NULL END);
  INSERT INTO public.word_of_day_web_attempt_receipts(log_id,attempt_number,student_id,response)
  VALUES(p_log_id,p_attempt_number,p_student_id,v_response);
  -- Any XP/log/receipt/trigger error aborts the entire RPC transaction.
  RETURN v_response;
END;
$function$;

REVOKE ALL ON FUNCTION public.record_web_word_of_day_attempt(uuid,uuid,text,integer,integer,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_web_word_of_day_attempt(uuid,uuid,text,integer,integer,boolean) TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
