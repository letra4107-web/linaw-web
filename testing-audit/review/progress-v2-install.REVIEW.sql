-- REVIEW ONLY: never run against a shared project without explicit approval.
-- One-time proposal. Prerequisites: mobile 024/025/026/042 and web 026 badge ledger.
-- Does NOT install or execute the separate Word-of-Day proposal.
BEGIN;

-- Owner-supplied catalog reviewed on 29 October 2026. This file remains unapproved.
-- Fail on drift, partial installs, or absent defaults before changing the schema.
DO $preflight$
DECLARE wanted record; fn oid;
BEGIN
  FOR wanted IN SELECT * FROM (VALUES
    ('public.award_student_badges(uuid,jsonb)','b1a18d5cba78ba0e7d6a4716b31ce0b1'),
    ('public.get_student_reading_progress(uuid)','fae1a3bfe382acc8011cdc4323a51fef'),
    ('public.is_student_module_unlocked(uuid,uuid)','c8a841ec51d5930509ae9f2a7b02f451'),
    ('public.record_student_content_attempt(uuid,uuid,numeric,text,integer,boolean,text)','2405a4375b5f588dcf4295abc2030d6e'),
    ('public.start_module_assessment(uuid,uuid)','5de32a1262f7bfbc8606d9dade0c1ba8'),
    ('public.submit_module_assessment(uuid,uuid,jsonb)','220cc1e7cd08e1c9c25061da05beb4f1')
  ) expected(signature,definition_md5) LOOP
    fn := to_regprocedure(wanted.signature);
    IF fn IS NULL OR md5(pg_get_functiondef(fn)) IS DISTINCT FROM wanted.definition_md5 THEN
      RAISE EXCEPTION 'Progress prerequisite changed since review: %', wanted.signature;
    END IF;
  END LOOP;
  IF to_regprocedure('public.get_student_official_reading_level(uuid)') IS NULL
     OR to_regprocedure('public.get_student_module_level(uuid)') IS NULL THEN
    RAISE EXCEPTION 'Missing existing module-level helper';
  END IF;
  IF to_regclass('public.student_progress_events') IS NOT NULL
     OR to_regclass('public.student_content_base_rewards') IS NOT NULL
     OR to_regclass('public.student_assessment_submit_receipts') IS NOT NULL
     OR EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
       WHERE n.nspname='public' AND p.proname IN ('progress_contract_version','stamp_progress_revision',
         'start_student_progress_event','record_student_progress_event','reconcile_verified_student_badges',
         'submit_module_assessment_before_progress_events'))
     OR EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public'
       AND ((table_name='child_progress' AND column_name IN ('progress_revision','progress_legacy_completed_words'))
         OR (table_name='pronunciation_practice_sessions' AND column_name='progress_event_id'))) THEN
    RAISE EXCEPTION 'Progress layer already or partially installed; a separate upgrade review is required';
  END IF;
  -- These required columns are omitted by the established INSERT statements.
  -- The supplied catalog did not include defaults, so verify their presence here.
  FOR wanted IN SELECT * FROM (VALUES
    ('pronunciation_practice_sessions','id'),('pronunciation_practice_sessions','created_at'),
    ('pronunciation_practice_sessions','attempts'),('student_content_attempts','id'),
    ('student_content_completions','id'),('student_module_assessment_attempts','id'),
    ('student_module_assessment_attempts','status'),('student_module_assessment_attempts','started_at'),
    ('student_module_assessment_responses','id'),('student_module_completions','id'),
    ('student_badge_awards','awarded_at'),('child_progress','longest_streak')
  ) expected(table_name,column_name) LOOP
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns c WHERE c.table_schema='public'
      AND c.table_name=wanted.table_name AND c.column_name=wanted.column_name AND c.column_default IS NOT NULL) THEN
      RAISE EXCEPTION 'Required existing INSERT default unavailable: %.%',wanted.table_name,wanted.column_name;
    END IF;
  END LOOP;
END $preflight$;


DO $$ BEGIN
  IF to_regprocedure('public.record_student_content_attempt(uuid,uuid,numeric,text,integer,boolean,text)') IS NULL
     OR to_regprocedure('public.award_student_badges(uuid,jsonb)') IS NULL
     OR to_regprocedure('public.submit_module_assessment(uuid,uuid,jsonb)') IS NULL
     OR to_regclass('public.student_badge_awards') IS NULL THEN
    RAISE EXCEPTION 'Missing verified progress prerequisites';
  END IF;
