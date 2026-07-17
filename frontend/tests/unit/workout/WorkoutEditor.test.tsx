import { useState } from "react";
import { fireEvent, screen } from "@testing-library/react";
import { useForm, useWatch } from "react-hook-form";
import { Dumbbell } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import { WorkoutEditorView, type WorkoutEditorViewProps } from "@/features/workout/templates/components/WorkoutEditorView";
import type {
  WorkoutEditorExerciseValues,
  WorkoutEditorValues,
} from "@/features/workout/templates/hooks/useWorkoutEditorForm";
import type { WorkoutEditorTab } from "@/features/workout/templates/hooks/useWorkoutEditor";
import { createExerciseIdentityDraft } from "@/features/workout/entries/types/ExerciseIdentity";
import { renderWithProviders } from "tests/setup/test-utils";

vi.mock("@/features/workout/components/ExerciseCatalogPicker", () => ({
  default: ({
    onSelect,
    onUseTypedQuery,
  }: {
    onSelect: (exercise: { id: number; name: string }) => void;
    onUseTypedQuery?: (query: string) => void;
  }) => (
    <div data-testid="exercise-catalog-picker">
      <button type="button" onClick={() => onSelect({ id: 101, name: "Bench Press" })}>
        Pick Bench Press
      </button>
      <button type="button" onClick={() => onUseTypedQuery?.("Cable Press Around")}>
        Add Cable Press Around
      </button>
    </div>
  ),
}));

function makeExercise(
  overrides: Partial<WorkoutEditorExerciseValues> = {},
): WorkoutEditorExerciseValues {
  return {
    identity:
      overrides.identity ??
      createExerciseIdentityDraft({
        exerciseDefinitionId: overrides.identity?.kind === "definition" ? overrides.identity.exerciseDefinitionId : null,
        exerciseInfoId: overrides.identity?.exerciseInfoId ?? null,
        exerciseName: overrides.identity?.exerciseName ?? "",
        variant: overrides.identity?.variant ?? "",
      }),
    goalSets: overrides.goalSets ?? 3,
    exerciseConfigId: overrides.exerciseConfigId ?? null,
    focus: overrides.focus ?? false,
    targetRestSeconds: overrides.targetRestSeconds ?? null,
  };
}

function cloneExercise(
  exercise: WorkoutEditorExerciseValues,
): WorkoutEditorExerciseValues {
  return makeExercise(exercise);
}

function useTestForm(
  values: WorkoutEditorValues = {
    workoutName: "",
    workoutCategory: "",
    exercises: [],
  },
) {
  return useForm<WorkoutEditorValues>({ defaultValues: values });
}

