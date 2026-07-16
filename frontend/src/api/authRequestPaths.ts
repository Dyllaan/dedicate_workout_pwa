import type { InternalAxiosRequestConfig } from "axios";

const PUBLIC_AUTH_PATHS = new Set([
  "/user/login",
  "/user/register",
  "/user/verify-mfa",
  "/user/refresh",
]);

function normalizeRequestPath(url?: string): string | null {
  if (!url) return null;

  try {
    return new URL(url, "http://localhost").pathname;
  } catch {
    return url.split("?")[0] ?? null;
  }
}

export function isPublicAuthPath(url?: string): boolean {
  const path = normalizeRequestPath(url);
  return path ? PUBLIC_AUTH_PATHS.has(path) : false;
}

export function isSessionBootstrapPath(url?: string): boolean {
  return normalizeRequestPath(url) === "/user/me";
}

export function attachAuthorizationHeader(
  config: InternalAxiosRequestConfig,
  accessToken: string | null,
): InternalAxiosRequestConfig {
  if (isPublicAuthPath(config.url)) {
    return config;
  }

  if (accessToken && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
}
