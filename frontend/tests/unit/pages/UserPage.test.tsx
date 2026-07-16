vi.mock("@/components/health/ServiceVersions", () => ({
  ServiceVersions: () => <div>Service versions stub</div>,
}));

import { fireEvent, screen } from "@testing-library/react";
import YouPage from "@/pages/user/YouPage";
import { createAuthContextValue, renderWithProviders } from "tests/setup/test-utils";

describe("YouPage", () => {
  it("renders account controls and lets the user log out", () => {
    const logout = vi.fn();

    renderWithProviders(<YouPage />, {
      auth: createAuthContextValue({ logout }),
    });

    expect(screen.getByRole("heading", { name: "You" })).toBeInTheDocument();
    expect(screen.getByText("Manage your account settings.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Log out Sign out of your account on this device\./i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Log out Sign out of your account on this device\./i }));
    expect(logout).toHaveBeenCalled();
  });
});
