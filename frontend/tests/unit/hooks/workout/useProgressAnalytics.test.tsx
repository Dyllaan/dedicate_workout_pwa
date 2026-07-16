import type { PropsWithChildren } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { useProgressChartQuery } from "@/hooks/workout/useProgressAnalytics";
import { createTestQueryClient } from "tests/setup/test-utils";

vi.mock("@/api/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/api")>();
  return {
    ...actual,
    workoutApi: {
      post: vi.fn(),
    },
  };
});

import { workoutApi } from "@/api/api";

function createWrapper() {
  const queryClient = createTestQueryClient();
  return ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useProgressChartQuery", () => {
  beforeEach(() => {
    vi.mocked(workoutApi.post).mockReset();
  });

  it("fetches progress chart data when enabled", async () => {
    const response = {
      series: [],
      diagnostics: [],
      summary: null,
    };

    vi.mocked(workoutApi.post).mockResolvedValue({ data: response } as never);

    const request = {
      exerciseDefinitionId: "definition-1",
      metric: "BEST_SET_E1RM" as const,
      comparisonMode: "ABSOLUTE" as const,
    };

    const { result } = renderHook(() => useProgressChartQuery(request), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(workoutApi.post).toHaveBeenCalledWith("/progress/charts/query", request);
    expect(result.current.data).toEqual(response);
  });

  it("skips fetching when disabled", async () => {
    const request = {
      exerciseDefinitionId: "definition-2",
      metric: "MAX_WEIGHT" as const,
      comparisonMode: "BASELINE_PERCENT" as const,
    };

    renderHook(() => useProgressChartQuery(request, false), {
      wrapper: createWrapper(),
    });

    await Promise.resolve();

    expect(workoutApi.post).not.toHaveBeenCalled();
  });
});
