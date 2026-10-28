# Dedicated read-only connection setup

The owner reported manually applying 047 and 048 to MAIN on 2026-10-18. That report is recorded, but the main database has **not yet been independently verified**. Do not rerun either migration.

Creating a login and granting permissions is an **access-configuration change to main**. Codex has executed none of those changes and will not use administrator credentials or the service-role key as a substitute. If the prohibition on all main changes includes roles/grants, stop here until the owner authorizes that setup; use an already approved reader if one exists.

## 1. Operator creates the login, if authorized

An authorized project operator can review [reader-role-operator-proposal.sql](reader-role-operator-proposal.sql). It creates `linawletra_safety_reader` with login permission, no superuser/database-creation/role-creation/replication/BYPASSRLS privileges, and SELECT on only the six relevant public tables. It does not create application/Auth accounts or modify rows, schema objects, RLS policies, Storage or migrations. This is a **manual proposal**, not part of any automated script.

The role initially has no password. The operator should set a unique strong password through an approved administration tool with a masked password prompt. With the operator's own private `psql` session, `\password linawletra_safety_reader` prompts twice rather than embedding a password in saved SQL. Do not send administrator credentials to Codex or store a completed password statement in Git/chat. Do not change the project's main database password.

The proposal changes no database-wide setting. Password tools can issue a role-password change internally; that is also an operator access-configuration change and must be authorized separately from read-only verification. Codex will not execute it. The verifier supplies its own session read-only defaults and explicitly begins `REPEATABLE READ READ ONLY`, without a persistent `ALTER`. Default read-only mode alone is not a complete privilege boundary: PUBLIC function-execution grants can still exist. The verifier never invokes application RPCs and checks actual role attributes before proceeding.

## 2. Copy connection parameters from the correct project

In the main project's **Connect** panel, choose a direct connection or the **Session pooler** on port **5432**. Use the endpoint shown by that project; do not guess its region or pooler hostname. Direct connections may require IPv6. For a custom role, session-pooler usernames use `linawletra_safety_reader.<project-ref>`; direct usernames use `linawletra_safety_reader`. Do not use the transaction pooler on 6543 for this verifier. [Official connection guide](https://supabase.com/docs/guides/database/connecting-to-postgres).

Download the database CA certificate from the project's database settings and save it as `.qa/supabase-ca.crt` (or another private local path). TLS certificate and hostname verification remain enabled. Do not disable verification or add an insecure SSL option to make a connection succeed. [Official verified-TLS example](https://supabase.com/docs/guides/database/psql).

## 3. Complete the private local template

An empty, disabled template has been prepared at `.qa/main-readonly.env`; any pre-existing file is preserved. Enter the role's private password locally:

```dotenv
MAIN_READONLY_VERIFICATION_ENABLED=false
MAIN_EXPECTED_PROJECT_REF=<main-project-reference>
MAIN_DATABASE_HOST=<direct-or-session-pooler-host-from-Connect>
MAIN_DATABASE_PORT=5432
MAIN_DATABASE_NAME=postgres
MAIN_DATABASE_USER=linawletra_safety_reader
MAIN_DATABASE_PASSWORD=<reader-password-only>
MAIN_DATABASE_CA_FILE=.qa/supabase-ca.crt
```

For the session pooler, change the username to `linawletra_safety_reader.<project-ref>`. The expected project reference is the public project identifier, not an API key. The verifier pins this reference to the existing application's configured Supabase URL. It never loads an administrator database password or falls back to a service-role key. After filling the fields and confirming the target, change only the enable flag to `true`.

This is an audit-only database login, not an application Admin/Teacher/Parent/Student Auth account. Do not replace `server/.env`, the deployed application's credentials, or its service-role configuration with these reader connection settings.

`.qa/` is ignored by Git. **This workspace is inside OneDrive: Gitignore does not prevent cloud syncing.** If that folder syncs, keep credentials in a private, nonsynced folder instead and pass its exact path to the verifier. Do not print the file, include it in screenshots, or paste it into chat. On Windows, Unix file-mode flags do not replace suitable file ACLs.

## 4. Run the fixed read-only verifier

```powershell
node scripts/qa-main-readonly.mjs .qa/main-readonly.env
```

Alternatively pass the absolute path of the private file. No environment variables from that file are exported into the application's runtime. The script refuses administrator/service-role usernames, checks the actual login's attributes, uses verified TLS, enforces a read-only transaction and bounded query/lock timeouts, and rolls back before closing. It never reads or executes the operator setup proposal or either migration.

Catalog results check function signatures/body fingerprints/search paths/grants, trigger wiring, constraints, indexes and dependencies. Exact body fingerprint differences require review, since formatting can also differ. Metadata cannot establish which unrelated objects were introduced without a pre-migration snapshot.

## 5. Understand the RLS limit before accepting data results

SELECT grants do **not** override RLS. This proposal adds no policy and no privileged role membership. Consequently, a new reader will commonly be able to inspect catalogs while global data-integrity checks remain **BLOCKED**. Empty visible tables or partially visible joins must never be treated as evidence of zero global violations. [Supabase RLS documentation](https://supabase.com/docs/guides/database/postgres/row-level-security).

The verifier runs the aggregate integrity SQL only if existing policies prove unfiltered SELECT across every joined table, without ownership or BYPASSRLS. Otherwise it reports the scope problem and stops that part. If global visibility is unavailable, the owner must separately decide whether to authorize narrowly scoped audit SELECT policies or another compliant audit method. **No such policy change is proposed for automatic execution here.** Do not grant service-role membership, disable RLS or use an owner/admin connection to force those tests to pass.

After configuring the file, provide only its path in chat. Codex can then continue the already authorized read-only verification. Until the connection and scope are genuinely available, main migration/data verification remains unverified and no deployment clearance is given.
