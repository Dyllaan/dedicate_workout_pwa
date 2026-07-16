import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import useWorkoutEditorForm, {
  createEmptyWorkoutEditorValues,
} from "@/hooks/forms/useWorkoutEditorForm";
import { createExerciseIdentityDraft } from "@/types/exerciseIdentity";
import { getStringValidationMessage } from "@/utils/validator";

describe("useWorkoutEditorForm", () => {
  it("marks the form dirty when adding an exercise with default values", async () => {
    const onSubmit = vi.fn();

    const { result } = renderHook(() =>
      useWorkoutEditorForm({
        defaultValues: createEmptyWorkoutEditorValues(),
        resetKey: "create",
        onSubmit,
      }),
    );

    expect(result.current.form.formState.isDirty).toBe(false);

    act(() => {
      result.current.addExercise();
    });

    await waitFor(() => {
      expect(result.current.form.formState.isDirty).toBe(true);
    });
  });

  it("keeps only one exercise focused at a time and clears focus when the focused exercise is removed", () => {
    const { result } = renderHook(() =>
      useWorkoutEditorForm({
        defaultValues: {
          workoutName: "Push Day",
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
              focus: false,
              targetRestSeconds: null,
            },
            {
              identity: createExerciseIdentityDraft({
                exerciseInfoId: 2,
                exerciseName: "Squat",
                variant: "Back",
              }),
              goalSets: 4,
              exerciseConfigId: "config-2",
              focus: false,
              targetRestSeconds: null,
            },
          ],
        },
        resetKey: "focus-state",
        onSubmit: vi.fn(),
      }),
    );

    act(() => {
      result.current.setExerciseFocus(0, true);
    });

    expect(result.current.form.getValues("exercises").map((exercise) => exercise.focus)).toEqual([
      true,
      false,
    ]);

    act(() => {
      result.current.setExerciseFocus(1, true);
    });

    expect(result.current.form.getValues("exercises").map((exercise) => exercise.focus)).toEqual([
      false,
      true,
    ]);

    act(() => {
      result.current.removeExercise(1);
    });

    expect(result.current.form.getValues("exercises").map((exercise) => exercise.focus)).toEqual([
      false,
    ]);
  });

  it("keeps catalog-backed exercise names saveable even when the catalog label contains punctuation", async () => {
    const { result } = renderHook(() =>
      useWorkoutEditorForm({
        defaultValues: {
          workoutName: "Push Day",
          workoutCategory: "Push",
          exercises: [],
        },
        resetKey: "catalog-backed",
        onSubmit: vi.fn(),
      }),
    );

    act(() => {
      result.current.addExercise({
        identity: createExerciseIdentityDraft({
          exerciseInfoId: 12,
          exerciseName: "Skull Crushers: Barbell",
          variant: "Barbell",
        }),
      });
    });

    await act(async () => {
      expect(await result.current.form.trigger()).toBe(true);
    });

    expect(result.current.form.formState.errors.exercises?.[0]?.identity).toBeUndefined();
  });

  it("reports why a workout name is too short", async () => {
    expect(getStringValidationMessage("Workout name", "Ab")).toContain("at least");
    expect(getStringValidationMessage("Workout name", "Ab")).not.toContain(
      "invalid characters",
    );
  });

  it("reports leading and trailing whitespace separately for workout types", async () => {
    expect(getStringValidationMessage("Workout type", " Push ")).toContain(
      "not start or end with whitespace",
    );
  });

  it("reports whitespace and character problems together for custom exercise names", async () => {
    const message = getStringValidationMessage("Exercise name", " #");
    expect(message).toContain("not start or end with whitespace");
    expect(message).toContain("at least");
    expect(message).toContain("contain only letters, numbers, spaces, and common punctuation");
  });
});
