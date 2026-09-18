-- Practice sessions affect progress insights and badge eligibility. They are
-- now created only by POST /api/student/practice/attempt, which resolves the
-- authenticated student and derives scoring from active reading content.
-- Revoke the browser mutation capability regardless of historical policy name;
-- service_role retains its separate database grant for the API path.
REVOKE INSERT ON TABLE public.pronunciation_practice_sessions FROM authenticated;

NOTIFY pgrst, 'reload schema';
