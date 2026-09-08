-- Staged retirement of recoverable student passwords.
-- Existing plaintext values are intentionally retained during rollout so no
-- account is locked out. New enrollment/reset code writes NULL and records a
-- rotation timestamp. After production verification and account rotations,
-- a separately reviewed cleanup may NULL remaining legacy values and later
-- drop the column.

ALTER TABLE public.child_credentials
  ALTER COLUMN plain_password DROP NOT NULL;

ALTER TABLE public.child_credentials
  ADD COLUMN IF NOT EXISTS password_rotated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS plaintext_retired_at TIMESTAMPTZ;

COMMENT ON COLUMN public.child_credentials.plain_password IS
  'LEGACY ONLY. New code must write NULL. Remove after verified credential rotation.';

COMMENT ON COLUMN public.child_credentials.hashed_password IS
  'One-way bcrypt audit/compatibility hash; Supabase Auth remains authoritative for login.';
