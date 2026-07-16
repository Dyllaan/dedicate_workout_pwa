import { lazy, type ComponentType } from "react";
import { screen } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";

import AppShell from "@/components/layout/shell/AppShell";
import PublicShell from "@/components/layout/shell/PublicShell";
import { createAuthContextValue, renderWithProviders } from "tests/setup/test-utils";

describe("route shells", () => {
  it("wraps signed-in routes in the app shell and shows the bottom nav", () => {
    renderWithProviders(
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<div>Dashboard content</div>} />
        </Route>
      </Routes>,
      {
        route: "/dashboard",
        auth: createAuthContextValue({ signedIn: true }),
      },
    );

    expect(screen.getByTestId("app-shell")).toBeInTheDocument();
    expect(screen.getByText("Dashboard content")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Primary navigation" })).toBeInTheDocument();
  });

  it("wraps public routes in the public shell without the bottom nav", () => {
    renderWithProviders(
      <Routes>
        <Route element={<PublicShell />}>
          <Route path="/login" element={<div>Login content</div>} />
        </Route>
      </Routes>,
      {
        route: "/login",
        auth: createAuthContextValue({ signedIn: false, user: null }),
      },
    );

    expect(screen.getByTestId("public-shell")).toBeInTheDocument();
    expect(screen.getByText("Login content")).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Primary navigation" })).not.toBeInTheDocument();
  });

  it("shows a local fallback inside the app shell chrome", () => {
    type LazyRouteComponent = ComponentType<object>;
    const LazyDashboard = lazy(
      async () =>
        new Promise<{ default: LazyRouteComponent }>(() => {
          // Keep the module unresolved so the shell suspense fallback stays visible.
        }),
    );

    renderWithProviders(
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<LazyDashboard />} />
        </Route>
      </Routes>,
      {
        route: "/dashboard",
        auth: createAuthContextValue({ signedIn: true }),
      },
    );

    expect(screen.getByTestId("app-shell")).toBeInTheDocument();
    expect(screen.getByTestId("app-shell-route-loading")).toBeInTheDocument();
    expect(screen.queryByTestId("route-loading")).not.toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Primary navigation" })).toBeInTheDocument();
  });

  it("shows route loading inside the public shell without the bottom nav", () => {
    type LazyRouteComponent = ComponentType<object>;
    const LazyLogin = lazy(
      async () =>
        new Promise<{ default: LazyRouteComponent }>(() => {
          // Keep the module unresolved so the shell suspense fallback stays visible.
        }),
    );

    renderWithProviders(
      <Routes>
        <Route element={<PublicShell />}>
          <Route path="/login" element={<LazyLogin />} />
        </Route>
      </Routes>,
      {
        route: "/login",
        auth: createAuthContextValue({ signedIn: false, user: null }),
      },
    );

    expect(screen.getByTestId("public-shell")).toBeInTheDocument();
    expect(screen.getByTestId("route-loading")).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Primary navigation" })).not.toBeInTheDocument();
  });
});
