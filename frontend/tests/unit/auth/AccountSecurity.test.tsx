const enqueueSnackbarMock = vi.fn();

vi.mock("notistack", async () => {
  const actual = await vi.importActual<typeof import("notistack")>("notistack");
  return {
    ...actual,
    enqueueSnackbar: (...args: unknown[]) => enqueueSnackbarMock(...args),
  };
});

import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DeleteAccount from "@/components/auth/dialog/DeleteAccount";
import ChangePasswordPage from "@/pages/user/ChangePasswordPage";
import { buildUser } from "tests/shared/builders";
import { createAuthContextValue, renderWithProviders } from "tests/setup/test-utils";

describe("account security surfaces", () => {
  beforeEach(() => {
    enqueueSnackbarMock.mockReset();
  });

  it("requires a confirmation click before deleting a non-MFA account", async () => {
    const deleteUser = vi.fn(async () => {});

    renderWithProviders(
      <DeleteAccount user={buildUser({ mfaEnabled: false })} deleteUser={deleteUser} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Delete Account/i }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() => expect(deleteUser).toHaveBeenCalledWith(""));
  });

  it("requires MFA verification before deleting an MFA-enabled account", async () => {
    const deleteUser = vi.fn(async () => {});

    renderWithProviders(
      <DeleteAccount user={buildUser({ mfaEnabled: true })} deleteUser={deleteUser} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Delete Account/i }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    fireEvent.change(screen.getByLabelText("Enter 6-digit code from Authenticator"), {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Verify & Delete Account" }));

    await waitFor(() => expect(deleteUser).toHaveBeenCalledWith("123456"));
  });

  it("blocks password updates when confirmation does not match", async () => {
    const user = userEvent.setup();
    const updatePassword = vi.fn(async () => ({ success: false, mfaRequired: true }));

    renderWithProviders(<ChangePasswordPage />, {
      auth: createAuthContextValue({
        user: buildUser({ mfaEnabled: false }),
        updatePassword,
      }),
    });

    await user.type(screen.getByLabelText("Current Password"), "OldPassword1");
    await user.type(screen.getByLabelText("New Password"), "NewPassword1");
    await user.type(screen.getByLabelText("Confirm New Password"), "Mismatch1");
    await user.click(screen.getByRole("button", { name: "Update Password" }));

    expect(enqueueSnackbarMock).toHaveBeenCalledWith(
      "New password and confirmation do not match",
      { variant: "error" },
    );
    expect(updatePassword).not.toHaveBeenCalled();
  });

  it("reveals MFA follow-up messaging after an async MFA-required password response", async () => {
    const user = userEvent.setup();
    let resolveUpdate: ((value: { success: false; mfaRequired: true }) => void) | null = null;
    const updatePassword = vi.fn(
      () =>
        new Promise<{ success: false; mfaRequired: true }>((resolve) => {
          resolveUpdate = resolve;
        }),
    );

    renderWithProviders(<ChangePasswordPage />, {
      auth: createAuthContextValue({
        user: buildUser({ mfaEnabled: false }),
        updatePassword,
      }),
    });

    await user.type(screen.getByLabelText("Current Password"), "OldPassword1");
    await user.type(screen.getByLabelText("New Password"), "NewPassword1");
    await user.type(screen.getByLabelText("Confirm New Password"), "NewPassword1");

    const submitButton = screen.getByRole("button", { name: "Update Password" });
    await user.click(submitButton);

    await waitFor(() =>
      expect(updatePassword).toHaveBeenCalledWith("OldPassword1", "NewPassword1", undefined),
    );
    await waitFor(() => {
      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent("Updating...");
    });

    resolveUpdate?.({ success: false, mfaRequired: true });

    await waitFor(() => {
      expect(submitButton).toBeEnabled();
      expect(submitButton).toHaveTextContent("Update Password");
    });
    expect(
      await screen.findByText("MFA code is required. Please enter your authentication code and try again."),
    ).toBeInTheDocument();
  });
});
