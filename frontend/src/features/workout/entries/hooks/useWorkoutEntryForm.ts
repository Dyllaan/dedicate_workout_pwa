import { useNavigate } from "react-router-dom";
import { useWorkoutEntryMutations } from "@/features/workout/entries/hooks/useWorkoutEntries";
import type { WorkoutTemplate, WorkoutEntry } from "@/features/workout/types/Workout";
import { useEffect, useState, useRef, useCallback } from "react";
import {
  calculateVolume,
  calculateProgress,
  stepValue as stepValueHelper,
  addSetToList,
} from "@/features/workout/entries/utils/workoutEntryHelpers.ts";
import { enqueueSnackbar } from "notistack";
import type {
  ReadinessFormState,
  WorkoutEntryExerciseDraft,
  WorkoutEntryExerciseSuggestion,
} from "@/features/workout/entries/types/workoutEntryFormTypes";
import { DEFAULT_READINESS_FORM_STATE } from "@/features/workout/entries/types/workoutEntryFormTypes";
import type { ExerciseInfoCatalogItem } from "@/features/heatmap/types/Heatmap";
import {
  clearWorkoutEntryDraft,
  loadWorkoutEntryDraft,
  saveWorkoutEntryDraft,
} from "@/features/workout/entries/types/workoutEntryDraft";
import buildWorkoutEntryPayload from "@/features/workout/entries/utils/buildWorkoutEntryPayload";
import {
  buildSeededExerciseDraft,
  getRemainingSuggestions,
  type WorkoutEntryExerciseInput,
} from "@/features/workout/entries/utils/workoutEntrySuggestions";
import { getExerciseCatalogWorkoutVariant } from "@/features/heatmap/utils/exerciseCatalog";
import type { ReadinessCheckInRequest } from "@/features/insights/types/Insights";
import {
  createExerciseIdentityDraft,
  getExerciseIdentityName,
  getExerciseIdentityVariant,
  isCustomExerciseIdentity,
} from "@/features/workout/entries/types/ExerciseIdentity";

let _idCounter = 0;
const EXERCISE_SORT_ID_PATTERN = /^exercise-(\d+)$/;

const newSortId = () => `exercise-${++_idCounter}`;

function syncSortIdCounter(exercises: WorkoutEntryExerciseDraft[]) {
  const highestExistingId = exercises.reduce((highest, exercise) => {
    const match = EXERCISE_SORT_ID_PATTERN.exec(exercise.sortId.trim());
    if (!match) return highest;

    const numericId = Number.parseInt(match[1] ?? "", 10);
    return Number.isFinite(numericId) ? Math.max(highest, numericId) : highest;
  }, 0);

  _idCounter = Math.max(_idCounter, highestExistingId);
}

function normalizeExerciseSortIds(exercises: WorkoutEntryExerciseDraft[]) {
  syncSortIdCounter(exercises);

  const seenSortIds = new Set<string>();

  return exercises.map((exercise) => {
    const candidateSortId = exercise.sortId.trim();
    const sortId = candidateSortId.length > 0 && !seenSortIds.has(candidateSortId)
      ? candidateSortId
      : newSortId();

    seenSortIds.add(sortId);

    const goalSets =
      isCustomExerciseIdentity(exercise.identity)
        ? Math.max(1, exercise.sets.length)
        : Math.max(1, exercise.goalSets);

    const nextExercise =
      exercise.goalSets === goalSets && sortId === exercise.sortId
        ? exercise
        : { ...exercise, sortId, goalSets };

    return nextExercise;
  });
}

function shouldMirrorSetCount(exercise: WorkoutEntryExerciseDraft) {
  return isCustomExerciseIdentity(exercise.identity);
}

function isDefaultReadinessForm(readinessForm: ReadinessFormState) {
  return (
    readinessForm.sleepQuality === DEFAULT_READINESS_FORM_STATE.sleepQuality &&
    readinessForm.stressLevel === DEFAULT_READINESS_FORM_STATE.stressLevel &&
    readinessForm.sorenessLevel === DEFAULT_READINESS_FORM_STATE.sorenessLevel &&
    readinessForm.confidenceLevel === DEFAULT_READINESS_FORM_STATE.confidenceLevel
  );
}

