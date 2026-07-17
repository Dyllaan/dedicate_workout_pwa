import { useEffect, useState } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useForm, useWatch } from "react-hook-form";
import { Dumbbell } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import { WorkoutEditorView, type WorkoutEditorViewProps } from "@/features/workout/templates/components/WorkoutEditorView";
import type {
  WorkoutEditorExerciseValues,
  WorkoutEditorValues,
} from "@/features/workout/templates/hooks/useWorkoutEditorForm";
import type { WorkoutEditorTab } from "@/features/workout/templates/hooks/useWorkoutEditor";
import { createExerciseIdentityDraft, isCustomExerciseIdentity } from "@/features/workout/entries/types/ExerciseIdentity";

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
      <button type="button" onClick={() => onUseTypedQuery?.("Custom Press")}>
        Add Custom Press
      </button>
    </div>
  ),
}));

function makeExercise(
  overrides: Partial<WorkoutEditorExerciseValues> = {},
): WorkoutEditorExerciseValues {
  return {
    identity: overrides.identity ?? createExerciseIdentityDraft({}),
    goalSets: overrides.goalSets ?? 3,
    exerciseConfigId: overrides.exerciseConfigId ?? null,
    focus: overrides.focus ?? false,
    targetRestSeconds: overrides.targetRestSeconds ?? null,
  };
}

function useTestForm(
  values: WorkoutEditorValues = {
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
      makeExercise({
        identity: createExerciseIdentityDraft({
          exerciseInfoId: 2,
          exerciseName: "Squat",
          variant: "Back",
        }),
        goalSets: 4,
      }),
    ],
  },
) {
  return useForm<WorkoutEditorValues>({ defaultValues: values });
}

function TestHarness({
  activeTab = "details",
  currentExerciseIndex = null,
  values,
  onSelectExercise = vi.fn(),
  onOpenExercise = vi.fn(),
  onSetExerciseFocus = vi.fn(),
  onSetActiveTab = vi.fn(),
}: {
  activeTab?: WorkoutEditorTab;
  currentExerciseIndex?: number | null;
  values?: WorkoutEditorValues;
  onSelectExercise?: (index: number) => void;
  onOpenExercise?: (index: number) => void;
  onSetExerciseFocus?: (index: number, focus: boolean) => void;
  onSetActiveTab?: (tab: WorkoutEditorTab) => void;
}) {
  const form = useTestForm(values);
  const [tab, setTab] = useState<WorkoutEditorTab>(activeTab);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(currentExerciseIndex);
  const [baselineExercise, setBaselineExercise] = useState<WorkoutEditorExerciseValues | null>(
    currentExerciseIndex !== null ? makeExercise(form.getValues(`exercises.${currentExerciseIndex}`)) : null,
  );
  const exercises = useWatch({ control: form.control, name: "exercises" }) as WorkoutEditorExerciseValues[];
  const currentExercise =
    selectedIndex !== null ? exercises[selectedIndex] ?? null : null;
  const currentExerciseHasChanges =
    currentExercise !== null && JSON.stringify(currentExercise) !== JSON.stringify(baselineExercise);

  const props: WorkoutEditorViewProps = {
    title: "Create Workout",
    subtitle: "Build your custom workout routine",
    icon: Dumbbell,
    form,
    fields: exercises.map((_, index) => ({ id: `field-${index}` })) as never,
    categoryOptions: ["Push", "Pull"],
    shouldShowError: () => false,
    stepGoalSets: () => {},
    setExerciseFocus: onSetExerciseFocus,
    handleSubmitClick: () => {},
    resetForm: () => {},
    isExerciseValid: () => true,
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
    shouldShowVariantInput: currentExercise ? isCustomExerciseIdentity(currentExercise.identity) : false,
    suggestedExercises: [],
    canSubmit: true,
    currentExerciseHasChanges,
    finalSaveLabel: "Save",
    finalUndoLabel: "Reset",
    openExercise: (index) => {
      setSelectedIndex(index);
      setBaselineExercise(makeExercise(exercises[index] ?? undefined));
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

      form.setValue("exercises", [...exercises, nextExercise], { shouldDirty: true });
      setSelectedIndex(nextIndex);
      setBaselineExercise(nextExercise);
      setTab("exercise");
      onSelectExercise(nextIndex);
    },
    handleAddTypedExercise: (exerciseName) => {
      const nextIndex = exercises.length;
      const nextExercise = makeExercise({
        identity: createExerciseIdentityDraft({
          exerciseName,
        }),
        goalSets: 3,
        exerciseConfigId: null,
        focus: false,
        targetRestSeconds: null,
      });

      form.setValue("exercises", [...exercises, nextExercise], { shouldDirty: true });
      setSelectedIndex(nextIndex);
      setBaselineExercise(nextExercise);
      setTab("exercise");
      onSelectExercise(nextIndex);
    },
    handleRemoveCurrentExercise: () => {
      setSelectedIndex(null);
      setBaselineExercise(null);
      setTab("picker");
    },
    handleRemoveExerciseFromPicker: () => {},
    handleReorderExercises: () => {},
  };

  return <WorkoutEditorView {...props} />;
}

