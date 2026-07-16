import MockAdapter from "axios-mock-adapter";
import {
  ApiError,
  authApi,
  getAccessToken,
  recoverFromAuthFailure,
  unwrapApiResponse,
  requestSessionRecovery,
  setAccessToken,
  setSessionRecoveryEnabled,
  setWorkoutWriteGuard,
  setupInterceptors,
  workoutApi,
} from "@/api/api";

describe("api auth/session handling", () => {
  let authMock: MockAdapter;
  let workoutMock: MockAdapter;

  beforeEach(() => {
    authMock = new MockAdapter(authApi);
    workoutMock = new MockAdapter(workoutApi);
    setAccessToken(null);
    setSessionRecoveryEnabled(false);
    setWorkoutWriteGuard(null);
    setupInterceptors(async () => {}, () => {});
  });

  afterEach(() => {
    authMock.restore();
    workoutMock.restore();
    setWorkoutWriteGuard(null);
  });

  it("attaches the bearer token to protected requests", async () => {
    setAccessToken("access-123");

    let seenAuthorization: string | undefined;
    workoutMock.onGet("/workout-templates").reply((config) => {
      seenAuthorization = String(config.headers?.Authorization ?? "");
      return [200, []];
    });

    await workoutApi.get("/workout-templates");

    expect(seenAuthorization).toBe("Bearer access-123");
  });

  it("does not attach the bearer token to public auth paths", async () => {
    setAccessToken("access-123");

    let seenAuthorization: string | undefined;
    authMock.onPost("/user/login").reply((config) => {
      seenAuthorization = config.headers?.Authorization as string | undefined;
      return [200, {}];
    });

    await authApi.post("/user/login", {
      username: "louis",
      password: "Password1",
    });

    expect(seenAuthorization).toBeUndefined();
  });

  it("returns logged_out immediately when session recovery is disabled", async () => {
    await expect(recoverFromAuthFailure()).resolves.toBe("logged_out");
  });

  it("unwrapApiResponse prefers a string payload for non-2xx responses", () => {
    expect(() =>
      unwrapApiResponse({
        status: 418,
        data: "teapot",
      } as never),
    ).toThrowError(new ApiError("teapot", 418, "teapot"));
  });

  it("unwrapApiResponse falls back through message fields and the default status text", () => {
    expect(() =>
      unwrapApiResponse({
        status: 400,
        data: { message: "bad request" },
      } as never),
    ).toThrowError(new ApiError("bad request", 400, { message: "bad request" }));

    expect(() =>
      unwrapApiResponse({
        status: 503,
        data: {},
      } as never),
    ).toThrowError(new ApiError("Request failed (503)", 503, {}));
  });

  it("surfaces a failed refresh outcome when the refresh request errors unexpectedly", async () => {
    setSessionRecoveryEnabled(true);
    authMock.onPost("/user/refresh").networkError();

    const outcome = await requestSessionRecovery();

    expect(outcome.status).toBe("failed");
    if (outcome.status === "failed") {
      expect(outcome.error.message).toContain("Network Error");
    }
  });

  it("treats 403 refresh responses as unauthenticated", async () => {
    setSessionRecoveryEnabled(true);
    authMock.onPost("/user/refresh").reply(403, { cause: "expired" });

    const outcome = await requestSessionRecovery();

    expect(outcome.status).toBe("unauthenticated");
  });

  it("fails refreshes that do not return an access token", async () => {
    setSessionRecoveryEnabled(true);
    authMock.onPost("/user/refresh").reply(200, {});

    const outcome = await requestSessionRecovery();

    expect(outcome.status).toBe("failed");
    if (outcome.status === "failed") {
      expect(outcome.error.message).toBe("Session refresh did not return an access token");
    }
  });

  it("surfaces a failed refresh outcome when the refresh endpoint returns a server error", async () => {
    setSessionRecoveryEnabled(true);
    authMock.onPost("/user/refresh").reply(500, { cause: "server-error" });

    const outcome = await requestSessionRecovery();

    expect(outcome.status).toBe("failed");
    if (outcome.status === "failed") {
      expect(outcome.error.message).toBe("Session refresh failed");
    }
  });

  it("refreshes and retries the original request after a 401", async () => {
    const logoutSpy = vi.fn();
    const tokenUpdateSpy = vi.fn();

    setAccessToken("expired-token");
    setSessionRecoveryEnabled(true);
    setupInterceptors(logoutSpy, tokenUpdateSpy);

    authMock.onPost("/user/refresh").reply(200, { accessToken: "fresh-token" });
    workoutMock.onGet("/workout-templates").replyOnce(401);
    workoutMock.onGet("/workout-templates").reply((config) => {
      expect(config.headers?.Authorization).toBe("Bearer fresh-token");
      return [200, [{ id: "1" }]];
    });

    const response = await workoutApi.get("/workout-templates");

    expect(response.status).toBe(200);
    expect(response.data).toEqual([{ id: "1" }]);
    expect(tokenUpdateSpy).toHaveBeenCalledWith("fresh-token");
    expect(getAccessToken()).toBe("fresh-token");
    expect(logoutSpy).not.toHaveBeenCalled();
  });

  it("queues concurrent refresh attempts behind a single refresh request", async () => {
    const logoutSpy = vi.fn();
    const tokenUpdateSpy = vi.fn();

    setAccessToken("expired-token");
    setSessionRecoveryEnabled(true);
    setupInterceptors(logoutSpy, tokenUpdateSpy);

    authMock.onPost("/user/refresh").reply(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return [200, { accessToken: "fresh-token" }];
    });
    workoutMock.onGet("/workout-templates").replyOnce(401);
    workoutMock.onGet("/splits").replyOnce(401);
    workoutMock.onGet("/workout-templates").reply(200, []);
    workoutMock.onGet("/splits").reply(200, []);

    await Promise.all([
      workoutApi.get("/workout-templates"),
      workoutApi.get("/splits"),
    ]);

    expect(authMock.history.post).toHaveLength(1);
    expect(tokenUpdateSpy).toHaveBeenCalledTimes(1);
    expect(logoutSpy).not.toHaveBeenCalled();
  });

  it("logs out when refresh fails", async () => {
    const logoutSpy = vi.fn();

    setAccessToken("expired-token");
    setSessionRecoveryEnabled(true);
    setupInterceptors(logoutSpy, vi.fn());

    authMock.onPost("/user/refresh").reply(401, { cause: "nope" });
    workoutMock.onGet("/workout-templates").replyOnce(401);

    const response = await workoutApi.get("/workout-templates");

    expect(response.status).toBe(401);
    expect(logoutSpy).toHaveBeenCalledTimes(1);
  });

  it("does not try session recovery when the request opts out explicitly", async () => {
    const logoutSpy = vi.fn();

    setAccessToken("expired-token");
    setSessionRecoveryEnabled(true);
    setupInterceptors(logoutSpy, vi.fn());

    workoutMock.onGet("/workout-templates").reply(401, { cause: "expired" });

    const response = await workoutApi.get("/workout-templates", {
      _skipSessionRecovery: true,
    });

    expect(response.status).toBe(401);
    expect(authMock.history.post).toHaveLength(0);
    expect(logoutSpy).not.toHaveBeenCalled();
  });

  it("does not try session recovery twice for a request that already retried", async () => {
    const logoutSpy = vi.fn();

    setAccessToken("expired-token");
    setSessionRecoveryEnabled(true);
    setupInterceptors(logoutSpy, vi.fn());

    workoutMock.onGet("/workout-templates").reply(401, { cause: "expired" });

    const response = await workoutApi.get("/workout-templates", {
      _sessionRecoveryAttempted: true,
    });

    expect(response.status).toBe(401);
    expect(authMock.history.post).toHaveLength(0);
    expect(logoutSpy).not.toHaveBeenCalled();
  });

  it("blocks workout-domain write requests when the startup guard is active", async () => {
    setWorkoutWriteGuard(() => ({
      blocked: true,
      reason: "Data sync needed before saving. Retry refresh.",
    }));

    await expect(workoutApi.post("/workout-entries", {})).rejects.toMatchObject<ApiError>({
      name: "ApiError",
      message: "Data sync needed before saving. Retry refresh.",
      status: 409,
    });

    expect(workoutMock.history.post).toHaveLength(0);
  });

  it("does not block auth/account writes when the startup guard is active", async () => {
    setWorkoutWriteGuard(() => ({
      blocked: true,
      reason: "Data sync needed before saving. Retry refresh.",
    }));

    authMock.onPost("/mfa/status").reply(200, {});
    const response = await authApi.post("/mfa/status", {});

    expect(response.status).toBe(200);
  });

  it("allows workout-domain writes again after the startup guard recovers", async () => {
    let blocked = true;
    setWorkoutWriteGuard(() => ({
      blocked,
      reason: "Data sync needed before saving. Retry refresh.",
    }));

    await expect(workoutApi.post("/workout-entries", {})).rejects.toMatchObject<ApiError>({
      name: "ApiError",
      status: 409,
    });

    blocked = false;
    workoutMock.onPost("/workout-entries").reply(201, { id: "entry-1" });
    const response = await workoutApi.post("/workout-entries", {});

    expect(response.status).toBe(201);
    expect(response.data).toEqual({ id: "entry-1" });
  });
});
