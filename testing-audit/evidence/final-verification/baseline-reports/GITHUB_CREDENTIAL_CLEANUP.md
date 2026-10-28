# GitHub credential cleanup review

Date: **2026-10-21, Asia/Manila**. Status: **safe local preparation complete; AUD-001 remains OPEN pending owner revocation/rotation confirmation.** No credential was tested for validity. No commit, push, ref deletion, history rewrite, garbage collection, production setting change or shared Supabase operation occurred.

> **Conditional cleanup follow-up:** the owner approved only the two documented ref deletions with prerequisites, then confirmed revocation is **incomplete or uncertain**. Both refs still match the expected object ID and remain intact. Deletion is **BLOCKED**; no recovery-point confirmation has been received. [Fresh preflight, preservation checks and remaining exposure](CHECKPOINT_CLEANUP_STATUS.md).

## Finding that changes the cleanup plan

The recognized secret-bearing `server/.env.example` blob is present in **two local Codex checkpoint tree refs**, with **no containing commit among all 206 stored/reachable commits**. GitHub's read-only advertisement lists `refs/heads/main` at `d5fd34e2146c7eadbfeafcf3f4a80b51413b61ee`, matching scanned local HEAD. No other remote refs were advertised. This is evidence about currently advertised history, not a guarantee about deleted refs, caches, pull requests, artifacts, forks or earlier copies.

**A rewrite of GitHub main is not justified by the present findings.** The previous object-only audit included tool snapshot trees in `--all`; its reference to a historical blob did not establish a committed or pushed exposure. That scope is corrected in the linked audit reports. The credential material remains retained locally and must still receive owner review and revocation if real. Removing it from any Git object store cannot invalidate a copied credential.

## Scan coverage and evidence

- **206 commits**, including their trees and commit-message bodies; **359 index entries** and current HEAD files.
- **All 2,128 stored blobs** among **5,129 stored Git objects**, including unreachable/retained blobs. No object was removed. Blob content was inspected in memory and never written to scan evidence.
- All tracked working files and nonignored prospective additions present during the full scan: **876 file paths**. Later report/tool additions receive a separate final current-file check.
- Text extraction succeeded for **11 stored PDF versions**. Recognized credential patterns were checked in extracted text and raw bytes. This does not inspect screenshots, OCR, attachments or every PDF annotation.
- Provider-shaped tokens, service-role JWT role claims, private-key headers, credential-bearing connection URLs, sensitive configuration assignments and inline password/token literals were examined. Generic matches are candidates, not proof of real credentials.
- Git remote URL configuration and commit-message scanning produced no recognized credential matches. Remote URLs, authors' addresses and commit-message bodies were not printed or copied into reports.

Evidence: [full redacted inventory](evidence/github-cleanup/scan.json), [candidate dispositions](evidence/github-cleanup/triage.json), [recognized credential-containing commits](evidence/github-cleanup/affected-commits.csv), [all candidate commits with classifications](evidence/github-cleanup/candidate-commits.csv), [read-only GitHub ref advertisement](evidence/github-cleanup/remote-refs.json).

The [final current-file verification](evidence/github-cleanup/current-file-verification.json) checks later report/tool additions, all six example-file states (working tree/index/HEAD), ignored local environments and tracked sensitive filenames after preparation.

[Post-preparation checks](evidence/github-cleanup/post-preparation-checks.json) record the final current-file scan, lint, report-generator syntax, whitespace and read-only Git object-integrity results. Retained/dangling objects were left intact.

`affected-commits.csv` has only a header: there are no identified commits containing recognized exposed credentials in this scan. The separate candidate CSV includes validation feedback and configuration-test fixtures and must not be described as a list of proven leaks.

## Affected files and credential types

| File/material | Credential or data type | Working tree / index / HEAD | Stored-history status and action |
| --- | --- | --- | --- |
| `server/.env.example` | Supabase legacy service-role JWT, SMTP/app password, Brevo API key, ElevenLabs API key | Placeholder-only in all three; tracked template retained | One recognized credential-shaped blob in two local checkpoint refs; no containing commit found. Keep AUD-001 OPEN until owner confirmation. |
| `.env.example` | Public client configuration template | Placeholder-only in all three; tracked template retained | No recognized exposed credential found. |
| `.env`, `.env.production`, `server/.env` | Actual private runtime configuration | Present locally, ignored, not indexed | Preserved. In-memory comparisons during verification confirmed unchanged contents; values and hashes were not serialized. |
| `server/tests/security.test.js`, six committed blob versions | Generic Google TTS / ElevenLabs configuration literals | No current recognized provider credential | Candidates occur in `validateServerConfig` test fixtures. They are not recognized provider-token formats. Owner may privately confirm they are synthetic; no API validation is permitted. Exact blobs, lines and containing commits are in candidate evidence. |
| `src/pages/auth/Login.tsx`, `src/pages/auth/SignUp.tsx` | Strings assigned to `errors.password` | Retained unchanged | Reviewed false positives: password-validation feedback, not supplied passwords. |
| `tests/authQa.test.mjs` | Mock sign-up session literal | Existing untracked test retained unchanged | Reviewed mock fixture passed to `signupHarness`; not a real authenticated service request. |
| Seven additional retained candidate blobs | Older configuration-validation fixtures and a validation-feedback version | Outside mapped current commit/snapshot paths | Byte-scanned and classified by source context. Original filenames were not reconstructed from dangling trees; IDs and lines remain in evidence. No additional recognized credential-shaped literal found. |

