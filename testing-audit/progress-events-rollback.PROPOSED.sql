-- REVIEW ONLY. Safe shutdown rollback: disable mutations, retain all history/receipts.
-- Never restore arbitrary client totals, old WOD routines or JS read/modify/write rewards.
BEGIN;
REVOKE EXECUTE ON FUNCTION public.start_student_progress_event(uuid,uuid,text,uuid,uuid,text,boolean),
 public.record_student_progress_event(uuid,uuid,text,text,integer,integer,boolean),
 public.reconcile_verified_student_badges(uuid),public.submit_module_assessment(uuid,uuid,jsonb) FROM service_role;
-- Keep SELECT policies, official read functions, all XP and all receipt/ledger rows.
-- Retain student_content_base_rewards, its unique payment keys, linked sessions,
-- and progress_legacy_completed_words. Never erase evidence to "re-enable" XP.
-- Retain the revision trigger. Do not drop/recreate the assessment core or revert its grants.
NOTIFY pgrst,'reload schema';
COMMIT;
