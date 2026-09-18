-- Guided PDF reading attempts and assignment status are now written only by
-- the ownership-checked student API. The old policies let a student browser
-- submit an arbitrary transcript, accuracy, chunk text, or status directly.
-- Preserve all SELECT policies and teacher/service-role workflows; only
-- revoke the superseded student mutation paths.

DROP POLICY IF EXISTS "Students record own pdf reading attempts" ON public.pdf_reading_attempts;
DROP POLICY IF EXISTS "Students update own pdf assignment status" ON public.pdf_assignments;
DROP POLICY IF EXISTS "Students update own guided pdf progress" ON public.pdf_assignments;

-- Service-role policies from 004_teacher_workspace.sql remain the sole write
-- path for student reading attempts/status changes. Force PostgREST to reload
-- the updated policy definitions.
NOTIFY pgrst, 'reload schema';
