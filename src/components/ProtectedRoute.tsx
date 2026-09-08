import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth/AuthContext';
import type { AppRole } from '../lib/auth/resolveRole';
import { dashboardPathForRole } from '../lib/auth/resolveRole';
import { BrandedStatus } from './BrandedStatus';

interface ProtectedRouteProps {
  role: AppRole;
  children: React.ReactNode;
}

export function ProtectedRoute({ role, children }: ProtectedRouteProps) {
  const { user, identity, loading, error, retry } = useAuth();

  if (loading) {
    return <BrandedStatus message="Sinusuri ang iyong account..." />;
  }

  if (error) return <BrandedStatus error={error} onRetry={retry} />;

  if (!user) return <Navigate to="/login" replace />;

  if (!identity) {
    return <Navigate to="/verify-email" replace />;
  }

  if (identity.role !== role) {
    return <Navigate to={dashboardPathForRole(identity.role)} replace />;
  }

  return <>{children}</>;
}
