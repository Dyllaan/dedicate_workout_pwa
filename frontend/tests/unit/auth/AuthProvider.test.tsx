const {
  navigateMock,
  successMock,
  errorMock,
  infoMock,
} = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  successMock: vi.fn(),
  errorMock: vi.fn(),
  infoMock: vi.fn(),
}));

import { QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AuthProvider from "@/components/auth/auth";
import { useAuth } from "@/components/auth/auth";
import { authApi, setAccessToken, setSessionRecoveryEnabled } from "@/api/api";
import { buildUser } from "tests/shared/builders";
import { createTestQueryClient } from "tests/setup/test-utils";

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock("notistack", () => ({
  enqueueSnackbar: (message: string, options?: { variant?: string }) => {
    if (options?.variant === "success") {
      successMock(message);
      return;
    }

    if (options?.variant === "info") {
      infoMock(message);
      return;
    }

    errorMock(message);
  },
}));

vi.mock("@/utils/deviceFingerprint", () => ({
  getDeviceFingerprint: vi.fn(async () => "fingerprint-test"),
}));

function AuthProbe() {
  const auth = useAuth();

  return (
    <div>
      <output aria-label="Signed in">{String(auth.signedIn)}</output>
      <output aria-label="MFA required">{String(auth.mfaRequired)}</output>
      <output aria-label="Username">{auth.user?.username ?? "anonymous"}</output>
      <button type="button" onClick={() => auth.register("louis", "Password1")}>
        Register
      </button>
      <button type="button" onClick={() => auth.login("louis", "Password1")}>
        Login
      </button>
      <button type="button" onClick={() => auth.verifyMfa("123456", true)}>
        Verify MFA
      </button>
      <button
        type="button"
        onClick={() => auth.updatePassword("OldPassword1", "NewPassword1", "123456")}
      >
        Update Password
      </button>
      <button
        type="button"
        onClick={() =>
          auth.setUser(buildUser({ username: "manual-user", accessToken: "manual-token" }))
        }
      >
        Set User
      </button>
      <button type="button" onClick={() => auth.logout()}>
        Logout
      </button>
    </div>
  );
}

describe("AuthProvider", () => {
  function renderProvider() {
    const queryClient = createTestQueryClient();

    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AuthProvider>
            <AuthProbe />
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );
  }

  function renderOutsideProvider() {
    const queryClient = createTestQueryClient();

    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AuthProbe />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  }

  beforeEach(() => {
    localStorage.clear();
    setAccessToken(null);
    setSessionRecoveryEnabled(false);

    vi.spyOn(authApi, "get").mockImplementation(async (url) => {
      if (url === "/user/me") {
        return { status: 401, data: { cause: "anonymous" } } as never;
      }
      if (url === "/mfa/status") {
        return { status: 200, data: { enabled: false, verified: true } } as never;
      }
      return { status: 404, data: {} } as never;
    });

    vi.spyOn(authApi, "post").mockImplementation(async (url) => {
      if (url === "/user/refresh") {
        return { status: 401, data: { cause: "no refresh" } } as never;
      }
      return { status: 200, data: {} } as never;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("throws when useAuth is used outside AuthProvider", () => {
    expect(() => renderOutsideProvider()).toThrow("useAuth must be used within AuthProvider");
  });

  it("registers a user without persisting auth state to localStorage", async () => {
    vi.spyOn(authApi, "post").mockImplementation(async (url) => {
      if (url === "/user/refresh") {
        return { status: 401, data: { cause: "no refresh" } } as never;
      }
      if (url === "/user/register") {
        return {
          status: 201,
          data: buildUser({ username: "louis", accessToken: "register-token" }),
        } as never;
      }
      return { status: 200, data: { enabled: false, verified: true } } as never;
    });

    renderProvider();

    await waitFor(() =>
      expect(authApi.post).toHaveBeenCalledWith(
        "/user/refresh",
        undefined,
        expect.objectContaining({ validateStatus: expect.any(Function) }),
      ),
    );

    await act(async () => {
      screen.getByRole("button", { name: "Register" }).click();
    });

    await waitFor(() =>
      expect(screen.getByLabelText("Signed in")).toHaveTextContent("true"),
    );
    expect(authApi.get).not.toHaveBeenCalledWith("/mfa/status");
    expect(screen.getByLabelText("Username")).toHaveTextContent("louis");
    expect(localStorage.getItem("user")).toBeNull();
    expect(successMock).toHaveBeenCalledWith("Account created successfully!");
  });

  it("handles MFA login and successful verification without persisting auth state", async () => {
    vi.spyOn(authApi, "post").mockImplementation(async (url) => {
      if (url === "/user/refresh") {
        return { status: 401, data: { cause: "no refresh" } } as never;
      }
      if (url === "/user/login") {
        return {
          status: 202,
          data: { mfaToken: "pending-mfa", message: "MFA required" },
        } as never;
      }
      if (url === "/user/verify-mfa") {
        return {
          status: 200,
          data: buildUser({ username: "louis", accessToken: "mfa-token" }),
        } as never;
      }
      return { status: 200, data: { enabled: false, verified: true } } as never;
    });

    renderProvider();

    await act(async () => {
      screen.getByRole("button", { name: "Login" }).click();
    });

    await waitFor(() =>
      expect(screen.getByLabelText("MFA required")).toHaveTextContent("true"),
    );
    expect(infoMock).toHaveBeenCalledWith("Please enter your authentication code");

    await act(async () => {
      screen.getByRole("button", { name: "Verify MFA" }).click();
    });

    await waitFor(() =>
      expect(screen.getByLabelText("Signed in")).toHaveTextContent("true"),
    );
    expect(authApi.get).not.toHaveBeenCalledWith("/mfa/status");
    expect(screen.getByLabelText("Username")).toHaveTextContent("louis");
    expect(localStorage.getItem("user")).toBeNull();
    expect(successMock).toHaveBeenCalledWith("Authentication successful!");
  });

  it("restores a session from the refresh cookie on cold boot", async () => {
    const refreshSpy = vi.spyOn(authApi, "post").mockImplementation(async (url) => {
      if (url === "/user/refresh") {
        return { status: 200, data: { accessToken: "refreshed-token" } } as never;
      }
      return { status: 200, data: {} } as never;
    });

    const meSpy = vi.spyOn(authApi, "get").mockImplementation(async (url) => {
      if (url === "/user/me") {
        return {
          status: 200,
          data: { username: "restored-user", mfaEnabled: true },
        } as never;
      }
      if (url === "/mfa/status") {
        return { status: 200, data: { enabled: true, verified: true } } as never;
      }
      return { status: 404, data: {} } as never;
    });

    renderProvider();

    await waitFor(() =>
      expect(screen.getByLabelText("Signed in")).toHaveTextContent("true"),
    );
    expect(refreshSpy).toHaveBeenCalledWith(
      "/user/refresh",
      undefined,
      expect.objectContaining({ validateStatus: expect.any(Function) }),
    );
    expect(meSpy).toHaveBeenCalledTimes(1);
    expect(refreshSpy.mock.invocationCallOrder[0]).toBeLessThan(
      meSpy.mock.invocationCallOrder[0],
    );
    expect(authApi.get).not.toHaveBeenCalledWith("/mfa/status");
    expect(screen.getByLabelText("Username")).toHaveTextContent("restored-user");
    expect(localStorage.getItem("user")).toBeNull();
  });

  it("stays anonymous on cold boot when refresh recovery fails", async () => {
    const refreshSpy = vi.spyOn(authApi, "post").mockImplementation(async (url) => {
      if (url === "/user/refresh") {
        return { status: 401, data: { cause: "no refresh" } } as never;
      }
      return { status: 200, data: {} } as never;
    });

    const meSpy = vi.spyOn(authApi, "get").mockImplementation(async (url) => {
      if (url === "/user/me") {
        return { status: 401, data: { cause: "expired" } } as never;
      }
      return { status: 404, data: {} } as never;
    });

    renderProvider();

    await waitFor(() =>
      expect(screen.getByLabelText("Signed in")).toHaveTextContent("false"),
    );
    expect(refreshSpy).toHaveBeenCalledTimes(1);
    expect(meSpy).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Username")).toHaveTextContent("anonymous");
    expect(localStorage.getItem("user")).toBeNull();
  });

  it("returns MFA-required state when the password update endpoint requests it", async () => {
    vi.spyOn(authApi, "post").mockImplementation(async (url) => {
      if (url === "/user/refresh") {
        return { status: 401, data: { cause: "no refresh" } } as never;
      }
      if (url === "/user/update-password") {
        return {
          status: 400,
          data: { cause: "MFA code required" },
        } as never;
      }
      return { status: 200, data: { enabled: false, verified: true } } as never;
    });

    renderProvider();

    await act(async () => {
      screen.getByRole("button", { name: "Update Password" }).click();
    });

    expect(infoMock).toHaveBeenCalledWith("MFA code required");
  });

  it("logs out and leaves no auth residue in localStorage", async () => {
    vi.spyOn(authApi, "post").mockImplementation(async (url) => {
      if (url === "/user/refresh") {
        return { status: 401, data: { cause: "no refresh" } } as never;
      }
      if (url === "/user/logout") {
        return { status: 200, data: {} } as never;
      }
      return { status: 200, data: { enabled: false, verified: true } } as never;
    });

    renderProvider();

    await act(async () => {
      screen.getByRole("button", { name: "Set User" }).click();
    });
    expect(authApi.get).not.toHaveBeenCalledWith("/mfa/status");

    localStorage.setItem("user", JSON.stringify({ username: "legacy-user" }));

    await act(async () => {
      screen.getByRole("button", { name: "Logout" }).click();
    });

    await waitFor(() =>
      expect(screen.getByLabelText("Signed in")).toHaveTextContent("false"),
    );
    expect(navigateMock).toHaveBeenCalledWith("/login");
    expect(localStorage.getItem("user")).toBeNull();
  });
});
