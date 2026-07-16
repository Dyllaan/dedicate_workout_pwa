import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useExerciseInfoQuickPicks } from "@/hooks/workout/useMuscleHeatmap";
import { useResolveExerciseDefinition } from "@/hooks/workout/useResolveExerciseDefinition";
import type {
  WorkoutEditorController,
  WorkoutEditorExerciseValues,
} from "@/hooks/forms/useWorkoutEditorForm";
import { getExerciseCatalogWorkoutVariant } from "@/utils/exerciseCatalog";
import type { ExerciseInfoCatalogItem } from "@/types/Heatmap";
import type { ExerciseDefinitionResolveMatch } from "@/types/Workout";
import {
  createExerciseIdentityDraft,
  getExerciseIdentityInfoId,
  getExerciseIdentityName,
  getExerciseIdentityVariant,
  isCustomExerciseIdentity,
  sameExerciseIdentity,
  withResolvedDefinition,
} from "@/types/exerciseIdentity";

export type WorkoutEditorTab = "details" | "picker" | "exercise";

function cloneExercise(
  exercise: WorkoutEditorExerciseValues,
): WorkoutEditorExerciseValues {
  return { ...exercise, identity: { ...exercise.identity } };
}

function logWorkoutEditorEvent(
  event: string,
  details: Record<string, unknown>,
) {
  console.info("[WorkoutEditor]", event, details);
}

function areExercisesEqual(
  left: WorkoutEditorExerciseValues | null,
  right: WorkoutEditorExerciseValues | null,
) {
  if (!left || !right) return false;

  return (
    sameExerciseIdentity(left.identity, right.identity) &&
    left.goalSets === right.goalSets &&
    left.exerciseConfigId === right.exerciseConfigId &&
    left.focus === right.focus &&
    left.targetRestSeconds === right.targetRestSeconds
  );
}

function buildExerciseDraft(
  values: Partial<WorkoutEditorExerciseValues> = {},
): WorkoutEditorExerciseValues {
  return {
    identity: values.identity ?? createExerciseIdentityDraft({}),
    goalSets: values.goalSets ?? 3,
    exerciseConfigId: values.exerciseConfigId ?? null,
    focus: values.focus ?? false,
    targetRestSeconds: values.targetRestSeconds ?? null,
  };
}

function resolveTab(
  rawTab: string | null,
  validTabs: readonly WorkoutEditorTab[],
  defaultTab: WorkoutEditorTab,
) {
  if (!rawTab) return defaultTab;

  return validTabs.includes(rawTab as WorkoutEditorTab)
    ? (rawTab as WorkoutEditorTab)
    : defaultTab;
}

function remapSelectedIndexAfterRemoval(
  selectedIndex: number | null,
  removedIndex: number,
) {
  if (selectedIndex === null) return null;
  if (selectedIndex === removedIndex) return null;
  if (selectedIndex > removedIndex) return selectedIndex - 1;
  return selectedIndex;
}

function remapSelectedIndexAfterMove(
  selectedIndex: number | null,
  fromIndex: number,
  toIndex: number,
) {
  if (selectedIndex === null) return null;
  if (selectedIndex === fromIndex) return toIndex;

  if (fromIndex < toIndex && selectedIndex > fromIndex && selectedIndex <= toIndex) {
    return selectedIndex - 1;
  }

  if (fromIndex > toIndex && selectedIndex >= toIndex && selectedIndex < fromIndex) {
    return selectedIndex + 1;
  }

  return selectedIndex;
}

interface UseWorkoutEditorInput {
  editor: WorkoutEditorController;
  saveLabel?: string;
  undoLabel?: string;
}

type DefinitionChoiceState = {
  draft: WorkoutEditorExerciseValues;
  matches: ExerciseDefinitionResolveMatch[];
  suggestedDefinitionId?: string | null;
};