END $$;

-- Fail installation atomically on incompatible measured schema; no guessing TEXT/UUID.
DO $$ DECLARE required record; actual text; BEGIN
 FOR required IN SELECT * FROM (VALUES
  ('children','id','uuid'),('children','auth_uid','uuid|text'),
  ('child_progress','child_id','uuid'),('child_progress','xp','int4'),('child_progress','total_attempts','int4'),
  ('child_progress','accuracy_sum','int4'),('child_progress','activities_completed','int4'),
  ('child_progress','completed_words','_text'),('child_progress','achievements','jsonb'),('child_progress','badges','jsonb'),
  ('child_progress','word_count','int4'),('child_progress','updated_at','timestamptz'),
  ('reading_content','id','uuid'),('reading_content','content_text','text'),('reading_content','is_active','bool'),
  ('student_content_attempts','id','uuid'),('student_module_assessment_attempts','id','uuid'),
  ('student_badge_awards','student_id','uuid'),('pronunciation_practice_sessions','student_id','uuid')
 ) contract(table_name,column_name,type_name) LOOP
  SELECT udt_name INTO actual FROM information_schema.columns WHERE table_schema='public' AND table_name=required.table_name AND column_name=required.column_name;
  IF actual IS NULL OR NOT actual=ANY(string_to_array(required.type_name,'|')) THEN RAISE EXCEPTION 'Unverified/incompatible progress schema: %.%',required.table_name,required.column_name; END IF;
 END LOOP;
END $$;

ALTER TABLE public.child_progress ADD COLUMN progress_revision bigint NOT NULL DEFAULT 0;
-- Snapshot only the uncertain pre-contract labels, once under the learner lock.
-- New verified practice must not turn another same-label content UUID into
-- alleged legacy history. This metadata never establishes reward eligibility.
ALTER TABLE public.child_progress ADD COLUMN progress_legacy_completed_words text[];
CREATE FUNCTION public.stamp_progress_revision() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
BEGIN NEW.progress_revision:=OLD.progress_revision+1; NEW.updated_at:=clock_timestamp(); RETURN NEW; END $$;
CREATE TRIGGER stamp_progress_revision BEFORE UPDATE ON public.child_progress FOR EACH ROW EXECUTE FUNCTION public.stamp_progress_revision();

CREATE TABLE public.student_progress_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.children(id),
  content_id uuid NOT NULL REFERENCES public.reading_content(id),
  source text NOT NULL CHECK (source IN ('practice','assessment')),
  channel text NOT NULL CHECK (channel IN ('mobile','web')),
  assessment_attempt_id uuid REFERENCES public.student_module_assessment_attempts(id),
  assessment_item_id uuid REFERENCES public.reading_module_assessment_items(id),
  expected_text text NOT NULL,
  issued_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  expires_at timestamptz NOT NULL DEFAULT clock_timestamp() + interval '10 minutes',
  request jsonb,
  accuracy integer CHECK (accuracy BETWEEN 0 AND 100),
  content_attempt_id uuid REFERENCES public.student_content_attempts(id),
  reward_content_id uuid REFERENCES public.reading_content(id),
  response jsonb,
  CHECK ((source='assessment') = (assessment_attempt_id IS NOT NULL AND assessment_item_id IS NOT NULL)),
  UNIQUE(student_id,reward_content_id),
  UNIQUE(assessment_attempt_id,assessment_item_id)
);
CREATE INDEX student_progress_events_student_idx ON public.student_progress_events(student_id,issued_at);
ALTER TABLE public.student_progress_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.student_progress_events FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.student_progress_events TO service_role;
CREATE POLICY service_events ON public.student_progress_events TO service_role USING (true) WITH CHECK (true);

