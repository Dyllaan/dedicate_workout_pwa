const enqueueSnackbarMock = vi.fn();
const clipboardWriteTextMock = vi.fn();
const createObjectUrlMock = vi.fn(() => "blob:test-url");
const revokeObjectUrlMock = vi.fn();
const clickMock = vi.fn();

vi.mock("notistack", async () => {
  const actual = await vi.importActual<typeof import("notistack")>("notistack");
  return {
    ...actual,
    enqueueSnackbar: (...args: unknown[]) => enqueueSnackbarMock(...args),
  };
});

const mfaMock = vi.fn();

vi.mock("@/features/auth/hooks/useMfa", () => ({
  useMfa: () => mfaMock(),
}));

import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MfaDisableDialog from "@/features/auth/components/dialog/mfa/MfaDisableDialog";
import MfaSetupDialog from "@/features/auth/components/dialog/mfa/MfaSetupDialog";
import { createAuthContextValue, renderWithProviders } from "tests/setup/test-utils";

describe("MFA dialogs", () => {
  beforeEach(() => {
    const originalCreateElement = Document.prototype.createElement;

    enqueueSnackbarMock.mockReset();
    clipboardWriteTextMock.mockReset();
    createObjectUrlMock.mockClear();
    revokeObjectUrlMock.mockClear();
    clickMock.mockClear();

    const clipboard = { writeText: clipboardWriteTextMock };

    Object.defineProperty(globalThis.navigator, "clipboard", {
      configurable: true,
      value: clipboard,
    });
    Object.defineProperty(window.navigator, "clipboard", {
      configurable: true,
      value: clipboard,
    });

    globalThis.URL.createObjectURL = createObjectUrlMock;
    globalThis.URL.revokeObjectURL = revokeObjectUrlMock;
    vi.spyOn(document, "createElement").mockImplementation(((tagName: string) => {
      if (tagName === "a") {
        return {
          click: clickMock,
          set href(_href: string) {},
          set download(_download: string) {},
        } as unknown as HTMLAnchorElement;
      }

      return originalCreateElement.call(document, tagName);
    }) as typeof document.createElement);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it("shows a fail-closed setup state when no access token is available", () => {
    mfaMock.mockReturnValue({
      setupData: null,
      isLoading: false,
      accessToken: null,
      setupMfa: vi.fn(),
      verifyMfa: vi.fn(),
    });

    renderWithProviders(<MfaSetupDialog open onOpenChange={vi.fn()} />);

    expect(screen.getByText("Enable Two-Factor Authentication")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
    expect(screen.getByText("No access token available")).toBeInTheDocument();
  });

  it("walks through setup, verification, secret copy, backup download, and completion", async () => {
    const user = userEvent.setup();
    const setupMfa = vi.fn(async () => true);
    const verifyMfa = vi.fn(async () => true);
    const onOpenChange = vi.fn();
    const onComplete = vi.fn();

    mfaMock.mockReturnValue({
      setupData: {
        secret: "ABCDEF123456",
        qrCode: "data:image/png;base64,abc",
        backupCodes: ["CODE-1", "CODE-2"],
      },
      isLoading: false,
      accessToken: "token",
      setupMfa,
      verifyMfa,
    });

    renderWithProviders(
      <MfaSetupDialog open onOpenChange={onOpenChange} onComplete={onComplete} />,
    );

    await user.click(screen.getByRole("button", { name: "Continue" }));
    await waitFor(() => expect(setupMfa).toHaveBeenCalled());

    expect(screen.getByText("Scan the QR code and enter your verification code")).toBeInTheDocument();
    expect(screen.getByText("Scan QR Code")).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Copy secret" })).toBeVisible();

    await user.type(screen.getByLabelText("Enter 6-digit code from Authenticator"), "123456");
    await user.click(screen.getByRole("button", { name: "Verify & Enable" }));

    await waitFor(() => expect(verifyMfa).toHaveBeenCalledWith("123456"));
    expect(screen.getByText("Important: Save Your Backup Codes")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Download" }));
    expect(createObjectUrlMock).toHaveBeenCalled();
    expect(clickMock).toHaveBeenCalled();
    expect(revokeObjectUrlMock).toHaveBeenCalledWith("blob:test-url");
    expect(enqueueSnackbarMock).toHaveBeenCalledWith("Backup codes downloaded", {
      variant: "success",
    });

    await user.click(screen.getByRole("button", { name: "Done" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onComplete).toHaveBeenCalled();
  });

  it("submits disable verification and closes the dialog", async () => {
    const user = userEvent.setup();
    const disableMfa = vi.fn(async () => ({ success: true }));
    const onOpenChange = vi.fn();

    renderWithProviders(
      <MfaDisableDialog open onOpenChange={onOpenChange} />,
      {
        auth: createAuthContextValue({ disableMfa }),
      },
    );

    await user.type(screen.getByLabelText("Enter 6-digit code from Authenticator"), "123456");
    await user.click(screen.getByRole("button", { name: "Verify & Disable" }));

    await waitFor(() => expect(disableMfa).toHaveBeenCalledWith("123456"));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
