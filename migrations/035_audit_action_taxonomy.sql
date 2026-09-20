-- Task 1: canonical DOMAIN.VERB taxonomy while preserving all historical rows.
CREATE OR REPLACE FUNCTION public.audit_action_for_mutation(p_table TEXT, p_operation TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p_table
    WHEN 'users' THEN 'ACCOUNT.' || CASE p_operation WHEN 'INSERT' THEN 'CREATE' WHEN 'DELETE' THEN 'DELETE' ELSE 'UPDATE' END
    WHEN 'children' THEN 'STUDENT.' || CASE p_operation WHEN 'INSERT' THEN 'CREATE' WHEN 'DELETE' THEN 'DELETE' ELSE 'UPDATE' END
    WHEN 'teacher_student_links' THEN 'ROSTER.' || CASE p_operation WHEN 'INSERT' THEN 'ASSIGN' WHEN 'DELETE' THEN 'UNASSIGN' ELSE 'UPDATE' END
    WHEN 'pdf_materials' THEN 'MATERIAL.' || CASE p_operation WHEN 'INSERT' THEN 'CREATE' WHEN 'DELETE' THEN 'DELETE' ELSE 'UPDATE' END
    WHEN 'lessons' THEN 'PASSAGE.' || CASE p_operation WHEN 'INSERT' THEN 'CREATE' WHEN 'DELETE' THEN 'DELETE' ELSE 'UPDATE' END
    WHEN 'student_settings' THEN 'STUDENT.SETTINGS_UPDATE'
    WHEN 'student_reading_level_overrides' THEN 'STUDENT.READING_LEVEL_UPDATE'
    WHEN 'child_progress' THEN 'STUDENT.PROGRESS_UPDATE'
    WHEN 'pdf_assignments' THEN 'ASSIGNMENT.' || CASE p_operation WHEN 'INSERT' THEN 'CREATE' WHEN 'DELETE' THEN 'DELETE' ELSE 'UPDATE' END
    ELSE 'DATA.' || CASE p_operation WHEN 'INSERT' THEN 'CREATE' WHEN 'DELETE' THEN 'DELETE' ELSE 'UPDATE' END
  END;
$$;

-- The existing append-only trigger is temporarily disabled only for this
-- one-time, additive taxonomy backfill. The old value remains in metadata.
ALTER TABLE public.audit_logs DISABLE TRIGGER audit_logs_no_update_or_delete;
UPDATE public.audit_logs
SET metadata = metadata || jsonb_build_object('legacy_action', action),
    action = CASE
      WHEN action IN ('AUTH_LOGIN', 'AUTH_LOGIN_SUCCESS') THEN 'AUTH.LOGIN_SUCCESS'
      WHEN action IN ('AUTH_LOGOUT') THEN 'AUTH.LOGOUT'
      WHEN action IN ('AUTH_PASSWORD_RESET') THEN 'AUTH.PASSWORD_RESET'
      WHEN action ~ '^(INSERT|UPDATE|DELETE)$' THEN public.audit_action_for_mutation(module, action)
      WHEN action ~ '^(POST|PUT|PATCH|DELETE) ' THEN 'SYSTEM.LEGACY_EVENT'
      WHEN action ~ '^[A-Z][A-Z0-9_]*\.[A-Z][A-Z0-9_]*$' THEN action
      ELSE 'SYSTEM.LEGACY_EVENT'
    END;
ALTER TABLE public.audit_logs ENABLE TRIGGER audit_logs_no_update_or_delete;

ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_action_taxonomy;
ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_action_taxonomy
  CHECK (action ~ '^[A-Z][A-Z0-9_]*\.[A-Z][A-Z0-9_]*$');

-- Replace direct browser mutation records' bare SQL verbs with the same
-- taxonomy. The redaction list deliberately remains exhaustive.
CREATE OR REPLACE FUNCTION public.audit_direct_mutation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_actor UUID := auth.uid(); v_role TEXT; v_name TEXT;
  v_old JSONB := CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) END;
  v_new JSONB := CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) END;
  v_record_id TEXT := COALESCE(v_new->>'id', v_old->>'id');
BEGIN
  IF auth.role() <> 'authenticated' THEN RETURN COALESCE(NEW, OLD); END IF;
  SELECT role, name INTO v_role, v_name FROM public.users WHERE id = v_actor;
  v_old := v_old - ARRAY['password','plain_password','hashed_password','token','access_token','refresh_token','session','authorization','transcript','spoken_text','chunk_text','audio','audio_data','raw_audio'];
  v_new := v_new - ARRAY['password','plain_password','hashed_password','token','access_token','refresh_token','session','authorization','transcript','spoken_text','chunk_text','audio','audio_data','raw_audio'];
  INSERT INTO public.audit_logs(actor_id, actor_role, actor_name, action, module, record_id, status, previous_values, updated_values, metadata)
  VALUES (v_actor, v_role, v_name, public.audit_action_for_mutation(TG_TABLE_NAME, TG_OP), TG_TABLE_NAME, v_record_id, 'successful', v_old, v_new, jsonb_build_object('source', 'database_trigger'));
  RETURN COALESCE(NEW, OLD);
END;
$$;

NOTIFY pgrst, 'reload schema';
