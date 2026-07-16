import { Navigate, Outlet, useLocation } from "react-router-dom";

import ShellFrame from "@/components/layout/shell/ShellFrame";
import { shouldShowAppBack } from "@/components/layout/shell/shellNavigation";
import RouteLoadingPage from "@/routes/RouteLoadingPage";
import { useAuth } from "@/hooks/useAuth";

export default function ProtectedRoute() {
  const { pathname } = useLocation();
  const { signedIn, isLoading } = useAuth();

  if (isLoading) {
    return (
      <ShellFrame
        data-testid="app-shell"
        variant="app"
        showBack={shouldShowAppBack(pathname)}
        forceBottomNav
      >
        <div data-testid="auth-route-loading">
          <RouteLoadingPage />
        </div>
      </ShellFrame>
    );
  }

  if (!signedIn) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
