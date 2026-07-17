import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AnalysisTab from "@/features/analysis/components/AnalysisTab";
import type { AnalysisExerciseOption } from "@/features/analysis/types/Analysis";
import { renderWithProviders } from "tests/setup/test-utils";

const optionsMock = vi.fn();
const recommendationMock = vi.fn();

vi.mock("@/features/analysis/hooks/useAnalysis", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/analysis/hooks/useAnalysis")>();

  return {
    ...actual,
    useAnalysisExerciseOptions: () => optionsMock(),
    useTemplateAnalysisRecommendation: (templateId?: string | null, options?: { limit?: number; startDate?: string; endDate?: string }) =>
      recommendationMock(templateId, options),
  };
});

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location-search">{location.search}</div>;
}

function buildOption(overrides: AnalysisExerciseOption): AnalysisExerciseOption {
  return overrides;
}

function formatDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function expectedDefaultRange() {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 30);
  return {
    startDate: formatDateInputValue(start),
    endDate: formatDateInputValue(end),
  };
}

describe("AnalysisTab", () => {
  beforeEach(() => {
    optionsMock.mockReset();
    recommendationMock.mockReset();

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
              suggestedWeightKg: 120,
              reasoning: "Bar speed is still there.",
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
  });

  it("renders the selected exercise and loads analysis for its template", () => {
    const range = expectedDefaultRange();
    renderWithProviders(<AnalysisTab />, { route: "/insights?tab=analysis&exerciseDefinitionId=bench-press" });

    expect(screen.getByRole("combobox", { name: "Exercise analysis picker" })).toHaveTextContent("Bench Press");
    expect(screen.getByText("Exercise analysis")).toBeInTheDocument();
    expect(screen.getByText("Bench Press")).toBeInTheDocument();
    expect(recommendationMock).toHaveBeenCalledWith("template-latest-bench", {
      limit: 10,
      startDate: range.startDate,
      endDate: range.endDate,
    });
  });

  it("uses the selected exercise definition from the URL", () => {
    const range = expectedDefaultRange();
    renderWithProviders(<AnalysisTab />, { route: "/insights?tab=analysis&exerciseDefinitionId=squat" });

    expect(screen.getByRole("combobox", { name: "Exercise analysis picker" })).toHaveTextContent("Back Squat");
    expect(recommendationMock).toHaveBeenCalledWith("template-squat", {
      limit: 10,
      startDate: range.startDate,
      endDate: range.endDate,
    });
  });

  it("auto-selects the first eligible exercise when the URL is missing a selection", async () => {
    renderWithProviders(
      <>
        <AnalysisTab />
        <LocationProbe />
      </>,
      { route: "/insights?tab=analysis" },
    );

    await waitFor(() => {
      expect(screen.getByTestId("location-search")).toHaveTextContent("exerciseDefinitionId=squat");
    });

    expect(screen.getByRole("combobox", { name: "Exercise analysis picker" })).toHaveTextContent("Back Squat");
  });

  it("applies trajectory presets to the analysis query", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-11T12:00:00.000Z"));
    try {
      renderWithProviders(
        <>
          <AnalysisTab />
          <LocationProbe />
        </>,
        { route: "/insights?tab=analysis&exerciseDefinitionId=bench-press" },
      );

      fireEvent.click(screen.getByRole("button", { name: "Last 90 days" }));

      expect(screen.getByTestId("location-search")).toHaveTextContent("analysisLimit=10");
      expect(screen.getByTestId("location-search")).toHaveTextContent("analysisStartDate=2026-04-12");
      expect(screen.getByTestId("location-search")).toHaveTextContent("analysisEndDate=2026-07-11");
      expect(screen.getByTestId("location-search")).toHaveTextContent("analysisPreset=90d");
      expect(recommendationMock).toHaveBeenLastCalledWith("template-latest-bench", {
        limit: 10,
        startDate: "2026-04-12",
        endDate: "2026-07-11",
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("disables preset chips while a custom window is selected", () => {
    renderWithProviders(<AnalysisTab />, { route: "/insights?tab=analysis&exerciseDefinitionId=bench-press" });

    fireEvent.change(screen.getByLabelText("Start date"), { target: { value: "2026-06-13" } });

    expect(screen.getByRole("button", { name: "Custom" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "All time" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Last 30 days" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Last 90 days" })).toBeDisabled();
  });

  it("debounces date changes before updating the analysis request", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-11T12:00:00.000Z"));
    try {
      renderWithProviders(
        <>
          <AnalysisTab />
          <LocationProbe />
        </>,
        { route: "/insights?tab=analysis&exerciseDefinitionId=bench-press" },
      );

      fireEvent.change(screen.getByLabelText("Start date"), { target: { value: "2026-06-13" } });
      expect(screen.getByTestId("location-search")).not.toHaveTextContent("analysisStartDate=2026-06-13");

      await act(async () => {
        vi.advanceTimersByTime(350);
      });

      expect(screen.getByTestId("location-search")).toHaveTextContent("analysisStartDate=2026-06-13");
      expect(screen.getByTestId("location-search")).toHaveTextContent("analysisPreset=custom");
      expect(recommendationMock).toHaveBeenLastCalledWith("template-latest-bench", {
        limit: 10,
        startDate: "2026-06-13",
        endDate: "2026-07-11",
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("debounces limit changes before updating the analysis request", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-11T12:00:00.000Z"));
    try {
      renderWithProviders(
        <>
          <AnalysisTab />
          <LocationProbe />
        </>,
        { route: "/insights?tab=analysis&exerciseDefinitionId=bench-press" },
      );

      fireEvent.change(screen.getByLabelText("Limit"), { target: { value: "15" } });

      await act(async () => {
        vi.advanceTimersByTime(350);
      });

      expect(screen.getByTestId("location-search")).toHaveTextContent("analysisLimit=15");
      expect(screen.getByTestId("location-search")).toHaveTextContent("analysisPreset=custom");
      expect(recommendationMock).toHaveBeenLastCalledWith("template-latest-bench", {
        limit: 15,
        startDate: "2026-06-11",
        endDate: "2026-07-11",
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("renders the shared analysis window once at the tab level", () => {
    renderWithProviders(<AnalysisTab />, { route: "/insights?tab=analysis&exerciseDefinitionId=bench-press" });

    expect(screen.getByTestId("analysis-window-controls")).toBeInTheDocument();
    expect(screen.getAllByText("Analysis window")).toHaveLength(1);
    expect(screen.getAllByLabelText("Start date")).toHaveLength(1);
    expect(screen.getAllByLabelText("End date")).toHaveLength(1);
    expect(screen.getAllByLabelText("Limit")).toHaveLength(1);
  });

  it("shows an empty state when no eligible exercise definitions exist", () => {
    optionsMock.mockReturnValue({
      options: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithProviders(<AnalysisTab />, { route: "/insights?tab=analysis" });

    expect(screen.getByText("No eligible exercises yet.")).toBeInTheDocument();
    expect(screen.getByText("Focused exercises with definition ids appear here.")).toBeInTheDocument();
  });

  it("renders the consolidated recommendation, plateau, and trend sections", () => {
    const { container } = renderWithProviders(<AnalysisTab />, { route: "/insights?tab=analysis&exerciseDefinitionId=bench-press" });

    expect(screen.getByText("Recommendation")).toBeInTheDocument();
    expect(screen.getByText("Plateau")).toBeInTheDocument();
    expect(screen.getByText("Trend")).toBeInTheDocument();
    expect(screen.getByText("Bar speed is still there.")).toBeInTheDocument();
    expect(screen.getByText("No plateau detected")).toBeInTheDocument();
    expect(container.querySelector('path[data-line-series-key="actualWeight"]')).toHaveAttribute("stroke", "var(--chart-1)");
  });
});
