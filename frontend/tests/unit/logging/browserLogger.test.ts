import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createBrowserLogger,
  installBrowserLogger,
} from "@/logging/browserLogger";

describe("browser logging", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("batches console warnings and errors before sending them", async () => {
    const transport = vi.fn().mockResolvedValue(undefined);
    const logger = createBrowserLogger({
      endpoint: "/api/browser-logs",
      transport,
      flushIntervalMs: 1_000,
      maxBatchSize: 10,
    });

    logger.recordConsole("warn", ["  first warning  "]);
    logger.recordConsole("error", [new Error("boom")]);
    await logger.flush();

    expect(transport).toHaveBeenCalledTimes(1);
    const payload = transport.mock.calls[0][1] as { events: Array<{ level: string; message: string; stack?: string }> };
    expect(payload.events).toHaveLength(2);
    expect(payload.events[0]).toMatchObject({
      level: "warn",
      message: "first warning",
    });
    expect(payload.events[1]).toMatchObject({
      level: "error",
      message: "boom",
    });
    expect(payload.events[1].stack).toContain("Error: boom");
  });

  it("captures window errors and unhandled rejections through the installer", async () => {
    const transport = vi.fn().mockResolvedValue(undefined);
    const logger = installBrowserLogger({
      endpoint: "/api/browser-logs",
      transport,
      flushIntervalMs: 1_000,
      maxBatchSize: 10,
    });

    try {
      window.dispatchEvent(new ErrorEvent("error", {
        message: "page crashed",
        filename: "main.tsx",
        lineno: 12,
        colno: 34,
        error: new Error("page crashed"),
      }));
      const rejectionEvent = new Event("unhandledrejection");
      Object.defineProperty(rejectionEvent, "reason", {
        value: "promise rejected",
      });
      window.dispatchEvent(rejectionEvent);

      await logger.flush();

      expect(transport).toHaveBeenCalledTimes(1);
      const payload = transport.mock.calls[0][1] as { events: Array<{ level: string; message: string }> };
      expect(payload.events.map((event) => event.level)).toEqual(["error", "error"]);
      expect(payload.events.map((event) => event.message)).toEqual(["page crashed", "promise rejected"]);
    } finally {
      logger.dispose();
    }
  });
});
