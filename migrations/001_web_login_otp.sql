-- LinawLetra Web: login 2FA codes.
-- Owned entirely by this project's backend (service_role); no client access.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.web_login_otp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  resend_count INT NOT NULL DEFAULT 0,
  last_resend_at TIMESTAMPTZ,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_web_login_otp_user_id ON public.web_login_otp(user_id);

ALTER TABLE public.web_login_otp ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "web_login_otp service role only" ON public.web_login_otp;
CREATE POLICY "web_login_otp service role only"
ON public.web_login_otp
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

NOTIFY pgrst, 'reload schema';