export function useWorkoutEntryForm(
  workoutTemplate: WorkoutTemplate,
  lastEntry: WorkoutEntry | null,
) {
  const navigate = useNavigate();
  const { createWorkoutEntry } = useWorkoutEntryMutations();

  const [exerciseData, setExerciseData] = useState<WorkoutEntryExerciseDraft[]>([]);
  const [readinessForm, setReadinessForm] = useState<ReadinessFormState>(
    DEFAULT_READINESS_FORM_STATE,
  );
  const [readinessIncluded, setReadinessIncluded] = useState(true);
  const [remainingSuggestions, setRemainingSuggestions] = useState<WorkoutEntryExerciseSuggestion[]>([]);

  const submittedRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exerciseDataRef = useRef(exerciseData);
  const [submitting, setSubmitting] = useState(false);
  exerciseDataRef.current = exerciseData;

  useEffect(() => {
    const draft = loadWorkoutEntryDraft(workoutTemplate.id);
    if (draft) {
      setExerciseData(normalizeExerciseSortIds(draft.exerciseData));
      setReadinessForm(draft.readiness ?? DEFAULT_READINESS_FORM_STATE);
      setReadinessIncluded(draft.readinessIncluded);
      enqueueSnackbar("Draft restored from your last session.", { variant: "info" });
    } else {
      setExerciseData([]);
      setReadinessForm(DEFAULT_READINESS_FORM_STATE);
      setReadinessIncluded(true);
    }
    submittedRef.current = false;
  }, [workoutTemplate.id]);

  useEffect(() => {
    const shouldPersistDraft =
      exerciseData.length > 0 || !isDefaultReadinessForm(readinessForm) || !readinessIncluded;

    if (!shouldPersistDraft) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(() => {
      saveWorkoutEntryDraft(workoutTemplate.id, {
        exerciseData,
        readiness: readinessForm,
        readinessIncluded,
        workoutTemplateName: workoutTemplate.name,
      });
    }, 800);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

      if (!submittedRef.current && shouldPersistDraft) {
        saveWorkoutEntryDraft(workoutTemplate.id, {
          exerciseData,
          readiness: readinessForm,
          readinessIncluded,
          workoutTemplateName: workoutTemplate.name,
        });
      }
    };
  }, [exerciseData, readinessForm, readinessIncluded, workoutTemplate.id, workoutTemplate.name]);

  useEffect(() => {
    setRemainingSuggestions(
      getRemainingSuggestions(workoutTemplate.exercises, exerciseData, lastEntry),
    );
  }, [workoutTemplate.exercises, exerciseData, lastEntry]);

  const updateExercise = useCallback(
    (exerciseIdx: number, updater: (data: WorkoutEntryExerciseDraft) => WorkoutEntryExerciseDraft) => {
      setExerciseData((previous) =>
        previous.map((item, idx) => (idx === exerciseIdx ? updater(item) : item)),
      );
    },
    [],
  );

  const handleNameChange = useCallback(
    (exerciseIdx: number, field: "exerciseName" | "variant", value: string) => {
      updateExercise(exerciseIdx, (data) => ({
        ...data,
        identity:
          field === "exerciseName"
            ? createExerciseIdentityDraft({
                exerciseDefinitionId: null,
                exerciseInfoId: null,
                exerciseName: value,
                variant: getExerciseIdentityVariant(data.identity),
              })
            : createExerciseIdentityDraft({
                exerciseDefinitionId: null,
                exerciseInfoId: null,
                exerciseName: getExerciseIdentityName(data.identity),
                variant: value,
              }),
      }));
    },
    [updateExercise],
  );

  const handleSetChange = useCallback(
    (
      exerciseIdx: number,
      setIdx: number,
      field: "reps" | "weight" | "rpe" | "notes" | "setRole" | "restBeforeSeconds",
      value: string,
    ) => {
      updateExercise(exerciseIdx, (data) => ({
        ...data,
        sets: data.sets.map((set, idx) => (idx === setIdx ? { ...set, [field]: value } : set)),
      }));
    },
    [updateExercise],
  );

  const stepValue = useCallback(
    (
      exerciseIdx: number,
      setIdx: number,
      field: "reps" | "weight",
      direction: "up" | "down",
    ) => {
      updateExercise(exerciseIdx, (data) => ({
        ...data,
        sets: stepValueHelper(data.sets, setIdx, field, direction),
      }));
    },
    [updateExercise],
  );

  const addSet = useCallback(
    (exerciseIdx: number) => {
      updateExercise(exerciseIdx, (data) => {
        const nextSets = addSetToList(data.sets);

        return {
          ...data,
          sets: nextSets,
          goalSets: shouldMirrorSetCount(data) ? nextSets.length : data.goalSets,
        };
      });
    },
    [updateExercise],
  );

  const removeSet = useCallback(
    (exerciseIdx: number, setIdx: number) => {
      updateExercise(exerciseIdx, (data) => {
        if (data.sets.length <= 1) return data;
        const nextSets = data.sets.filter((_, idx) => idx !== setIdx);
        return {
          ...data,
          sets: nextSets,
          goalSets: shouldMirrorSetCount(data) ? nextSets.length : data.goalSets,
        };
      });
    },
    [updateExercise],
  );

  const copyFromPrevious = useCallback(
    (exerciseIdx: number, setIdx: number) => {
      if (setIdx === 0) return;
      updateExercise(exerciseIdx, (data) => ({
        ...data,
        sets: data.sets.map((set, idx) =>
          idx === setIdx ? { ...data.sets[setIdx - 1] } : set
        ),
      }));
    },
    [updateExercise],
  );

  const removeExercise = useCallback((exerciseIdx: number) => {
    setExerciseData((previous) => previous.filter((_, idx) => idx !== exerciseIdx));
  }, []);

  const moveExercise = useCallback((fromIndex: number, toIndex: number) => {
    setExerciseData((previous) => {
      if (fromIndex === toIndex) return previous;
      if (fromIndex < 0 || toIndex < 0) return previous;
      if (fromIndex >= previous.length || toIndex >= previous.length) return previous;

      const next = [...previous];
      const [movedExercise] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, movedExercise);
      return next;
    });
  }, []);

  const fillLastSession = useCallback(
    (exerciseIdx: number) => {
      updateExercise(exerciseIdx, (data) => ({
        ...data,
        sets: data.sets.map((set) => ({
          ...set,
          reps: set.lastReps != null ? String(set.lastReps) : set.reps,
          weight: set.lastWeight != null ? String(set.lastWeight) : set.weight,
        })),
      }));
    },
    [updateExercise],
  );

  const setAllSetsWeight = useCallback(
    (exerciseIdx: number, weight: string) => {
      updateExercise(exerciseIdx, (data) => ({
        ...data,
        sets: data.sets.map((set) => ({ ...set, weight })),
      }));
    },
    [updateExercise],
  );

  const setAllSetsReps = useCallback(
    (exerciseIdx: number, reps: string) => {
      updateExercise(exerciseIdx, (data) => ({
        ...data,
        sets: data.sets.map((set) => ({ ...set, reps })),
      }));
    },
    [updateExercise],
  );

  const addCustomExercise = useCallback(
    (exerciseConfig: WorkoutEntryExerciseInput): { sortId: string; index: number } => {
      syncSortIdCounter(exerciseDataRef.current);
      const sortId = newSortId();
      const seededExercise = buildSeededExerciseDraft(exerciseConfig, lastEntry, sortId);
      const index = exerciseDataRef.current.length;

      setExerciseData((previous) => {
        const nextExercise = shouldMirrorSetCount(seededExercise)
          ? { ...seededExercise, goalSets: seededExercise.sets.length }
          : seededExercise;

        return [...previous, nextExercise];
      });

      return { sortId, index };
    },
    [lastEntry],
  );

  const linkExerciseToCatalog = useCallback(
    (exerciseIdx: number, exercise: ExerciseInfoCatalogItem) => {
      updateExercise(exerciseIdx, (data) => ({
        ...data,
        identity: createExerciseIdentityDraft({
          exerciseInfoId: exercise.id,
          exerciseName: exercise.name,
          variant: getExerciseCatalogWorkoutVariant(exercise) || null,
        }),
      }));
    },
    [updateExercise],
  );

  const convertExerciseToCustom = useCallback(
    (exerciseIdx: number) => {
      updateExercise(exerciseIdx, (data) => ({
        ...data,
        identity: createExerciseIdentityDraft({
          exerciseName: getExerciseIdentityName(data.identity),
          variant: getExerciseIdentityVariant(data.identity),
        }),
        goalSets: data.sets.length,
      }));
    },
    [updateExercise],
  );

  const handleReadinessChange = useCallback(
    (field: keyof ReadinessFormState, value: number) => {
      setReadinessForm((current) => ({ ...current, [field]: value }));
    },
    [],
  );

  const handleReadinessSave = useCallback(() => {
    setReadinessIncluded(true);
  }, []);

  const handleReadinessSkip = useCallback(() => {
    setReadinessIncluded(false);
  }, []);

  const handleSubmit = async (readiness?: ReadinessCheckInRequest | null) => {
    setSubmitting(true);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    const entryPayload = buildWorkoutEntryPayload(workoutTemplate.id, exerciseData, readiness ?? null);

    try {
      await createWorkoutEntry(entryPayload);
      clearWorkoutEntryDraft(workoutTemplate.id);
      submittedRef.current = true;
      navigate(`/workout/${workoutTemplate.id}`);
      enqueueSnackbar("Workout entry saved successfully!", { variant: "success" });
    } catch {
      enqueueSnackbar("Failed to save workout entry. Please try again.", { variant: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return {
    exerciseData,
    setExerciseData,
    readinessForm,
    readinessIncluded,
    handleReadinessChange,
    handleReadinessSave,
    handleReadinessSkip,
    handleSetChange,
    handleNameChange,
    stepValue,
    addSet,
    removeSet,
    copyFromPrevious,
    addCustomExercise,
    handleSubmit,
    calculateVolume,
    calculateProgress,
    remainingSuggestions,
    removeExercise,
    moveExercise,
    linkExerciseToCatalog,
    convertExerciseToCustom,
    fillLastSession,
    setAllSetsWeight,
    setAllSetsReps,
    submitting,
  };
}