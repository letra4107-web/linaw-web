# Mobile compatibility audit (Phase 3)

Source inspected: `C:\Users\Samantha\OneDrive\Desktop\LinawLm\LinawLm`.

## Credentials

| Surface | Finding | Status |
|---|---|---|
| Mobile enrollment backend | `backend/routes/auth.js` created a Supabase Auth account, bcrypt hash, and `child_credentials.plain_password`, then emailed the temporary password | Updated locally to write `plain_password: null` plus rotation/retirement timestamps. Requires database migration 023 before mobile backend deployment. |
| Mobile UI / child profile switcher | No query of `child_credentials` or `plain_password` found in `src/` | Compatible with client-read lockdown. Validate the installed production binary after release. |
| Student login | Uses Supabase Auth email/password and saved session tokens | Compatible; no recoverable password is required. |
| Password reset | Mobile backend updates Supabase Auth through its reset flow | Compatible, but should be tested in staging after 023/024. |
| Parent credential display | No mobile screen-level read/display of `child_credentials` found | Do not reintroduce it; parent receives a one-time generated credential only. |

## Storage and PDFs

| Surface | Finding | Private-bucket readiness |
|---|---|---|
| `StudentDashboard.tsx` PDF assignments | Reads `pdf_materials.file_url` and opens it directly | Not ready. Must use an authenticated ownership-checked access endpoint. |
| `StudentDashboard.tsx` teacher uploads | Tries a signed URL from `teacher-uploads`, then a public URL, then a direct URL fallback | Not ready; bucket/path mismatch and public fallback must be removed only after a tested endpoint is available. |
| `StudentDashboard.tsx` lessons | Opens `lessons.pdf_url` directly | Not ready. Must use an authenticated access endpoint. |
| Mobile `reading.js` | Creates permanent `lesson-pdfs` public URLs | Transitional only. Store bucket/path and legacy URL after migration 025. |
| Web teacher lesson/PDF links | Now request an authenticated access URL; legacy URLs remain stored for compatibility | Ready for signed URLs only after migration 025 and backend deployment. |

The mobile app currently targets a separate Railway backend (`app-backend-production-f32c...`), not the web API. Therefore web access endpoints alone do not migrate mobile. Add equivalent authenticated, ownership-checked endpoints to the mobile backend; update each consumer; ship/test a mobile release; inspect aggregate storage readiness; only then enable `STORAGE_SIGNED_URLS_ENABLED=true` and later make buckets private.

## Mobile release gate

1. Apply 023–025 in staging.
2. Deploy the mobile backend plaintext-write change.
3. Test new child enrollment, email delivery, login, reset, profile switching, and existing student login.
4. Implement and test mobile access-URL consumers against the mobile backend.
5. Test fresh/expired signed URL refresh and offline/error states.
6. Deploy the mobile app release.
7. Verify no `child_credentials` client reads in telemetry/code review and that the admin legacy count declines.
8. Only then consider the final plaintext cleanup and private buckets.
