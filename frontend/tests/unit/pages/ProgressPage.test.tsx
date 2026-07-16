import * as React from "react";
import { screen, waitFor } from "@testing-library/react";
import { useLocation } from "react-router-dom";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";

import ProgressPage from "@/components/insights/ProgressPage";
import type { AnalysisExerciseOption } from "@/types/Analysis";
import { renderWithProviders } from "tests/setup/test-utils";

const optionsMock = vi.fn();
const recommendationMock = vi.fn();
const progressQueryMock = vi.fn();
const historyMock = vi.fn();

vi.mock("@/components/charts/SimpleBarChart.tsx", () => ({
  default: (props: { data: Array<{ label: string }> }) => (
    <div data-testid="simple-bar-chart">{props.data.length}</div>
  ),
}));

vi.mock("@/components/ui/select.tsx", () => {
  function Select({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (value: string) => void;
    children: React.ReactNode;
  }) {
    let ariaLabel = "";
    const options: React.ReactElement[] = [];

    React.Children.forEach(children, (child) => {
      if (!React.isValidElement(child)) {
        return;
      }

      if (child.type === SelectTrigger) {
        ariaLabel = child.props["aria-label"] ?? ariaLabel;
      }

      if (child.type === SelectContent) {
        React.Children.forEach(child.props.children, (item) => {
          if (!React.isValidElement(item) || item.type !== SelectItem) {
            return;
          }

          options.push(
            <option key={item.props.value} value={item.props.value}>
              {item.props.children}
            </option>,
          );
        });
      }
    });

    return (
      <select aria-label={ariaLabel} value={value} onChange={(event) => onValueChange(event.target.value)}>
        {options}
      </select>
    );
  }

  function SelectTrigger({ children }: { children?: React.ReactNode }) {
    return <>{children}</>;
  }

  function SelectContent({ children }: { children?: React.ReactNode }) {
    return <>{children}</>;
  }

  function SelectValue() {
    return null;
  }

  function SelectItem({ children }: { children?: React.ReactNode }) {
    return null;
  }

  return {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  };
});

vi.mock("@/hooks/workout/useAnalysis.ts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks/workout/useAnalysis")>();

  return {
    ...actual,
    useAnalysisExerciseOptions: () => optionsMock(),
    useTemplateAnalysisRecommendation: (templateId?: string | null) =>
      recommendationMock(templateId),
  };
});

vi.mock("@/hooks/progress/useProgressQuery.ts", () => ({
  default: (args: { exerciseDefinitionId: string }) => progressQueryMock(args),
}));

vi.mock("@/hooks/workout/useExerciseHistory.ts", () => ({
  useExerciseHistory: (exerciseDefinitionId: string, options?: { limit?: number }) =>
    historyMock(exerciseDefinitionId, options),
}));

vi.mock("@/hooks/useUnitPreference.ts", () => ({
  useUnitPreference: () => ({
    format: (value: number) => `${value.toFixed(1)}kg`,
  }),
}));

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location-search">{location.search}</div>;
}

function buildOption(overrides: AnalysisExerciseOption): AnalysisExerciseOption {
  return overrides;
}