The service-role assignment and its decoded JWT role describe the **same credential**, not two separate exposures. No known GitHub token, AWS access ID, Google-format API key, Slack/Stripe/SendGrid token, private-key header or credential-bearing connection URL was found by the selected detectors. This is a heuristic result, not proof that every possible credential encoding is absent.

Recognized secret-bearing blob: `e36a2425ec62bf9ae9d69ca1bfa67a71369007f9`. Retaining tree: `081ba404375f1319843bcddd85ac59a424b22ae4`.

The two exact retaining refs are:

```text
refs/codex/turn-diffs/checkpoints/06cbf6717843e7f3f0166fb170d574ad/359d43141d7c003afedc0d5e757b7645/1792315982495/4adb50db-90e3-44cf-af91-a1897e682f20
refs/codex/turn-diffs/checkpoints/594447f4ea056837c5359433a35d97b1/338ad1d7cd109d5aee3366f5f452fffc/1792343065231/6792b65c-15a0-4d3c-ad79-a61bceb4cee0
```

These are local tree snapshots, not commits or advertised GitHub branches. Their existence alone cannot establish whether another copy was uploaded elsewhere.

## Ignore rules and other sensitive data

Expanded `.gitignore` now covers alternate `*.env` filenames, private-key/keystore formats, SSH/AWS credentials, local package authentication files, service-account/credential JSON filenames, token files, private secret directories, Terraform state/variable files, database snapshots and designated export directories. `.env.example`, SQL migrations, application source, package locks and audit CSVs remain visible to Git. Tests use fictitious paths without creating credential files.

No private environment, key/config credential filename or database/export filename was found in scanned commit/snapshot trees or current tracked paths. Ignore rules do not untrack indexed files, inspect content, or prevent deliberately forced adds. There was no need to remove an indexed private environment file, and no `git rm --cached` was run.

Other sensitive-data review remains bounded: the repository includes educational PDFs, thesis documentation and image assets. Their text/bytes were credential-pattern scanned, but image content, personal details embedded in screenshots, document attachments/metadata, encrypted material and compressed payloads are not certified clean. Owner review should prioritize `docs/LinawLetra_Thesis_System_Documentation.pdf`, `docs/LinawLetra_Dyslexia_Friendly_Reading_Samples.pdf`, `docs/reading-stories/`, image assets and any future learner exports. Schema column names, educational character names and test fixtures were not treated as proof of real student records. Git author/contact metadata also needs owner privacy judgment before public distribution.

Ignored runtime environments, local test/browser directories and dependency installations are intentionally outside the publication-content scan. Selected private environment values were compared with generated frontend files **only in memory**; no matching private value was found.

## Proposed cleanup procedure — not executed

1. **Owner credential response first.** Follow [the existing provider-specific rotation/revocation instructions](CREDENTIAL_ROTATION.md) for Supabase legacy service-role, SMTP/app password, Brevo and ElevenLabs. Review provider usage and repository access privately. Confirm replacement and old-credential revocation without sending values. No credential is considered safe because a file or Git object was removed.
2. **Preserve the current work.** The working tree contains substantial pre-existing fixes. Before any destructive action, arrange an owner-controlled, access-restricted backup of the complete working copy and local configuration. A full Git backup may itself contain the exposed material and must not be committed, uploaded as a public artifact or stored in this repository. No backup, stash, reset or auto-commit was created here.
3. **Retain the clean examples and ignore rules through an ordinary reviewed change.** Review specific files and sanitized scan results, then separately approve staging/committing/pushing selected changes. This task staged nothing. Publishing the full dirty tree would also include unrelated application/database-dependent changes and needs its own review and deployment plan.
4. **For the demonstrated local retention, prefer an owner-reviewed checkpoint-only cleanup.** First confirm the IDE no longer needs the two exact checkpoint refs for recovery and that both still point to the recorded tree. The owner has now conditionally approved these two deletions; the proposed operation would be `git update-ref -d <exact-checkpoint-ref> <expected-old-tree-id>` for only those two refs, with `081ba404375f1319843bcddd85ac59a424b22ae4` as the expected old ID. It would leave branches, working files and actual environments intact, but discard those IDE recovery references. **Revocation is incomplete or uncertain and the recovery condition is unconfirmed; deletion remains BLOCKED and neither ref was deleted.**
5. **Re-scan after any separately approved local cleanup.** Deleting refs leaves retained objects; other checkpoints, reflogs or snapshots may still protect them. Verify every retaining root before considering further cleanup. Reflog expiry, pruning and garbage collection are separate destructive operations and require another reviewed scope and explicit approval. They can lose unrelated recovery data. A fresh clean clone is an alternative; transfer only reviewed working files and private configuration securely, preserving the original until recovery is confirmed.
6. **Only if additional evidence establishes contaminated remote history, prepare a separate rewrite.** Inventory all relevant branch/tag/PR refs and alternate secret paths in a fresh isolated clone; use a reviewed `git-filter-repo` version supporting `--sensitive-data-removal` (at least 2.47). A proposed content-preserving command is `git-filter-repo --sensitive-data-removal --replace-text <private-external-replacements-file>`. The replacement mapping would contain revoked values, stay outside the repository under restricted access, and never appear in command arguments, reports or committed files. It has not been created. Review binary/metadata cases separately. Obtain approval before running any rewrite, even in that clone; never rewrite this dirty working directory. Validate changed commits, templates, functionality and complete secret scans before proposing publication.
7. **Treat publication as its own approval gate.** Review the exact ref changes, collaborators' work, branch protections, open PRs and automatic deployments. A later approved push must enumerate the intended branch/tag refs so private Codex tree refs are excluded; mirroring this local repository could publish them. No force-push command has been run or authorized. After any approved remote cleanup, re-clone to verify and coordinate other clones/forks. GitHub Support may be needed for cached views or PR refs and has its own removal criteria.

