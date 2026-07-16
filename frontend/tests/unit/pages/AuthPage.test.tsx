const { navigateMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
}));

import { fireEvent, screen } from "@testing-library/react";
import AuthPage from "@/pages/user/AuthPage";
import { createAuthContextValue, renderWithProviders } from "tests/setup/test-utils";

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock("@/components/auth/forms/LoginForm", () => ({
  default: () => <div>Login form</div>,
}));

vi.mock("@/components/auth/forms/RegisterForm", () => ({
  default: () => <div>Register form</div>,
}));

vi.mock("@/components/auth/forms/MfaForm", () => ({
  default: () => <div>MFA form</div>,
}));

vi.mock("@/components/auth/dialog/AuthRequirementsDialog", () => ({
  default: () => null,
}));

vi.mock("@/components/health/ServiceVersions", () => ({
  ServiceVersions: () => null,
}));

describe("AuthPage", () => {
  it("navigates to the register route from login mode", () => {
    renderWithProviders(<AuthPage mode="login" />, {
      route: "/login",
      auth: createAuthContextValue({ mfaRequired: false }),
    });

    fireEvent.click(screen.getByRole("button", { name: "Sign up" }));

    expect(navigateMock).toHaveBeenCalledWith("/register");
  });

  it("syncs the visible mode when the route-provided mode changes", () => {
    const rendered = renderWithProviders(<AuthPage mode="login" />, {
      route: "/login",
      auth: createAuthContextValue({ mfaRequired: false }),
    });

    expect(screen.getByText("Login")).toBeInTheDocument();
    expect(screen.getByText("Login form")).toBeInTheDocument();

    rendered.rerender(<AuthPage mode="register" />);

    expect(screen.getByText("Register")).toBeInTheDocument();
    expect(screen.getByText("Register form")).toBeInTheDocument();
  });
});
