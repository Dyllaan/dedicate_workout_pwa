import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import WorkoutVolumePanel from "@/features/workout/components/panels/WorkoutVolumePanel";

vi.mock("@/features/workout/hooks/useWorkoutContext", () => ({
  default: vi.fn(),
}));

import useWorkoutContext from "@/features/workout/hooks/useWorkoutContext";

const mockedUseWorkoutContext = vi.mocked(useWorkoutContext);

function buildContext(overrides: {
  entries?: unknown[];
  format?: (kg: number) => string;
  isLoading?: boolean;
} = {}) {
  mockedUseWorkoutContext.mockReturnValue({
    workoutTemplate: null,
    lastEntry: null,
    entries: [],
    stats: null,
    isLoading: false,
    format: (kg: number) => `${kg} kg`,
    ...overrides,
  });
}

describe("WorkoutVolumePanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading skeletons when isLoading is true", () => {
    buildContext({ isLoading: true });

    render(<WorkoutVolumePanel />);

    expect(screen.getByText("Volume history")).toBeInTheDocument();
    const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders empty state when there are no entries", () => {
    buildContext({ entries: [], isLoading: false });

    render(<WorkoutVolumePanel />);

    expect(screen.getByText("No entries yet")).toBeInTheDocument();
    expect(
      screen.getByText("Start a workout to see your volume history."),
    ).toBeInTheDocument();
  });

  it("renders volume chart when entries exist", () => {
    buildContext({
      entries: [
        {
          id: "entry-1",
          template: {
            id: "template-1",
            name: "Push Day",
            category: "Push",
            exercises: [],
            createdAt: "2026-01-01T00:00:00.000Z",
          },
          exercises: [
            {
              id: "ex-1",
              exerciseName: "Bench Press",
              sets: [
                { id: "s1", reps: 5, weight: 100, rpe: 8 },
                { id: "s2", reps: 3, weight: 110, rpe: 9 },
              ],
            },
          ],
          createdAt: "2026-06-01T10:00:00.000Z",
        },
      ],
    });

    render(<WorkoutVolumePanel />);

    expect(screen.getByText("Volume history")).toBeInTheDocument();
    expect(screen.queryByText("No entries yet")).toBeNull();
    const svg = document.querySelector("svg");
    expect(svg).toBeInTheDocument();
    const tonnagePath = document.querySelector('[data-line-series-key="tonnage"]');
    expect(tonnagePath).toBeInTheDocument();
  });
});