export function useWorkoutEditor({
  editor,
  saveLabel,
  undoLabel,
}: UseWorkoutEditorInput) {
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    form,
    fields,
    categoryOptions,
    shouldShowError,
    addExercise,
    removeExercise,
    moveExercise,
    setExerciseFocus,
    stepGoalSets,
    isExerciseValid,
    areAllExercisesValid,
    handleSubmitClick,
    resetForm,
  } = editor;

  const [selectedExerciseIndex, setSelectedExerciseIndex] = useState<number | null>(null);
  const [selectedExerciseSnapshot, setSelectedExerciseSnapshot] = useState<WorkoutEditorExerciseValues | null>(null);

  const exercises = form.watch("exercises");
  const workoutName = form.watch("workoutName");
  const workoutCategory = form.watch("workoutCategory");
  const { data: quickPickExercises = [] } = useExerciseInfoQuickPicks(10);
  const { mutateAsync: resolveExerciseDefinition, isPending: isResolvingDefinitionChoice } = useResolveExerciseDefinition();
  const [definitionChoice, setDefinitionChoice] = useState<DefinitionChoiceState | null>(null);

  const activeTab = useMemo(() => {
    const resolved = resolveTab(searchParams.get("tab"), ["details", "picker", "exercise"], "details");
    if (resolved === "exercise" && selectedExerciseIndex === null) {
      return "picker" as const;
    }
    return resolved;
  }, [searchParams, selectedExerciseIndex]);

  useEffect(() => {
    const rawTab = searchParams.get("tab");
    const resolved = resolveTab(rawTab, ["details", "picker", "exercise"], "details");
    const normalized = resolved === "exercise" && selectedExerciseIndex === null
      ? "picker"
      : resolved;

    if (rawTab !== normalized) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set("tab", normalized);
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams, selectedExerciseIndex, setSearchParams]);

  const currentExerciseIndex = selectedExerciseIndex ?? -1;
  const currentExercise =
    currentExerciseIndex >= 0 ? exercises[currentExerciseIndex] ?? null : null;
  const shouldShowVariantInput = currentExercise ? isCustomExerciseIdentity(currentExercise.identity) : false;
  const currentExerciseHasChanges = currentExercise
    ? !areExercisesEqual(currentExercise, selectedExerciseSnapshot)
    : false;
  const canSubmit =
    workoutName.trim().length > 0 &&
    workoutCategory.trim().length > 0 &&
    areAllExercisesValid();
  const finalSaveLabel = saveLabel ?? "Save";
  const finalUndoLabel = undoLabel ?? "Back";
  const suggestedExercises = useMemo(
    () =>
      quickPickExercises.filter(
        (quickPick) =>
          !exercises.some((exercise) =>
            getExerciseIdentityInfoId(exercise.identity)
              ? getExerciseIdentityInfoId(exercise.identity) === quickPick.id
              : getExerciseIdentityName(exercise.identity).trim().toLowerCase() ===
                quickPick.name.trim().toLowerCase(),
          ),
      ),
    [quickPickExercises, exercises],
  );

  const setActiveTab = useCallback(
    (tab: WorkoutEditorTab) => {
      if (activeTab === "exercise" && tab !== "exercise") {
        setSelectedExerciseSnapshot(
          currentExercise ? cloneExercise(currentExercise) : null,
        );
      }

      const nextParams = new URLSearchParams(searchParams);
      nextParams.set("tab", tab);
      setSearchParams(nextParams, { replace: true });
    },
    [activeTab, currentExercise, searchParams, setSearchParams],
  );

  const openExercise = useCallback(
    (index: number, snapshot?: WorkoutEditorExerciseValues | null) => {
      setSelectedExerciseIndex(index);
      setSelectedExerciseSnapshot(
        snapshot === undefined
          ? exercises[index]
            ? cloneExercise(exercises[index])
            : null
          : snapshot,
      );
      setActiveTab("exercise");
    },
    [exercises, setActiveTab],
  );

  const handleAddCatalogExercise = useCallback(
    async (exercise: ExerciseInfoCatalogItem) => {
      const draft = buildExerciseDraft({
        identity: createExerciseIdentityDraft({
          exerciseInfoId: exercise.id,
          exerciseName: exercise.name,
          variant: getExerciseCatalogWorkoutVariant(exercise),
        }),
      });

      logWorkoutEditorEvent("picker add catalog", {
        draft,
        currentCount: exercises.length,
        activeTab,
      });

      const resolution = await resolveExerciseDefinition({
        query: getExerciseIdentityName(draft.identity),
        exerciseInfoId: exercise.id,
        exerciseName: getExerciseIdentityName(draft.identity),
        variant: getExerciseIdentityVariant(draft.identity),
      });
      if (resolution.status === "multiple_matches") {
        setDefinitionChoice({
          draft,
          matches: resolution.matches,
          suggestedDefinitionId: resolution.suggestedDefinitionId ?? null,
        });
        return;
      }
      if (resolution.status === "single_match") {
        draft.identity = withResolvedDefinition(
          draft.identity,
          resolution.suggestedDefinitionId ?? "",
        );
      }

      const nextIndex = addExercise(draft);
      openExercise(nextIndex, draft);
    },
    [addExercise, activeTab, exercises.length, openExercise, resolveExerciseDefinition],
  );

  const handleAddTypedExercise = useCallback(
    async (exerciseName: string) => {
      const draft = buildExerciseDraft({
        identity: createExerciseIdentityDraft({
          exerciseName,
        }),
      });

      logWorkoutEditorEvent("picker add custom", {
        draft,
        currentCount: exercises.length,
        activeTab,
      });

      const resolution = await resolveExerciseDefinition({
        query: exerciseName,
        exerciseName,
        variant: null,
      });
      if (resolution.status === "multiple_matches") {
        setDefinitionChoice({
          draft,
          matches: resolution.matches,
          suggestedDefinitionId: resolution.suggestedDefinitionId ?? null,
        });
        return;
      }
      if (resolution.status === "single_match") {
        draft.identity = withResolvedDefinition(
          draft.identity,
          resolution.suggestedDefinitionId ?? "",
        );
      }

      const nextIndex = addExercise(draft);
      openExercise(nextIndex, draft);
    },
    [activeTab, addExercise, exercises.length, openExercise, resolveExerciseDefinition],
  );

  const confirmDefinitionChoice = useCallback(
    (definitionId: string) => {
      if (!definitionChoice) {
        return;
      }

      const draft = {
        ...definitionChoice.draft,
        identity: withResolvedDefinition(definitionChoice.draft.identity, definitionId),
      };
      const nextIndex = addExercise(draft);
      setDefinitionChoice(null);
      openExercise(nextIndex, draft);
    },
    [addExercise, definitionChoice, openExercise],
  );

  const closeDefinitionChoice = useCallback(() => {
    setDefinitionChoice(null);
  }, []);

  const handleRemoveExercise = useCallback(
    (index: number) => {
      removeExercise(index);
      if (selectedExerciseIndex === index) {
        setSelectedExerciseSnapshot(null);
      }
      setSelectedExerciseIndex((current) =>
        remapSelectedIndexAfterRemoval(current, index),
      );
    },
    [removeExercise, selectedExerciseIndex],
  );

  const handleRemoveCurrentExercise = useCallback(() => {
    if (currentExerciseIndex < 0) return;
    handleRemoveExercise(currentExerciseIndex);
  }, [currentExerciseIndex, handleRemoveExercise]);

  const handleReorderExercises = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex) return;

      moveExercise(fromIndex, toIndex);
      setSelectedExerciseIndex((current) =>
        remapSelectedIndexAfterMove(current, fromIndex, toIndex),
      );
    },
    [moveExercise],
  );

  const handleRemoveExerciseFromPicker = useCallback(
    (index: number) => {
      handleRemoveExercise(index);
    },
    [handleRemoveExercise],
  );

  return {
    form,
    fields,
    categoryOptions,
    shouldShowError,
    stepGoalSets,
    handleSubmitClick,
    resetForm,
    isExerciseValid,
    activeTab,
    setActiveTab,
    exercises,
    workoutName,
    workoutCategory,
    currentExerciseIndex,
    currentExercise,
    shouldShowVariantInput,
    canSubmit,
    finalSaveLabel,
    finalUndoLabel,
    suggestedExercises,
    currentExerciseHasChanges,
    definitionChoice,
    isResolvingDefinitionChoice,
    openExercise,
    handleAddCatalogExercise,
    handleAddTypedExercise,
    confirmDefinitionChoice,
    closeDefinitionChoice,
    handleRemoveCurrentExercise,
    handleRemoveExerciseFromPicker,
    handleReorderExercises,
    setExerciseFocus,
  };
}

export type WorkoutEditorState = ReturnType<typeof useWorkoutEditor>;
