import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ChartTabContent from "@/features/progress/components/ChartTabContent";
import type { ProgressChartQueryResponse } from "@/features/progress/types/Progress";
import { renderWithProviders } from "tests/setup/test-utils";

const useProgressQueryMock = vi.fn();

vi.mock("@/features/progress/hooks/useProgressQuery", () => ({
  default: () => useProgressQueryMock(),
}));

describe("ChartTabContent", () => {
  beforeEach(() => {
    useProgressQueryMock.mockReset();
  });

  it("renders safely when the backend omits points", () => {
    useProgressQueryMock.mockReturnValue({
      chartData: {
        unit: "%",
        metric: "BEST_SET_E1RM",
        comparisonMode: "BASELINE_PERCENT",
      } as unknown as ProgressChartQueryResponse,
      isChartLoading: false,
      activeMetric: "BEST_SET_E1RM",
      handleMetricChange: vi.fn(),
      handleComparisonModeChange: vi.fn(),
      activeProgressComparisonMode: "BASELINE_PERCENT",
    });

    renderWithProviders(<ChartTabContent exerciseDefinitionId="definition-1" />);

    expect(screen.getByTestId("exercise-chart-shell")).toBeInTheDocument();
    expect(screen.getByText("No chart data available for this exercise.")).toBeInTheDocument();
  });

  it("renders a delta when point data exists", () => {
    const chartData: ProgressChartQueryResponse = {
      unit: "kg",
      metric: "BEST_SET_E1RM",
      comparisonMode: "ABSOLUTE",
      points: [
        { timestamp: "2026-03-01T00:00:00.000Z", seriesKey: "main", value: 100 },
        { timestamp: "2026-04-01T00:00:00.000Z", seriesKey: "main", value: 103.4 },
      ],
    };

    useProgressQueryMock.mockReturnValue({
      chartData,
      isChartLoading: false,
      activeMetric: "BEST_SET_E1RM",
      handleMetricChange: vi.fn(),
      handleComparisonModeChange: vi.fn(),
      activeProgressComparisonMode: "ABSOLUTE",
    });

    renderWithProviders(<ChartTabContent exerciseDefinitionId="definition-1" />);

    expect(screen.getByTestId("exercise-chart-shell")).toBeInTheDocument();
    expect(screen.getByText("+3.4 vs previous point")).toBeInTheDocument();
  });
});
