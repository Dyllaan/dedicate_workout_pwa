import type { MfaStatus, User } from "@/types/User";

export type AuthSessionState = {
  user: User | null;
  accessToken: string | null;
  mfaRequired: boolean;
  isLoading: boolean;
  pendingMfaToken: string | null;
  mfaStatus: MfaStatus | null;
};

type AuthSessionAction =
  | { type: "SET_LOADING"; isLoading: boolean }
  | { type: "SET_ACCESS_TOKEN"; accessToken: string | null }
  | { type: "SET_AUTHENTICATED_USER"; user: User }
  | { type: "SET_USER"; user: User | null }
  | { type: "CLEAR_AUTH" }
  | { type: "SET_MFA_REQUIRED"; pendingMfaToken: string }
  | { type: "RESET_LOGIN_FLOW" }
  | { type: "SET_MFA_STATUS"; mfaStatus: MfaStatus | null }
  | { type: "SET_USER_MFA_ENABLED"; enabled: boolean };

export const initialAuthSessionState: AuthSessionState = {
  user: null,
  accessToken: null,
  mfaRequired: false,
  isLoading: true,
  pendingMfaToken: null,
  mfaStatus: null,
};

export function authSessionReducer(
  state: AuthSessionState,
  action: AuthSessionAction,
): AuthSessionState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.isLoading };
    case "SET_ACCESS_TOKEN":
      return { ...state, accessToken: action.accessToken };
    case "SET_AUTHENTICATED_USER":
      return {
        ...state,
        user: action.user,
        accessToken: action.user.accessToken,
        mfaRequired: false,
        pendingMfaToken: null,
      };
    case "SET_USER":
      return {
        ...state,
        user: action.user,
        accessToken: action.user?.accessToken ?? null,
      };
    case "CLEAR_AUTH":
      return {
        ...state,
        user: null,
        accessToken: null,
        mfaRequired: false,
        pendingMfaToken: null,
        mfaStatus: null,
      };
    case "SET_MFA_REQUIRED":
      return {
        ...state,
        mfaRequired: true,
        pendingMfaToken: action.pendingMfaToken,
      };
    case "RESET_LOGIN_FLOW":
      return {
        ...state,
        mfaRequired: false,
        pendingMfaToken: null,
      };
    case "SET_MFA_STATUS":
      return {
        ...state,
        mfaStatus: action.mfaStatus,
      };
    case "SET_USER_MFA_ENABLED":
      return {
        ...state,
        user: state.user ? { ...state.user, mfaEnabled: action.enabled } : state.user,
      };
    default:
      return state;
  }
}