-- Option 1: payment identity is the child + fixed reward namespace + canonical
-- reading_content UUID. Modules, assessment runs, labels and tickets are not keys.
-- A zero-amount row freezes uncertain legacy eligibility before new attempts can
-- obscure it. It is not proof of payment. Only a committed awarded_event_id is.
ALTER TABLE public.student_progress_events ADD UNIQUE(id,student_id,content_id);
CREATE TABLE public.student_content_base_rewards (
  student_id uuid NOT NULL REFERENCES public.children(id),
  reward_type text NOT NULL DEFAULT 'content_practice' CHECK (reward_type='content_practice'),
  content_id uuid NOT NULL REFERENCES public.reading_content(id),
  legacy_review_required boolean NOT NULL,
  awarded_event_id uuid UNIQUE,
  amount integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  awarded_at timestamptz,
  PRIMARY KEY(student_id,reward_type,content_id),
  FOREIGN KEY(awarded_event_id,student_id,content_id)
    REFERENCES public.student_progress_events(id,student_id,content_id),
  CHECK ((awarded_event_id IS NULL AND amount=0 AND awarded_at IS NULL)
    OR (awarded_event_id IS NOT NULL AND amount=50 AND awarded_at IS NOT NULL AND NOT legacy_review_required))
);
ALTER TABLE public.student_content_base_rewards ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.student_content_base_rewards FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.student_content_base_rewards TO service_role;
CREATE POLICY service_content_rewards ON public.student_content_base_rewards TO service_role USING (true);
-- Exact linkage distinguishes new server sessions from uncertain historical
-- sessions. Nullable for history; no rewriting or inferred historical payments.
ALTER TABLE public.pronunciation_practice_sessions ADD COLUMN progress_event_id uuid UNIQUE
  REFERENCES public.student_progress_events(id);

CREATE TABLE public.student_assessment_submit_receipts (
  attempt_id uuid PRIMARY KEY REFERENCES public.student_module_assessment_attempts(id),
  student_id uuid NOT NULL REFERENCES public.children(id),
  request jsonb NOT NULL, response jsonb NOT NULL
);
ALTER TABLE public.student_assessment_submit_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.student_assessment_submit_receipts FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.reconcile_verified_student_badges(p_student_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE p public.child_progress%ROWTYPE; n int; avg_score numeric; best int; perfect int;
  difficult boolean; conquered int; baseline int; awards jsonb := '[]'; ids jsonb;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Service role required' USING ERRCODE='42501'; END IF;
  SELECT * INTO p FROM public.child_progress WHERE child_id=p_student_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Progress not initialized' USING ERRCODE='PT503'; END IF;
  -- Historical client totals and sessions cannot establish new award eligibility.
  SELECT count(*),avg(accuracy),max(accuracy) INTO n,avg_score,best
  FROM public.student_progress_events WHERE student_id=p_student_id AND source='practice' AND content_attempt_id IS NOT NULL;
  SELECT accuracy INTO baseline FROM public.student_progress_events
  WHERE student_id=p_student_id AND source='practice' AND content_attempt_id IS NOT NULL ORDER BY issued_at,id LIMIT 1;
  SELECT count(*) FILTER (WHERE max_score=100),coalesce(bool_or(tries>=5),false),count(*) FILTER (WHERE tries>=3 AND max_score>=88)
  INTO perfect,difficult,conquered FROM (
    SELECT expected_text,count(*) tries,max(accuracy) max_score FROM public.student_progress_events
    WHERE student_id=p_student_id AND source='practice' AND content_attempt_id IS NOT NULL GROUP BY expected_text
  ) s;
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'xp',xp)),'[]') INTO awards FROM (VALUES
    ('unang_bigkas',20,n>=1),('malinaw_magsalita',30,best>=90),('tamang_bigkas',40,perfect>=5),
    ('boses_ng_tagumpay',60,n>=25),('bigkas_champion',60,n>=10 AND avg_score>=90),
    ('hindi_ako_susuko',30,difficult),('lakas_ng_loob',40,conquered>=5),
    ('matalinong_mag_aaral',40,n>=5 AND avg_score-baseline>=20)
  ) b(id,xp,eligible)
  WHERE eligible AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(coalesce(p.achievements,'[]')) a WHERE a->>'id'=b.id);
  IF jsonb_array_length(awards)>0 AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(coalesce(p.achievements,'[]')) a WHERE a->>'id'='aking_unang_tagumpay') THEN
    awards := awards || jsonb_build_array(jsonb_build_object('id','aking_unang_tagumpay','xp',25));
  END IF;
  -- Reuse the established badge ledger/atomic award function; never reissue historical IDs.
  IF jsonb_array_length(awards)=0 THEN RETURN jsonb_build_object('awarded_badge_ids','[]'::jsonb,'new_xp',p.xp); END IF;
  RETURN public.award_student_badges(p_student_id,awards);
