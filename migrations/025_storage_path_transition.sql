-- Transitional, non-destructive storage metadata. Public URL columns remain
-- authoritative until all web/mobile consumers use backend access-url APIs.
-- Rollback: applications may ignore these nullable columns. Do not drop them
-- after new clients begin writing storage_path without first backfilling URLs.

ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS storage_bucket TEXT,
  ADD COLUMN IF NOT EXISTS storage_path TEXT,
  ADD COLUMN IF NOT EXISTS legacy_public_url TEXT;

UPDATE public.lessons
SET legacy_public_url = COALESCE(legacy_public_url, pdf_url),
    storage_bucket = COALESCE(storage_bucket, 'lesson-pdfs'),
    storage_path = COALESCE(storage_path, split_part(pdf_url, '/lesson-pdfs/', 2))
WHERE pdf_url LIKE '%/lesson-pdfs/%';

ALTER TABLE public.pdf_materials
  ADD COLUMN IF NOT EXISTS storage_bucket TEXT DEFAULT 'reading-materials',
  ADD COLUMN IF NOT EXISTS legacy_public_url TEXT;

UPDATE public.pdf_materials
SET storage_bucket = COALESCE(storage_bucket, 'reading-materials'),
    legacy_public_url = COALESCE(legacy_public_url, file_url)
WHERE file_url IS NOT NULL;

ALTER TABLE public.teacher_uploads
  ADD COLUMN IF NOT EXISTS storage_bucket TEXT,
  ADD COLUMN IF NOT EXISTS storage_path TEXT,
  ADD COLUMN IF NOT EXISTS legacy_public_url TEXT;

UPDATE public.teacher_uploads
SET legacy_public_url = COALESCE(legacy_public_url, path),
    storage_bucket = COALESCE(storage_bucket, 'reading-materials'),
    storage_path = COALESCE(storage_path, split_part(path, '/reading-materials/', 2))
WHERE path LIKE '%/reading-materials/%';

NOTIFY pgrst, 'reload schema';
