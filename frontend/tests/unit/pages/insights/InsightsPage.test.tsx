import { useLocation } from "react-router-dom";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "tests/setup/test-utils";
import InsightsPage from "@/pages/insights/InsightsPage";

const insightsOverviewMock = vi.fn();
const readinessHistoryMock = vi.fn();

vi.mock("@/features/insights/hooks/useTrainingInsights", () => ({
  useInsightsOverview: () => insightsOverviewMock(),
  useReadinessHistory: (...args: unknown[]) => readinessHistoryMock(...args),
}));

vi.mock("@/features/insights/components/InsightsOverviewPanel", () => ({
  InsightsOverviewPanel: () => <div data-testid="overview-panel" />,
}));

vi.mock("@/features/insights/components/InsightsVolumePanel", () => ({
  default: () => <div data-testid="volume-panel" />,
}));

vi.mock("@/features/progress/components/ProgressPanel", () => ({
  default: () => <div data-testid="lift-page" />,
}));

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location-search">{location.search}</div>;
}

describe("InsightsPage", () => {
  beforeEach(() => {
    insightsOverviewMock.mockReset();
    readinessHistoryMock.mockReset();

    insightsOverviewMock.mockReturnValue({
      data: {
        dashboardSummary: {
          workoutTemplateCount: 0,
          splitCount: 0,
          activeSplit: null,
          nextWorkout: null,
          topLift: null,
          hasLoggedWorkout: false,
          hasCreatedProgramme: false,
        },
        prioritySignals: [],
      },
      isLoading: false,
    });

    readinessHistoryMock.mockReturnValue({
      data: {
        pageInfo: null,
      },
      isLoading: false,
    });
  });

  it("renders the unified lift tab from the URL", () => {
    renderWithProviders(<InsightsPage />, { route: "/insights?tab=analysis" });

    expect(screen.getByRole("tab", { name: "Lift detail" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("lift-page")).toBeInTheDocument();
    expect(screen.queryByTestId("overview-panel")).not.toBeInTheDocument();
  });

  it("updates the query string when switching to lift detail", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <>
        <InsightsPage />
        <LocationProbe />
      </>,
      { route: "/insights?tab=overview" },
    );

    await user.click(screen.getByRole("tab", { name: "Lift detail" }));

    await waitFor(() => {
      expect(screen.getByTestId("location-search")).toHaveTextContent("tab=lift");
    });

    expect(screen.getByRole("tab", { name: "Lift detail" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("lift-page")).toBeInTheDocument();
  });
});