END $$;

CREATE FUNCTION public.start_student_progress_event(p_student_id uuid,p_content_id uuid,p_source text,
  p_assessment_attempt_id uuid DEFAULT NULL,p_assessment_item_id uuid DEFAULT NULL,p_channel text DEFAULT 'mobile',p_new_attempt boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE c public.reading_content%ROWTYPE; e public.student_progress_events%ROWTYPE; a record; v_level text;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Service role required' USING ERRCODE='42501'; END IF;
  IF p_source IS NULL OR p_source NOT IN ('practice','assessment') THEN RAISE EXCEPTION 'Invalid source' USING ERRCODE='22023'; END IF;
  IF p_channel IS NULL OR p_channel NOT IN ('mobile','web') THEN RAISE EXCEPTION 'Invalid channel' USING ERRCODE='22023'; END IF;
  IF p_new_attempt IS NULL THEN RAISE EXCEPTION 'Invalid attempt mode' USING ERRCODE='22023'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.children WHERE id=p_student_id) THEN RAISE EXCEPTION 'Student not found' USING ERRCODE='P0002'; END IF;
  v_level := public.get_student_reading_progress(p_student_id)->>'effective_level';
  IF v_level IS NULL OR v_level NOT IN ('Beginner','Intermediate','Advanced') THEN RAISE EXCEPTION 'Official reading level unavailable' USING ERRCODE='PT503'; END IF;
  INSERT INTO public.child_progress(child_id,xp,total_attempts,accuracy_sum,activities_completed,completed_words,achievements,badges,level)
  VALUES(p_student_id,0,0,0,0,'{}','[]','[]',v_level) ON CONFLICT(child_id) DO NOTHING;
  PERFORM 1 FROM public.child_progress WHERE child_id=p_student_id FOR UPDATE;
  UPDATE public.child_progress SET progress_legacy_completed_words=coalesce(completed_words,'{}')
    WHERE child_id=p_student_id AND progress_legacy_completed_words IS NULL;
  SELECT * INTO c FROM public.reading_content WHERE id=p_content_id AND is_active FOR SHARE;
  IF NOT FOUND OR nullif(btrim(c.content_text),'') IS NULL THEN RAISE EXCEPTION 'Active content not found' USING ERRCODE='P0002'; END IF;
  IF p_source='assessment' THEN
    SELECT attempt.id INTO a FROM public.student_module_assessment_attempts attempt
    JOIN public.reading_module_assessment_items item ON item.assessment_id=attempt.assessment_id
    JOIN public.reading_module_items mi ON mi.id=item.module_item_id
    JOIN public.reading_module_assessments assessment ON assessment.id=attempt.assessment_id AND assessment.is_active
    WHERE attempt.id=p_assessment_attempt_id AND attempt.student_id=p_student_id AND attempt.status='in_progress'
      AND item.id=p_assessment_item_id AND mi.content_id=p_content_id FOR UPDATE OF attempt;
    IF NOT FOUND THEN RAISE EXCEPTION 'No owned active assessment question' USING ERRCODE='42501'; END IF;
  ELSE
    IF p_assessment_attempt_id IS NOT NULL OR p_assessment_item_id IS NOT NULL OR c.is_assessment OR c.content_type IN ('paragraph','story') THEN
      RAISE EXCEPTION 'Assessment context required' USING ERRCODE='42501'; END IF;
    v_level := public.get_student_reading_progress(p_student_id)->>'effective_level';
    IF array_position(ARRAY['Beginner','Intermediate','Advanced'],c.level) > array_position(ARRAY['Beginner','Intermediate','Advanced'],v_level)
       OR v_level IS NULL THEN RAISE EXCEPTION 'Content is locked' USING ERRCODE='42501'; END IF;
    IF EXISTS(SELECT 1 FROM public.reading_module_items mi JOIN public.reading_modules m ON m.id=mi.module_id AND m.is_active WHERE mi.content_id=p_content_id)
      AND NOT EXISTS(SELECT 1 FROM public.reading_module_items mi JOIN public.reading_modules m ON m.id=mi.module_id AND m.is_active
        WHERE mi.content_id=p_content_id AND mi.role<>'assessment' AND public.is_student_module_unlocked(p_student_id,mi.module_id)) THEN
      RAISE EXCEPTION 'Module is locked' USING ERRCODE='42501'; END IF;
  END IF;
  SELECT * INTO e FROM public.student_progress_events WHERE student_id=p_student_id AND content_id=p_content_id AND source=p_source AND (p_source='assessment' OR channel=p_channel)
    AND assessment_attempt_id IS NOT DISTINCT FROM p_assessment_attempt_id AND assessment_item_id IS NOT DISTINCT FROM p_assessment_item_id
    AND ((response IS NULL AND expires_at>clock_timestamp()) OR p_source='assessment')
    AND (p_source='assessment' OR NOT p_new_attempt) ORDER BY issued_at DESC LIMIT 1;
  IF NOT FOUND THEN
    INSERT INTO public.student_progress_events(student_id,content_id,source,channel,assessment_attempt_id,assessment_item_id,expected_text)
    VALUES(p_student_id,p_content_id,p_source,p_channel,p_assessment_attempt_id,p_assessment_item_id,c.content_text) RETURNING * INTO e;
  ELSIF e.source='assessment' AND e.response IS NULL AND e.expires_at<=clock_timestamp() THEN
    UPDATE public.student_progress_events SET expires_at=clock_timestamp()+interval '10 minutes',expected_text=c.content_text WHERE id=e.id RETURNING * INTO e;
  END IF;
  RETURN jsonb_build_object('eventId',e.id,'expiresAt',e.expires_at);
