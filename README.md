# LinawLetra Web

LinawLetra is a responsive Filipino reading-support platform for Grades 1–6. It connects student reading practice with parent progress visibility, teacher assignments and insights, and administrative management. The web app shares its Supabase project and curriculum data with the related mobile application.

> This software supports learning. It is not a diagnostic or medical tool.

## Features

- Filipino pronunciation practice, browser speech recognition, and authenticated Google Cloud TTS
- Grade-based learning modules, assessments, nonsense-word checks, challenge words, streaks, XP, and badges
- Parent enrollment, child accessibility settings, schedules, reports, and notifications
- Teacher rosters, PDF reading assignments, drill review, and class progress reports
- Admin account management and operational analytics
- Lexend font, text sizing, high contrast, reading guide, reduced-motion support, and TTS speed controls

## Technology

- Frontend: React 19, TypeScript, Vite, React Router, Tailwind CSS, TanStack Query
- Backend: Node.js, Express, Multer, Google Cloud Text-to-Speech
- Data/auth/storage: Supabase Auth, Postgres, Realtime, and Storage
- Hosting: static frontend on Hostinger; Express API on Railway

## Architecture

`src/` contains the browser application. Routes are split into public/auth, admin, teacher, parent, and student bundles. `server/` contains authenticated API routes that use a Supabase service-role client. `migrations/` contains ordered SQL changes for the shared Supabase project.

Authorization is enforced twice: `ProtectedRoute` controls browser navigation, while Express middleware and Supabase RLS enforce access to data. Frontend checks are never treated as a security boundary.

## Frontend setup

Requirements: Node.js 22+ and npm.

```bash
npm ci
copy .env.example .env
npm run dev
```

Frontend environment variables:

```dotenv
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
VITE_API_URL=http://localhost:4000/api
VITE_APP_VERSION=0.1.0
VITE_API_COMPATIBILITY_VERSION=3
VITE_ANALYTICS_ENDPOINT=
```

Only the Supabase anon key is permitted in the frontend. Never add a service-role key, SMTP password, or Google credential to a `VITE_` variable.

## Backend setup

```bash
cd server
npm ci
copy .env.example .env
npm run dev
```

Backend variables:

```dotenv
PORT=4000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
FRONTEND_URL=http://localhost:5173
APP_VERSION=0.1.0
API_COMPATIBILITY_VERSION=3
GIT_COMMIT_SHA=
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-private-service-role-key
GOOGLE_TTS_API_KEY=your-private-google-key
STORAGE_SIGNED_URLS_ENABLED=false
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-user
SMTP_PASS=your-private-password
EMAIL_FROM="LinawLetra <no-reply@example.com>"
```

`CORS_ORIGIN` accepts comma-separated exact origins. Production should include only the deployed frontend origins.

## Supabase and migrations

Create or select the shared Supabase project, configure frontend/backend keys separately, then apply SQL files in `migrations/` in numeric order through a reviewed migration workflow. Do not rerun or edit an already-deployed migration without understanding its idempotency and data impact.

The `reading-materials` and legacy `lesson-pdfs` buckets are currently public for compatibility with stored `file_url` values and the mobile `teacher_uploads` workflow. Treat their URLs as public data. The private-storage migration must be coordinated: inventory mobile/web consumers, store object paths instead of permanent URLs, add ownership-checked signed-URL endpoints with short expiry, migrate clients, make buckets private, then remove legacy public URLs. Do not flip bucket visibility before both clients are ready.

### Student credential migration

Apply migrations 023–026 in order before deploying the matching backend. New web enrollment/reset and the audited mobile enrollment path store only the bcrypt hash; the temporary password is returned/delivered once. Migration 024 also removes the historical parent credential SELECT policy and sanitizes any new/changed plaintext write at the database boundary. Existing plaintext values are intentionally not deleted.

The mobile source audit found no UI/client query that reads `child_credentials`; only its service-role enrollment route wrote plaintext and emailed the temporary value. The route now writes `NULL`, but the mobile backend must be deployed after migration 023. Before final cleanup, verify the production mobile binary and access logs, rotate every account reported as legacy, and back up affected rows. Only then null remaining plaintext in a separate reviewed migration. The login source of truth remains Supabase Auth.

### Security feature flags

- `STORAGE_SIGNED_URLS_ENABLED=false` is the compatibility default. Keep it false until web and mobile use access endpoints and readiness reports are clean.
- `API_COMPATIBILITY_VERSION=3` and `VITE_API_COMPATIBILITY_VERSION=3` must match. A mismatch warns in the browser but does not block learning.
- `APP_VERSION`, `VITE_APP_VERSION`, and optional `GIT_COMMIT_SHA` identify deployments without exposing secrets.

## Speech and TTS

Speech recognition runs through supported browser APIs. Google TTS runs only on the backend and requires an authenticated Supabase session. The endpoint validates text, limits length, and applies endpoint and API rate limits. Restrict the Google API key to the required Text-to-Speech API and monitor quota/billing alerts.

## User roles

- Admin: manages users, teachers, configuration, and system analytics.
- Teacher: manages assigned students, lessons, PDFs, and progress.
- Parent: enrolls children and reviews their settings, schedules, and progress.
- Student: completes assigned learning, practice, and assessments.