function SubmissionHarness({
  activeTab,
  invalidSection,
}: {
  activeTab: WorkoutEditorTab;
  invalidSection: "details" | "exercise";
}) {
  const form = useTestForm({
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
  });
  const [tab, setTab] = useState<WorkoutEditorTab>(activeTab);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(0);
  const exercises = useWatch({ control: form.control, name: "exercises" }) as WorkoutEditorExerciseValues[];
  const currentExercise =
    selectedIndex !== null ? exercises[selectedIndex] ?? null : null;
  const currentExerciseHasChanges =
    !!currentExercise &&
    JSON.stringify(currentExercise) !==
      JSON.stringify(makeExercise({
        identity: createExerciseIdentityDraft({
          exerciseInfoId: 1,
          exerciseName: "Bench Press",
          variant: "Barbell",
        }),
        goalSets: 3,
      }));
  const onSubmit = vi.fn();

  useEffect(() => {
    if (invalidSection === "details") {
      form.setValue("workoutName", "", { shouldDirty: true });
    }

    if (invalidSection === "exercise") {
      form.setValue("exercises.0.identity.exerciseName", "", { shouldDirty: true });
    }
  }, [form, invalidSection]);

  const props: WorkoutEditorViewProps = {
    title: "Create Workout",
    subtitle: "Build your custom workout routine",
    icon: Dumbbell,
    form,
    fields: exercises.map((_, index) => ({ id: `field-${index}` })) as never,
    categoryOptions: ["Push", "Pull"],
    shouldShowError: () => false,
    stepGoalSets: () => {},
    setExerciseFocus: vi.fn(),
    handleSubmitClick: () => {
      void form.handleSubmit(onSubmit)();
    },
    resetForm: () => {},
    isExerciseValid: () => true,
    activeTab: tab,
    setActiveTab: setTab,
    exercises,
    workoutName: form.getValues("workoutName"),
    workoutCategory: form.getValues("workoutCategory"),
    currentExerciseIndex: selectedIndex ?? -1,
    currentExercise,
    shouldShowVariantInput: currentExercise ? isCustomExerciseIdentity(currentExercise.identity) : false,
    suggestedExercises: [],
    canSubmit: false,
    currentExerciseHasChanges,
    finalSaveLabel: "Save",
    finalUndoLabel: "Reset",
    openExercise: (index) => {
      setSelectedIndex(index);
      setTab("exercise");
    },
    handleAddCatalogExercise: () => {},
    handleAddTypedExercise: () => {},
    handleRemoveCurrentExercise: () => {},
    handleRemoveExerciseFromPicker: () => {},
    handleReorderExercises: () => {},
  };

  return <WorkoutEditorView {...props} />;
}

describe("WorkoutEditorView", () => {
  it("renders the details panel for the initial tab", () => {
    render(<TestHarness activeTab="details" currentExerciseIndex={null} />);

    expect(screen.getByRole("tab", { name: "Initial details" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByLabelText("Workout Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Workout Type")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Exercise" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(screen.queryByTestId("exercise-catalog-picker")).not.toBeInTheDocument();
  });

  it("renders the picker panel and opens a newly added exercise", () => {
    render(<TestHarness activeTab="picker" currentExerciseIndex={0} />);

    expect(screen.getByRole("tab", { name: "Picker" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByTestId("exercise-catalog-picker")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Pick Bench Press" }));

    expect(screen.getByRole("tab", { name: "Exercise" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText("Current exercise")).toBeInTheDocument();
    expect(screen.getAllByText("Bench Press").at(-1)).toBeInTheDocument();
  });

  it("renders the current exercise panel for the selected exercise", () => {
    render(<TestHarness activeTab="exercise" currentExerciseIndex={1} />);

    expect(screen.getByRole("tab", { name: "Exercise" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText("Current exercise")).toBeInTheDocument();
    expect(screen.getByText("Squat")).toBeInTheDocument();
    expect(screen.getByLabelText("Goal Sets")).toHaveValue(4);
    expect(screen.getByRole("button", { name: "Done" })).toBeDisabled();
    expect(screen.queryByTestId("exercise-catalog-picker")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Goal Sets"), { target: { value: "5" } });

    expect(screen.getByRole("button", { name: "Done" })).not.toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Done" }));

    expect(screen.getByRole("tab", { name: "Picker" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("shows the focused badge and exposes the focus toggle in the exercise panel", () => {
    const onSetExerciseFocus = vi.fn();

    render(
      <TestHarness
        activeTab="exercise"
        currentExerciseIndex={0}
        onSelectExercise={vi.fn()}
        onOpenExercise={vi.fn()}
        onSetExerciseFocus={onSetExerciseFocus}
      />,
    );

    expect(screen.getByRole("button", { name: /mark as focus/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /mark as focus/i }));
    expect(onSetExerciseFocus).toHaveBeenCalledWith(0, true);
  });

  it("shows the focused badge in the exercise list", () => {
    render(
      <TestHarness
        activeTab="picker"
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
              focus: true,
            }),
            makeExercise({
              identity: createExerciseIdentityDraft({
                exerciseInfoId: 2,
                exerciseName: "Squat",
                variant: "Back",
              }),
              goalSets: 4,
            }),
          ],
        }}
        onSelectExercise={vi.fn()}
        onOpenExercise={vi.fn()}
      />,
    );

    expect(screen.getByText("Focused")).toBeInTheDocument();
  });

  it("marks the details tab red after a failed submission when the workout name is missing", async () => {
    render(<SubmissionHarness activeTab="details" invalidSection="details" />);

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Initial details" })).toHaveAttribute(
        "aria-invalid",
        "true",
      );
    });
  });

  it("marks the exercise tab red after a failed submission when the current exercise is invalid", async () => {
    render(<SubmissionHarness activeTab="exercise" invalidSection="exercise" />);

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Exercise" })).toHaveAttribute(
        "aria-invalid",
        "true",
      );
    });
  });
});
