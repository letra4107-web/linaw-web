-- Apply in the Supabase SQL Editor before retrying Authentication > Users > Delete.
-- Keep audit events when an Auth user is deleted. ON DELETE SET NULL must be
-- allowed to clear the actor reference without allowing edits to the event.
BEGIN;

CREATE OR REPLACE FUNCTION public.prevent_audit_log_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.actor_id IS NOT NULL
       AND NEW.actor_id IS NULL
       AND (to_jsonb(NEW) - 'actor_id') IS NOT DISTINCT FROM (to_jsonb(OLD) - 'actor_id')
       -- The FK cleanup sees the deletion in its own transaction. Clearing a
       -- reference to an existing user, including by service_role, stays blocked.
       AND NOT EXISTS (SELECT 1 FROM auth.users WHERE id = OLD.actor_id)
    THEN
      RETURN NEW;
    END IF;
  END IF;

  RAISE EXCEPTION 'Audit logs are append-only';
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_audit_log_mutation() FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
