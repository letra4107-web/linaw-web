-- Reserve each inbox for one account, across all roles and clients.
-- Existing accounts are preserved, including legacy Gmail aliases.
BEGIN;

CREATE OR REPLACE FUNCTION public.canonical_account_email(p_email text)
RETURNS text LANGUAGE sql IMMUTABLE STRICT SET search_path=pg_catalog AS $$
 SELECT CASE WHEN split_part(lower(btrim(p_email)),'@',2) IN ('gmail.com','googlemail.com')
   THEN replace(split_part(split_part(lower(btrim(p_email)),'@',1),'+',1),'.','')||'@gmail.com'
   ELSE lower(btrim(p_email)) END
$$;

CREATE TABLE IF NOT EXISTS public.account_email_reservations (
 email_key text PRIMARY KEY,
 auth_uid uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED
);
ALTER TABLE public.account_email_reservations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.account_email_reservations FROM PUBLIC,anon,authenticated;

-- Prefer verified owners when legacy aliases already share an inbox. No
-- credentials, roles, profiles or verification history are modified.
INSERT INTO public.account_email_reservations(email_key,auth_uid)
 SELECT DISTINCT ON (public.canonical_account_email(a.email)) public.canonical_account_email(a.email),a.id
 FROM auth.users a LEFT JOIN public.users u ON u.id=a.id
 WHERE nullif(btrim(a.email),'') IS NOT NULL
 ORDER BY public.canonical_account_email(a.email),coalesce(u.email_verified,false) DESC,
   a.email_confirmed_at NULLS LAST,a.created_at,a.id
 ON CONFLICT(email_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.reserve_account_email()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE next_key text; previous_key text; owner_id uuid;
BEGIN
 IF TG_OP='UPDATE' THEN
   previous_key:=public.canonical_account_email(OLD.email);
   IF NEW.email IS NOT DISTINCT FROM OLD.email THEN RETURN NEW; END IF;
 END IF;
 next_key:=public.canonical_account_email(nullif(btrim(NEW.email),''));
 IF TG_OP='UPDATE' AND next_key IS NOT DISTINCT FROM previous_key THEN RETURN NEW; END IF;
 IF next_key IS NOT NULL THEN
   -- A unique key serializes concurrent signup/email-change requests across servers.
   INSERT INTO public.account_email_reservations(email_key,auth_uid) VALUES(next_key,NEW.id)
   ON CONFLICT(email_key) DO UPDATE SET auth_uid=EXCLUDED.auth_uid
     WHERE public.account_email_reservations.auth_uid=EXCLUDED.auth_uid
   RETURNING auth_uid INTO owner_id;
   IF owner_id IS NULL THEN
     RAISE EXCEPTION 'Email already in use' USING ERRCODE='23505',CONSTRAINT='account_email_reservations_pkey';
   END IF;
 END IF;
 IF previous_key IS NOT NULL AND previous_key IS DISTINCT FROM next_key THEN
   DELETE FROM public.account_email_reservations WHERE email_key=previous_key AND auth_uid=NEW.id;
   INSERT INTO public.account_email_reservations(email_key,auth_uid)
    SELECT previous_key,a.id FROM auth.users a WHERE a.id<>NEW.id
      AND public.canonical_account_email(a.email)=previous_key ORDER BY a.created_at,a.id LIMIT 1
    ON CONFLICT(email_key) DO NOTHING;
 END IF;
 RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.retain_existing_email_owner()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 DELETE FROM public.account_email_reservations WHERE auth_uid=OLD.id;
 INSERT INTO public.account_email_reservations(email_key,auth_uid)
  SELECT public.canonical_account_email(OLD.email),a.id FROM auth.users a
  WHERE a.id<>OLD.id AND public.canonical_account_email(a.email)=public.canonical_account_email(OLD.email)
  ORDER BY a.created_at,a.id LIMIT 1 ON CONFLICT(email_key) DO NOTHING;
 RETURN OLD;
END $$;

DROP TRIGGER IF EXISTS reserve_account_email ON auth.users;
CREATE TRIGGER reserve_account_email BEFORE INSERT OR UPDATE OF email ON auth.users
 FOR EACH ROW EXECUTE FUNCTION public.reserve_account_email();
DROP TRIGGER IF EXISTS retain_existing_email_owner ON auth.users;
CREATE TRIGGER retain_existing_email_owner AFTER DELETE ON auth.users
 FOR EACH ROW EXECUTE FUNCTION public.retain_existing_email_owner();

-- Called only by rate-limited servers. Never return the owner's identity or role.
CREATE OR REPLACE FUNCTION public.account_email_in_use(p_email text,p_except_id uuid DEFAULT NULL)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT EXISTS(SELECT 1 FROM auth.users a WHERE public.canonical_account_email(a.email)=public.canonical_account_email(p_email)
   AND (p_except_id IS NULL OR a.id<>p_except_id))
$$;
REVOKE ALL ON FUNCTION public.canonical_account_email(text),public.reserve_account_email(),public.retain_existing_email_owner(),public.account_email_in_use(text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.account_email_in_use(text,uuid) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