Roles are resolved from `public.users`, with enrolled child accounts recognized through `children.auth_uid`. Server routes independently verify the bearer token and allowed role.

## Commands

```bash
npm run dev       # frontend development server
npm run lint      # Oxlint
npm test          # security/business-critical backend tests
npm run build     # TypeScript and production Vite build
npm run preview   # preview the built frontend
npm run smoke:staging # guarded, non-destructive staging deployment checks
```

Backend-only commands are available in `server/package.json`.

## Product analytics

`src/lib/analytics.ts` provides a replaceable, privacy-conscious event layer. Without `VITE_ANALYTICS_ENDPOINT`, events are emitted only as local browser custom events. The abstraction blocks properties whose keys imply names, emails, passwords, tokens, transcripts, voice/audio, or student identity. Any external collector requires a privacy and retention review before production use.

## Testing and CI

Focused Node tests cover PDF validation, TTS authentication/limits, reading-profile behavior, and authorization invariants. GitHub Actions installs both workspaces and runs lint, tests, and the production build on pushes and pull requests. `server/tests/e2e.staging.test.js` is skipped by default and runs read-only role smoke tests only when `E2E_ALLOW_STAGING_TESTS=true`; it refuses known production URLs and requires an explicitly staging/local target plus dedicated test accounts.

## Production deployment

### Before deployment

1. Create a verified Supabase backup and record current migration/policy/bucket state.
2. Review `docs/RLS_AUDIT.md`, `docs/MOBILE_COMPATIBILITY_AUDIT.md`, migrations 023–026, and confirm the mobile release no longer writes plaintext.
3. Deploy to a dedicated staging Supabase/Railway/Hostinger environment first. Never reuse production credentials.
4. Run `npm ci`, `npm --prefix server ci`, `npm run lint`, `npm test`, `npm run build`, and `npm run smoke:staging`.
5. Confirm `STORAGE_SIGNED_URLS_ENABLED=false` and matching API compatibility versions.

### Backend and database

1. Apply migrations 023, 024, 025, then 026 through the reviewed Supabase migration workflow.
2. Verify RLS/policy/function grants using the queries in `docs/RLS_AUDIT.md`; confirm credential queries return no rows for anon/parent/student/teacher tokens.
3. Configure Railway variables from `server/.env.example`. Production startup fails closed for missing/invalid core values.
4. Deploy the web API, check `/api/health`, version/commit, Helmet headers, exact CORS, 401/403 behavior, and request correlation IDs.
5. Deploy the separate mobile backend credential change. Keep both material buckets public.

### Frontend

1. Build with the production Supabase anon URL/key, API URL, version, and compatibility marker.
2. Upload **the contents** of `dist/` to Hostinger, including hidden `.htaccess`, `robots.txt`, `sitemap.xml`, and the manifest.
3. Purge Hostinger/CDN cache and confirm the new hashed asset names and version meta are served.
4. Verify CSP permits only intended Supabase/API/font/media connections and contains no `unsafe-eval`.

### Post-deployment

Test parent enrollment/reset and credential status, every role login, Word of the Day replay, reading practice, assessments, progress, badges, notifications, TTS, PDF validation/upload/access, charts, deep links, plus the installed mobile build. Compare frontend/backend compatibility markers. Review the aggregate credential and storage-readiness admin APIs; never export credential rows.

### Rollback

- Frontend: restore the prior complete Hostinger artifact set and purge CDN cache.
- Web/mobile backend: redeploy the prior immutable build. Do not roll back the database first.
- Migration 023: leaving nullable/timestamp columns is compatible with old code.
- Migration 024: drop only the sanitizer trigger/function if an emergency writer is broken; recreating parent credential reads is discouraged and must be separately approved.
- Migration 025: leave transitional columns/data in place; old clients ignore them.
- Migration 026: restore the prior backend code but retain `student_badge_awards` so award history is not lost.
- Storage/TTS: switch `STORAGE_SIGNED_URLS_ENABLED=false` and redeploy. Buckets are not made private by these migrations. Restore prior Google configuration if TTS alone fails.

GitHub Actions can automatically deploy the verified frontend to Hostinger after every push to `main`; see [docs/AUTOMATED_DEPLOYMENT.md](docs/AUTOMATED_DEPLOYMENT.md) for the one-time GitHub Secrets setup. Railway remains responsible for the connected backend's automatic deployment.

## Security notes

- Never commit `.env` files or production exports.
- Rotate a credential immediately if it appears in logs, screenshots, commits, or frontend code.
- Treat browser role checks as UX only; server middleware and RLS must authorize every sensitive action.
- PDF validation reduces accidental/spoofed uploads but is not malware scanning. Consider a quarantine/scanning service for untrusted institutional uploads.
- Review public legal drafts with qualified counsel before launch.

## Troubleshooting

- Blank/config error: confirm all three required frontend variables and restart Vite.
- API CORS error: ensure the exact browser origin is in `CORS_ORIGIN`; avoid `*` in production.
- TTS 401: sign in again and confirm the request includes a current Supabase bearer token.
- TTS 429: wait for the rate-limit window; investigate automation before increasing limits.
- PDF rejected: confirm `.pdf`, a PDF MIME type, a `%PDF-` header, an EOF trailer, and size below 15 MB.
- Deep-link 404 from Hostinger: ensure the built `.htaccess` exists in the document root and `mod_rewrite` is enabled.
