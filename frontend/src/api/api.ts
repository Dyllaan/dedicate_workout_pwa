import axios, { type AxiosResponse, type InternalAxiosRequestConfig } from "axios";
import config from "@/config/config";
import {
  attachAuthorizationHeader,
  isPublicAuthPath,
  isSessionBootstrapPath,
} from "./authRequestPaths";
import {
  createSessionRefreshCoordinator,
  type SessionRefreshResult,
} from "./sessionRefreshCoordinator";
import {
  getAccessToken,
  isSessionRecoveryEnabled,
  notifyAccessTokenUpdated,
  notifyLogout,
  setAccessToken,
  setSessionRecoveryEnabled,
  setupSessionTransport,
  type LogoutCallback,
  type TokenUpdateCallback,
} from "./sessionTransportState";

const API_URL = config.API_URL;

export class ApiError extends Error {
  status: number;
  response: unknown;
  constructor(message: string, status: number, response: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.response = response;
  }
}

export { getAccessToken, setAccessToken, setSessionRecoveryEnabled };
type AuthRecoveryOutcome = 'recovered' | 'logged_out';
type WorkoutWriteGuardResult = { blocked: boolean; reason?: string };
type WorkoutWriteGuard = (() => WorkoutWriteGuardResult) | null;
let workoutWriteGuard: WorkoutWriteGuard = null;

export function setWorkoutWriteGuard(guard: WorkoutWriteGuard) {
  workoutWriteGuard = guard;
}

export const setupInterceptors = (
  logoutCallback: LogoutCallback,
  tokenUpdateCallback: TokenUpdateCallback,
) => {
  setupSessionTransport(logoutCallback, tokenUpdateCallback);
};

export const gatewayApi = axios.create({
  baseURL: API_URL,
  validateStatus: () => true,
});

export const authApi = axios.create({
  baseURL: `${API_URL}auth`,
  validateStatus: () => true,
  withCredentials: true,
});

export const workoutApi = axios.create({
  baseURL: `${API_URL}workout`,
  validateStatus: () => true,
});

type ApiErrorPayload = {
  cause?: string;
  message?: string;
  error?: string;
};

function extractApiErrorMessage(status: number, response: unknown) {
  if (typeof response === "string" && response.trim().length > 0) {
    return response;
  }

  if (response && typeof response === "object") {
    const payload = response as ApiErrorPayload;
    for (const candidate of [payload.cause, payload.message, payload.error]) {
      if (typeof candidate === "string" && candidate.trim().length > 0) {
        return candidate;
      }
    }
  }

  return `Request failed (${status})`;
}

export function unwrapApiResponse<T>(response: AxiosResponse<T>): T {
  if (response.status < 200 || response.status >= 300) {
    throw new ApiError(
      extractApiErrorMessage(response.status, response.data),
      response.status,
      response.data,
    );
  }

  return response.data;
}

function attachAuthHeader(cfg: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
  return attachAuthorizationHeader(cfg, getAccessToken());
}

authApi.interceptors.request.use(attachAuthHeader);
workoutApi.interceptors.request.use((cfg) => {
  const request = attachAuthHeader(cfg);
  const method = request.method?.toUpperCase();
  const isTrainingWrite = method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE";

  if (isTrainingWrite && workoutWriteGuard) {
    const guardResult = workoutWriteGuard();
    if (guardResult.blocked) {
      const reason = guardResult.reason ?? "Data sync needed before saving. Retry refresh.";
      throw new ApiError(reason, 409, { cause: reason });
    }
  }

  return request;
});

function toError(error: unknown, fallbackMessage: string) {
  return error instanceof Error ? error : new Error(fallbackMessage);
}

async function requestFreshAccessToken(): Promise<SessionRefreshResult> {
  if (!isSessionRecoveryEnabled()) {
    return { status: "unauthenticated" };
  }

  try {
    const res = await authApi.post("/user/refresh", undefined, {
      validateStatus: () => true,
    });

    if (res.status === 200) {
      const data = res.data as { accessToken?: string };
      if (!data.accessToken) {
        return {
          status: "failed",
          error: new ApiError("Session refresh did not return an access token", res.status, res.data),
        };
      }

      setAccessToken(data.accessToken);
      notifyAccessTokenUpdated(data.accessToken);

      return {
        status: "recovered",
        accessToken: data.accessToken,
      };
    }

    if (res.status === 401 || res.status === 403) {
      return { status: "unauthenticated" };
    }

    return {
      status: "failed",
      error: new ApiError("Session refresh failed", res.status, res.data),
    };
  } catch (error) {
    return {
      status: "failed",
      error: toError(error, "Session refresh request failed"),
    };
  }
}

const sessionRefreshCoordinator = createSessionRefreshCoordinator(requestFreshAccessToken);

export function requestSessionRecovery(): Promise<SessionRefreshResult> {
  return sessionRefreshCoordinator.recover();
}

export async function recoverFromAuthFailure(): Promise<AuthRecoveryOutcome> {
  const recovery = await requestSessionRecovery();

  if (recovery.status === "recovered") {
    return "recovered";
  }

  await notifyLogout();
  return "logged_out";
}

type SessionAwareRequestConfig = InternalAxiosRequestConfig & {
  _sessionRecoveryAttempted?: boolean;
  _skipSessionRecovery?: boolean;
};

function attachRefreshInterceptor(instance: typeof workoutApi) {
  instance.interceptors.response.use(async (response) => {
    if (response.status !== 401 && response.status !== 403) return response;

    const originalRequest = response.config as SessionAwareRequestConfig;
    const requestUrl = originalRequest.url;

    if (originalRequest._skipSessionRecovery || originalRequest._sessionRecoveryAttempted) {
      return response;
    }

    if (requestUrl?.includes('/user/logout') || isPublicAuthPath(requestUrl)) {
      return response;
    }

    const authorizationHeader = originalRequest.headers.Authorization ?? originalRequest.headers.authorization;
    const isSessionBootstrap = isSessionBootstrapPath(requestUrl);

    if (!authorizationHeader && !isSessionBootstrap) return response;
    if (isSessionBootstrap && !authorizationHeader && !isSessionRecoveryEnabled()) return response;

    const recovery = await recoverFromAuthFailure();

    if (recovery === 'recovered' && getAccessToken()) {
      originalRequest._sessionRecoveryAttempted = true;
      originalRequest.headers.Authorization = `Bearer ${getAccessToken()}`;
      return instance(originalRequest);
    }

    return response;
  });
}

attachRefreshInterceptor(authApi);
attachRefreshInterceptor(workoutApi);
