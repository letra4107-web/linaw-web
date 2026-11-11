-- Same parent + normalized full name + grade identifies an enrollment.
-- Preserve display names, existing accounts, credentials, progress and XP.
BEGIN;

-- Use Unicode case rules regardless of the server's operating-system locale.
CREATE COLLATION IF NOT EXISTS public.child_enrollment_unicode
 (provider=icu,locale='und',deterministic=true);

CREATE OR REPLACE FUNCTION public.normalize_child_enrollment_name(p_name text)
RETURNS text LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE SET search_path=pg_catalog AS $$
 SELECT lower(btrim(regexp_replace(normalize(replace(p_name,chr(65279),' '),NFKC),'[[:space:]]+',' ','g')) COLLATE public.child_enrollment_unicode)
$$;

-- Do not merge or delete legacy children if duplicate data is discovered.
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.children WHERE parent_id IS NOT NULL
  GROUP BY parent_id,grade_level,public.normalize_child_enrollment_name(name) HAVING count(*)>1) THEN
  RAISE EXCEPTION 'Existing duplicate child enrollments require review. No accounts were changed.';
 END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS children_parent_enrollment_name_uidx
 ON public.children(parent_id,grade_level,public.normalize_child_enrollment_name(name))
 WHERE parent_id IS NOT NULL;

NOTIFY pgrst,'reload schema';
COMMIT;
