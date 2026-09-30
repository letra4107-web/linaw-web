-- One centralized, admin-managed configuration record for system-wide settings.
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  settings JSONB NOT NULL DEFAULT '{}'::JSONB,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT system_settings_global_key CHECK (key = 'global')
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.system_settings FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.system_settings TO service_role;

NOTIFY pgrst, 'reload schema';
