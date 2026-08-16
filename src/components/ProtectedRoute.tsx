import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth/AuthContext';
import type { AppRole } from '../lib/auth/resolveRole';
import { dashboardPathForRole } from '../lib/auth/resolveRole';

interface ProtectedRouteProps {
  role: AppRole;
  children: React.ReactNode;
}

export function ProtectedRoute({ role, children }: ProtectedRouteProps) {
  const { user, identity, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-lg">
        Naglo-load...
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (!identity) {
    return <Navigate to="/verify-email" replace />;
  }

  if (identity.role !== role) {
    return <Navigate to={dashboardPathForRole(identity.role)} replace />;
  }

  return <>{children}</>;
}
