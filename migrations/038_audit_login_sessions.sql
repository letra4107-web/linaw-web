-- Login details are kept in audit_logs.metadata, preserving the existing
-- append-only audit schema and avoiding a duplicate session store.
CREATE INDEX IF NOT EXISTS audit_logs_auth_sessions_idx
ON public.audit_logs (actor_id, created_at DESC)
WHERE action IN ('AUTH.LOGIN_SUCCESS', 'AUTH.LOGOUT');
