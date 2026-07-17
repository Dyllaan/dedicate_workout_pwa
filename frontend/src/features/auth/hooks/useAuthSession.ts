import { useEffect, useReducer, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  authApi,
  setAccessToken as setModuleAccessToken,
  setSessionRecoveryEnabled,
  setupInterceptors,
} from "@/api/api";
import type { AuthContextType } from "@/features/auth/types/AuthContextType";
import type { LoginResult, MfaStatus, User } from "@/features/auth/types/User";
import { getDeviceFingerprint } from "@/features/auth/utils/deviceFingerprint";
import { bootstrapSession } from "../services/authSessionBootstrap";
import {
  authSessionReducer,
  initialAuthSessionState,
  type AuthSessionState,
} from "../services/authSessionState";
import { withDerivedSub } from "../services/authUser";
import { enqueueSnackbar } from "notistack";

function getErrorMessage(data: unknown, fallback: string) {
  if (typeof data === "object" && data !== null && "cause" in data && typeof data.cause === "string") {
    return data.cause;
  }
  return fallback;
}

function hasInteractiveAuthState(state: AuthSessionState) {
  return !!state.user || !!state.accessToken || state.mfaRequired || !!state.pendingMfaToken;
}

export function useProvideAuth(): AuthContextType {
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(authSessionReducer, initialAuthSessionState);
  const stateRef = useRef<AuthSessionState>(initialAuthSessionState);
  const isLoggingOutRef = useRef(false);
  const logoutRef = useRef<() => void | Promise<void>>(() => {});

  stateRef.current = state;

  const signedIn = !!state.user;

  const setAccessToken = (token: string | null) => {
    dispatch({ type: "SET_ACCESS_TOKEN", accessToken: token });
    setModuleAccessToken(token);
  };

  const clearAuthState = () => {
    dispatch({ type: "CLEAR_AUTH" });
    setModuleAccessToken(null);
    setSessionRecoveryEnabled(false);
  };

  const setUser = (userData: User | null) => {
    if (!userData) {
      clearAuthState();
      return;
    }

    const normalizedUser = withDerivedSub(userData);
    dispatch({ type: "SET_AUTHENTICATED_USER", user: normalizedUser });
    setModuleAccessToken(normalizedUser.accessToken);
    setSessionRecoveryEnabled(true);
  };

  const resetLoginFlowState = () => {
    dispatch({ type: "RESET_LOGIN_FLOW" });
  };

  const changeUserIsMfaEnabled = (enabled: boolean) => {
    dispatch({ type: "SET_USER_MFA_ENABLED", enabled });
  };

  const establishAuthenticatedSession = (userData: User, successToast?: string) => {
    setUser(userData);
    if (successToast) {
      enqueueSnackbar(successToast, { variant: "success" });
    }
  };

  async function logout() {
    const currentAccessToken = stateRef.current.accessToken;

    if (isLoggingOutRef.current) {
      return;
    }

    if (!currentAccessToken) {
      clearAuthState();
      navigate("/login");
      return;
    }

    isLoggingOutRef.current = true;

    try {
      await authApi.post("/user/logout", undefined, {
        headers: {
          Authorization: `Bearer ${currentAccessToken}`,
        },
      });
    } catch {
      enqueueSnackbar("Logout failed. Please try again.", { variant: "error" });
    } finally {
      isLoggingOutRef.current = false;
      clearAuthState();
      navigate("/login");
    }
  }

  const fetchMfaStatus = async () => {
    if (!stateRef.current.accessToken) return;

    const response = await authApi.get("/mfa/status");
    if (response.status === 200) {
      dispatch({ type: "SET_MFA_STATUS", mfaStatus: response.data as MfaStatus });
    }
  };

  useEffect(() => {
    logoutRef.current = logout;
  });

  useEffect(() => {
    setupInterceptors(
      () => logoutRef.current(),
      (nextAccessToken) => {
        setAccessToken(nextAccessToken);
        const currentUser = stateRef.current.user;
        if (currentUser && nextAccessToken) {
          dispatch({
            type: "SET_USER",
            user: withDerivedSub({ ...currentUser, accessToken: nextAccessToken }),
          });
        }
      },
    );
  }, []);

  useEffect(() => {
    setSessionRecoveryEnabled(true);

    bootstrapSession()
      .then(({ accessToken, user }) => {
        if (accessToken) {
          setAccessToken(accessToken);
        }

        if (user) {
          dispatch({ type: "SET_USER", user });
          return;
        }

        if (hasInteractiveAuthState(stateRef.current)) {
          return;
        }

        clearAuthState();
      })
      .catch(() => {
        if (hasInteractiveAuthState(stateRef.current)) {
          return;
        }

        enqueueSnackbar("Session recovery failed. Please retry.", { variant: "error" });
        clearAuthState();
      })
      .finally(() => {
        dispatch({ type: "SET_LOADING", isLoading: false });
      });
  }, []);

  const register = async (username: string, password: string): Promise<LoginResult> => {
    try {
      const response = await authApi.post(
        "/user/register",
        { username, password },
        { validateStatus: () => true },
      );

      if (response.status === 201) {
        establishAuthenticatedSession(
          (response.data.response ?? response.data) as User,
          "Account created successfully!",
        );
        return { success: true };
      }

      const error = getErrorMessage(response.data, "Registration failed");
      enqueueSnackbar(error, { variant: "error" });
      return { success: false, error };
    } catch {
      enqueueSnackbar("An unexpected error occurred", { variant: "error" });
      return { success: false, error: "Registration failed" };
    }
  };

  const login = async (
    username: string,
    password: string,
    mfaCode?: string,
  ): Promise<LoginResult> => {
    try {
      const deviceFingerprint = await getDeviceFingerprint();

      const response = await authApi.post(
        "/user/login",
        {
          username,
          password,
          deviceFingerprint,
          ...(mfaCode && { mfaCode }),
        },
        { validateStatus: () => true },
      );

      if (response.status === 202) {
        const data = response.data as { mfaToken: string };
        dispatch({ type: "SET_MFA_REQUIRED", pendingMfaToken: data.mfaToken });
        enqueueSnackbar("Please enter your authentication code", { variant: "info" });
        return { success: false, mfaRequired: true };
      }

      if (response.status === 200) {
        establishAuthenticatedSession(response.data as User);
        return { success: true };
      }

      const error = getErrorMessage(response.data, "Login failed");
      resetLoginFlowState();
      enqueueSnackbar(error, { variant: "error" });
      return { success: false, error };
    } catch {
      resetLoginFlowState();
      enqueueSnackbar("An unexpected error occurred", { variant: "error" });
      return { success: false, error: "Network error" };
    }
  };

  const verifyMfa = async (
    mfaCode: string,
    trustDevice: boolean,
  ): Promise<LoginResult> => {
    if (!state.pendingMfaToken) {
      enqueueSnackbar("Session expired. Please login again.", { variant: "error" });
      return { success: false, error: "No MFA session" };
    }

    try {
      const deviceFingerprint = await getDeviceFingerprint();

      const response = await authApi.post(
        "/user/verify-mfa",
        {
          mfaToken: state.pendingMfaToken,
          code: mfaCode,
          deviceFingerprint,
          trustDevice,
        },
        { validateStatus: () => true },
      );

      if (response.status === 200) {
        establishAuthenticatedSession(response.data as User, "Authentication successful!");
        return { success: true };
      }

      const error = getErrorMessage(response.data, "Invalid authentication code");
      dispatch({ type: "SET_MFA_REQUIRED", pendingMfaToken: state.pendingMfaToken });
      enqueueSnackbar(error, { variant: "error" });
      return { success: false, error };
    } catch {
      dispatch({ type: "SET_MFA_REQUIRED", pendingMfaToken: state.pendingMfaToken });
      enqueueSnackbar("An unexpected error occurred", { variant: "error" });
      return { success: false, error: "Network error" };
    }
  };

  const deleteUser = async (mfaCode?: string) => {
    try {
      const response = await authApi.delete("/user/delete", {
        data: { mfaCode },
        validateStatus: () => true,
      });

      if (response.status === 200) {
        enqueueSnackbar("User account deleted successfully", { variant: "success" });
        await logout();
        return;
      }

      if (response.status === 401) {
        enqueueSnackbar("Incorrect MFA code", { variant: "error" });
        return;
      }

      enqueueSnackbar(getErrorMessage(response.data, "Failed to delete user"), { variant: "error" });
    } catch {
      enqueueSnackbar("An unexpected error occurred", { variant: "error" });
    }
  };

  const disableMfa = async (
    mfaCode: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await authApi.post(
        "/mfa/disable",
        { code: mfaCode },
        { validateStatus: () => true },
      );

      if (response.status === 200) {
        enqueueSnackbar("MFA disabled successfully", { variant: "success" });
        changeUserIsMfaEnabled(false);
        return { success: true };
      }

      const error = getErrorMessage(response.data, "Failed to disable MFA");
      enqueueSnackbar(error, { variant: "error" });
      return { success: false, error };
    } catch {
      enqueueSnackbar("An unexpected error occurred", { variant: "error" });
      return { success: false, error: "Network error" };
    }
  };

  const updatePassword = async (
    oldPassword: string,
    newPassword: string,
    mfaCode?: string,
  ) => {
    try {
      const response = await authApi.post(
        "/user/update-password",
        {
          oldPassword,
          newPassword,
          ...(mfaCode && { mfaCode }),
        },
        { validateStatus: () => true },
      );

      if (response.status === 400) {
        const error = getErrorMessage(response.data, "MFA code required");
        enqueueSnackbar(error, { variant: "info" });
        return { success: false, mfaRequired: true };
      }

      if (response.status === 200) {
        enqueueSnackbar("Password updated successfully", { variant: "success" });
        return { success: true };
      }

      const error = getErrorMessage(response.data, "Failed to update password");
      enqueueSnackbar(error, { variant: "error" });
      return { success: false, error };
    } catch {
      enqueueSnackbar("An unexpected error occurred", { variant: "error" });
      return { success: false, error: "Network error" };
    }
  };

  return {
    user: state.user,
    setUser,
    login,
    verifyMfa,
    logout,
    signedIn,
    mfaRequired: state.mfaRequired,
    pendingMfaToken: state.pendingMfaToken,
    mfaStatus: state.mfaStatus,
    fetchMfaStatus,
    deleteUser,
    disableMfa,
    changeUserIsMfaEnabled,
    updatePassword,
    isLoading: state.isLoading,
    register,
  };
}
