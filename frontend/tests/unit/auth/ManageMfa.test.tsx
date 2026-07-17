import { fireEvent, screen } from "@testing-library/react";
import ManageMfa from "@/features/auth/components/dialog/ManageMfa";
import { buildUser } from "tests/shared/builders";
import { createAuthContextValue, renderWithProviders } from "tests/setup/test-utils";

describe("ManageMfa", () => {
  it("opens setup when MFA is disabled", () => {
    renderWithProviders(<ManageMfa />, {
      auth: createAuthContextValue({
        user: buildUser({ mfaEnabled: false }),
      }),
    });

    fireEvent.click(screen.getByText("MFA is Disabled"));

    expect(screen.getByText("Enable Two-Factor Authentication")).toBeInTheDocument();
  });

  it("opens disable verification when MFA is enabled", () => {
    renderWithProviders(<ManageMfa />, {
      auth: createAuthContextValue({
        user: buildUser({ mfaEnabled: true }),
      }),
    });

    fireEvent.click(screen.getByText("MFA is Enabled"));

    expect(screen.getByText("Disable Two-Factor Authentication")).toBeInTheDocument();
  });
});