END $$;

CREATE FUNCTION public.record_student_progress_event(p_student_id uuid,p_event_id uuid,p_expected_text text,
  p_transcript text,p_accuracy integer,p_duration_seconds integer DEFAULT NULL,p_is_correct boolean DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE e public.student_progress_events%ROWTYPE; c public.reading_content%ROWTYPE; p public.child_progress%ROWTYPE;
  ledger public.student_content_base_rewards%ROWTYPE;
  input jsonb; result jsonb; badge_result jsonb; reward integer := 0; legacy boolean; valid_context jsonb; v_correct boolean;
  reward_status text;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Service role required' USING ERRCODE='42501'; END IF;
  IF p_transcript IS NULL OR length(btrim(p_transcript)) NOT BETWEEN 1 AND 2000 OR p_accuracy IS NULL OR p_accuracy NOT BETWEEN 0 AND 100
    OR (p_duration_seconds IS NOT NULL AND p_duration_seconds NOT BETWEEN 0 AND 3600) THEN RAISE EXCEPTION 'Invalid answer' USING ERRCODE='22023'; END IF;
  SELECT * INTO p FROM public.child_progress WHERE child_id=p_student_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Progress not initialized' USING ERRCODE='PT503'; END IF;
  IF p.progress_legacy_completed_words IS NULL THEN
    UPDATE public.child_progress SET progress_legacy_completed_words=coalesce(completed_words,'{}')
      WHERE child_id=p_student_id RETURNING * INTO p;
  END IF;
  SELECT * INTO e FROM public.student_progress_events WHERE id=p_event_id AND student_id=p_student_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Owned event not found' USING ERRCODE='P0002'; END IF;
  input := jsonb_build_object('transcript',p_transcript,'durationSeconds',p_duration_seconds);
  v_correct := coalesce(p_is_correct,p_accuracy>=88);
  IF e.response IS NOT NULL THEN
    IF e.request IS DISTINCT FROM input THEN RAISE EXCEPTION 'Changed replay' USING ERRCODE='PT409'; END IF;
    RETURN e.response || jsonb_build_object('progress',to_jsonb(p),'replayed',true,'xpAwarded',0,
      'baseReward',(e.response->'baseReward') || jsonb_build_object('xpAwarded',0,'status',
        CASE WHEN e.response->'baseReward'->>'status'='awarded' THEN 'already_rewarded' ELSE e.response->'baseReward'->>'status' END),
      'newlyPersistedAchievementIds','[]'::jsonb);
  END IF;
  IF e.expires_at <= clock_timestamp() THEN RAISE EXCEPTION 'Expired event' USING ERRCODE='PT410'; END IF;
  IF e.expected_text IS DISTINCT FROM p_expected_text THEN RAISE EXCEPTION 'Changed event' USING ERRCODE='PT409'; END IF;
  SELECT * INTO c FROM public.reading_content WHERE id=e.content_id AND is_active FOR SHARE;
  IF NOT FOUND OR c.content_text IS DISTINCT FROM e.expected_text THEN RAISE EXCEPTION 'Stale content' USING ERRCODE='PT409'; END IF;
  -- Revalidate all authoritative gates inside this transaction before recording.
  valid_context := public.start_student_progress_event(p_student_id,e.content_id,e.source,e.assessment_attempt_id,e.assessment_item_id,e.channel);
  -- Evidence of *possible* old payment blocks automatic backfill. Text fields
  -- only veto uncertain history; they never establish identity or eligibility.
  -- Freeze this decision before writing any new verified attempt on either client.
  SELECT EXISTS(SELECT 1 FROM public.student_content_attempts ca
      WHERE ca.student_id=p_student_id AND ca.content_id=e.content_id
        AND NOT EXISTS(SELECT 1 FROM public.student_progress_events pe WHERE pe.content_attempt_id=ca.id))
    OR EXISTS(SELECT 1 FROM public.student_content_completions cc
      WHERE cc.student_id=p_student_id AND cc.content_id=e.content_id
        AND NOT EXISTS(SELECT 1 FROM public.student_progress_events pe WHERE pe.content_attempt_id=cc.qualifying_attempt_id))
    OR EXISTS(SELECT 1 FROM public.pronunciation_practice_sessions s
      WHERE s.student_id=p_student_id AND s.progress_event_id IS NULL AND lower(btrim(s.word))=lower(btrim(c.content_text)))
    OR EXISTS(SELECT 1 FROM unnest(coalesce(p.progress_legacy_completed_words,'{}')) w WHERE lower(btrim(w))=lower(btrim(c.content_text))) INTO legacy;
  INSERT INTO public.student_content_base_rewards(student_id,content_id,legacy_review_required)
    VALUES(p_student_id,e.content_id,legacy) ON CONFLICT(student_id,reward_type,content_id) DO NOTHING;
  SELECT * INTO ledger FROM public.student_content_base_rewards
    WHERE student_id=p_student_id AND reward_type='content_practice' AND content_id=e.content_id FOR UPDATE;
  result := public.record_student_content_attempt(p_student_id,e.content_id,p_accuracy,p_transcript,p_duration_seconds,
    e.source='assessment' AND c.content_type IN ('paragraph','story'),e.source);
  reward_status := CASE
    WHEN ledger.awarded_event_id IS NOT NULL THEN 'already_rewarded'
    WHEN ledger.legacy_review_required THEN 'legacy_review_required'
    WHEN e.source<>'practice' OR e.channel<>'mobile' THEN 'not_applicable'
    WHEN p_accuracy<88 THEN 'not_eligible'
    ELSE 'awarded' END;
  IF reward_status='awarded' THEN
    reward:=50;
    UPDATE public.student_content_base_rewards SET awarded_event_id=e.id,amount=reward,awarded_at=clock_timestamp()
      WHERE student_id=p_student_id AND reward_type='content_practice' AND content_id=e.content_id;
  END IF;
  UPDATE public.student_progress_events SET request=input,accuracy=p_accuracy,content_attempt_id=(result->>'attempt_id')::uuid,
    reward_content_id=CASE WHEN reward>0 THEN e.content_id ELSE NULL END WHERE id=e.id;
  IF e.source='practice' THEN
    INSERT INTO public.pronunciation_practice_sessions(student_id,word,spoken_text,accuracy_percentage,is_correct,duration_seconds,practice_source,progress_event_id)
    VALUES(p_student_id,c.content_text,p_transcript,p_accuracy,v_correct,p_duration_seconds,'practice',e.id);
    UPDATE public.child_progress cp SET xp=coalesce(cp.xp,0)+reward,total_attempts=coalesce(cp.total_attempts,0)+1,
      baseline_accuracy=coalesce(cp.baseline_accuracy,p_accuracy),accuracy_sum=coalesce(cp.accuracy_sum,0)+p_accuracy,
      completed_words=CASE WHEN p_accuracy>=88 THEN ARRAY(SELECT DISTINCT unnest(coalesce(cp.completed_words,'{}')||ARRAY[c.content_text])) ELSE cp.completed_words END,
      updated_at=now() WHERE child_id=p_student_id;
    UPDATE public.child_progress SET word_count=cardinality(completed_words) WHERE child_id=p_student_id;
  END IF;
  badge_result := public.reconcile_verified_student_badges(p_student_id);
  SELECT * INTO p FROM public.child_progress WHERE child_id=p_student_id;
  result := result || jsonb_build_object('accuracy',p_accuracy,'correct',v_correct);
  result := jsonb_build_object('success',true,'result',result,'progress',to_jsonb(p),'xpAwarded',reward,'replayed',false,
    'baseReward',jsonb_build_object('rewardType','content_practice','contentId',e.content_id,'status',reward_status,'xpAwarded',reward),
    'newlyPersistedAchievementIds',badge_result->'awarded_badge_ids');
  UPDATE public.student_progress_events SET response=result WHERE id=e.id;
  RETURN result;
END $$;

-- Keep the existing assessment implementation, but require verified bound answers
-- and retain a receipt so a lost submit acknowledgement can be retried safely.
ALTER FUNCTION public.submit_module_assessment(uuid,uuid,jsonb) RENAME TO submit_module_assessment_before_progress_events;
REVOKE ALL ON FUNCTION public.submit_module_assessment_before_progress_events(uuid,uuid,jsonb) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.submit_module_assessment(p_student_id uuid,p_attempt_id uuid,p_responses jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE receipt public.student_assessment_submit_receipts%ROWTYPE; result jsonb;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Service role required' USING ERRCODE='42501'; END IF;
  IF jsonb_typeof(p_responses) IS DISTINCT FROM 'array' OR jsonb_array_length(p_responses) NOT BETWEEN 1 AND 50 THEN RAISE EXCEPTION 'Invalid responses' USING ERRCODE='22023'; END IF;
  PERFORM 1 FROM public.child_progress WHERE child_id=p_student_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Progress not initialized' USING ERRCODE='PT503'; END IF;
  SELECT * INTO receipt FROM public.student_assessment_submit_receipts WHERE attempt_id=p_attempt_id AND student_id=p_student_id;
  IF FOUND THEN
    IF receipt.request IS DISTINCT FROM p_responses THEN RAISE EXCEPTION 'Changed submission replay' USING ERRCODE='PT409'; END IF;
    RETURN receipt.response || jsonb_build_object('replayed',true);
  END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_responses) r WHERE NOT EXISTS(
    SELECT 1 FROM public.student_progress_events e WHERE e.student_id=p_student_id AND e.assessment_attempt_id=p_attempt_id
      AND e.assessment_item_id=(r->>'assessment_item_id')::uuid AND e.content_attempt_id=(r->>'content_attempt_id')::uuid AND e.response IS NOT NULL
  )) THEN RAISE EXCEPTION 'Unverified assessment answer' USING ERRCODE='42501'; END IF;
  result := public.submit_module_assessment_before_progress_events(p_student_id,p_attempt_id,p_responses);
  INSERT INTO public.student_assessment_submit_receipts VALUES(p_attempt_id,p_student_id,p_responses,result);
  RETURN result;
