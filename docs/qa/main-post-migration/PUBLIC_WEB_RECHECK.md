# Deployed public website recheck — 2026-10-18 (Asia/Manila)

The deployed public website was inspected without an account session, submitted forms, database credentials, RPC calls, migrations or deployment. This is a limited supplementary run; it does not replace the complete application inventory or clear the main post-migration hold.

| Executed scope | PASS | FAIL | BLOCKED |
|---|---:|---:|---:|
| Anonymous HTTP status, headers and API authorization checks | 24 | 1 | 0 |
| Edge public-page navigation and responsive viewport checks | 23 | 7 | 1 |
| Check instances in this supplementary run | 47 | 8 | 1 |

These counts include related assertions against the same pages, not 56 new independent user journeys. The last complete application inventory remains 561 cases: 472 passed, 15 failed, 66 blocked, 3 not run and 5 not implemented. No new application-wide readiness claim is made.

## Findings

- All 18 HTTP frontend URL checks returned 200. This establishes delivery of the SPA document, not authenticated dashboard functionality.
- The backend health check returned 200 with its expected public metadata and security header. Health does not query or validate the Supabase schema.
- Five protected API requests without credentials returned 401, including the Admin, Teacher, Parent and Student paths. This checks anonymous rejection only, not cross-role authorization or RLS.
- All four anonymous dashboard root navigations redirected to login in Edge. No account was logged in.
- The deployed backend still omits `Access-Control-Expose-Headers` for the API compatibility header (LIVE-025). The local `server/server.js` already configures the exposed headers; its prior local regression evidence is retained. No deployment or new local product correction was performed in this recheck.
- `/privacy`, `/terms`, `/child-data`, `/account-deletion` and `/accessibility` measured 587px content at a 375px viewport, reproducing the previously reported deployed mobile overflow. Those five pages passed the 1440px viewport checks. Existing local corrections and their earlier test evidence do not establish a deployed fix.
- The first mobile browser visits to `/` and `/login` returned HTTP 403; their separate HTTP probes and later desktop browser visits returned 200. These two failed browser assertions have an unresolved delivery cause. They are not attributed to migrations, authentication or a new application-code defect without further evidence. No access restriction was bypassed.
- No uncaught JavaScript exceptions were observed, but the all-planned-navigation exception check remains BLOCKED because not every planned public page check completed successfully. It was not marked passed from an empty exception list.

## Limits and evidence

The fresh headless Edge context permitted only GET/HEAD requests to `https://linawletra.com`. All other origins and methods, plus service workers, were blocked. External Google Fonts requests were therefore blocked; layout observations use the available fallback fonts and require a fully rendered font-enabled follow-up before broad visual signoff. The mobile viewport is a resized desktop engine, not a physical phone or Safari test.

An initial sandbox attempt denied network access. It was not accepted as a product result; the authorized external-network rerun produced the evidence below. No retry was used to erase the two observed 403 results.

- [HTTP results](../evidence/main-post-migration/deployed-readonly-2026-10-18/deployed-public-http.json)
- [Browser results, version and blocked-request log](../evidence/main-post-migration/deployed-readonly-2026-10-18/browser-navigation.json)
- [Desktop home screenshot](../evidence/main-post-migration/deployed-readonly-2026-10-18/home-1440.png)
- [Desktop login screenshot](../evidence/main-post-migration/deployed-readonly-2026-10-18/login-1440.png)
- Navigation runner: `scripts/qa-deployed-navigation-readonly.mjs` (no production application files changed).

Main catalog verification of migrations 047/048 and global existing-data integrity remain BLOCKED by incomplete dedicated read-only connection configuration and potentially restricted RLS visibility. Actual login, account switching, authenticated dashboard workflows, email/OTP, learning mutations and speech services were not run. The separate isolated QA environment is still required for write-dependent integration tests.

**Readiness: HOLD.** Public delivery and anonymous guards are partially verified; deployed defects and unresolved browser responses remain, and the main database has not been independently cleared. No automatic deployment is authorized or performed.
