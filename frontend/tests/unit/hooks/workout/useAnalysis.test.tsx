import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const templatesMock = vi.fn();
const workoutEntriesMock = vi.fn();

vi.mock("@/features/workout/templates/hooks/useWorkoutTemplates", () => ({
  useAllWorkoutTemplates: () => templatesMock(),
}));

vi.mock("@/features/workout/entries/hooks/useWorkoutEntries", () => ({
  useAllWorkoutEntries: () => workoutEntriesMock(),
}));

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { accessToken: "token" },
  }),
}));

import { useAnalysisExerciseOptions } from "@/features/analysis/hooks/useAnalysis";

describe("useAnalysisExerciseOptions", () => {
  beforeEach(() => {
    templatesMock.mockReset();
    workoutEntriesMock.mockReset();
  });

  it("chooses the template with the most workout history for a shared exercise definition", () => {
    templatesMock.mockReturnValue({
      data: [
        {
          id: "template-sparse",
          name: "Sparse Bench",
          category: "Push",
          createdAt: "2026-06-01T10:00:00.000Z",
          exercises: [
            {
              focus: true,
              exerciseDefinition: {
                id: "bench-press",
                exerciseName: "Bench Press",
                variant: null,
              },
            },
          ],
        },
        {
          id: "template-rich",
          name: "Rich Bench",
          category: "Push",
          createdAt: "2026-06-02T10:00:00.000Z",
          exercises: [
            {
              focus: true,
              exerciseDefinition: {
                id: "bench-press",
                exerciseName: "Bench Press",
                variant: null,
              },
            },
          ],
        },
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    workoutEntriesMock.mockReturnValue({
      data: [
        {
          template: { id: "template-sparse" },
          createdAt: "2026-06-10T10:00:00.000Z",
        },
        {
          template: { id: "template-rich" },
          createdAt: "2026-06-09T10:00:00.000Z",
        },
        {
          template: { id: "template-rich" },
          createdAt: "2026-06-11T10:00:00.000Z",
        },
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    const { result } = renderHook(() => useAnalysisExerciseOptions());

    expect(result.current.options).toHaveLength(1);
    expect(result.current.options[0]?.templateId).toBe("template-rich");
  });
});