END $$;

REVOKE ALL ON FUNCTION public.start_student_progress_event(uuid,uuid,text,uuid,uuid,text,boolean) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.record_student_progress_event(uuid,uuid,text,text,integer,integer,boolean) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.reconcile_verified_student_badges(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.submit_module_assessment(uuid,uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.start_student_progress_event(uuid,uuid,text,uuid,uuid,text,boolean),
  public.record_student_progress_event(uuid,uuid,text,text,integer,integer,boolean),
  public.reconcile_verified_student_badges(uuid),public.submit_module_assessment(uuid,uuid,jsonb) TO service_role;

-- Defense in depth: direct learner writes must not mint completion evidence.
-- SELECT policies survive. Service-role backend writes remain available.
REVOKE INSERT,UPDATE,DELETE ON public.child_progress,public.pronunciation_practice_sessions,
  public.student_content_attempts,public.student_content_completions,public.student_module_assessment_attempts,
  public.student_module_assessment_responses,public.student_module_completions,public.word_of_day_log,
  public.student_badge_awards,public.lesson_progress FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.progress_contract_version() RETURNS jsonb LANGUAGE sql SECURITY DEFINER
  SET search_path=pg_catalog,public AS $$ SELECT jsonb_build_object('version',2) $$;
REVOKE ALL ON FUNCTION public.progress_contract_version() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.progress_contract_version() TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
