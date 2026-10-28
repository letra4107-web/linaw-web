# Conditional checkpoint cleanup: BLOCKED

Date: **2026-10-21, Asia/Manila**. The owner approved deletion of only the two previously documented Codex checkpoint refs, subject to matching object IDs, completed credential revocation and the recovery points no longer being needed. The owner subsequently answered **"Revocation is incomplete or uncertain."** Whether the recovery points are no longer needed is also unconfirmed.

**Neither reference was deleted.** The conditional approval remains on record, but its prerequisites have not been satisfied. No additional approval is being requested for the same scope.

## Executed read-only preflight

- Both exact refs listed in [the cleanup report](GITHUB_CREDENTIAL_CLEANUP.md) still resolve to `081ba404375f1319843bcddd85ac59a424b22ae4`, matching the audit. Both remain intact.
- In-memory comparisons found **883 current tracked/nonignored working files unchanged** during the preflight. The three actual environment files (`.env`, `.env.production`, `server/.env`), index, HEAD, local branches and remote-tracking branches were unchanged. No environment values or hashes were serialized. Audit documentation/evidence updates occur after that comparison and are the only nonignored files written for this follow-up.
- A fresh read-only GitHub query confirmed `main` still advertises `d5fd34e2146c7eadbfeafcf3f4a80b51413b61ee`, matching the prior audit. No remote write or object fetch occurred. The sandbox connection failed first; the approved read-only retry succeeded.
- A fresh byte-pattern scan of the 883 current working files found **zero recognized credential-shaped files**. Generic literals and encoded/binary content are subject to the original detector limits.
- The known retained blob `e36a2425ec62bf9ae9d69ca1bfa67a71369007f9` still contains credential-shaped material for **Supabase legacy service-role, SMTP/app password, Brevo and ElevenLabs**. The Supabase assignment and decoded JWT role refer to the same credential. No credential was used or checked with a provider, and revocation is not established.

Evidence: [local/ref/file checks and fresh current scan](evidence/github-cleanup/checkpoint-preflight/local.json), [fresh GitHub main check](evidence/github-cleanup/checkpoint-preflight/remote.json).

These are **preflight results**, not a post-cleanup scan. No complete stored-history rerun or post-deletion scan was performed because deletion was blocked. The earlier full stored-object scan remains available in [the original evidence](evidence/github-cleanup/scan.json).

## Remaining exposure and required owner actions

AUD-001 remains **OPEN**. The two refs still retain the secret-bearing tree, and the credential blob remains stored locally. There is no new evidence establishing that it was pushed to GitHub; cached/deleted refs, other clones and copies remain unverified. Even a future approved ref deletion will leave retained objects because garbage collection and pruning are outside the authorized scope.

1. Complete the [provider-specific revocation/replacement steps](CREDENTIAL_ROTATION.md), including revoking the old credentials. Confirm completion without supplying values. Do not infer revocation from creating replacement credentials or from Git cleanup.
2. Confirm that neither of the two checkpoint recovery points is still needed.
3. Once both conditions are confirmed, recheck the exact refs against their expected object IDs immediately before executing only the already-approved deletions. Preserve current files, branches and private environment contents with before/after comparisons; verify remote main independently without writing to it. Then rerun the complete credential scan and report retained exposure separately from reference removal.

No application code, actual environment file, production setting or shared database record was modified. No ref deletion, history rewrite, force-push, commit, push, garbage collection, pruning or reflog expiry occurred. The current authorization permits no additional reference deletions or remote cleanup.
