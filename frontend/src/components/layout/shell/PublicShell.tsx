import { Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";

import RouteLoadingPage from "@/routes/RouteLoadingPage";

import ShellFrame from "./ShellFrame";
import { shouldShowPublicBack } from "./shellNavigation";

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
