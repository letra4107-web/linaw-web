-- READ ONLY. Run only against an owner-approved target; this task did not run it on Supabase.
SELECT version(), current_database(), current_user;
SELECT table_name,column_name,udt_name,is_nullable,column_default FROM information_schema.columns
WHERE table_schema='public' AND table_name IN ('children','child_progress','reading_content','student_content_attempts',
 'student_content_completions','student_module_assessment_attempts','student_module_assessment_responses',
 'student_module_completions','student_badge_awards','pronunciation_practice_sessions','word_of_day_log','lesson_progress')
ORDER BY table_name,ordinal_position;
SELECT table_name,grantee,privilege_type FROM information_schema.table_privileges
WHERE table_schema='public' AND table_name IN ('child_progress','student_content_attempts','student_content_completions',
 'student_module_assessment_attempts','student_module_completions','student_badge_awards','pronunciation_practice_sessions',
 'word_of_day_log','lesson_progress','activities','pdf_reading_attempts','pdf_assignments') ORDER BY table_name,grantee,privilege_type;
SELECT schemaname,tablename,policyname,roles,cmd,qual,with_check FROM pg_policies WHERE schemaname='public'
AND tablename IN ('child_progress','student_content_attempts','student_content_completions','student_badge_awards',
 'pronunciation_practice_sessions','word_of_day_log','lesson_progress','activities','pdf_reading_attempts','pdf_assignments');
SELECT p.oid::regprocedure AS signature,p.prosecdef,p.proconfig,p.proacl,pg_get_functiondef(p.oid) AS definition
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public'
AND (p.proname ILIKE '%progress%' OR p.proname ILIKE '%word_of_day%' OR p.proname ILIKE '%assessment%'
 OR p.proname ILIKE '%badge%' OR p.proname ILIKE '%content_attempt%');
SELECT event_object_table,trigger_name,action_timing,event_manipulation,action_statement
FROM information_schema.triggers WHERE event_object_schema='public'
AND event_object_table IN ('child_progress','word_of_day_log','student_badge_awards','student_content_attempts');
-- Inspect constraints/indexes (UUID vs historical TEXT, uniqueness, reward/streak columns).
SELECT conrelid::regclass AS relation,conname,pg_get_constraintdef(oid) FROM pg_constraint
WHERE conrelid IN (to_regclass('public.child_progress'),to_regclass('public.word_of_day_log'),to_regclass('public.student_badge_awards'));
-- No learner rows, credentials, or environment values are selected.
