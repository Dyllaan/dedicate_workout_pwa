describe("config parsing", () => {
  afterEach(() => {
    window.__APP_CONFIG__ = {
      VITE_API_URL: "http://localhost:8080/",
    };
    vi.resetModules();
  });

  it("accepts expected runtime config values", async () => {
    vi.resetModules();
    window.__APP_CONFIG__ = {
      VITE_API_URL: "https://api.example.com",
      VITE_MIN_SETS: "2",
      VITE_MAX_STRING_LENGTH: "80",
    };

    const { parseConfig } = await import("@/config/config");
    const config = parseConfig({}, window.__APP_CONFIG__ ?? {});

    expect(config.API_URL).toBe("https://api.example.com/");
    expect(config.MIN_SETS).toBe(2);
    expect(config.MAX_STRING_LENGTH).toBe(80);
  });

  it("defaults the API base to the same-origin /api/ prefix", async () => {
    vi.resetModules();
    window.__APP_CONFIG__ = {};

    const { parseConfig } = await import("@/config/config");
    const config = parseConfig({}, window.__APP_CONFIG__ ?? {});

    expect(config.API_URL).toBe("/api/");
  });

  it("allows runtime overrides for direct gateway development", async () => {
    vi.resetModules();
    window.__APP_CONFIG__ = {
      VITE_API_URL: "http://localhost:8080",
    };

    const { parseConfig } = await import("@/config/config");
    const config = parseConfig({}, window.__APP_CONFIG__ ?? {});

    expect(config.API_URL).toBe("http://localhost:8080/");
  });

  it("rejects malformed or unexpected runtime config", async () => {
    vi.resetModules();
    window.__APP_CONFIG__ = {
      VITE_API_URL: "javascript:alert(1)",
      VITE_UNSAFE_FLAG: "1",
    };

    await expect(import("@/config/config")).rejects.toThrow(/Unknown runtime config keys/);

    vi.resetModules();
    window.__APP_CONFIG__ = {
      VITE_API_URL: "javascript:alert(1)",
    };

    await expect(import("@/config/config")).rejects.toThrow(/Invalid URL protocol/);
  });
});
