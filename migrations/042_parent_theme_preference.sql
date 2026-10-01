-- Keep the parent portal's appearance preference alongside its language preference.
ALTER TABLE public.parents_settings
  ADD COLUMN IF NOT EXISTS preferred_theme TEXT NOT NULL DEFAULT 'default'
    CHECK (preferred_theme IN ('default', 'dark', 'high-contrast'));

NOTIFY pgrst, 'reload schema';
