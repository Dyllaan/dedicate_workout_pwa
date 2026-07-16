import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Landing from '@/pages/core/Landing';
import RouteLoadingPage from '@/routes/RouteLoadingPage';

export default function RootRoute() {
  const { signedIn, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div data-testid="auth-route-loading">
        <RouteLoadingPage />
      </div>
    );
  }

  return signedIn ? <Navigate to="/dashboard" replace /> : <Landing />;
}
