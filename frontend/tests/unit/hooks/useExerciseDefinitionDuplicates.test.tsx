import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useExerciseDefinitionDuplicateGroups } from "@/features/workout/exercise-definitions/hooks/useExerciseDefinitionDuplicates";

const exerciseDefinitionsMock = vi.fn();
const workoutEntriesMock = vi.fn();

vi.mock("@/features/workout/exercise-definitions/hooks/useExerciseDefinitions", () => ({
  useAllExerciseDefinitions: () => exerciseDefinitionsMock(),
}));

vi.mock("@/features/workout/entries/hooks/useWorkoutEntries", () => ({
  useAllWorkoutEntries: () => workoutEntriesMock(),
}));

describe("useExerciseDefinitionDuplicateGroups", () => {
  it("groups duplicate definitions by catalog identity and tracks usage", () => {
    exerciseDefinitionsMock.mockReturnValue({
      data: [
        {
          id: "definition-a",
          exerciseName: "Low Row",
          variant: "Cable",
          exerciseInfoId: 17,
          mappingSource: "CATALOG",
          primaryMuscle: "lats",
          secondaryMuscles: [],
          createdAt: "2026-06-01T10:00:00.000Z",
          updatedAt: "2026-06-01T10:00:00.000Z",
        },
        {
          id: "definition-b",
          exerciseName: "Seated Low Row",
          variant: "Cable",
          exerciseInfoId: 17,
          mappingSource: "AUTO",
          primaryMuscle: "lats",
          secondaryMuscles: [],
          createdAt: "2026-06-05T10:00:00.000Z",
          updatedAt: "2026-06-05T10:00:00.000Z",
        },
        {
          id: "definition-c",
          exerciseName: "Face Pull",
          variant: null,
          exerciseInfoId: null,
          mappingSource: "AUTO",
          primaryMuscle: "rear_delt",
          secondaryMuscles: [],
          createdAt: "2026-06-06T10:00:00.000Z",
          updatedAt: "2026-06-06T10:00:00.000Z",
        },
        {
          id: "definition-d",
          exerciseName: "Face Pull",
          variant: null,
          exerciseInfoId: null,
          mappingSource: "MANUAL",
          primaryMuscle: "rear_delt",
          secondaryMuscles: [],
          createdAt: "2026-06-07T10:00:00.000Z",
          updatedAt: "2026-06-07T10:00:00.000Z",
        },
      ],
      isLoading: false,
      error: null,
    });

    workoutEntriesMock.mockReturnValue({
      data: [
        {
          id: "entry-1",
          createdAt: "2026-06-10T10:00:00.000Z",
          template: { id: "template-1" },
          exercises: [
            { exerciseDefinitionId: "definition-a" },
            { exerciseDefinitionId: "definition-c" },
          ],
        },
        {
          id: "entry-2",
          createdAt: "2026-06-12T10:00:00.000Z",
          template: { id: "template-2" },
          exercises: [
            { exerciseDefinitionId: "definition-a" },
            { exerciseDefinitionId: "definition-b" },
            { exerciseDefinitionId: "definition-d" },
          ],
        },
      ],
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useExerciseDefinitionDuplicateGroups());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toHaveLength(2);

    const catalogGroup = result.current.data.find((group) => group.exerciseInfoId === 17);
    expect(catalogGroup).toBeTruthy();
    expect(catalogGroup?.suggestedCanonicalDefinitionId).toBe("definition-a");
    expect(catalogGroup?.definitions).toHaveLength(2);
    expect(catalogGroup?.definitions[0]?.sessionCount).toBe(2);
    expect(catalogGroup?.definitions[0]?.lastUsedAt).toBe("2026-06-12T10:00:00.000Z");

    const customGroup = result.current.data.find((group) => group.exerciseInfoId == null);
    expect(customGroup?.definitions).toHaveLength(2);
    expect(customGroup?.definitions[0]?.sessionCount).toBe(1);
  });
});
