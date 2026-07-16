import type { PropsWithChildren } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { gatewayApi } from "@/api/api";
import { useServices } from "@/hooks/useServices";
import { createTestQueryClient } from "tests/setup/test-utils";

function createWrapper() {
  const queryClient = createTestQueryClient();
  return ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useServices", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads health and version information with one gateway request", async () => {
    const getSpy = vi.spyOn(gatewayApi, "get").mockResolvedValue({
      status: 200,
      data: {
        services: [
          {
            id: "gateway",
            label: "Gateway",
            health: "UP",
            version: "2.0.0-SNAPSHOT",
            name: "Dedicate Gateway",
            buildTime: null,
          },
          {
            id: "auth",
            label: "Auth Service",
            health: "UP",
            version: "2.0.0",
            name: "Auth",
            buildTime: "2026-05-21T10:00:00Z",
          },
          {
            id: "workout",
            label: "Workout Service",
            health: "DOWN",
            version: null,
            name: "Workout",
            buildTime: null,
          },
          {
            id: "frontend",
            label: "Frontend",
            health: "UP",
            version: null,
            name: "App",
            buildTime: null,
          },
        ],
      },
    } as never);

    const { result } = renderHook(() => useServices(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.find((svc) => svc.id === "auth")?.version).toBe("2.0.0"));
    expect(getSpy).toHaveBeenCalledTimes(1);
    expect(getSpy).toHaveBeenCalledWith("service-status");
    expect(result.current.find((svc) => svc.id === "gateway")?.version).toBe("2.0.0");
    expect(result.current.find((svc) => svc.id === "workout")?.health).toBe("DOWN");
    expect(result.current.find((svc) => svc.id === "frontend")?.version).toBe(__APP_VERSION__);
  });

  it("marks services down instead of crashing when the status response is malformed", async () => {
    vi.spyOn(gatewayApi, "get").mockResolvedValue({
      status: 200,
      data: "<!doctype html>",
    } as never);

    const { result } = renderHook(() => useServices(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.every((svc) => svc.isError)).toBe(true), {
      timeout: 4_000,
    });

    expect(result.current.every((svc) => svc.health === "DOWN")).toBe(true);
    expect(result.current.find((svc) => svc.id === "frontend")?.version).toBe(__APP_VERSION__);
  });
});
