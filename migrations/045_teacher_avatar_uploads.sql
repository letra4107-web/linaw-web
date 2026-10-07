-- Teacher profile photos are public for display in the teacher portal. Uploads
-- and profile updates stay scoped to the authenticated teacher.
ALTER TABLE public.teacher_profiles
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS notify_progress BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_schedule BOOLEAN NOT NULL DEFAULT false;

INSERT INTO storage.buckets (id, name, public)
VALUES ('teacher-avatars', 'teacher-avatars', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "teachers upload own avatars" ON storage.objects;
CREATE POLICY "teachers upload own avatars"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'teacher-avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "teachers update own avatars" ON storage.objects;
CREATE POLICY "teachers update own avatars"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'teacher-avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'teacher-avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "teachers read own avatars" ON storage.objects;
CREATE POLICY "teachers read own avatars"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'teacher-avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

NOTIFY pgrst, 'reload schema';
