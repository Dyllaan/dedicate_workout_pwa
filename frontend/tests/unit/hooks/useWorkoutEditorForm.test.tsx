import { act, renderHook } from "@testing-library/react";
import useWorkoutEditorForm, {
  createEmptyWorkoutEditorValues,
  editorValuesToCreateWorkoutPayload,
} from "@/hooks/forms/useWorkoutEditorForm";
import { createExerciseIdentityDraft } from "@/types/exerciseIdentity";
import { buildExerciseInfoCatalogItem } from "tests/shared/builders";

describe("useWorkoutEditorForm", () => {
  it("stores a human-readable variant when linking a catalog exercise", () => {
    const { result } = renderHook(() =>
      useWorkoutEditorForm({
        defaultValues: createEmptyWorkoutEditorValues(),
        resetKey: "catalog-link",
        onSubmit: vi.fn(),
      }),
    );

    act(() => {
      result.current.addExercise({
        identity: createExerciseIdentityDraft({
          exerciseName: "Bench Press",
        }),
        goalSets: 3,
      });
      result.current.linkExercise(
        0,
        buildExerciseInfoCatalogItem({
          name: "Bench Press",
          variation: "No",
          equipment: "Dumbbell",
          mainMuscle: "Chest",
        }),
      );
    });

    expect(result.current.form.getValues("exercises.0")).toEqual(
      expect.objectContaining({
        identity: createExerciseIdentityDraft({
          exerciseInfoId: 1,
          exerciseName: "Bench Press",
          variant: "Dumbbell",
        }),
      }),
    );
  });

  it("serializes exercise focus into create payloads", () => {
    const { result } = renderHook(() =>
      useWorkoutEditorForm({
        defaultValues: {
          workoutName: "Custom Push",
          workoutCategory: "Push",
          exercises: [
            {
              identity: createExerciseIdentityDraft({
                exerciseInfoId: 1,
                exerciseName: "Bench Press",
                variant: "Barbell",
              }),
              goalSets: 3,
              exerciseConfigId: "config-1",
              focus: true,
              targetRestSeconds: null,
            },
          ],
        },
        resetKey: "focus-payload",
        onSubmit: vi.fn(),
      }),
    );

    expect(editorValuesToCreateWorkoutPayload(result.current.form.getValues())).toEqual(
      expect.objectContaining({
        exercises: [
          expect.objectContaining({
            exerciseName: "Bench Press",
            focus: true,
          }),
        ],
      }),
    );
  });
});
