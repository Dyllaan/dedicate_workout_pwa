import { defineConfig, devices } from "@playwright/test";

const PORT = 4174;
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${PORT}`;
const webServerCommand =
  process.platform === "win32"
    ? `cmd /c "set VITE_API_URL=/api/&& npm run dev -- --host 127.0.0.1 --port ${PORT} --configLoader runner"`
    : `VITE_API_URL=/api/ npm run dev -- --host 127.0.0.1 --port ${PORT} --configLoader runner`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: webServerCommand,
    port: PORT,
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium-mocked",
      use: { ...devices["Desktop Chrome"] },
      metadata: { useRealBackend: false },
    },
    {
      name: "mobile-chromium-mocked",
      use: { ...devices["Pixel 7"] },
      metadata: { useRealBackend: false },
    },
    {
      name: "mobile-webkit-mocked",
      use: { ...devices["iPhone 13"] },
      metadata: { useRealBackend: false },
    },
    {
      name: "chromium-smoke-real",
      use: { ...devices["Desktop Chrome"] },
      metadata: { useRealBackend: true },
    },
  ],
});
