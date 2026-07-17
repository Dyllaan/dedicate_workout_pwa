const { getAccessTokenMock, requestSessionRecoveryMock, authGetMock } = vi.hoisted(() => ({
  getAccessTokenMock: vi.fn(),
  requestSessionRecoveryMock: vi.fn(),
  authGetMock: vi.fn(),
}));

vi.mock("@/api/api", async () => {
  const actual = await vi.importActual<typeof import("@/api/api")>("@/api/api");
  return {
    ...actual,
    getAccessToken: getAccessTokenMock,
    requestSessionRecovery: requestSessionRecoveryMock,
    authApi: {
      get: authGetMock,
    },
  };
});

import { describe, expect, it, beforeEach } from "vitest";
import { bootstrapSession } from "@/features/auth/services/authSessionBootstrap";

function buildJwt(sub: string) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ sub })).toString("base64url");
  return `${header}.${payload}.signature`;
}

describe("bootstrapSession", () => {
  beforeEach(() => {
    getAccessTokenMock.mockReset();
    requestSessionRecoveryMock.mockReset();
    authGetMock.mockReset();
  });

  it("returns a user built from /user/me when an access token is already available", async () => {
    const accessToken = buildJwt("user-123");
    getAccessTokenMock.mockReturnValue(accessToken);
    requestSessionRecoveryMock.mockResolvedValue({ status: "unauthenticated" });
    authGetMock.mockImplementation(async (_path: string, config: { validateStatus: () => boolean }) => {
      expect(config.validateStatus()).toBe(true);
      return {
        status: 200,
        data: {
          username: "louis",
          mfaEnabled: true,
        },
      };
    });

    await expect(bootstrapSession()).resolves.toEqual({
      accessToken,
      user: {
        username: "louis",
        mfaEnabled: true,
        accessToken,
        sub: "user-123",
      },
    });
  });

  it("returns nulls when recovery does not restore a token", async () => {
    getAccessTokenMock.mockReturnValue(null);
    requestSessionRecoveryMock.mockResolvedValue({ status: "unauthenticated" });

    await expect(bootstrapSession()).resolves.toEqual({
      accessToken: null,
      user: null,
    });

    expect(authGetMock).not.toHaveBeenCalled();
  });
});
