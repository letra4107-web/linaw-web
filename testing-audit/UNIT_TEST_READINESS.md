# Unit testing readiness and actual coverage

Updated: **2026-10-21, Asia/Manila**.

**Evidence boundary:** current working-tree source, including prior edits. PASS means only the named executed assertion. Mocks, rendered pages, coverage, compilation and anonymous redirects do not establish complete live functionality. No shared Supabase calls/mutations, real account creation, delivery, proposed Word-of-Day SQL execution, deployment, commit, push, ref deletion or Git maintenance occurred. Private environment values never appear in reports. Earlier reports are retained in [baseline-reports](evidence/final-verification/baseline-reports/).

| Executed check | Result | Evidence |
| --- | --- | --- |
| backend | 494 PASS, 0 FAIL, 2 skipped / 496 total | [evidence/final-verification/gates-release-review/backend.tap](evidence/final-verification/gates-release-review/backend.tap) |
| frontend | 54 PASS, 0 FAIL, 0 skipped / 54 total | [evidence/final-verification/gates-release-review/frontend.tap](evidence/final-verification/gates-release-review/frontend.tap) |
| lint | exit 0 | [evidence/final-verification/gates-release-review/lint.txt](evidence/final-verification/gates-release-review/lint.txt) |
| TypeScript build mode (tsc -b) | exit 0 | [evidence/final-verification/gates-release-review/build.txt](evidence/final-verification/gates-release-review/build.txt) |
| Normal production Vite build | exit 0 | [evidence/final-verification/gates-release-review/vite-build.txt](evidence/final-verification/gates-release-review/vite-build.txt) |
| diff | exit 0 | [evidence/final-verification/gates-release-review/diff.txt](evidence/final-verification/gates-release-review/diff.txt) |

There are 70 new executed assertions versus the 478-pass baseline: section error sanitization (1), API contracts/outages/grade precedence (40), PDF upload failure/collision/ambiguous acknowledgement (12), enrollment compensation/validation/email outage (7), frontend API/Manila daily-word/error-notice contracts (10). Existing tests were retained.

| Measured area | Files | Lines | Functions | Branches | Scope |
| --- | --- | --- | --- | --- | --- |
| backend | 38 | 61.29% (2830/4617) | 79.72% | 68.53% | c8 --all for backend JS excluding tests and operator scripts; unloaded eligible files included |
| frontend | 12 | 77.98% (790/1013) | 59.57% | 75.43% | Source-mapped frontend TS units executed through the test loader; loaded modules only; excludes browser rendering coverage and unloaded pages |

Coverage was measured with c8/V8, not estimated from test count. [Backend HTML](evidence/final-verification/coverage-final/backend/index.html), [frontend unit HTML](evidence/final-verification/coverage-final/frontend/index.html), [raw summary](evidence/final-verification/coverage-final/summary.json). Frontend **whole-application coverage is not available**: only executed unit modules are measured, and CSS/browser rendering is outside that denominator. Backend --all includes unexecuted eligible files. These percentages cannot be combined or compared with the former loaded-module 46.61% figure as if scopes were identical. c8 and axe-core are QA-only tooling; official measurement/tool scope: [c8](https://github.com/bcoe/c8), [axe-core](https://github.com/dequelabs/axe-core).

Remaining gaps include unexecuted React components, lifecycle branches, page-specific controls, loading/empty/error permutations beyond named checks, actual device APIs and rare concurrency paths. Consult HTML/coverage-final.json per-file uncovered ranges; never infer a whole file's functions passed because it was loaded. Coverage report [summary](evidence/final-verification/coverage-final/summary.json) is separate from baseline test count. The last production change is CSS only and is tested by targeted browser assertions.

To rerun locally: node testing-audit/final-local-checks.mjs; node testing-audit/coverage-run.mjs (unique ignored temporary coverage directories; staging disabled). These do not run the proposed WOD SQL. Tool dependencies are isolated under scripts/qa-tools.

All preserved browser attempts, including initial fixture/setup failures and pre-fix runs: [execution index](BROWSER_EXECUTION_INDEX.csv). Raw statuses are retained; invalid fixtures do not establish successful data behavior.

## Unit test document exports

The supplied five-column UNIT TEST DOCUMENT template is now available as [editable Word](unit-test-documents/UNIT_TEST_DOCUMENTS.docx), [printable PDF](unit-test-documents/UNIT_TEST_DOCUMENTS.pdf) and [the complete ZIP](LINAWLETRA_UNIT_TEST_PACKAGE.zip). It preserves all 550 automated records (548 passed, two skipped/blocked) and labels unit, source-contract and mocked integration scopes separately. The [module-sheet companion](unit-test-documents/MODULE_TEST_SHEETS.docx) contains 96 unexecuted/planned scenarios across 40 sheets, including correct/incorrect Login credentials. [Index and individual module files](unit-test-documents/README.md). This is a document export, not a new test execution or functionality signoff.

