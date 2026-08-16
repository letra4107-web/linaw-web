-- Ensures the 'lesson-pdfs' storage bucket exists. Migration 006_lessons.sql in
-- the mobile repo already defines this + its RLS policies, but live schema
-- inspection found the public.lessons table applied without this bucket
-- existing -- re-running the idempotent bucket insert here to close that gap.
INSERT INTO storage.buckets (id, name, public)
VALUES ('lesson-pdfs', 'lesson-pdfs', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "Lesson PDFs are readable" ON storage.objects;
CREATE POLICY "Lesson PDFs are readable"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'lesson-pdfs');

DROP POLICY IF EXISTS "Teachers can upload lesson PDFs" ON storage.objects;
CREATE POLICY "Teachers can upload lesson PDFs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'lesson-pdfs'
  AND COALESCE(auth.jwt()->'user_metadata'->>'role', '') IN ('teacher', 'admin')
);

NOTIFY pgrst, 'reload schema';
