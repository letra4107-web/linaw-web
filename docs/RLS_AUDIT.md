# LinawLetra RLS audit

This is a source-level audit of the web migrations and the shared mobile migrations in `LinawLm`. It is **not** proof of the deployed Supabase policy state. Before production, compare `pg_tables.rowsecurity`, `pg_policies`, table grants, and function grants in the staging/production projects against the latest migrations.

| Table/resource | Direct client access | Expected source state | Classification / required verification |
|---|---|---|---|
| `users` | Web/mobile read and self-update | Several linked-parent/teacher name policies exist; base policies are outside the web migration sequence | Needs review: enumerate all deployed policies and confirm normal users cannot enumerate accounts or change roles/status. |
| `children` | Heavy web/mobile reads; limited updates | Mobile 017 enables RLS for own parent, own student, service role; web 009 adds assigned-teacher read | Safe if all listed migrations are deployed. Verify no older broad policy remains. |
| `child_credentials` | No current UI reads; mobile backend writes with service role | Mobile 002 allowed parent SELECT of the whole row, including plaintext/hash. Web 024 removes that policy and sanitizes new plaintext writes | Vulnerable until 024 is applied; server-only after 024. Existing plaintext is intentionally retained but no longer client-readable. |
| `child_progress` | Web/mobile reads; mobile historically wrote | Mobile 027 removes every non-SELECT client policy; server/RPC owns updates | Safe if 027 is deployed. Verify no production-only write policy remains. |
| `word_of_day_log` | Student reads/inserts directly | Mobile 022 removes the legacy ALL policy; completion/rewards are server/RPC-owned | Safe for replay if 022/031/034 and web Phase 2 are deployed. Verify function EXECUTE grants. Accuracy remains client-originated. |
| `pronunciation_practice_sessions` | Student insert; student/parent/teacher read | Student ownership and parent relationship policies exist | Confidentiality scoped; integrity needs review because client supplies transcript, accuracy, and correctness. |
| `phoneme_confusion` | Student insert/read; parent read | Mobile 023 ownership policies | Safe for row ownership if deployed; client-generated analysis remains an integrity limitation. |
| `lesson_progress` | Mobile student writes; parent reads | Mobile 013 scopes student/parent/service role | Row isolation safe if deployed; client can claim opened/completed states, so reward/completion consequences must remain server-side. |
| `scheduled_activities` | Parent CRUD; student read/update | Mobile 044 separates parent ownership and student status changes | Safe if 044 replaced the older broad policy. Verify allowed student update columns with triggers/RPC. |
| `notifications` | Direct reads/updates plus backend union | Multiple historical policies exist; web route now verifies object ownership | Needs deployed-policy review because direct Supabase queries bypass Express and historical policy names overlap. Backend IDOR is fixed. |
| `teacher_student_links` | Teacher CRUD/read | Web 004 scopes by teacher and assigned grade; service role policy | Relationship-safe by source, but same-grade roster expansion is a product authorization rule that must be confirmed. |
| `pdf_materials` | Teacher/student direct read | Owner teacher or student with assignment | Safe if 007/017 are deployed. Public bucket still bypasses table confidentiality for anyone with a URL. |
| `pdf_assignments` | Teacher CRUD; student/parent read; student status update | Relationship policies corrected by 008 | Row ownership safe if deployed; student can directly set allowed status values, so completion integrity needs server ownership. |
| `pdf_reading_attempts` | Student direct insert/read; teacher/parent read | Relationship policies corrected by 008 | Confidentiality safe if deployed; accuracy/correctness are client-controlled and duplicate reward enforcement must be database-atomic. |
| `pdf_drill_items` | Teacher manage; assigned student read | Web 016 relationship policies | Safe if deployed. XP values are teacher-controlled within server validation. |
| `teacher_assessments` / scores | Teacher manage; student/parent scoped reads | Web 004/008 policies | Expected safe; verify assessment RPC ownership and EXECUTE grants in deployed schema. |
| Module/content attempts, responses, completions | Student/parent reads; backend RPC writes | Mobile 025/042/043 policies and server RPC calls | Expected safe; function security and grants need integration testing. |
| `lessons` | Authenticated published reads; teacher writes | Mobile 006 | Not private-by-assignment: every authenticated user can read published lessons by design. Storage remains public. |
| `teacher_uploads` | Mobile direct read | Base schema/policies not fully represented in the web sequence | Needs review. Mobile still resolves public/direct URLs and bucket paths. |
| `parents`, `parents_settings`, `student_settings`, `teacher_profiles` | Direct self/linked reads and updates | Mobile 003/004 and web 003/006 policies | Expected safe; verify deployed policy inventory. |
| `teacher_messages` | Parent/teacher direct access | Web 013 removes historical leaked/duplicate policies; 014/015 fix name lookup recursion | Safe if 013–015 are deployed in order. |
| `words`, curriculum, definitions | Authenticated/student reads | Later mobile 043 narrows curriculum by official level | Non-sensitive, but verify older broad policies were replaced rather than accumulated. |
| `word_mastery`, `confusion_patterns`, generic `reading_attempts` | No exact tables found in available sources | Actual equivalents appear to be content completions, `phoneme_confusion`, and pronunciation/PDF attempts | Needs live schema inventory; do not assume absent from production. |
| Storage `reading-materials`, `lesson-pdfs` | Direct public URL/object access | Buckets are public; authenticated SELECT policies also exist | Public by design during transition. Do not mark private until mobile is migrated and readiness counts are verified. |

## Required live queries

Run these through a reviewed Supabase SQL session without exporting row data:

```sql
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;

select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname in ('public', 'storage')
order by schemaname, tablename, policyname;

select routine_schema, routine_name, grantee, privilege_type
from information_schema.routine_privileges
where routine_schema = 'public'
order by routine_name, grantee;

select n.nspname as schema_name, p.proname as function_name, p.prosecdef as security_definer,
       pg_get_userbyid(p.proowner) as owner,
       coalesce(array_to_string(p.proconfig, ', '), '') as function_settings
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
order by function_name;

select table_schema, table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema in ('public', 'storage')
  and grantee in ('anon', 'authenticated', 'service_role', 'PUBLIC')
order by table_schema, table_name, grantee, privilege_type;

select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
order by id;
```

Do not paste credential rows or secret values into tickets or logs.
