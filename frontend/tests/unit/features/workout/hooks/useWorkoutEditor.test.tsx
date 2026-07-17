import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useWorkoutEditor } from "@/features/workout/templates/hooks/useWorkoutEditor";
import type {
  WorkoutEditorController,
  WorkoutEditorExerciseValues,
} from "@/features/workout/templates/hooks/useWorkoutEditorForm";
import type { ExerciseDefinitionResolveResponse } from "@/features/workout/types/Workout";
import { createExerciseIdentityDraft } from "@/features/workout/entries/types/ExerciseIdentity";

const { resolveExerciseDefinitionMock } = vi.hoisted(() => ({
  resolveExerciseDefinitionMock: vi.fn<[], Promise<ExerciseDefinitionResolveResponse>>(),
}));

vi.mock("@/features/heatmap/hooks/useMuscleHeatmap", () => ({
  useExerciseInfoQuickPicks: () => ({ data: [] }),
}));

vi.mock("@/features/workout/exercise-definitions/hooks/useResolveExerciseDefinition", () => ({
  useResolveExerciseDefinition: () => ({
    mutateAsync: resolveExerciseDefinitionMock,
    isPending: false,
  }),
}));

vi.mock("@dnd-kit/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@dnd-kit/core")>();
  return {
    ...actual,
    useSensor: vi.fn(() => ({})),
    useSensors: vi.fn((...args: unknown[]) => args),
  };
});

type ExerciseField = {
  id: string;
};

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

function makeEditorMock({
  exercises: initialExercises = [
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
  dirty = false,
} = {}) {
  let exercises = [...initialExercises];
  let fields: ExerciseField[] = exercises.map((_, index) => ({
    id: `field-${index}`,
  }));

  const form = {
    watch: vi.fn((field: string) => {
      if (field === "exercises") return exercises;
      if (field === "workoutName") return "Test Workout";
      if (field === "workoutCategory") return "Push";
      return "";
    }),
    control: {},
    formState: { isDirty: dirty },
  };

  const editor = {
    form,
    get fields() {
      return fields;
    },
    categoryOptions: ["Push", "Pull"],
    shouldShowError: vi.fn().mockReturnValue(false),
    addExercise: vi.fn((values: Partial<WorkoutEditorExerciseValues>) => {
      const nextIndex = exercises.length;
      exercises = [
        ...exercises,
        makeExercise({
          identity: values.identity ?? createExerciseIdentityDraft({}),
          goalSets: values.goalSets,
          exerciseConfigId: values.exerciseConfigId ?? null,
          focus: values.focus ?? false,
          targetRestSeconds: values.targetRestSeconds ?? null,
        }),
      ];
      fields = [...fields, { id: `field-${nextIndex}` }];
      return nextIndex;
    }),
    removeExercise: vi.fn((exerciseIndex: number) => {
      exercises = exercises.filter((_, index) => index !== exerciseIndex);
      fields = fields.filter((_, index) => index !== exerciseIndex);
    }),
    moveExercise: vi.fn((fromIndex: number, toIndex: number) => {
      const nextExercises = [...exercises];
      const [movedExercise] = nextExercises.splice(fromIndex, 1);
      nextExercises.splice(toIndex, 0, movedExercise);
      exercises = nextExercises;

      const nextFields = [...fields];
      const [movedField] = nextFields.splice(fromIndex, 1);
      nextFields.splice(toIndex, 0, movedField);
      fields = nextFields;
    }),
    stepGoalSets: vi.fn(),
    setExerciseFocus: vi.fn(),
    isExerciseValid: vi.fn().mockReturnValue(true),
    validateDetails: vi.fn().mockResolvedValue(true),
    validateExercise: vi.fn().mockResolvedValue(true),
    isExerciseBlank: vi.fn().mockReturnValue(false),
    hasValidExercise: vi.fn().mockReturnValue(true),
    areAllExercisesValid: vi.fn().mockReturnValue(true),
    handleSubmitClick: vi.fn(),
    resetForm: vi.fn(),
  } as unknown as WorkoutEditorController;

  return { editor, getExercises: () => exercises, getFields: () => fields };
}

function createWrapper(route: string = "/workout/create") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  window.history.replaceState({}, "", route);

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
}

