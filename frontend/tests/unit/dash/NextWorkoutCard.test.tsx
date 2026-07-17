const navigateMock = vi.fn();
const dashboardSummaryMock = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock("@/features/dashboard/hooks/useDashboardSummary", () => ({
  useDashboardSummary: () => dashboardSummaryMock(),
}));

import { screen } from "@testing-library/react";
import NextWorkoutCard from "@/features/dashboard/components/summary/NextWorkoutCard";
import { buildDashboardSummary } from "tests/shared/builders";
import { renderWithProviders } from "tests/setup/test-utils";

describe("NextWorkoutCard", () => {
  beforeEach(() => {
    navigateMock.mockReset();
    dashboardSummaryMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the empty workout state when no templates exist", () => {
    dashboardSummaryMock.mockReturnValue({
      data: buildDashboardSummary({
        workoutTemplateCount: 0,
        activeSplit: null,
        nextWorkout: null,
        topLift: null,
      }),
      isLoading: false,
    });

    renderWithProviders(<NextWorkoutCard />);

    expect(screen.queryByText("Next Workout")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows the no-active-split state and navigates to split creation", () => {
    dashboardSummaryMock.mockReturnValue({
      data: buildDashboardSummary({
        activeSplit: null,
        nextWorkout: null,
      }),
      isLoading: false,
    });

    renderWithProviders(<NextWorkoutCard />);

    expect(screen.queryByText("Next Workout")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders the next workout details with a single interactive button", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-26T12:00:00.000Z"));

    dashboardSummaryMock.mockReturnValue({
      data: buildDashboardSummary({
        nextWorkout: {
          id: "workout-123",
          name: "Bench Focus",
          category: "Push",
          previewExercises: [
            { exerciseName: "Bench Press", variant: "Barbell", goalSets: 3 },
            { exerciseName: "Incline Press", variant: null, goalSets: 2 },
          ],
          extraExerciseCount: 0,
          lastCompletedAt: "2026-04-25T08:00:00.000Z",
          lastSetCount: 2,
        },
      }),
      isLoading: false,
    });

    renderWithProviders(<NextWorkoutCard />);

    expect(screen.getByText("Bench Focus")).toBeInTheDocument();
    expect(screen.getByText("Push")).toBeInTheDocument();
    expect(screen.getByText(/Last done/)).toHaveTextContent("yesterday");
    expect(screen.getByText(/Last done/)).toHaveTextContent("2 sets");
    expect(screen.getByTitle("Bench Press (Barbell)")).toHaveTextContent("BPx3");
    expect(screen.getByRole("button", { name: /Bench Focus/i })).toBeInTheDocument();
    screen.getByRole("button", { name: /Bench Focus/i }).click();
    expect(navigateMock).toHaveBeenCalledWith("/workout/workout-123");
  });
});
