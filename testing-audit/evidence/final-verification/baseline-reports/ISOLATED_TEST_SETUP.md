# Isolated integration setup and remaining approval boundary

The owner confirms only one shared Supabase project exists. Do not point test/provisioning scripts at it. No separate project was created in this task.

## Working disposable PostgreSQL fixture

The repaired `scripts/qa-postgres.mjs` uses a fresh UUID directory, explicit UTF-8/C locale and IPv4 clients matching its `127.0.0.1` server. `QA_POSTGRES_USE_TEMP=true` selects a dedicated temporary root outside OneDrive. The initialization and connection settings affect only new disposable clusters. Cluster data is synthetic; no existing cluster or application environment file is opened. The helper retains fixture directories and does not recursively delete existing paths.

In a normal approved local terminal, run:

```powershell
$env:QA_POSTGRES_USE_TEMP = 'true'
$env:QA_EVIDENCE_DIR = 'testing-audit/evidence/resolution/database'
node scripts/qa-database.mjs
```

The existing 28 assertions passed in this audit. They exercise a selected minimal UUID foundation, roster/section/badge functions, emulated Auth claims and historical-schema incompatibility probes. They are not a complete Supabase restore, an Auth-token test or a test of the new Word of the Day proposal.

The restricted Codex sandbox still prevents `initdb` from creating/re-executing its restricted Windows token (error 87 / error 3). A temporary-directory change alone did not fix that sandbox restriction. Outside the sandbox, initialization and the suite succeeded with the helper adjustments. Earlier 20-second direct diagnostics timed out during bootstrap; they do not prove a permanently broken PostgreSQL binary. Do not change UAC, firewall, endpoint protection or browser security settings to force a test pass.

## Separate Supabase project

1. Create a new project or a separate local Supabase stack with a different host/port identity and entirely separate keys. Keep the current shared environment untouched. Cloud Supabase avoids this Windows process restriction; a local full Supabase stack additionally needs the documented Docker/CLI prerequisites. No dependency/service installation is performed here.
2. Obtain and privately review an authoritative **schema-only** baseline, including Auth helpers, RLS, functions, Storage rules, constraints and triggers. Do not copy real student/parent/teacher rows or credentials. The mobile TEXT foundation and later UUID functions cannot simply be replayed as a known-complete baseline.
3. Restore only the reviewed schema into the new environment; seed synthetic curriculum and relationships. Review every data-changing migration before isolated replay. Never use a production service key for provisioning.
4. Create dedicated Admin, Teacher, Parent, Student, unrelated-parent and unrelated-student fixtures. Use non-service-role JWTs for owner/role/RLS tests. Configure sandbox email or a local mail sink; mock TTS unless actual provider use is separately approved.
5. Populate the ignored `.qa/staging.env` using `scripts/qa-staging.env.example`. Use the guarded isolated-target checks before any authenticated workflow. Do not enter keys in chat or tracked files.
6. Review the [Word of the Day proposal](WORD_OF_DAY_REVIEW.md) and [metadata preflight](review/word-of-day-preflight.READONLY.sql). **Explicit SQL execution approval is still required.** Neither proposal nor preflight was executed in this audit. Do not deploy code dependent on the new RPC before the approved database change is validated.
7. After approval, run actual SQL rollback, receipt replay, simultaneous sessions, serialization/deadlock recovery and service-only permission cases, then complete the API/Auth/Storage/Realtime/OTP/MFA/browser journeys marked BLOCKED in the current reports.

## Browser host restriction

The new independent fixture reproduces denials with native loading and with request routing. It contains no LinawLetra, Vite, Supabase or external resources. Node HTTP can reach it; failed browser paths can be correlated against server observations in the diagnostic JSON. Thus application code and routing interception are not required causes. The specific browser/Windows network policy has not been identified.

Security event 5157 could not be read in the current audit context; no firewall-profile information was returned. The audit did not elevate to change machine policy or claim that a particular firewall product caused the issue. An owner/IT operator should correlate Edge/Chromium network diagnostics and Windows endpoint/filtering logs for the fixture's recorded times/ports, or run the unchanged fixture and public suite on a clean approved workstation/CI runner. Preserve failing runs instead of retrying until one passes.
