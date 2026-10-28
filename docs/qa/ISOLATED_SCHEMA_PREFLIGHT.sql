-- READ ONLY. Run only in the separate isolated test project, then retain
-- metadata results privately. Does not execute application RPCs or select rows.
-- Presence is necessary, not proof of policy/role correctness.
BEGIN TRANSACTION READ ONLY;
SELECT expected.name AS required_table, c.oid IS NOT NULL AS present, c.relrowsecurity AS rls_enabled
FROM (VALUES ('admin_student_notes'),('audit_logs'),('authoritative_speech_attempt_keys'),('child_credentials'),('child_progress'),('children'),('class_sections'),('lessons'),('notifications'),('parent_teacher_replies'),('parents'),('parents_settings'),('pdf_assignments'),('pdf_drill_items'),('pdf_materials'),('pdf_reading_attempts'),('phoneme_confusion'),('pronunciation_practice_sessions'),('reading_content'),('reading_module_items'),('reading_modules'),('scheduled_activities'),('section_students'),('student_content_completions'),('student_nonsense_check_sets'),('student_nonsense_checks'),('student_reading_level_overrides'),('student_settings'),('system_settings'),('teacher_messages'),('teacher_profiles'),('teacher_student_links'),('teacher_uploads'),('users'),('word_definitions'),('word_of_day_log')) expected(name)
LEFT JOIN pg_namespace n ON n.nspname='public'
LEFT JOIN pg_class c ON c.relnamespace=n.oid AND c.relname=expected.name AND c.relkind IN ('r','p')
ORDER BY 1;
SELECT expected.name AS required_rpc, count(p.oid)::int AS overloads,
       array_agg(pg_get_function_identity_arguments(p.oid)) FILTER (WHERE p.oid IS NOT NULL) AS signatures
FROM (VALUES ('assign_section_students'),('award_student_badges'),('equip_student_module'),('get_reading_module_content'),('get_student_module_path'),('record_student_content_attempt'),('start_module_assessment'),('submit_module_assessment'),('unequip_student_module')) expected(name)
LEFT JOIN pg_namespace n ON n.nspname='public'
LEFT JOIN pg_proc p ON p.pronamespace=n.oid AND p.proname=expected.name GROUP BY 1 ORDER BY 1;
SELECT expected.table_name, expected.column_name, expected.expected_type, columns.udt_name AS actual_type,
       columns.column_name IS NOT NULL AND (expected.expected_type IS NULL OR columns.udt_name=expected.expected_type) AS compatible
FROM (VALUES ('children','id','uuid'),('children','parent_id','uuid'),('children','auth_uid','uuid'),('users','id',NULL),('child_progress','child_id','uuid'),('users','lastLoginAt',NULL)) expected(table_name,column_name,expected_type)
LEFT JOIN information_schema.columns ON columns.table_schema='public' AND columns.table_name=expected.table_name AND columns.column_name=expected.column_name ORDER BY 1,2;
SELECT schemaname,tablename,policyname,roles,cmd,qual,with_check FROM pg_policies WHERE schemaname IN ('public','storage') ORDER BY 1,2,3;
SELECT n.nspname,p.proname,p.prosecdef,p.proconfig,array_agg(DISTINCT privileges.grantee) AS grantees
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
LEFT JOIN information_schema.routine_privileges privileges ON privileges.specific_schema=n.nspname AND privileges.specific_name=p.proname||'_'||p.oid::text
WHERE n.nspname='public' GROUP BY n.nspname,p.proname,p.oid,p.prosecdef,p.proconfig ORDER BY 1,2;
ROLLBACK;
