import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "tests/setup/test-utils";
import SelectedWorkoutPage from "@/pages/workouts/SelectedWorkoutPage";

const workoutContextMock = vi.fn();

vi.mock("@/features/workout/hooks/useWorkoutContext", () => ({
  default: () => workoutContextMock(),
}));

vi.mock("@/features/workout/components/panels/SelectedWorkoutOverviewPanel", () => ({
  default: () => <div data-testid="overview-panel" />,
}));

vi.mock("@/features/workout/components/panels/WorkoutEntriesPanel", () => ({
  default: () => <div data-testid="entries-panel" />,
}));

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location-search">{location.search}</div>;
}

describe("SelectedWorkoutPage", () => {
  beforeEach(() => {
    workoutContextMock.mockReturnValue({
      workoutTemplate: {
        id: "workout-1",
        name: "Push Day",
        category: "Strength",
        createdAt: "2026-06-04T10:00:00.000Z",
        exercises: [],
      },
      lastEntry: null,
      entries: [],
      stats: {
        entryCount: 2,
        totalWeightLifted: 200,
      },
      isLoading: false,
    });
  });

  it("keeps the tab shell visible while loading the workout", () => {
    workoutContextMock.mockReturnValue({
      workoutTemplate: null,
      lastEntry: null,
      entries: [],
      stats: {
        entryCount: 0,
        totalWeightLifted: 0,
      },
      isLoading: true,
    });

    renderWithProviders(<SelectedWorkoutPage />, {
      route: "/workout/workout-1?tab=overview",
    });

    expect(screen.getByText("Loading workout")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Overview" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Entries" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Heatmap" })).toBeInTheDocument();
    expect(screen.getByText("Fetching the workout overview, entries, and heatmap.")).toBeInTheDocument();
  });

  it("shows the overview tab by default and updates the query string when switching tabs", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <>
        <SelectedWorkoutPage />
        <LocationDisplay />
      </>,
      {
        route: "/workout/workout-1?tab=overview",
      },
    );

    expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("overview-panel")).toBeInTheDocument();
    expect(screen.queryByTestId("entries-panel")).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Entries" }));

    await waitFor(() => {
      expect(screen.getByTestId("location-search")).toHaveTextContent("tab=entries");
    });

    expect(screen.getByRole("tab", { name: "Entries" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("entries-panel")).toBeInTheDocument();
  });

  it("opens the entries tab from the query string", () => {
    renderWithProviders(
      <SelectedWorkoutPage />,
      {
        route: "/workout/workout-1?tab=entries",
      },
    );

    expect(screen.getByRole("tab", { name: "Entries" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("entries-panel")).toBeInTheDocument();
    expect(screen.queryByTestId("overview-panel")).not.toBeInTheDocument();
  });
});
