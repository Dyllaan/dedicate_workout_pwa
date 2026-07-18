import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const templatesMock = vi.fn();

vi.mock("@/features/workout/templates/hooks/useWorkoutTemplates", () => ({
  useAllWorkoutTemplates: () => templatesMock(),
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
  });

  it("sorts options alphabetically by exercise name, then variant, then template name", () => {
    templatesMock.mockReturnValue({
      data: [
        {
          id: "template-c",
          name: "C-Template",
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
          id: "template-a",
          name: "A-Template",
          category: "Push",
          createdAt: "2026-06-02T10:00:00.000Z",
          exercises: [
            {
              focus: true,
              exerciseDefinition: {
                id: "squat",
                exerciseName: "Squat",
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

    const { result } = renderHook(() => useAnalysisExerciseOptions());

    expect(result.current.options).toHaveLength(2);
    expect(result.current.options[0]?.exerciseName).toBe("Bench Press");
    expect(result.current.options[1]?.exerciseName).toBe("Squat");
  });

  it("deduplicates by exercise definition ID, keeping the alphabetically first option", () => {
    templatesMock.mockReturnValue({
      data: [
        {
          id: "template-b",
          name: "Template B",
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
          id: "template-a",
          name: "Template A",
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

    const { result } = renderHook(() => useAnalysisExerciseOptions());

    expect(result.current.options).toHaveLength(1);
    expect(result.current.options[0]?.templateName).toBe("Template A");
  });

  it("skips exercises without a focus", () => {
    templatesMock.mockReturnValue({
      data: [
        {
          id: "template-a",
          name: "Template A",
          category: "Full Body",
          createdAt: "2026-06-01T10:00:00.000Z",
          exercises: [
            {
              focus: false,
              exerciseDefinition: {
                id: "non-focus-exercise",
                exerciseName: "Non Focus",
                variant: null,
              },
            },
            {
              focus: true,
              exerciseDefinition: {
                id: "focus-exercise",
                exerciseName: "Focus Exercise",
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

    const { result } = renderHook(() => useAnalysisExerciseOptions());

    expect(result.current.options).toHaveLength(1);
    expect(result.current.options[0]?.exerciseDefinitionId).toBe("focus-exercise");
  });

  it("skips exercises without a definition ID", () => {
    templatesMock.mockReturnValue({
      data: [
        {
          id: "template-a",
          name: "Template A",
          category: "Full Body",
          createdAt: "2026-06-01T10:00:00.000Z",
          exercises: [
            {
              focus: true,
              exerciseDefinition: {
                id: "  ",
                exerciseName: "Blank Id",
                variant: null,
              },
            },
            {
              focus: true,
              exerciseDefinition: {
                id: "valid-exercise",
                exerciseName: "Valid Exercise",
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

    const { result } = renderHook(() => useAnalysisExerciseOptions());

    expect(result.current.options).toHaveLength(1);
    expect(result.current.options[0]?.exerciseDefinitionId).toBe("valid-exercise");
  });

  it("returns loading state from templates query", () => {
    templatesMock.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });

    const { result } = renderHook(() => useAnalysisExerciseOptions());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.options).toEqual([]);
  });
});
