-- LinawLetra Web: archive trail for Admin disable/delete/archive actions.
-- Reuses the existing users.account_status ('active' | 'archived') / is_active columns;
-- these columns just record who archived a row and why.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS archived_reason TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

NOTIFY pgrst, 'reload schema';
