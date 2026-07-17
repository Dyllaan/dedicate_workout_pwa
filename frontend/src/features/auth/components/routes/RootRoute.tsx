import { Navigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import Landing from '@/pages/public/Landing';
import RouteLoadingPage from '@/features/auth/components/routes/RouteLoadingPage';

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
