import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "tests/setup/test-utils";
import TestSessionPage from "@/features/workout/test-1rm/components/TestSessionPage";

vi.mock("@/features/workout/hooks/useWorkoutContext", () => ({
  default: vi.fn(),
}));

vi.mock("@/features/workout/test-1rm/hooks/use1rmBaseline", () => ({
  use1rmBaseline: vi.fn(),
}));

import useWorkoutContext from "@/features/workout/hooks/useWorkoutContext";
import { use1rmBaseline } from "@/features/workout/test-1rm/hooks/use1rmBaseline";

const mockedUseWorkoutContext = vi.mocked(useWorkoutContext);
const mockedUse1rmBaseline = vi.mocked(use1rmBaseline);

function buildContext(overrides: Record<string, unknown> = {}) {
  mockedUseWorkoutContext.mockReturnValue({
    workoutTemplate: {
      id: "tpl-1",
      name: "Heavy Squat Day",
      category: "Lower",
      exercises: [
        {
          exerciseConfigId: "ec-1",
          exerciseDefinition: {
            id: "def-1",
            exerciseName: "Squat",
            variant: "Competition",
          },
          goalSets: 5,
          focus: true,
        },
      ],
      createdAt: "2026-01-01T00:00:00Z",
    },
    lastEntry: null,
    entries: [],
    stats: null,
    isLoading: false,
    format: (kg: number) => `${kg} kg`,
    ...overrides,
  });
  mockedUse1rmBaseline.mockReturnValue({
    data: 100,
    isLoading: false,
    isError: false,
    error: null,
    isSuccess: true,
    isFetching: false,
    isPending: false,
  } as ReturnType<typeof use1rmBaseline>);
}

describe("TestSessionPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    buildContext();
  });

  it("renders the SETUP phase with exercise info", () => {
    renderWithProviders(<TestSessionPage />);

    expect(screen.getByText("1RM Test")).toBeInTheDocument();
    expect(screen.getByText("Start 1RM Test")).toBeInTheDocument();
    expect(screen.getByText("Heavy Squat Day — In Progress")).toBeInTheDocument();
  });

  it("renders baseline E1RM in setup panel", () => {
    renderWithProviders(<TestSessionPage />);

    expect(screen.getByText("100 kg")).toBeInTheDocument();
  });

  it("renders without a workout template", () => {
    mockedUseWorkoutContext.mockReturnValue({
      workoutTemplate: null,
      lastEntry: null,
      entries: [],
      stats: null,
      isLoading: false,
      format: (kg: number) => `${kg} kg`,
    });

    renderWithProviders(<TestSessionPage />);

    expect(screen.getByText("1RM Test")).toBeInTheDocument();
    expect(screen.getByText("Start 1RM Test")).toBeInTheDocument();
  });
});
