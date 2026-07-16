import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { ExerciseFormData } from "@/hooks/forms/workoutEntryFormTypes";

export type WorkoutEntryTab = "view" | "readiness" | "exercise" | "finish";

type WorkoutEntryTabsOptions = {
  includeFinish?: boolean;
  finishDisabled?: boolean;
};

type PreferredSelection = {
  exerciseId: string;
  preferredIndex: number;
};

function resolveTab(
  rawTab: string | null,
  includeFinish: boolean,
  hasExercises: boolean,
  finishDisabled: boolean,
): WorkoutEntryTab {
  const candidate =
    rawTab === "view" ||
    rawTab === "readiness" ||
    rawTab === "exercise" ||
    (includeFinish && rawTab === "finish")
      ? rawTab
      : "view";

  if (candidate === "exercise" && !hasExercises) {
    return "view";
  }

  if (candidate === "finish" && finishDisabled) {
    return "view";
  }

  return candidate;
}

function findExerciseIndex(
  exercises: ExerciseFormData[],
  exerciseId: string | null,
  preferredSelection: PreferredSelection | null,
) {
  if (preferredSelection) {
    const preferredExercise = exercises[preferredSelection.preferredIndex] ?? null;
    if (preferredExercise && preferredExercise.sortId === preferredSelection.exerciseId) {
      return preferredSelection.preferredIndex;
    }
  }

  if (!exerciseId) return -1;

  return exercises.findIndex((exercise) => exercise.sortId === exerciseId);
}

