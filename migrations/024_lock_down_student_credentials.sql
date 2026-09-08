-- Phase 3: stop all client-side credential reads and prevent new plaintext
-- writes without deleting any legacy value. Apply only after 023.
--
-- Rollback (policy only): recreate the previous parents_read_child_credentials
-- SELECT policy from the mobile 002_new_tables.sql migration. That rollback is
-- intentionally not automated because exposing hashes/passwords is unsafe.
-- The write-sanitizing trigger can be rolled back with:
--   DROP TRIGGER IF EXISTS sanitize_child_credentials_plaintext ON public.child_credentials;
--   DROP FUNCTION IF EXISTS public.sanitize_child_credentials_plaintext();

ALTER TABLE public.child_credentials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "parents_read_child_credentials" ON public.child_credentials;
DROP POLICY IF EXISTS "Parents read child credentials" ON public.child_credentials;

CREATE OR REPLACE FUNCTION public.sanitize_child_credentials_plaintext()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.plain_password := NULL;
    NEW.plaintext_retired_at := COALESCE(NEW.plaintext_retired_at, now());
  ELSIF NEW.plain_password IS DISTINCT FROM OLD.plain_password AND NEW.plain_password IS NOT NULL THEN
    NEW.plain_password := NULL;
    NEW.plaintext_retired_at := COALESCE(NEW.plaintext_retired_at, now());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sanitize_child_credentials_plaintext ON public.child_credentials;
CREATE TRIGGER sanitize_child_credentials_plaintext
BEFORE INSERT OR UPDATE ON public.child_credentials
FOR EACH ROW EXECUTE FUNCTION public.sanitize_child_credentials_plaintext();

COMMENT ON TABLE public.child_credentials IS
  'Server-only credential metadata. RLS intentionally exposes no rows to anon/authenticated clients.';

NOTIFY pgrst, 'reload schema';
