import { Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";

import RouteLoadingPage from "@/features/auth/components/routes/RouteLoadingPage";

import ShellFrame from "./ShellFrame";
import { shouldShowPublicBack } from "./utils/ShellNavigation";

export default function PublicShell() {
  const { pathname } = useLocation();

  return (
    <ShellFrame
      data-testid="public-shell"
      variant="public"
      showBack={shouldShowPublicBack(pathname)}
    >
      <Suspense fallback={<RouteLoadingPage />}>
        <Outlet />
      </Suspense>
    </ShellFrame>
  );
}
