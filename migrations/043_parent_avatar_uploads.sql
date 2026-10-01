-- Parent profile photos are public but upload paths are restricted to the
-- authenticated parent's UUID.
INSERT INTO storage.buckets (id, name, public)
VALUES ('parent-avatars', 'parent-avatars', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "parents upload own avatars" ON storage.objects;
CREATE POLICY "parents upload own avatars" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'parent-avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "parents update own profile" ON public.parents;
CREATE POLICY "parents update own profile" ON public.parents FOR UPDATE TO authenticated
USING (auth_uid = auth.uid()) WITH CHECK (auth_uid = auth.uid());