function TestHarness({
  activeTab = "details",
  currentExerciseIndex = null,
  values,
  onOpenExercise = vi.fn(),
  onSetExerciseFocus = vi.fn(),
  onSetActiveTab = vi.fn(),
}: {
  activeTab?: WorkoutEditorTab;
  currentExerciseIndex?: number | null;
  values?: WorkoutEditorValues;
  onOpenExercise?: (index: number) => void;
  onSetExerciseFocus?: (index: number, focus: boolean) => void;
  onSetActiveTab?: (tab: WorkoutEditorTab) => void;
}) {
  const form = useTestForm(values);
  const [tab, setTab] = useState<WorkoutEditorTab>(activeTab);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(currentExerciseIndex);
  const [baselineExercise, setBaselineExercise] = useState<WorkoutEditorExerciseValues | null>(
    currentExerciseIndex !== null
      ? cloneExercise(form.getValues(`exercises.${currentExerciseIndex}`))
      : null,
  );
  const exercises = useWatch({
    control: form.control,
    name: "exercises",
  }) as WorkoutEditorExerciseValues[];

  const currentExercise =
    selectedIndex !== null ? exercises[selectedIndex] ?? null : null;
  const currentExerciseHasChanges =
    currentExercise !== null && JSON.stringify(currentExercise) !== JSON.stringify(baselineExercise);

  const replaceExercises = (nextExercises: WorkoutEditorExerciseValues[]) => {
    form.setValue("exercises", nextExercises, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const props: WorkoutEditorViewProps = {
    title: "Create Workout",
    subtitle: "Build your custom workout routine",
    icon: Dumbbell,
    form,
    fields: exercises.map((_, index) => ({ id: `field-${index}` })) as never,
    categoryOptions: ["Push", "Pull"],
    shouldShowError: () => false,
    stepGoalSets: (index, direction) => {
      const current = form.getValues(`exercises.${index}.goalSets`);
      form.setValue(
        `exercises.${index}.goalSets`,
        direction === "up" ? current + 1 : Math.max(1, current - 1),
        {
          shouldDirty: true,
          shouldValidate: true,
        },
      );
    },
    setExerciseFocus: onSetExerciseFocus,
    handleSubmitClick: vi.fn(),
    resetForm: vi.fn(),
    isExerciseValid: (index) => {
      const exercise = form.getValues(`exercises.${index}`);
      return exercise.identity.exerciseName.trim().length > 0 && exercise.goalSets > 0;
    },
    activeTab: tab,
    setActiveTab: (nextTab) => {
      setTab(nextTab);
      onSetActiveTab(nextTab);
    },
    exercises,
    workoutName: form.getValues("workoutName"),
    workoutCategory: form.getValues("workoutCategory"),
    currentExerciseIndex: selectedIndex ?? -1,
    currentExercise,
    shouldShowVariantInput: currentExercise?.isCustomExercise ?? false,
    suggestedExercises: [],
    canSubmit:
      form.getValues("workoutName").trim().length > 0 &&
      form.getValues("workoutCategory").trim().length > 0 &&
      exercises.length > 0 &&
      exercises.every((exercise) => exercise.identity.exerciseName.trim().length > 0 && exercise.goalSets > 0),
    currentExerciseHasChanges,
    finalSaveLabel: "Save",
    finalUndoLabel: "Reset",
    openExercise: (index) => {
      setSelectedIndex(index);
      setBaselineExercise(cloneExercise(exercises[index] ?? makeExercise()));
      setTab("exercise");
      onOpenExercise(index);
    },
    handleAddCatalogExercise: (exercise) => {
      const nextIndex = exercises.length;
      const nextExercise = makeExercise({
        identity: createExerciseIdentityDraft({
          exerciseInfoId: exercise.id,
          exerciseName: exercise.name,
          variant: "",
        }),
        goalSets: 3,
        exerciseConfigId: null,
        focus: false,
        targetRestSeconds: null,
      });
      replaceExercises([...exercises, nextExercise]);
      setSelectedIndex(nextIndex);
      setBaselineExercise(nextExercise);
      setTab("exercise");
    },
    handleAddTypedExercise: (exerciseName) => {
      const nextIndex = exercises.length;
      const nextExercise = makeExercise({
        identity: createExerciseIdentityDraft({
          exerciseName,
          variant: "",
        }),
        goalSets: 3,
        exerciseConfigId: null,
        focus: false,
        targetRestSeconds: null,
      });
      replaceExercises([...exercises, nextExercise]);
      setSelectedIndex(nextIndex);
      setBaselineExercise(nextExercise);
      setTab("exercise");
    },
    handleRemoveCurrentExercise: () => {
      if (selectedIndex === null) return;

      const nextExercises = exercises.filter((_, index) => index !== selectedIndex);
      replaceExercises(nextExercises);
      setSelectedIndex(null);
      setBaselineExercise(null);
      setTab("picker");
    },
    handleRemoveExerciseFromPicker: (index) => {
      const nextExercises = exercises.filter((_, exerciseIndex) => exerciseIndex !== index);
      replaceExercises(nextExercises);

      if (selectedIndex === index) {
        setSelectedIndex(null);
        setBaselineExercise(null);
        setTab("picker");
      } else if (selectedIndex !== null && selectedIndex > index) {
        setSelectedIndex(selectedIndex - 1);
      }
    },
    handleReorderExercises: (fromIndex, toIndex) => {
      if (fromIndex === toIndex) return;

      const nextExercises = [...exercises];
      const [moved] = nextExercises.splice(fromIndex, 1);
      if (!moved) return;

      nextExercises.splice(toIndex, 0, moved);
      replaceExercises(nextExercises);

      if (selectedIndex === fromIndex) {
        setSelectedIndex(toIndex);
      } else if (
        selectedIndex !== null &&
        fromIndex < toIndex &&
        selectedIndex > fromIndex &&
        selectedIndex <= toIndex
      ) {
        setSelectedIndex(selectedIndex - 1);
      } else if (
        selectedIndex !== null &&
        fromIndex > toIndex &&
        selectedIndex >= toIndex &&
        selectedIndex < fromIndex
      ) {
        setSelectedIndex(selectedIndex + 1);
      }
    },
  };

  return <WorkoutEditorView {...props} />;
}

async function completeDetailsStep() {
  fireEvent.change(screen.getByRole("textbox", { name: "Workout Name" }), {
    target: { value: "Push Day A" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Switch to create mode" }));
  fireEvent.change(screen.getByRole("textbox", { name: "Workout Type" }), {
    target: { value: "Push" },
  });
  fireEvent.click(screen.getByRole("tab", { name: "Picker" }));
  await screen.findByTestId("exercise-catalog-picker");
}

describe("WorkoutEditor", () => {
  it("renders the details tab and allows switching to picker", async () => {
    renderWithProviders(
      <TestHarness activeTab="details" currentExerciseIndex={null} />,
    );

    expect(screen.getByRole("tab", { name: "Initial details" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByLabelText("Workout Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Workout Type")).toBeInTheDocument();

    await completeDetailsStep();

    expect(screen.getByRole("tab", { name: "Picker" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByTestId("exercise-catalog-picker")).toBeInTheDocument();
  });

  it("adds a catalog exercise and opens the new exercise editor", async () => {
    renderWithProviders(
      <TestHarness activeTab="details" currentExerciseIndex={null} />,
    );

    await completeDetailsStep();
    fireEvent.click(screen.getByRole("button", { name: "Pick Bench Press" }));

    expect(screen.getByRole("tab", { name: "Exercise" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("heading", { name: "Current exercise" })).toBeInTheDocument();
    expect(screen.getAllByText("Bench Press").at(-1)).toBeInTheDocument();
  });

  it("lets users add a typed exercise and opens the editor immediately", async () => {
    renderWithProviders(
      <TestHarness activeTab="details" currentExerciseIndex={null} />,
    );

    await completeDetailsStep();
    fireEvent.click(screen.getByRole("button", { name: "Add Cable Press Around" }));

    expect(await screen.findByRole("tab", { name: "Exercise" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("heading", { name: "Current exercise" })).toBeInTheDocument();
    expect(screen.getByText("Cable Press Around")).toBeInTheDocument();
  });

  it("keeps catalog exercise variants locked in exercise setup", () => {
    renderWithProviders(
      <TestHarness
        activeTab="exercise"
        currentExerciseIndex={0}
        values={{
          workoutName: "Test Workout",
          workoutCategory: "Push",
          exercises: [
            makeExercise({
              identity: createExerciseIdentityDraft({
                exerciseInfoId: 1,
                exerciseName: "Bench Press",
                variant: "Barbell",
              }),
              goalSets: 3,
            }),
          ],
        }}
      />,
    );

    expect(screen.getByRole("heading", { name: "Current exercise" })).toBeInTheDocument();
    expect(screen.getByText("Bench Press")).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Variant" })).not.toBeInTheDocument();
  });

  it("supports removing the current exercise and shows the empty picker state", async () => {
    renderWithProviders(
      <TestHarness
        activeTab="picker"
        currentExerciseIndex={null}
        values={{
          workoutName: "Test Workout",
          workoutCategory: "Push",
          exercises: [
            makeExercise({
              identity: createExerciseIdentityDraft({
                exerciseInfoId: 1,
                exerciseName: "Bench Press",
                variant: "Barbell",
              }),
              goalSets: 3,
            }),
          ],
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(screen.getByRole("heading", { name: "Current exercise" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));

    expect(await screen.findByRole("tab", { name: "Picker" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText(/No exercises added yet/)).toBeInTheDocument();
  });
});
