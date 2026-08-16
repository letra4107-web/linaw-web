import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth/AuthContext';
import { dashboardPathForRole } from '../lib/auth/resolveRole';
import Landing from './Landing';

export default function Home() {
  const { user, identity, loading } = useAuth();

  if (loading) return null;
  if (user && identity) return <Navigate to={dashboardPathForRole(identity.role)} replace />;

  return <Landing />;
}
