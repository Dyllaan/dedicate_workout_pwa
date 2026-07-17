import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';

import RouteLoadingPage from '@/features/auth/components/routes/RouteLoadingPage';

export default function PublicRoute() {
  const { signedIn, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div data-testid="auth-route-loading">
        <RouteLoadingPage />
      </div>
    );
  }

  if (signedIn) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
