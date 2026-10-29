-- READ ONLY: paste this entire SELECT into the same Supabase project's SQL Editor.
-- Returns one JSON result. Reads PostgreSQL metadata, not learner records.
-- Does not install functions, change grants, start exams, or award progress/XP.
WITH target_tables(name) AS (
  VALUES ('children'), ('child_progress'), ('reading_content'),
    ('reading_modules'), ('reading_module_items'), ('reading_module_assessments'),
    ('reading_module_assessment_items'), ('student_content_attempts'),
    ('student_content_completions'), ('student_module_assessment_attempts'),
    ('student_module_assessment_responses'), ('student_module_completions'),
    ('student_badge_awards'), ('pronunciation_practice_sessions'),
    ('word_of_day_log'), ('lesson_progress'), ('student_progress_events'),
    ('student_content_base_rewards'), ('student_assessment_submit_receipts')
), required_functions(signature) AS (
  VALUES ('public.record_student_content_attempt(uuid,uuid,numeric,text,integer,boolean,text)'),
    ('public.award_student_badges(uuid,jsonb)'),
    ('public.submit_module_assessment(uuid,uuid,jsonb)'),
    ('public.start_module_assessment(uuid,uuid)'),
    ('public.get_student_reading_progress(uuid)'),
    ('public.is_student_module_unlocked(uuid,uuid)')
)
SELECT jsonb_build_object(
  'read_only', true,
  'expected_contract_version', 2,
  'required_functions', (
    SELECT jsonb_agg(jsonb_build_object(
      'signature', signature, 'present', to_regprocedure(signature) IS NOT NULL
    ) ORDER BY signature) FROM required_functions
  ),
  'tables', (
    SELECT jsonb_agg(jsonb_build_object(
      'name', t.name, 'present', c.oid IS NOT NULL,
      'rls_enabled', c.relrowsecurity, 'rls_forced', c.relforcerowsecurity
    ) ORDER BY t.name)
    FROM target_tables t
    LEFT JOIN pg_namespace n ON n.nspname = 'public'
    LEFT JOIN pg_class c ON c.relnamespace = n.oid AND c.relname = t.name
  ),
  'columns', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'table', table_name, 'column', column_name,
      'type', udt_name, 'nullable', is_nullable
    ) ORDER BY table_name, ordinal_position), '[]'::jsonb)
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name IN (SELECT name FROM target_tables)
  ),
  'function_inventory', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'signature', p.oid::regprocedure::text,
      'security_definer', p.prosecdef,
      'settings', p.proconfig, 'acl', p.proacl,
      'definition', pg_get_functiondef(p.oid)
    ) ORDER BY p.proname, p.oid), '[]'::jsonb)
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prokind = 'f'
      AND (p.proname ~* '(progress|assessment|badge|word_of_day|content_attempt|practice)'
        OR p.proname = 'is_student_module_unlocked')
  ),
  'table_grants', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'table', table_name, 'role', grantee, 'privilege', privilege_type
    ) ORDER BY table_name, grantee, privilege_type), '[]'::jsonb)
    FROM information_schema.table_privileges
    WHERE table_schema = 'public' AND table_name IN (SELECT name FROM target_tables)
  ),
  'policies', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'table', tablename, 'name', policyname, 'roles', roles,
      'command', cmd, 'using', qual, 'with_check', with_check
    ) ORDER BY tablename, policyname), '[]'::jsonb)
    FROM pg_policies WHERE schemaname = 'public' AND tablename IN (SELECT name FROM target_tables)
  ),
  'triggers', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'table', c.relname, 'name', t.tgname, 'enabled', t.tgenabled,
      'definition', pg_get_triggerdef(t.oid),
      'function_definition', pg_get_functiondef(t.tgfoid)
    ) ORDER BY c.relname, t.tgname), '[]'::jsonb)
    FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND NOT t.tgisinternal
      AND c.relname IN (SELECT name FROM target_tables)
  ),
  'constraints', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'table', c.relname, 'name', con.conname,
      'definition', pg_get_constraintdef(con.oid)
    ) ORDER BY c.relname, con.conname), '[]'::jsonb)
    FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname IN (SELECT name FROM target_tables)
  ),
  'indexes', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'table', tablename, 'name', indexname, 'definition', indexdef
    ) ORDER BY tablename, indexname), '[]'::jsonb)
    FROM pg_indexes WHERE schemaname = 'public' AND tablename IN (SELECT name FROM target_tables)
  )
) AS progress_preflight;
