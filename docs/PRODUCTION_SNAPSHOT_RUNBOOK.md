# Production backup and readiness snapshot

This runbook is mandatory before any production migration, bucket-visibility change, or credential rotation. It is designed not to expose passwords, hashes, SMTP values, access tokens, or temporary credentials.

## 1. Create the protected backup first

An authorized Supabase operator must create/verify the managed database backup (or an encrypted `pg_dump` retained outside the application repository). Its protected scope must include `children`, `child_credentials`, progress, assignments, reading attempts, notifications, badge/reward records, and storage metadata. Restrict restoration access to named operators and record the restore point/time in the release ticket only.

Never use a browser download, console output, source-control commit, or application log as the location for credential-containing backup data.

## 2. Capture deployed schema/security state

In the Supabase SQL editor, save the result in the same protected release evidence location. Do not export table rows.

```sql
select schemaname, tablename, rowsecurity from pg_tables
where schemaname in ('public', 'storage') order by 1, 2;

select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies where schemaname in ('public', 'storage') order by 1, 2, 3;

select n.nspname, p.proname, p.prosecdef, pg_get_functiondef(p.oid) as definition
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' order by p.proname;

select routine_schema, routine_name, grantee, privilege_type
from information_schema.routine_privileges
where routine_schema = 'public' order by 1, 2, 3;

select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets order by id;
```

Review each `SECURITY DEFINER` function for a fixed `search_path`, least-privilege grants, and expected ownership. The RLS role tests in [RLS_AUDIT.md](RLS_AUDIT.md) are separate mandatory evidence.

## 3. Create the safe aggregate report

The script intentionally collects only counts and bucket configuration. It does not select row contents and is not a replacement for the encrypted backup.

```powershell
$env:SNAPSHOT_ALLOW_PRODUCTION_READONLY='true'
$env:SNAPSHOT_OUTPUT_FILE='D:\protected-release-evidence\linawletra-readiness.json'
node server/scripts/production-readiness-snapshot.js
```

The output path must be an approved protected absolute path. Check the report contains `containsRowData: false` and `containsCredentials: false`; do not attach it to public tickets if bucket names or operational counts are sensitive.

## 4. Migration readiness and recovery point

Before each migration, record: backup timestamp, migration checksum, current row counts, expected compatibility check, operator, and rollback decision. Apply only `023`, `024`, `025`, then `026`; verify after every one. Migration 027 is an optional staging speech pilot and is not part of the production sequence.

If a verification fails, stop. Restore only through the approved Supabase recovery procedure; do not attempt ad-hoc SQL deletes or credential restoration.