The rewrite cautions and tool requirements follow [GitHub's sensitive-data removal guidance](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository). The approval gates above reflect this task's explicit restrictions. The currently supported action is safe preparation, not deletion or rewriting.

## Executed regression verification

| Check | Actual final result | Evidence |
| --- | --- | --- |
| Backend Node tests | **434 PASS, 0 FAIL, 2 SKIPPED**, 436 total | [backend TAP](evidence/github-cleanup/backend.tap) |
| Frontend/utility Node tests | **44 PASS, 0 FAIL**, including 3 new credential/ignore regression tests | [frontend TAP](evidence/github-cleanup/frontend.tap) |
| Lint with warnings denied | PASS | [lint](evidence/github-cleanup/lint.txt) |
| TypeScript project build | PASS | [TypeScript](evidence/github-cleanup/build.txt) |
| Production Vite build | PASS | [production build](evidence/github-cleanup/vite-build.txt) |
| Diff whitespace checks | PASS | [diff](evidence/github-cleanup/diff.txt) |
| Actual local environments and Git index | All three environment files and index unchanged during verification | [preservation](evidence/github-cleanup/preservation.json) |
| Generated frontend scan | Zero recognized credential-shaped matches, zero selected private-environment-value matches | [build scan](evidence/github-cleanup/build-secret-scan.json) |
| Read-only GitHub refs | PASS after approved network retry; one advertised main matches local HEAD | [remote evidence](evidence/github-cleanup/remote-refs.json) |

Combined executed Node results: **478 PASS, 0 FAIL, 2 SKIPPED**. Initial lint found two unnecessary regex-string escapes in the new scanner; these were corrected before the final passing run. New detector tests also caught a synthetic fixture being interpreted as a literal; the fixture and quoted-value parser were corrected. These were audit-tool corrections, not application-source changes. The sandbox initially prevented the remote connection; the approved read-only retry succeeded.

No application route, component, runtime environment or production configuration was edited for this task. This supports unchanged behavior for the executed local assertions and successful compilation; it does not establish complete signed-in functionality. The two skipped checks are **staging role smoke** and **staging Supabase RLS isolation**. No shared-project fallback was used. Browser workflows, provider delivery, the pending Word-of-Day SQL dependency and remaining isolated-service checks were not rerun or cleared by credential cleanup.

## Modified files and remaining risks

This task changes `.gitignore`; adds `tests/githubCredentialCleanup.test.mjs`; adds `testing-audit/github-credential-detector.mjs`, `github-credential-scan.mjs`, `github-candidate-triage.mjs`, `github-remote-inventory.mjs`, `github-cleanup-verify.mjs` and the final current-file verifier; creates this report and redacted evidence under `testing-audit/evidence/github-cleanup/`; corrects credential scope in `CREDENTIAL_ROTATION.md`, `DEFECT_RESOLUTION.md`, `BUG_REPORT.md`, `FINAL_TESTING_REPORT.md` and their `resolution-report.mjs` generator. Earlier fixes, baseline evidence and unrelated edits remain preserved. Temporary local helpers under ignored `.qa/` contain no copied secrets.

Remaining risks are unconfirmed credential revocation; retained local credential material; unverified remote deleted refs/PRs/caches/forks/releases/Actions artifacts and other clones; generic configuration-test candidates requiring private owner judgment; sensitive content outside the detector/OCR/encoding coverage; and future accidental adds. GitHub push protection/secret scanning and a maintained redacting secret scanner are useful owner-controlled follow-ups; no repository settings or hooks were changed automatically.

**Readiness:** prepared for review and an ordinary, separately approved security change. GitHub history is not certified secret-free in all copies. The conditional checkpoint-only approval cannot be executed until its owner prerequisites are confirmed; AUD-001 remains OPEN. This report does not claim 100% security or application functionality.
