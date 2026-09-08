import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth/AuthContext';
import { dashboardPathForRole } from '../lib/auth/resolveRole';
import Landing from './Landing';
import { BrandedStatus } from '../components/BrandedStatus';

export default function Home() {
  const { user, identity, loading, error, retry } = useAuth();

  if (loading) return <BrandedStatus />;
  if (error) return <BrandedStatus error={error} onRetry={retry} />;
  if (user && identity) return <Navigate to={dashboardPathForRole(identity.role)} replace />;

  return <Landing />;
}
