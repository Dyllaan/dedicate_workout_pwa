import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import { AuthContext } from "@/components/auth/auth";
import { useMfa } from "@/hooks/useMfa";
import { authApi } from "@/api/api";
import { buildUser } from "tests/shared/builders";
import { createAuthContextValue } from "tests/setup/test-utils";

const enqueueSnackbarMock = vi.fn();

vi.mock("notistack", () => ({
  enqueueSnackbar: (...args: unknown[]) => enqueueSnackbarMock(...args),
}));

function MfaProbe() {
  const { setupMfa, verifyMfa } = useMfa();

  return (
    <div>
      <button type="button" onClick={() => setupMfa()}>
        Setup MFA
      </button>
      <button type="button" onClick={() => verifyMfa("123456")}>
        Verify MFA
      </button>
    </div>
  );
}

describe("useMfa", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function renderMfaHook(auth = createAuthContextValue()) {
    return renderHook(() => useMfa(), {
      wrapper: ({ children }) => <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>,
    });
  }

  it("surfaces failures to the user without relying on debug logging", async () => {
    vi.spyOn(authApi, "post").mockRejectedValue(new Error("network"));

    render(
      <AuthContext.Provider value={createAuthContextValue()}>
        <MfaProbe />
      </AuthContext.Provider>,
    );

    await act(async () => {
      screen.getByRole("button", { name: "Setup MFA" }).click();
    });

    await act(async () => {
      screen.getByRole("button", { name: "Verify MFA" }).click();
    });

    await waitFor(() =>
      expect(enqueueSnackbarMock).toHaveBeenCalledWith("An unexpected error occurred", { variant: "error" }),
    );
    expect(console.error).not.toHaveBeenCalled();
  });

  it("blocks MFA setup and verification when no access token exists", async () => {
    const { result } = renderMfaHook(createAuthContextValue({ user: null }));

    await act(async () => {
      expect(await result.current.setupMfa()).toBe(false);
      expect(await result.current.verifyMfa("123456")).toBe(false);
    });

    expect(enqueueSnackbarMock).toHaveBeenCalledWith("Please login first", { variant: "error" });
    expect(result.current.accessToken).toBeUndefined();
  });

  it("completes setup and verification when the API succeeds", async () => {
    const fetchMfaStatus = vi.fn(async () => {});
    const changeUserIsMfaEnabled = vi.fn();
    const auth = createAuthContextValue({
      user: buildUser({ accessToken: "access-token" }),
      fetchMfaStatus,
      changeUserIsMfaEnabled,
    });

    const postSpy = vi.spyOn(authApi, "post").mockImplementation(async (url, body) => {
      if (url === "mfa/setup") {
        return {
          status: 200,
          data: {
            qrCodeUrl: "qr://setup",
            secret: "SECRET",
            recoveryCodes: ["111111"],
          },
        } as never;
      }

      if (url === "mfa/verify") {
        expect(body).toEqual({ code: "123456" });
        return { status: 200, data: {} } as never;
      }

      return { status: 500, data: {} } as never;
    });

    const { result } = renderMfaHook(auth);

    await act(async () => {
      expect(await result.current.setupMfa()).toBe(true);
    });

    expect(result.current.setupData).toMatchObject({
      secret: "SECRET",
      recoveryCodes: ["111111"],
    });
    expect(postSpy).toHaveBeenCalledWith("mfa/setup");
    expect(enqueueSnackbarMock).toHaveBeenCalledWith("MFA setup initiated", { variant: "success" });

    await act(async () => {
      expect(await result.current.verifyMfa("123456")).toBe(true);
    });

    expect(postSpy).toHaveBeenCalledWith("mfa/verify", { code: "123456" });
    expect(changeUserIsMfaEnabled).toHaveBeenCalledWith(true);
    expect(fetchMfaStatus).toHaveBeenCalled();
    expect(enqueueSnackbarMock).toHaveBeenCalledWith("MFA enabled successfully!", { variant: "success" });
  });

  it("surfaces explicit API failures for setup and verification", async () => {
    const auth = createAuthContextValue({
      user: buildUser({ accessToken: "access-token" }),
      fetchMfaStatus: vi.fn(async () => {}),
      changeUserIsMfaEnabled: vi.fn(),
    });

    const postSpy = vi.spyOn(authApi, "post").mockImplementation(async (url) => {
      if (url === "mfa/setup") {
        return { status: 500, data: { message: "setup failed" } } as never;
      }

      if (url === "mfa/verify") {
        return { status: 400, data: { message: "invalid code" } } as never;
      }

      return { status: 500, data: {} } as never;
    });

    const { result } = renderMfaHook(auth);

    await act(async () => {
      expect(await result.current.setupMfa()).toBe(false);
      expect(await result.current.verifyMfa("123456")).toBe(false);
    });

    expect(postSpy).toHaveBeenCalledWith("mfa/setup");
    expect(postSpy).toHaveBeenCalledWith("mfa/verify", { code: "123456" });
    expect(enqueueSnackbarMock).toHaveBeenCalledWith("Failed to setup MFA", { variant: "error" });
    expect(enqueueSnackbarMock).toHaveBeenCalledWith("Invalid verification code", { variant: "error" });
  });
});
