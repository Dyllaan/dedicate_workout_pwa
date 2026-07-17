import { describe, it, expect } from "vitest";
import { isPublicAuthPath, isSessionBootstrapPath, attachAuthorizationHeader } from "@/api/authRequestPaths";
import type { InternalAxiosRequestConfig } from "axios";

function makeConfig(url?: string, headers?: Record<string, string>): InternalAxiosRequestConfig {
  return {
    url,
    headers: { ...headers } as InternalAxiosRequestConfig["headers"],
  } as InternalAxiosRequestConfig;
}

describe("isPublicAuthPath", () => {
  it("returns false for undefined", () => {
    expect(isPublicAuthPath(undefined)).toBe(false);
  });

  it("returns true for /user/login", () => {
    expect(isPublicAuthPath("/user/login")).toBe(true);
  });

  it("returns true for /user/register", () => {
    expect(isPublicAuthPath("/user/register")).toBe(true);
  });

  it("returns true for /user/verify-mfa", () => {
    expect(isPublicAuthPath("/user/verify-mfa")).toBe(true);
  });

  it("returns true for /user/refresh", () => {
    expect(isPublicAuthPath("/user/refresh")).toBe(true);
  });

  it("returns false for a non-public relative path", () => {
    expect(isPublicAuthPath("/api/workout/splits")).toBe(false);
  });

  it("handles a full URL by extracting the pathname", () => {
    expect(isPublicAuthPath("https://example.com/user/login")).toBe(true);
  });

  it("returns false for empty string", () => {
    expect(isPublicAuthPath("")).toBe(false);
  });

  it("falls back to splitting on ? when URL constructor throws", () => {
    expect(isPublicAuthPath("\0/user/login?query=1")).toBe(true);
  });
});

describe("isSessionBootstrapPath", () => {
  it("returns true for /user/me", () => {
    expect(isSessionBootstrapPath("/user/me")).toBe(true);
  });

  it("returns false for /user/login", () => {
    expect(isSessionBootstrapPath("/user/login")).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isSessionBootstrapPath(undefined)).toBe(false);
  });
});

describe("attachAuthorizationHeader", () => {
  it("returns config unchanged for public auth paths", () => {
    const config = makeConfig("/user/login");
    const result = attachAuthorizationHeader(config, "token-123");
    expect(result.headers.Authorization).toBeUndefined();
  });

  it("adds Bearer token when accessToken is provided and no existing Authorization", () => {
    const config = makeConfig("/api/workout/splits");
    const result = attachAuthorizationHeader(config, "token-abc");
    expect(result.headers.Authorization).toBe("Bearer token-abc");
  });

  it("does not add token when accessToken is null", () => {
    const config = makeConfig("/api/workout/splits");
    const result = attachAuthorizationHeader(config, null);
    expect(result.headers.Authorization).toBeUndefined();
  });

  it("does not overwrite existing Authorization header", () => {
    const config = makeConfig("/api/workout/splits", { Authorization: "Bearer existing" });
    const result = attachAuthorizationHeader(config, "token-new");
    expect(result.headers.Authorization).toBe("Bearer existing");
  });
});
