import { authApi, getAccessToken, requestSessionRecovery } from "@/api/api";
import type { MeResponse, User } from "@/features/auth/types/User";
import { buildUserFromMeResponse } from "./authUser";

type SessionBootstrapResult = {
  accessToken: string | null;
  user: User | null;
};

type BootstrapRequestConfig = {
  validateStatus: () => boolean;
  _skipSessionRecovery: true;
};

const bootstrapRequestConfig: BootstrapRequestConfig = {
  validateStatus: () => true,
  _skipSessionRecovery: true,
};

export async function bootstrapSession(): Promise<SessionBootstrapResult> {
  let nextAccessToken = getAccessToken();
  let recoveredBeforeMe = false;

  if (!nextAccessToken) {
    const recovery = await requestSessionRecovery();

    if (recovery.status === "failed") {
      throw recovery.error;
    }

    if (recovery.status !== "recovered") {
      return { accessToken: null, user: null };
    }

    nextAccessToken = recovery.accessToken;
    recoveredBeforeMe = true;
  }

  let response = await authApi.get("/user/me", bootstrapRequestConfig);

  if (response.status === 401 || response.status === 403) {
    if (recoveredBeforeMe) {
      return { accessToken: null, user: null };
    }

    const recovery = await requestSessionRecovery();

    if (recovery.status === "failed") {
      throw recovery.error;
    }

    if (recovery.status !== "recovered") {
      return { accessToken: null, user: null };
    }

    nextAccessToken = recovery.accessToken;
    response = await authApi.get("/user/me", bootstrapRequestConfig);
  }

  if (response.status === 200 && nextAccessToken) {
    return {
      accessToken: nextAccessToken,
      user: buildUserFromMeResponse(response.data as MeResponse, nextAccessToken),
    };
  }

  return { accessToken: null, user: null };
}
