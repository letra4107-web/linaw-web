-- STAGING-ONLY PILOT. Apply only after web migrations 023-026 and the mobile
-- server-owned reading progression migration are confirmed in the same project.
-- This is additive and does not change existing client-scored routes.
CREATE TABLE IF NOT EXISTS public.authoritative_speech_attempt_keys (
  student_id UUID NOT NULL REFERENCES public.children(id) ON DELETE RESTRICT,
  content_id UUID NOT NULL REFERENCES public.reading_content(id) ON DELETE RESTRICT,
  idempotency_key UUID NOT NULL,
  response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, idempotency_key)
);

ALTER TABLE public.authoritative_speech_attempt_keys ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.authoritative_speech_attempt_keys FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.authoritative_speech_attempt_keys TO service_role;

COMMENT ON TABLE public.authoritative_speech_attempt_keys IS
  'Staging-only idempotency records for the server-authoritative speech scoring pilot.';
