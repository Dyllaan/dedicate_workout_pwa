import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ExerciseHistoryPanel from "@/features/insights/components/ExerciseHistoryPanel";

const mockUseExerciseHistory = vi.hoisted(() => vi.fn());

vi.mock("@/features/workout/exercise-definitions/hooks/useExerciseHistory", () => ({
  useExerciseHistory: (...args: unknown[]) => mockUseExerciseHistory(...args),
}));

vi.mock("@/features/preferences/unit/hooks/useUnitPreference", () => ({
  useUnitPreference: () => ({
    format: (value: number) => `${value}kg`,
  }),
}));

vi.mock("@/features/workout/components/ExerciseSetsTable", () => ({
  default: ({ sets }: { sets: Array<{ id: string }> }) => (
    <div data-testid="exercise-sets">{sets.length} sets</div>
  ),
}));

vi.mock("@/components/charts/SimpleBarChart", () => ({
  default: () => <div data-testid="history-chart" />,
}));

describe("ExerciseHistoryPanel", () => {
  it("passes the exercise definition id to the history hook and renders matching sessions", () => {
    mockUseExerciseHistory.mockReturnValue({
      sessions: [
        {
          entryId: "entry-1",
          templateName: "Push Day",
          performedAt: "2026-05-02T10:00:00.000Z",
          sets: [{ id: "set-1", reps: 5, weight: 100, rpe: 8 }],
          topWeightKg: 100,
          volumeKg: 500,
          averageRestSeconds: 90,
        },
      ],
      isLoading: false,
      bestKg: 100,
    });

    render(
      <ExerciseHistoryPanel
        exerciseDefinitionId="definition-bench"
        exerciseName="Bench Press"
      />,
    );

    expect(mockUseExerciseHistory).toHaveBeenCalledWith(
      "definition-bench",
      expect.objectContaining({
        limit: 10,
        startDate: undefined,
        endDate: undefined,
      }),
    );
    expect(screen.getAllByText("Push Day")).toHaveLength(2);
    expect(screen.getAllByText("100kg")).toHaveLength(2);
    expect(screen.getByTestId("exercise-sets")).toHaveTextContent("1 sets");
  });
});
