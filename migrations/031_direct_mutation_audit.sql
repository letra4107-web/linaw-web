-- Audit direct browser-to-Supabase mutations without trusting the browser to
-- create audit rows. Server/service-role writes remain covered by Express.
CREATE OR REPLACE FUNCTION public.audit_direct_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_role TEXT;
  v_name TEXT;
  v_old JSONB := CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) END;
  v_new JSONB := CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) END;
  v_record_id TEXT := COALESCE(v_new->>'id', v_old->>'id');
BEGIN
  -- Service calls are already audited by the API middleware; avoid duplicates.
  IF auth.role() <> 'authenticated' THEN RETURN COALESCE(NEW, OLD); END IF;
  SELECT role, name INTO v_role, v_name FROM public.users WHERE id = v_actor;
  -- Reading transcripts and credentials are unnecessary in operational logs.
  v_old := v_old - ARRAY['password','plain_password','hashed_password','token','access_token','refresh_token','session','authorization','transcript','spoken_text','chunk_text','audio','audio_data','raw_audio'];
  v_new := v_new - ARRAY['password','plain_password','hashed_password','token','access_token','refresh_token','session','authorization','transcript','spoken_text','chunk_text','audio','audio_data','raw_audio'];
  INSERT INTO public.audit_logs(actor_id, actor_role, actor_name, action, module, record_id, status, previous_values, updated_values, metadata)
  VALUES (v_actor, v_role, v_name, TG_OP, TG_TABLE_NAME, v_record_id, 'successful', v_old, v_new, jsonb_build_object('source', 'database_trigger'));
  RETURN COALESCE(NEW, OLD);
END;
$$;

REVOKE ALL ON FUNCTION public.audit_direct_mutation() FROM PUBLIC, anon, authenticated;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'word_of_day_log','users','teacher_profiles','pdf_reading_attempts','pdf_assignments',
    'teacher_student_links','teacher_messages','parents','parents_settings',
    'pronunciation_practice_sessions','scheduled_activities','lessons','student_settings'
  ] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('DROP TRIGGER IF EXISTS audit_direct_mutation_trigger ON public.%I', t);
      EXECUTE format('CREATE TRIGGER audit_direct_mutation_trigger AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.audit_direct_mutation()', t);
    END IF;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