export function useWorkoutEntryTabs(
  exercises: ExerciseFormData[],
  { includeFinish = true, finishDisabled = false }: WorkoutEntryTabsOptions = {},
) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [preferredSelection, setPreferredSelection] = useState<PreferredSelection | null>(null);
  const rawExerciseId = searchParams.get("exerciseId");
  const latestExerciseIndex = exercises.length > 0 ? exercises.length - 1 : -1;
  const latestExercise = latestExerciseIndex >= 0 ? exercises[latestExerciseIndex] ?? null : null;

  const activeTab = useMemo(
    () =>
      resolveTab(
        searchParams.get("tab"),
        includeFinish,
        exercises.length > 0,
        finishDisabled || !includeFinish,
      ),
    [exercises.length, finishDisabled, includeFinish, searchParams],
  );

  const matchedExerciseIndex = useMemo(
    () => findExerciseIndex(exercises, rawExerciseId, preferredSelection),
    [exercises, preferredSelection, rawExerciseId],
  );

  const activeExerciseIndex = useMemo(() => {
    if (activeTab !== "exercise") {
      return -1;
    }

    if (matchedExerciseIndex >= 0) {
      return matchedExerciseIndex;
    }

    return latestExerciseIndex;
  }, [activeTab, latestExerciseIndex, matchedExerciseIndex]);

  const activeExercise =
    activeExerciseIndex >= 0 ? exercises[activeExerciseIndex] ?? null : null;
  const selectedExerciseId = activeExercise?.sortId ?? null;

  const setActiveTab = useCallback(
    (tab: WorkoutEntryTab) => {
      if (tab === "exercise" && exercises.length === 0) return;
      if (tab === "finish" && (finishDisabled || !includeFinish)) return;

      const nextParams = new URLSearchParams(searchParams);
      nextParams.set("tab", tab);

      if (tab === "exercise") {
        const nextExercise = activeExercise ?? latestExercise;
        if (nextExercise) {
          nextParams.set("exerciseId", nextExercise.sortId);
        } else {
          nextParams.delete("exerciseId");
        }
      } else if (tab === "readiness") {
        nextParams.delete("exerciseId");
      }

      setSearchParams(nextParams, { replace: true });
    },
    [
      activeExercise,
      exercises.length,
      finishDisabled,
      includeFinish,
      latestExercise,
      searchParams,
      setSearchParams,
    ],
  );

  const openExerciseById = useCallback(
    (exerciseId: string, nextPreferredIndex?: number) => {
      if (nextPreferredIndex != null) {
        setPreferredSelection({ exerciseId, preferredIndex: nextPreferredIndex });
      }

      const nextParams = new URLSearchParams(searchParams);
      nextParams.set("tab", "exercise");
      nextParams.set("exerciseId", exerciseId);
      setSearchParams(nextParams, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const openExerciseAtIndex = useCallback(
    (index: number) => {
      const exercise = exercises[index];
      if (!exercise) return;

      openExerciseById(exercise.sortId, index);
    },
    [exercises, openExerciseById],
  );

  const openLatestExercise = useCallback(() => {
    if (!latestExercise) return;
    openExerciseById(latestExercise.sortId, latestExerciseIndex);
  }, [latestExercise, latestExerciseIndex, openExerciseById]);

  const handleExerciseRemoved = useCallback(
    (removedIndex: number) => {
      const removedExercise = exercises[removedIndex] ?? null;
      if (!removedExercise) return;

      if (preferredSelection) {
        if (preferredSelection.preferredIndex === removedIndex) {
          setPreferredSelection(null);
        } else if (removedIndex < preferredSelection.preferredIndex) {
          setPreferredSelection({
            exerciseId: preferredSelection.exerciseId,
            preferredIndex: preferredSelection.preferredIndex - 1,
          });
        }
      }

      if (activeTab !== "exercise" || activeExerciseIndex !== removedIndex) {
        return;
      }

      const fallbackIndex =
        removedIndex > 0 ? removedIndex - 1 : exercises[removedIndex + 1] ? removedIndex + 1 : -1;

      if (fallbackIndex >= 0) {
        const fallbackExercise = exercises[fallbackIndex] ?? null;
        if (fallbackExercise) {
          openExerciseById(fallbackExercise.sortId, fallbackIndex);
          return;
        }
      }

      const nextParams = new URLSearchParams(searchParams);
      nextParams.set("tab", "view");
      nextParams.delete("exerciseId");
      setSearchParams(nextParams, { replace: true });
    },
    [
      activeExerciseIndex,
      activeTab,
      exercises,
      openExerciseById,
      preferredSelection,
      searchParams,
      setSearchParams,
    ],
  );

  const handleExerciseReordered = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;

    setPreferredSelection((currentSelection) => {
      if (!currentSelection) return currentSelection;

      let nextPreferredIndex = currentSelection.preferredIndex;

      if (currentSelection.preferredIndex === fromIndex) {
        nextPreferredIndex = toIndex;
      } else if (
        fromIndex < currentSelection.preferredIndex &&
        toIndex >= currentSelection.preferredIndex
      ) {
        nextPreferredIndex = currentSelection.preferredIndex - 1;
      } else if (
        fromIndex > currentSelection.preferredIndex &&
        toIndex <= currentSelection.preferredIndex
      ) {
        nextPreferredIndex = currentSelection.preferredIndex + 1;
      }

      return nextPreferredIndex === currentSelection.preferredIndex
        ? currentSelection
        : {
            exerciseId: currentSelection.exerciseId,
            preferredIndex: nextPreferredIndex,
          };
    });
  }, []);

  useEffect(() => {
    if (activeExerciseIndex >= 0 && activeExercise) {
      setPreferredSelection({
        exerciseId: activeExercise.sortId,
        preferredIndex: activeExerciseIndex,
      });
    } else if (activeTab !== "exercise") {
      setPreferredSelection(null);
    }
  }, [activeExercise, activeExerciseIndex, activeTab]);

  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams);
    let shouldUpdate = false;

    if (nextParams.get("tab") !== activeTab) {
      nextParams.set("tab", activeTab);
      shouldUpdate = true;
    }

    if (activeTab === "exercise") {
      if (selectedExerciseId) {
        if (nextParams.get("exerciseId") !== selectedExerciseId) {
          nextParams.set("exerciseId", selectedExerciseId);
          shouldUpdate = true;
        }
      } else if (nextParams.has("exerciseId")) {
        nextParams.delete("exerciseId");
        shouldUpdate = true;
      }
    } else if (activeTab === "readiness" && nextParams.has("exerciseId")) {
      nextParams.delete("exerciseId");
      shouldUpdate = true;
    } else if (rawExerciseId && matchedExerciseIndex < 0 && nextParams.has("exerciseId")) {
      nextParams.delete("exerciseId");
      shouldUpdate = true;
    }

    if (shouldUpdate) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [
    activeTab,
    matchedExerciseIndex,
    rawExerciseId,
    searchParams,
    selectedExerciseId,
    setSearchParams,
  ]);

  return {
    activeTab,
    activeExercise,
    activeExerciseIndex,
    openExerciseAtIndex,
    openExerciseById,
    openLatestExercise,
    selectedExerciseId,
    setActiveTab,
    handleExerciseRemoved,
    handleExerciseReordered,
  };
}
