# Duplicate child enrollment

Requirement: enrolling the same child details again must display exactly
`Student already exists` and must not leave a second child account.

The existing identity rule is the same parent, child name and grade. Name
comparison ignores case, repeated whitespace and surrounding whitespace. The
database index also handles legacy whitespace and simultaneous requests. Names
under different parents remain independent. Birth date is not a new identity key.

Both backend routes return HTTP 409 with `code: STUDENT_ALREADY_EXISTS`. Their
initial duplicate lookup runs before Auth account creation. A database conflict
after concurrent requests also returns 409 and attempts cleanup of the losing
request's temporary account. Other constraint errors remain ordinary failures.
The mobile and web error formatters preserve the required message exactly.

## Rollout

1. Apply `migrations/064_prevent_duplicate_child_enrollment.sql` to the shared
   Supabase database. Installation stops if legacy duplicate groups exist;
   reconcile their accounts and learning history before retrying. No records
   are automatically deleted by this migration.
2. Deploy the web and mobile backends with the updated enrollment handlers.
3. Deploy the web frontend and rebuild/update the iOS and Android apps to include
   their message formatter changes. Source changes do not update installed apps.

## Acceptance on the installed iOS app

Use an authorized disposable parent/child in a test environment. Enroll the
child once, note the child ID and linked Auth user ID, then submit the same
details again. Confirm `Student already exists`, the enrollment form remains
open, no success action occurs, and both child/Auth counts remain unchanged.
Repeat with case/spacing variations and simultaneous submissions from two
devices. Verify another parent may enroll a child with the same name.

## Automated checks

Verified locally: 16 web route/formatter checks, 35 mobile backend checks,
12 mobile checks with the iOS Jest preset, and 10 disposable PostgreSQL checks
passed. Mobile TypeScript and focused whitespace checks passed. The concurrent
database scenario accepted one out of eight simultaneous duplicate inserts.

- `node --test server/tests/finalEnrollmentContracts.test.js tests/validationMessages.test.mjs`
- `node scripts/qa-child-enrollment-sql.mjs` (disposable local PostgreSQL only)
- Mobile: `node --test backend/tests/duplicate_enrollment.test.js backend/tests/mobile_auth_audit.test.js`
- Mobile: `node node_modules/jest/bin/jest.js --preset=jest-expo/ios --roots=src --runInBand --no-cache --silent --testTimeout=15000 --runTestsByPath src/screens/EnrollChildModal.test.js src/utils/validationMessage.test.js`
- Mobile: `npm run typecheck`

These checks use mocked services or isolated local PostgreSQL. No live child
was enrolled, deleted or changed for verification. Actual installed-device
acceptance and production rollout are separate from the local checks.
