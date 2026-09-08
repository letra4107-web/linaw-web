# Phase 4 controlled release checklist

The current local work is not evidence that production has changed. Use one change window and stop at the first failed check.

1. Create and verify the protected backup and aggregate-only snapshot using [PRODUCTION_SNAPSHOT_RUNBOOK.md](PRODUCTION_SNAPSHOT_RUNBOOK.md). Capture deployed RLS/functions/grants and bucket evidence.
2. Run the migration-readiness SQL checks against production. Confirm the mobile/server schema dependencies used by the existing content-attempt RPC are present. Confirm no client relies on `child_credentials` reads and that public URL fallback remains enabled.
3. Apply exactly one migration at a time: `023_retire_plaintext_student_credentials.sql`, `024_lock_down_student_credentials.sql`, `025_storage_path_transition.sql`, `026_atomic_badge_awards.sql`. After each, record success, aggregate counts, a legacy-account login check, and the relevant app/API check. Do not deploy the new web backend before all four: it references columns/RPCs introduced by 024-026.
4. With real staging roles, run every role-isolation case in [RLS_AUDIT.md](RLS_AUDIT.md), including credential-field denial and cross-tenant tests. Investigate every unexpected policy/grant before proceeding.
5. Deploy the hardened API with validated environment variables, `STORAGE_SIGNED_URLS_ENABLED=false`, matching `APP_VERSION`, compatibility version, and commit. Verify health/version headers, Helmet/CORS/request IDs, TTS and authorization smoke tests.
6. Deploy the matching Hostinger `dist/`, including `.htaccess`, purge only the configured CDN cache, and verify public/deep routes, CSP, and normal browser access. Correct bot-protection settings only through Hostinger controls; keep origin/API protection enabled.
7. Deploy and test the mobile backend enrollment fix. Test one newly enrolled account, login/reset/child switching, and existing-account login. Do not rotate legacy credentials until this passes.
8. Rotate legacy accounts gradually with parent/admin-initiated one-time resets. Record aggregate status only. Trace the four accounts without credential metadata; do not create or delete accounts automatically.
9. Keep public storage and `STORAGE_SIGNED_URLS_ENABLED=false` until web and mobile authenticated access flows have staging evidence. Migration 027 and the authoritative scoring pilot are staging-only follow-up work, not part of this production cut.

## Readiness checks by migration

| Migration | Precondition | Post-check | Safe rollback stance |
| --- | --- | --- | --- |
| 023 | Existing legacy backend can tolerate nullable `plain_password`; backup complete | Existing rows/counts unchanged; reset/new enrollment writes no plaintext | Do not restore plaintext from app logs; use database recovery only if needed. |
| 024 | No client needs credential-row reads; server service role is healthy | Client credential selects denied; legacy values preserved; attempted future plaintext is sanitized | Disable/revert only the new trigger/policies using reviewed SQL if required; never recreate broad client reads. |
| 025 | `lessons`, `pdf_materials`, and `teacher_uploads` exist; public URLs remain valid | New columns populated where recognizable; web/mobile public URLs still open | Keep both old URLs and added path fields; no bucket change. |
| 026 | Badge and progress schema/RPC dependencies verified | Duplicate award retry awards once; existing badges/counts retained | Revert backend to the prior badge caller; preserve award rows and investigate before any data repair. |
