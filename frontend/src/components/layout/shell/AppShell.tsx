import { Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import LoadingState from "@/components/layout/feedback/LoadingState";

import ShellFrame from "./ShellFrame";
import { shouldShowAppBack } from "./utils/ShellNavigation";

export default function AppShell() {
  const { pathname } = useLocation();

  return (
    <ShellFrame data-testid="app-shell" variant="app" showBack={shouldShowAppBack(pathname)}>
      <Suspense fallback={<AppShellRouteFallback />}>
        <Outlet />
      </Suspense>
    </ShellFrame>
  );
}

function AppShellRouteFallback() {
  return (
    <div className="px-4 py-4" data-testid="app-shell-route-loading">
      <LoadingState rows={1} className="pt-0" />
    </div>
  );
}
