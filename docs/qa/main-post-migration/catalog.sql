-- READ ONLY: no application RPC invocation or application-row access.
-- Execute inside the verifier's REPEATABLE READ READ ONLY transaction.
SELECT current_user AS current_role, session_user AS login_role,
       current_setting('transaction_read_only') AS transaction_read_only,
       current_setting('row_security') AS row_security;

SELECT n.nspname AS schema_name, p.proname, oidvectortypes(p.proargtypes) AS argument_types,
       p.proargnames AS argument_names, pg_get_function_result(p.oid) AS result_type,
       p.prosecdef AS security_definer, p.proconfig AS function_settings, p.pronargdefaults AS default_arguments,
       l.lanname AS language, pg_get_userbyid(p.proowner) AS owner,
       md5(btrim(replace(p.prosrc, chr(13), ''), E' \n\t')) AS body_md5,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_execute,
       has_function_privilege('service_role', p.oid, 'EXECUTE') AS service_execute,
       has_function_privilege(current_user, p.oid, 'EXECUTE') AS reader_execute,
       EXISTS (SELECT 1 FROM aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a
               WHERE a.grantee = 0 AND a.privilege_type = 'EXECUTE') AS public_execute
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang
WHERE n.nspname='public' AND p.proname IN ('assign_section_students','validate_section_student','validate_teacher_student_link')
ORDER BY p.proname, argument_types;

SELECT n.nspname AS schema_name, c.relname AS table_name, t.tgname AS trigger_name,
       t.tgenabled, t.tgisinternal, t.tgtype AS type_mask,t.tgnargs AS argument_count,
       (t.tgqual IS NOT NULL) AS has_condition,
       pn.nspname AS function_schema, p.proname AS function_name
FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_namespace pn ON pn.oid=p.pronamespace
WHERE n.nspname='public' AND c.relname IN ('class_sections','section_students','teacher_student_links')
ORDER BY c.relname,t.tgname;

SELECT c.relname AS table_name, con.conname, con.contype, con.convalidated, con.condeferrable,
       con.condeferred, con.confdeltype, pg_get_constraintdef(con.oid) AS definition,
       ARRAY(SELECT a.attname::text FROM unnest(con.conkey) WITH ORDINALITY k(attnum,ord)
             JOIN pg_attribute a ON a.attrelid=con.conrelid AND a.attnum=k.attnum ORDER BY k.ord) AS columns,
       rn.nspname AS referenced_schema,rc.relname AS referenced_table
FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace
LEFT JOIN pg_class rc ON rc.oid=con.confrelid LEFT JOIN pg_namespace rn ON rn.oid=rc.relnamespace
WHERE n.nspname='public' AND c.relname IN ('class_sections','section_students','teacher_student_links')
ORDER BY c.relname,con.conname;

SELECT tablename AS table_name,indexname,indexdef FROM pg_indexes
WHERE schemaname='public' AND tablename IN ('class_sections','section_students','teacher_student_links') ORDER BY tablename,indexname;

SELECT c.relname AS table_name,c.relkind AS relation_kind,c.relrowsecurity,c.relforcerowsecurity,
       pg_get_userbyid(c.relowner) AS owner,row_security_active(c.oid) AS rls_active,
       has_table_privilege(c.oid,'SELECT') AS can_select,
       has_table_privilege(c.oid,'INSERT,UPDATE,DELETE,TRUNCATE') AS has_write_privilege,
       pg_has_role(current_user,c.relowner,'USAGE') AS inherits_owner,
       (NOT c.relrowsecurity OR (
          EXISTS (SELECT 1 FROM pg_policy pol WHERE pol.polrelid=c.oid AND pol.polpermissive
            AND pol.polcmd IN ('r','*') AND (pol.polqual IS NULL OR pg_get_expr(pol.polqual,pol.polrelid)='true')
            AND EXISTS (SELECT 1 FROM unnest(pol.polroles) r(role_oid)
                        WHERE CASE WHEN r.role_oid=0 THEN true ELSE pg_has_role(current_user,r.role_oid,'USAGE') END))
          AND NOT EXISTS (SELECT 1 FROM pg_policy pol WHERE pol.polrelid=c.oid AND NOT pol.polpermissive
            AND pol.polcmd IN ('r','*') AND EXISTS (SELECT 1 FROM unnest(pol.polroles) r(role_oid)
              WHERE CASE WHEN r.role_oid=0 THEN true ELSE pg_has_role(current_user,r.role_oid,'USAGE') END))
       )) AS proven_unfiltered_select
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname IN ('class_sections','section_students','teacher_student_links','children','teacher_profiles','users')
ORDER BY c.relname;

SELECT tablename,policyname,permissive,roles,cmd,qual,with_check FROM pg_policies
WHERE schemaname='public' AND tablename IN ('class_sections','section_students','teacher_student_links','children','teacher_profiles','users')
ORDER BY tablename,policyname;

SELECT c.relname AS table_name,a.attname AS column_name,format_type(a.atttypid,a.atttypmod) AS column_type,a.attnotnull
FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname IN ('class_sections','section_students','teacher_student_links','children','teacher_profiles','users')
AND a.attnum>0 AND NOT a.attisdropped ORDER BY c.relname,a.attnum;

-- Objects that depend on either changed function; catalog evidence only.
SELECT p.proname AS referenced_function,pg_describe_object(d.classid,d.objid,d.objsubid) AS dependent_object,d.deptype
FROM pg_depend d JOIN pg_proc p ON p.oid=d.refobjid JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE d.refclassid='pg_proc'::regclass AND n.nspname='public'
AND p.proname IN ('assign_section_students','validate_section_student') ORDER BY 1,2;
