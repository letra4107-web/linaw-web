-- Metadata only. Owner should first run this on the separate isolated project.
-- Not executed by this audit; no application rows or credential values selected.
BEGIN TRANSACTION READ ONLY;
SELECT table_name,column_name,udt_name,is_nullable,column_default
FROM information_schema.columns
WHERE table_schema='public' AND table_name IN ('children','word_of_day_log','child_progress','word_of_day_web_attempt_receipts')
ORDER BY table_name,ordinal_position;
SELECT conrelid::regclass AS relation,conname,pg_get_constraintdef(oid) AS definition
FROM pg_constraint WHERE conrelid IN (to_regclass('public.word_of_day_log'),to_regclass('public.child_progress'));
SELECT schemaname,tablename,policyname,roles,cmd,qual,with_check FROM pg_policies
WHERE schemaname='public' AND tablename IN ('word_of_day_log','child_progress','word_of_day_web_attempt_receipts');
SELECT event_object_table,trigger_name,action_timing,event_manipulation,action_statement
FROM information_schema.triggers WHERE event_object_schema='public'
AND event_object_table IN ('word_of_day_log','child_progress','word_of_day_web_attempt_receipts');
SELECT n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) AS signature,
       p.prosecdef,p.proconfig,p.proacl
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname IN ('record_web_word_of_day_attempt','complete_word_of_day_attempt','complete_personalized_word_of_day_attempt','award_student_badges');
SELECT grantee,table_name,privilege_type FROM information_schema.table_privileges
WHERE table_schema='public' AND table_name IN ('word_of_day_log','child_progress','word_of_day_web_attempt_receipts');
ROLLBACK;