describe("useWorkoutEditor", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/workout/create");
    resolveExerciseDefinitionMock.mockReset();
    resolveExerciseDefinitionMock.mockResolvedValue({
      status: "no_match",
      matches: [],
      suggestedDefinitionId: null,
    });
  });

  it("defaults to the details tab and normalizes a missing tab query param", async () => {
    const { editor } = makeEditorMock();
    const { result } = renderHook(() => useWorkoutEditor({ editor }), {
      wrapper: createWrapper("/workout/create"),
    });

    expect(result.current.activeTab).toBe("details");

    await waitFor(() => {
      expect(window.location.search).toContain("tab=details");
    });
  });

  it("falls back to picker when the exercise tab is requested without a selected exercise", async () => {
    const { editor } = makeEditorMock();
    const { result } = renderHook(() => useWorkoutEditor({ editor }), {
      wrapper: createWrapper("/workout/create?tab=exercise"),
    });

    await waitFor(() => {
      expect(result.current.activeTab).toBe("picker");
    });

    await waitFor(() => {
      expect(window.location.search).toContain("tab=picker");
    });
  });

  it("switches tabs through the URL state", () => {
    const { editor } = makeEditorMock();
    const { result } = renderHook(() => useWorkoutEditor({ editor }), {
      wrapper: createWrapper("/workout/create?tab=details"),
    });

    act(() => {
      result.current.setActiveTab("picker");
    });

    expect(window.location.search).toContain("tab=picker");
    expect(result.current.activeTab).toBe("picker");
  });

  it("selects an exercise from the picker and keeps it selected after save", () => {
    const { editor } = makeEditorMock();
    const { result } = renderHook(() => useWorkoutEditor({ editor }), {
      wrapper: createWrapper("/workout/create?tab=picker"),
    });

    act(() => {
      result.current.openExercise(1);
    });

    expect(result.current.activeTab).toBe("exercise");
    expect(result.current.currentExerciseIndex).toBe(1);
    expect(result.current.currentExercise?.identity.exerciseName).toBe("Squat");

    act(() => {
      result.current.handleSubmitClick();
    });

    expect(editor.handleSubmitClick).toHaveBeenCalledOnce();
    expect(result.current.activeTab).toBe("exercise");
    expect(result.current.currentExerciseIndex).toBe(1);
  });

  it("opens a new catalog exercise immediately after adding it when no reusable definition exists", async () => {
    const { editor } = makeEditorMock();
    const { result } = renderHook(() => useWorkoutEditor({ editor }), {
      wrapper: createWrapper("/workout/create?tab=picker"),
    });

    await act(async () => {
      await result.current.handleAddCatalogExercise({
        id: 99,
        name: "Deadlift",
      } as never);
    });

    expect(editor.addExercise).toHaveBeenCalledWith(
      expect.objectContaining({
        identity: createExerciseIdentityDraft({
          exerciseInfoId: 99,
          exerciseName: "Deadlift",
          variant: "",
        }),
      }),
    );
    expect(result.current.activeTab).toBe("exercise");
    expect(result.current.currentExerciseIndex).toBe(2);
    expect(result.current.currentExercise?.identity.exerciseName).toBe("Deadlift");
  });

  it("reuses a matched definition id when the resolver finds a single catalog-backed match", async () => {
    resolveExerciseDefinitionMock.mockResolvedValue({
      status: "single_match",
      suggestedDefinitionId: "definition-deadlift",
      matches: [
        {
          id: "definition-deadlift",
          exerciseName: "Deadlift",
          variant: null,
          exerciseInfoId: 99,
          mappingSource: "CATALOG",
          primaryMuscle: undefined,
          secondaryMuscles: [],
          createdAt: "2026-06-01T08:00:00Z",
          updatedAt: "2026-06-01T08:00:00Z",
          sessionCount: 4,
          lastUsedAt: "2026-07-01T08:00:00Z",
        },
      ],
    });

    const { editor } = makeEditorMock();
    const { result } = renderHook(() => useWorkoutEditor({ editor }), {
      wrapper: createWrapper("/workout/create?tab=picker"),
    });

    await act(async () => {
      await result.current.handleAddCatalogExercise({
        id: 99,
        name: "Deadlift",
      } as never);
    });

    expect(editor.addExercise).toHaveBeenCalledWith(
      expect.objectContaining({
        identity: createExerciseIdentityDraft({
          exerciseDefinitionId: "definition-deadlift",
          exerciseInfoId: 99,
          exerciseName: "Deadlift",
          variant: "",
        }),
      }),
    );
  });

  it("waits for the user to choose between multiple reusable definitions before adding a catalog exercise", async () => {
    resolveExerciseDefinitionMock.mockResolvedValue({
      status: "multiple_matches",
      suggestedDefinitionId: "definition-preferred",
      matches: [
        {
          id: "definition-preferred",
          exerciseName: "Bench Press",
          variant: "Barbell",
          exerciseInfoId: 1,
          mappingSource: "CATALOG",
          primaryMuscle: undefined,
          secondaryMuscles: [],
          createdAt: "2026-06-01T08:00:00Z",
          updatedAt: "2026-06-01T08:00:00Z",
          sessionCount: 5,
          lastUsedAt: "2026-07-01T08:00:00Z",
        },
        {
          id: "definition-secondary",
          exerciseName: "Bench Press",
          variant: "Paused",
          exerciseInfoId: 1,
          mappingSource: "CATALOG",
          primaryMuscle: undefined,
          secondaryMuscles: [],
          createdAt: "2026-05-01T08:00:00Z",
          updatedAt: "2026-05-01T08:00:00Z",
          sessionCount: 1,
          lastUsedAt: "2026-06-01T08:00:00Z",
        },
      ],
    });

    const { editor } = makeEditorMock();
    const { result } = renderHook(() => useWorkoutEditor({ editor }), {
      wrapper: createWrapper("/workout/create?tab=picker"),
    });

    await act(async () => {
      await result.current.handleAddCatalogExercise({
        id: 1,
        name: "Bench Press",
        equipment: "Barbell",
      } as never);
    });

    expect(editor.addExercise).not.toHaveBeenCalled();
    expect(result.current.definitionChoice).not.toBeNull();
    expect(result.current.definitionChoice?.matches).toHaveLength(2);

    act(() => {
      result.current.confirmDefinitionChoice("definition-secondary");
    });

    expect(editor.addExercise).toHaveBeenCalledWith(
      expect.objectContaining({
        identity: createExerciseIdentityDraft({
          exerciseDefinitionId: "definition-secondary",
          exerciseInfoId: 1,
          exerciseName: "Bench Press",
          variant: "Barbell",
        }),
      }),
    );
  });

  it("adds a fresh row when the same catalog exercise is picked again", async () => {
    const { editor } = makeEditorMock({
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
    const { result } = renderHook(() => useWorkoutEditor({ editor }), {
      wrapper: createWrapper("/workout/create?tab=picker"),
    });

    await act(async () => {
      await result.current.handleAddCatalogExercise({
        id: 101,
        name: "Bench Press",
        equipment: "Barbell",
      } as never);
    });

    expect(editor.addExercise).toHaveBeenCalledWith(
      expect.objectContaining({
        identity: createExerciseIdentityDraft({
          exerciseInfoId: 101,
          exerciseName: "Bench Press",
          variant: "Barbell",
        }),
        exerciseConfigId: null,
        targetRestSeconds: null,
      }),
    );
    expect(result.current.activeTab).toBe("exercise");
    expect(result.current.currentExerciseIndex).toBe(1);
    expect(result.current.currentExercise?.identity.exerciseName).toBe("Bench Press");
    expect(result.current.currentExerciseHasChanges).toBe(false);
  });

  it("opens a newly added custom exercise immediately when no reusable definition exists", async () => {
    const { editor } = makeEditorMock();
    const { result } = renderHook(() => useWorkoutEditor({ editor }), {
      wrapper: createWrapper("/workout/create?tab=picker"),
    });

    await act(async () => {
      await result.current.handleAddTypedExercise("Overhead Press");
    });

    expect(editor.addExercise).toHaveBeenCalledWith(
      expect.objectContaining({
        identity: createExerciseIdentityDraft({
          exerciseName: "Overhead Press",
          variant: null,
        }),
        exerciseConfigId: null,
        targetRestSeconds: null,
      }),
    );
    expect(result.current.activeTab).toBe("exercise");
    expect(result.current.currentExerciseIndex).toBe(2);
    expect(result.current.currentExercise?.identity.exerciseName).toBe("Overhead Press");
    expect(result.current.currentExerciseHasChanges).toBe(false);
  });

  it("removes the current exercise and falls back to picker", () => {
    const { editor } = makeEditorMock();
    const { result } = renderHook(() => useWorkoutEditor({ editor }), {
      wrapper: createWrapper("/workout/create?tab=exercise"),
    });

    act(() => {
      result.current.openExercise(1);
    });

    act(() => {
      result.current.handleRemoveCurrentExercise();
    });

    expect(editor.removeExercise).toHaveBeenCalledWith(1);
    expect(result.current.activeTab).toBe("picker");
    expect(result.current.currentExercise).toBeNull();
  });

  it("keeps the same exercise selected when removing an item before it", () => {
    const { editor } = makeEditorMock();
    const { result } = renderHook(() => useWorkoutEditor({ editor }), {
      wrapper: createWrapper("/workout/create?tab=picker"),
    });

    act(() => {
      result.current.openExercise(1);
    });

    act(() => {
      result.current.handleRemoveExerciseFromPicker(0);
    });

    expect(result.current.currentExerciseIndex).toBe(0);
    expect(result.current.currentExercise?.identity.exerciseName).toBe("Squat");
  });

  it("keeps the selected exercise aligned after reordering", () => {
    const { editor } = makeEditorMock();
    const { result } = renderHook(() => useWorkoutEditor({ editor }), {
      wrapper: createWrapper("/workout/create?tab=picker"),
    });

    act(() => {
      result.current.openExercise(1);
    });

    act(() => {
      result.current.handleReorderExercises(1, 0);
    });

    expect(editor.moveExercise).toHaveBeenCalledWith(1, 0);
    expect(result.current.currentExerciseIndex).toBe(0);
    expect(result.current.currentExercise?.identity.exerciseName).toBe("Squat");
  });
});
