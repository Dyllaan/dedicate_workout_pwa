import { screen } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import ProtectedRoute from "@/features/auth/components/routes/ProtectedRoute";
import PublicRoute from "@/features/auth/components/routes/PublicRoute";
import RootRoute from "@/features/auth/components/routes/RootRoute";
import { createAuthContextValue, renderWithProviders } from "tests/setup/test-utils";

describe("auth routes", () => {
  it("redirects anonymous users away from protected routes", () => {
    renderWithProviders(
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<div>Dashboard</div>} />
        </Route>
        <Route path="/login" element={<div>Login Screen</div>} />
      </Routes>,
      {
        route: "/dashboard",
        auth: {
          ...createAuthContextValue(),
          signedIn: false,
          user: null,
        },
      },
    );

    expect(screen.getByText("Login Screen")).toBeInTheDocument();
  });

  it("allows signed-in users through protected routes", () => {
    renderWithProviders(
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<div>Dashboard</div>} />
        </Route>
        <Route path="/login" element={<div>Login Screen</div>} />
      </Routes>,
      {
        route: "/dashboard",
      },
    );

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("shows a loading shell while auth state is resolving", () => {
    renderWithProviders(
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<div>Dashboard</div>} />
        </Route>
      </Routes>,
      {
        route: "/dashboard",
        auth: {
          ...createAuthContextValue(),
          isLoading: true,
        },
      },
    );

    expect(screen.getByTestId("app-shell")).toBeInTheDocument();
    expect(screen.getByTestId("auth-route-loading")).toBeInTheDocument();
    expect(screen.getByTestId("route-loading")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Primary navigation" })).toBeInTheDocument();
  });

  it("redirects signed-in users away from public routes", () => {
    renderWithProviders(
      <Routes>
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<div>Login Screen</div>} />
        </Route>
        <Route path="/dashboard" element={<div>Dashboard</div>} />
      </Routes>,
      {
        route: "/login",
      },
    );

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("shows the loading shell while public auth routes resolve", () => {
    renderWithProviders(
      <Routes>
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<div>Login Screen</div>} />
        </Route>
      </Routes>,
      {
        route: "/login",
        auth: {
          ...createAuthContextValue(),
          isLoading: true,
        },
      },
    );

    expect(screen.getByTestId("auth-route-loading")).toBeInTheDocument();
    expect(screen.getByTestId("route-loading")).toBeInTheDocument();
  });

  it("shows the landing page at root for anonymous users and redirects signed-in users", () => {
    const anonymous = renderWithProviders(
      <RootRoute />,
      {
        auth: {
          ...createAuthContextValue(),
          signedIn: false,
          user: null,
        },
      },
    );

    expect(screen.getByRole("button", { name: "Register" })).toBeInTheDocument();

    anonymous.unmount();

    renderWithProviders(
      <Routes>
        <Route path="/" element={<RootRoute />} />
        <Route path="/dashboard" element={<div>Dashboard</div>} />
      </Routes>,
      { route: "/" },
    );

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("shows the loading shell at root while auth state resolves", () => {
    renderWithProviders(
      <RootRoute />,
      {
        auth: {
          ...createAuthContextValue(),
          isLoading: true,
        },
      },
    );

    expect(screen.getByTestId("auth-route-loading")).toBeInTheDocument();
    expect(screen.getByTestId("route-loading")).toBeInTheDocument();
  });
});