describe("ProgressPage", () => {
  beforeAll(() => {
    Object.defineProperty(Element.prototype, "hasPointerCapture", {
      configurable: true,
      value: () => false,
    });
    Object.defineProperty(Element.prototype, "setPointerCapture", {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(Element.prototype, "releasePointerCapture", {
      configurable: true,
      value: vi.fn(),
    });
  });

  beforeEach(() => {
    optionsMock.mockReset();
    recommendationMock.mockReset();
    progressQueryMock.mockReset();
    historyMock.mockReset();

    optionsMock.mockReturnValue({
      options: [
        buildOption({
          exerciseDefinitionId: "squat",
          exerciseName: "Back Squat",
          variant: null,
          templateId: "template-squat",
          templateName: "Squat Day",
          templateCategory: "Lower",
          templateCreatedAt: "2026-06-03T10:00:00.000Z",
        }),
        buildOption({
          exerciseDefinitionId: "bench-press",
          exerciseName: "Bench Press",
          variant: "Barbell",
          templateId: "template-latest-bench",
          templateName: "Bench Peak",
          templateCategory: "Push",
          templateCreatedAt: "2026-06-05T10:00:00.000Z",
        }),
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    recommendationMock.mockImplementation((templateId) => ({
      data: templateId
        ? {
            suggestion: {
              type: "INCREASE",
              suggestedWeightKg: templateId === "template-squat" ? 180 : 120,
              reasoning: templateId === "template-squat" ? "Squat work is still moving." : "Bar speed is still there.",
            },
            plateau: {
              detected: false,
              reason: "No plateau detected from recent comparable sessions.",
            },
            trend: {
              slope: 0.19,
              intercept: 101.4,
              rSquared: 0.88,
              comparableObservationCount: 12,
              direction: "UP",
            },
            historySummary: {
              points: [
                {
                  observedAt: "2026-06-01T10:00:00.000Z",
                  weight: 110,
                  reps: 5,
                  rpe: 8,
                  pointType: "ACTUAL",
                },
                {
                  observedAt: "2026-06-08T10:00:00.000Z",
                  weight: 112.5,
                  reps: 5,
                  rpe: 8,
                  pointType: "ACTUAL",
                },
                {
                  observedAt: "2026-06-15T10:00:00.000Z",
                  weight: 115,
                  reps: 5,
                  rpe: 8,
                  pointType: "ACTUAL",
                },
              ],
            },
          }
        : null,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    }));

    progressQueryMock.mockImplementation(({ exerciseDefinitionId }: { exerciseDefinitionId: string }) => ({
      chartData: {
        unit: "kg",
        metric: "BEST_SET_E1RM",
        comparisonMode: "ABSOLUTE",
        points: [
          {
            timestamp: "2026-06-01T10:00:00.000Z",
            seriesKey: exerciseDefinitionId,
            value: exerciseDefinitionId === "squat" ? 170 : 110,
          },
          {
            timestamp: "2026-06-15T10:00:00.000Z",
            seriesKey: exerciseDefinitionId,
            value: exerciseDefinitionId === "squat" ? 180 : 120,
          },
        ],
      },
      isChartLoading: false,
      chartError: null,
      refetchChart: vi.fn(),
      activeMetric: "BEST_SET_E1RM",
      handleMetricChange: vi.fn(),
      handleComparisonModeChange: vi.fn(),
      activeProgressComparisonMode: "ABSOLUTE",
    }));

    historyMock.mockImplementation((exerciseDefinitionId: string) => ({
      sessions: exerciseDefinitionId
        ? [
            {
              entryId: `${exerciseDefinitionId}-1`,
              templateName: "Session 1",
              performedAt: "2026-06-15T10:00:00.000Z",
              sets: [],
              topWeightKg: exerciseDefinitionId === "squat" ? 180 : 120,
              volumeKg: exerciseDefinitionId === "squat" ? 1800 : 900,
              averageRestSeconds: 120,
            },
          ]
        : [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      bestKg: exerciseDefinitionId === "squat" ? 180 : 120,
      sessionCount: exerciseDefinitionId ? 1 : 0,
    }));
  });

  it("renders the selected exercise and shared sections", () => {
    renderWithProviders(<ProgressPage />, { route: "/insights?tab=lift&exerciseDefinitionId=bench-press" });

    expect(screen.getByRole("heading", { name: "Lift detail" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Lift picker" })).toHaveTextContent("Bench Press");
    expect(screen.getByText("Bench Press")).toBeInTheDocument();
    expect(screen.getByText("Suggested weight")).toBeInTheDocument();
    expect(screen.getAllByText("120.0kg").length).toBeGreaterThan(0);
    expect(screen.getByText("Estimates")).toBeInTheDocument();
    expect(screen.getByText("History")).toBeInTheDocument();
    expect(screen.getAllByTestId("simple-bar-chart")).toHaveLength(2);
    expect(progressQueryMock).toHaveBeenCalledWith({ exerciseDefinitionId: "bench-press" });
    expect(historyMock).toHaveBeenCalledWith("bench-press", { limit: 8 });
  });

  it("fills in the first eligible exercise when the URL is missing a selection", async () => {
    renderWithProviders(
      <>
        <ProgressPage />
        <LocationProbe />
      </>,
      { route: "/insights?tab=lift" },
    );

    await waitFor(() => {
      expect(screen.getByTestId("location-search")).toHaveTextContent("exerciseDefinitionId=squat");
    });

    expect(screen.getByRole("combobox", { name: "Lift picker" })).toHaveTextContent("Back Squat");
  });

  it("updates the URL and queries when the lift changes", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <>
        <ProgressPage />
        <LocationProbe />
      </>,
      { route: "/insights?tab=lift&exerciseDefinitionId=squat" },
    );

    await user.selectOptions(screen.getByRole("combobox", { name: "Lift picker" }), "bench-press");

    await waitFor(() => {
      expect(screen.getByTestId("location-search")).toHaveTextContent("exerciseDefinitionId=bench-press");
    });

    expect(progressQueryMock).toHaveBeenLastCalledWith({ exerciseDefinitionId: "bench-press" });
    expect(historyMock).toHaveBeenLastCalledWith("bench-press", { limit: 8 });
  });
});
