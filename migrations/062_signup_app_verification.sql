-- Auth auto-confirm and normal Auth updates are not app OTP verification.
-- Repair the source of the mobile signup/profile conflict without changing
-- existing account verification history, roles, credentials, or learning data.
BEGIN;

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE
  user_role text := coalesce(NEW.raw_user_meta_data->>'role','parent');
  display_name text := nullif(coalesce(
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'full_name',
    btrim(concat_ws(' ',NEW.raw_user_meta_data->>'firstName',NEW.raw_user_meta_data->>'lastName'))
  ),'');
BEGIN
  INSERT INTO public.users(id,email,name,role,created_at,email_verified,metadata)
  VALUES(NEW.id,NEW.email,display_name,user_role,now(),false,NEW.raw_user_meta_data)
  ON CONFLICT(id) DO UPDATE SET
    email=EXCLUDED.email,
    name=coalesce(public.users.name,EXCLUDED.name),
    role=coalesce(public.users.role,EXCLUDED.role),
    metadata=coalesce(public.users.metadata,'{}'::jsonb)||EXCLUDED.metadata;

  IF user_role='parent' THEN
    INSERT INTO public.parents(auth_uid,full_name,email,created_at)
    VALUES(NEW.id,display_name,NEW.email,now())
    ON CONFLICT(auth_uid) DO UPDATE SET
      full_name=coalesce(EXCLUDED.full_name,public.parents.full_name),
      email=coalesce(EXCLUDED.email,public.parents.email),updated_at=now();
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.handle_auth_user_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
  UPDATE public.users SET
    email=NEW.email,
    -- Preserve verification through sign-in, token refresh and password edits.
    -- A changed email needs a new app verification for that address.
    email_verified=CASE WHEN NEW.email IS DISTINCT FROM OLD.email THEN false ELSE email_verified END,
    metadata=coalesce(NEW.raw_user_meta_data,'{}'::jsonb)
  WHERE id=NEW.id;
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.handle_new_auth_user(),public.handle_auth_user_update() FROM PUBLIC,anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
