-- Read-only catalog checks AFTER the separately approved installation commits.
-- Does not start an assessment, submit answers, or modify learner data.
WITH required(signature) AS (
  VALUES ('public.progress_contract_version()'),
    ('public.start_student_progress_event(uuid,uuid,text,uuid,uuid,text,boolean)'),
    ('public.record_student_progress_event(uuid,uuid,text,text,integer,integer,boolean)'),
    ('public.reconcile_verified_student_badges(uuid)'),
    ('public.submit_module_assessment(uuid,uuid,jsonb)')
), objects(name) AS (
  VALUES ('public.student_progress_events'),('public.student_content_base_rewards'),
    ('public.student_assessment_submit_receipts')
)
SELECT jsonb_build_object(
  'read_only', true,
  'functions', (SELECT jsonb_agg(jsonb_build_object(
    'signature', signature,
    'present', to_regprocedure(signature) IS NOT NULL,
    'service_role_execute', CASE WHEN to_regprocedure(signature) IS NOT NULL
      THEN has_function_privilege('service_role',to_regprocedure(signature),'EXECUTE') ELSE false END,
    'authenticated_execute', CASE WHEN to_regprocedure(signature) IS NOT NULL
      THEN has_function_privilege('authenticated',to_regprocedure(signature),'EXECUTE') ELSE false END,
    'anon_execute', CASE WHEN to_regprocedure(signature) IS NOT NULL
      THEN has_function_privilege('anon',to_regprocedure(signature),'EXECUTE') ELSE false END
  ) ORDER BY signature) FROM required),
  'tables', (SELECT jsonb_agg(jsonb_build_object(
    'name', name, 'present', to_regclass(name) IS NOT NULL,
    'rls_enabled', (SELECT relrowsecurity FROM pg_class WHERE oid=to_regclass(name))
  ) ORDER BY name) FROM objects),
  'original_assessment_core_present',
    to_regprocedure('public.submit_module_assessment_before_progress_events(uuid,uuid,jsonb)') IS NOT NULL,
  'revision_trigger_present', EXISTS(SELECT 1 FROM pg_trigger
    WHERE tgrelid=to_regclass('public.child_progress') AND tgname='stamp_progress_revision' AND NOT tgisinternal)
) AS progress_post_install;
