-- One enrollment per parent, normalized child name and grade. Web and mobile write
-- to this table, so enforce the rule here even for simultaneous requests.
-- Existing accounts/progress are preserved. If legacy duplicates exist, this
-- migration stops; reconcile those records before retrying, without deleting
-- learning history blindly. This preserves the existing enrollment identity rule.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

CREATE OR REPLACE FUNCTION public.child_enrollment_name(p_name text)
RETURNS text
LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
SET search_path = pg_catalog
AS $$
  SELECT lower(btrim(regexp_replace(replace(p_name, chr(160), ' '), '[[:space:]]+', ' ', 'g')));
$$;

DO $$
DECLARE duplicate_groups bigint;
BEGIN
  SELECT count(*) INTO duplicate_groups
  FROM (
    SELECT parent_id, grade_level, public.child_enrollment_name(name)
    FROM public.children
    WHERE parent_id IS NOT NULL AND name IS NOT NULL
    GROUP BY parent_id, grade_level, public.child_enrollment_name(name)
    HAVING count(*) > 1
  ) duplicates;
  IF duplicate_groups > 0 THEN
    RAISE EXCEPTION 'Child enrollment protection needs review: % duplicate name group(s) already exist.', duplicate_groups
      USING ERRCODE = '23505', HINT = 'Review records with the same parent, grade and normalized name; preserve accounts and learning history before retrying this migration.';
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS children_parent_enrollment_name_uidx
ON public.children (parent_id, grade_level, public.child_enrollment_name(name));

NOTIFY pgrst, 'reload schema';
COMMIT;
