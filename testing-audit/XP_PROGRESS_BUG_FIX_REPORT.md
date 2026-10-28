# XP/progress bug-fix report

Updated 23 October 2026. Option 1 is VERIFIED LOCALLY for the supported practice/assessment contract. Formal staging/production status remains NOT READY / BLOCKED. No shared Supabase access/changes, shared migration execution, deployment, commits, pushes, history deletion or historical XP repair occurred. General-progress SQL and its prerequisites ran only in disposable local PostgreSQL. The separate WOD proposal remains unchanged and unexecuted.

## Option 1 changes

Added the canonical payment ledger/composite ownership key, linked new pronunciation sessions to events, froze uncertain pre-contract labels, and added explicit baseReward outcomes. Preserved new attempts versus receipt retries. Both clients validate responses and display reward status; web changed-input concurrency now conflicts. Backend mutations require version 2. Independent practice actions request separate server tickets; durable consumption retries retain their original ticket.

Existing XP, attempts, sessions, completions, badge IDs and dates remain intact. The transaction freezes pre-contract completed-word labels once in progress_legacy_completed_words, then creates a zero-amount eligibility claim on first encounter. Pre-contract content attempts/completions, unlinked old sessions, or frozen matching labels mark legacy_review_required. Text is only a conservative veto for uncertainty; it never authorizes payment or defines content identity. Newly verified same-label content does not become false legacy history. A zero-amount row/old xp_awarded flag is not proof of payment. Web practice cannot launder an uncertain legacy claim into a mobile reward. New practice still records, with no automatic missed historical credit. Reconciliation requires independent records and separate approval; even a large suspect legacy total is preserved rather than corrected here.

Mobile Student Dashboard applies only official snapshots, displays first/repeat/retry/legacy-review feedback using the existing StudentText/theme, and retains loading, same-answer retry and duplicate-tap protection. Parent progress refresh is tested against stored totals, including a repeat increasing attempts while word count/XP stay unchanged. Existing navigation, parent UI, assessment and achievement regressions pass. Parangal/catalog rendering and historical badge reads remain intact; no new client award path was added.

The actual web checkout has the seven reviewed source/test changes applied and hash-verified, including the follow-up version guard. Practice/module feedback uses the same outcome meanings. Dashboard, assessment, achievements, parent, teacher and admin read consumers retain their existing official table/RPC contracts; no XP consumer was changed to derive rewards from attempt count. Existing backend/client role and read-contract regressions, types, lint and production build pass. This is local fixture/route evidence, not authenticated browser or physical-phone staging validation.

[Full source/test file manifest](option-1/evidence/changed-files.json).

See [complete Option 1 verification](XP_OPTION_1_POLICY_VERIFICATION.md). [Preserved previous report](option-1/baseline/XP_PROGRESS_BUG_FIX_REPORT.md).
