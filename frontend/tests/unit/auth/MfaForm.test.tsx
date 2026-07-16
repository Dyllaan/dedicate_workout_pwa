import { fireEvent, screen, waitFor } from "@testing-library/react";
import MfaForm from "@/components/auth/forms/MfaForm";
import { createAuthContextValue, renderWithProviders } from "tests/setup/test-utils";

describe("MfaForm", () => {
  it("submits MFA verification and calls success with trust-device selection", async () => {
    const verifyMfa = vi.fn(async () => ({ success: true }));
    const onSuccess = vi.fn();

    renderWithProviders(<MfaForm onSuccess={onSuccess} />, {
      auth: createAuthContextValue({ verifyMfa }),
    });

    fireEvent.change(screen.getByLabelText("Authentication Code"), {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByLabelText("Trust this device for 30 days"));
    fireEvent.click(screen.getByRole("button", { name: "Verify Code" }));

    await waitFor(() =>
      expect(verifyMfa).toHaveBeenCalledWith("123456", true),
    );
    expect(onSuccess).toHaveBeenCalled();
  });

  it("clears the MFA code after a failed verification and allows logout", async () => {
    const verifyMfa = vi.fn(async () => ({ success: false, error: "Nope" }));
    const logout = vi.fn();

    renderWithProviders(<MfaForm onSuccess={vi.fn()} />, {
      auth: createAuthContextValue({ verifyMfa, logout }),
    });

    const codeInput = screen.getByLabelText("Authentication Code");
    fireEvent.change(codeInput, {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Verify Code" }));

    await waitFor(() => expect(verifyMfa).toHaveBeenCalled());
    await waitFor(() => expect(codeInput).toHaveValue(""));

    fireEvent.click(screen.getByRole("button", { name: "Back to Login" }));
    expect(logout).toHaveBeenCalled();
  });
});
