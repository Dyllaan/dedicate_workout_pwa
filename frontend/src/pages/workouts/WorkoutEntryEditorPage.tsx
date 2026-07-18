import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Dumbbell } from "lucide-react";
import Page from "@/components/layout/frames/Page";
import ErrorState from "@/components/layout/feedback/ErrorState";
import Section from "@/components/layout/section/Section";
import LoadingState from "@/components/layout/feedback/LoadingState";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentWeek } from "@/features/periodisation/week/components/useCurrentWeek";
import useWorkoutContext from "@/features/workout/hooks/useWorkoutContext";
import useWorkoutEntryContext from "@/features/workout/entries/hooks/useWorkoutEntryContext";
import { useWorkoutEntryForm } from "@/features/workout/entries/hooks/useWorkoutEntryForm";
import { useResolveExerciseDefinition } from "@/features/workout/exercise-definitions/hooks/useResolveExerciseDefinition";
import type { WorkoutEntryExerciseDraft } from "@/features/workout/entries/types/workoutEntryFormTypes";
import type { ExerciseInfoCatalogItem } from "@/features/heatmap/types/Heatmap";
import type { ExerciseDefinitionResolveMatch } from "@/features/workout/types/Workout";
import type { WorkoutEntry, WorkoutTemplate, UpdateWorkoutEntryRequest } from "@/features/workout/types/Workout";
import { getExerciseCatalogWorkoutVariant } from "@/features/heatmap/utils/exerciseCatalog";
import { ICONS } from "@/config/iconConfig";
import { stepValue as stepValueHelper, addSetToList } from "@/features/workout/entries/utils/workoutEntryHelpers";
import { useWorkoutSettings } from "@/features/workout/hooks/useWorkoutSettings";
import AddExerciseStep from "@/features/workout/entries/components/panels/AddExerciseStep";
import ExerciseDefinitionChoiceDialog from "@/features/workout/components/ExerciseDefinitionChoiceDialog";
import { WorkoutEntryExerciseDetail } from "@/features/workout/entries/components/panels/WorkoutEntryExerciseDetail";
import type { WorkoutEntryTab } from "../../features/workout/entries/hooks/useWorkoutEntryTabs";
import { useWorkoutEntryTabs } from "../../features/workout/entries/hooks/useWorkoutEntryTabs";
import {
  getRemainingSuggestions,
  type WorkoutEntryExerciseInput,
} from "@/features/workout/entries/utils/workoutEntrySuggestions";
import WorkoutEntryShell from "@/features/workout/entries/components/shell/WorkoutEntryShell";
import FinishEntryPanel from "@/features/workout/entries/components/panels/FinishEntryPanel";
import WorkoutEntryReadinessPanel from "@/features/workout/entries/components/panels/WorkoutEntryReadinessPanel";
import {
  createExerciseIdentityDraft,
  getExerciseIdentityVariant,
  isCustomExerciseIdentity,
  toCreatePayloadFields,
  withResolvedDefinition,
} from "@/features/workout/entries/types/ExerciseIdentity";
import {
  getWorkoutEntryExerciseName,
  getWorkoutEntryExerciseVariant,
} from "@/features/workout/entries/types/workoutEntryFormTypes";
import { matchesTemplateFocus } from "@/features/workout/entries/utils/templateFocus";
import { useLiftSummaryWithEnabled } from "@/features/insights/hooks/useTrainingInsights";

function mapEntryToFormData(workoutEntry: WorkoutEntry): WorkoutEntryExerciseDraft[] {
  return workoutEntry.exercises.map((exercise) => ({
    sortId: exercise.id,
    identity: createExerciseIdentityDraft({
      exerciseDefinitionId: exercise.exerciseDefinitionId ?? null,
      exerciseInfoId: exercise.exerciseInfoId ?? null,
      exerciseName: exercise.loggedExerciseName ?? exercise.exerciseName ?? "",
      variant: exercise.loggedVariant ?? exercise.variant ?? null,
    }),
    goalSets: exercise.exerciseInfoId == null ? exercise.sets.length : exercise.goalSets ?? 3,
    sets: exercise.sets.map((set) => ({
      reps: set.reps > 0 ? String(set.reps) : "",
      weight: set.weight != null ? String(set.weight) : "",
      rpe: String(set.rpe),
      notes: set.notes ?? "",
      setRole: set.setRole ?? null,
      restBeforeSeconds: set.restBeforeSeconds != null ? String(set.restBeforeSeconds) : "",
      lastReps: undefined,
      lastWeight: undefined,
    })),
  }));
}

function areExerciseEntriesEqual(left: WorkoutEntryExerciseDraft[], right: WorkoutEntryExerciseDraft[]) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function buildUpdateRequest(
  exerciseData: WorkoutEntryExerciseDraft[],
  notes: string,
): UpdateWorkoutEntryRequest {
  return {
    exercises: exerciseData.map((exercise) => ({
      exerciseDefinitionId: toCreatePayloadFields(exercise.identity).exerciseDefinitionId ?? undefined,
      exerciseName: toCreatePayloadFields(exercise.identity).exerciseName,
      variant: toCreatePayloadFields(exercise.identity).variant ?? undefined,
      goalSets: isCustomExerciseIdentity(exercise.identity) ? exercise.sets.length : exercise.goalSets,
      exerciseInfoId: toCreatePayloadFields(exercise.identity).exerciseInfoId ?? undefined,
      sets: exercise.sets
        .filter((set) => parseInt(set.reps) > 0)
        .map(({ reps, weight, rpe, notes: setNotes, setRole, restBeforeSeconds }) => ({
          reps: parseInt(reps),
          weight: weight ? parseFloat(weight) : undefined,
          rpe: parseFloat(rpe) || 7,
          notes: setNotes || undefined,
          setRole: setRole ?? undefined,
          restBeforeSeconds: restBeforeSeconds ? parseInt(restBeforeSeconds) : undefined,
        })),
    })),
    notes: notes || undefined,
  };
}

function getDefaultSet(): WorkoutEntryExerciseDraft["sets"][number] {
  return {
    reps: "",
    weight: "",
    rpe: "7",
    notes: "",
    setRole: null,
    restBeforeSeconds: "",
  };
}

function buildCreateTabs(exerciseData: WorkoutEntryExerciseDraft[], isValid: boolean) {
  return [
    { key: "view" as WorkoutEntryTab, label: "Workout" },
    { key: "readiness" as WorkoutEntryTab, label: "Readiness" },
    { key: "exercise" as WorkoutEntryTab, label: "Exercise", disabled: exerciseData.length === 0 },
    { key: "finish" as WorkoutEntryTab, label: "Finish", disabled: !isValid },
  ];
}

function buildEditTabs(exerciseData: WorkoutEntryExerciseDraft[]) {
  return [
    { key: "view" as WorkoutEntryTab, label: "Workout" },
    { key: "exercise" as WorkoutEntryTab, label: "Exercise", disabled: exerciseData.length === 0 },
  ];
}

type SearchExerciseDraftInput = WorkoutEntryExerciseInput;

type PendingDefinitionChoice = {
  draft: SearchExerciseDraftInput;
  title: string;
  matches: ExerciseDefinitionResolveMatch[];
  suggestedDefinitionId?: string | null;
};

function CreateWorkoutEntryPage() {
  const { workoutTemplate, lastEntry, isLoading } = useWorkoutContext();
  const navigate = useNavigate();

  if (isLoading) {
    return <WorkoutEntryPageLoading title="Loading workout" subtitle="Preparing your session so you can start logging." />;
  }

  if (!workoutTemplate) {
    return (
      <Page
        icon={ICONS.workout}
        title="Workout not found"
        subtitle="We couldn't load this workout template."
      >
        <ErrorState
          title="We couldn't load this workout template."
          description="Return to your workouts and choose a valid template before starting a session."
          icon={ICONS.workout}
          action={
            <Button icon={undefined} onClick={() => navigate("/workouts")}>
              Back to workouts
            </Button>
          }
        />
      </Page>
    );
  }

  return <CreateWorkoutEntryContent workoutTemplate={workoutTemplate} lastEntry={lastEntry} />;
}

function WorkoutEntryPageLoading({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <Page icon={ICONS.workout} title={title} subtitle={subtitle}>
      <Section title="Workout overview" subtitle="Loading workout entry details">
        <LoadingState rows={2} />
      </Section>
      <Section title="Exercises" subtitle="Loading exercises and set targets">
        <LoadingState rows={4} />
      </Section>
      <Section title="Finish" subtitle="Loading the session summary">
        <LoadingState rows={2} />
      </Section>
    </Page>
  );
}

function CreateWorkoutEntryContent({
  workoutTemplate,
  lastEntry,
}: {
  workoutTemplate: WorkoutTemplate;
  lastEntry: WorkoutEntry | null;
}) {
  const form = useWorkoutEntryForm(workoutTemplate, lastEntry);
  const {
    exerciseData,
    readinessForm,
    readinessIncluded,
    handleReadinessChange,
    handleReadinessSave,
    handleReadinessSkip,
    handleSetChange,
    stepValue,
    addSet,
    removeSet,
    copyFromPrevious,
    addCustomExercise,
    remainingSuggestions,
    removeExercise,
    moveExercise,
    submitting,
  } = form;

  const { context: programmeContext } = useCurrentWeek();
  const { settings } = useWorkoutSettings();
  const { mutateAsync: resolveExerciseDefinition } = useResolveExerciseDefinition();
  const focusedTemplateExercise = useMemo(
    () => workoutTemplate.exercises.find((exercise) => exercise.focus) ?? null,
    [workoutTemplate.exercises],
  );
  const { data: focusedLiftSummary, isLoading: focusedLiftSummaryLoading } =
    useLiftSummaryWithEnabled("template", workoutTemplate.id, focusedTemplateExercise != null);
  const [pendingDefinitionChoice, setPendingDefinitionChoice] = useState<PendingDefinitionChoice | null>(null);
  const [sessionStartedAt] = useState(() => new Date().toISOString());
  const hasExercisesWithSets = exerciseData.some((exercise) => exercise.sets?.length > 0);
  const hasChanges = exerciseData.length > 0;
  const isValid = hasExercisesWithSets;
  const {
    activeTab,
    activeExercise,
    activeExerciseIndex,
    handleExerciseRemoved,
    handleExerciseReordered,
    openExerciseAtIndex,
    openExerciseById,
    setActiveTab,
  } = useWorkoutEntryTabs(exerciseData, {
    includeFinish: true,
    finishDisabled: !isValid,
  });

  const targetRestSeconds =
    activeExercise?.targetRestSeconds ?? settings.defaultRestSeconds;

  const finishAddExercise = (
    exerciseConfig: SearchExerciseDraftInput,
  ) => {
    const { sortId, index } = addCustomExercise(exerciseConfig);
    openExerciseById(sortId, index);
  };

  const handleAddCustom = async (query: string) => {
    const draft: SearchExerciseDraftInput = {
      identity: createExerciseIdentityDraft({
        exerciseName: query,
      }),
      goalSets: 1,
    };
    const resolution = await resolveExerciseDefinition({
      query,
      exerciseName: query,
      variant: null,
    });

    if (resolution.status === "multiple_matches") {
      setPendingDefinitionChoice({
        draft,
        title: query,
        matches: resolution.matches,
        suggestedDefinitionId: resolution.suggestedDefinitionId ?? null,
      });
      return;
    }

    finishAddExercise({
      ...draft,
      identity:
        resolution.suggestedDefinitionId != null
          ? withResolvedDefinition(draft.identity, resolution.suggestedDefinitionId)
          : draft.identity,
    });
  };

  const handleAddSuggested = (idx: number) => {
    const suggestion = remainingSuggestions[idx];
    if (!suggestion) return;

    finishAddExercise({
      identity: suggestion.identity,
      goalSets: suggestion.goalSets ?? 1,
      targetRestSeconds: suggestion.targetRestSeconds ?? null,
    });
  };

  const handleAddCatalogExercise = async (exercise: ExerciseInfoCatalogItem) => {
    const draft: SearchExerciseDraftInput = {
      identity: createExerciseIdentityDraft({
        exerciseInfoId: exercise.id,
        exerciseName: exercise.name,
        variant: getExerciseCatalogWorkoutVariant(exercise) || undefined,
      }),
      goalSets: 1,
    };
    const resolution = await resolveExerciseDefinition({
      query: exercise.name,
      exerciseInfoId: exercise.id,
      exerciseName: exercise.name,
      variant: getExerciseIdentityVariant(draft.identity),
    });

    if (resolution.status === "multiple_matches") {
      setPendingDefinitionChoice({
        draft,
        title: exercise.name,
        matches: resolution.matches,
        suggestedDefinitionId: resolution.suggestedDefinitionId ?? null,
      });
      return;
    }

    finishAddExercise({
      ...draft,
      identity:
        resolution.suggestedDefinitionId != null
          ? withResolvedDefinition(draft.identity, resolution.suggestedDefinitionId)
          : draft.identity,
    });
  };

  const handleConfirmDefinitionChoice = (definitionId: string) => {
    if (!pendingDefinitionChoice) {
      return;
    }

    finishAddExercise({
      ...pendingDefinitionChoice.draft,
      identity: withResolvedDefinition(pendingDefinitionChoice.draft.identity, definitionId),
    });
    setPendingDefinitionChoice(null);
  };

  const handleWorkoutSubmit = () => handleSubmit(readinessIncluded ? readinessForm : null);

  const handleNext = () => {
    const nextExercise = exerciseData[activeExerciseIndex + 1];
    if (nextExercise) {
      openExerciseAtIndex(activeExerciseIndex + 1);
      return;
    }

    setActiveTab("view");
  };

  const handleRemoveExercise = (idx: number) => {
    handleExerciseRemoved(idx);
    removeExercise(idx);
  };

  const handleReorderExercises = (fromIndex: number, toIndex: number) => {
    handleExerciseReordered(fromIndex, toIndex);
    moveExercise(fromIndex, toIndex);
  };

  const handleRemoveExerciseById = (exerciseId: string, preferredIndex?: number) => {
    const index =
      preferredIndex != null && exerciseData[preferredIndex]?.sortId === exerciseId
        ? preferredIndex
        : exerciseData.findIndex((exercise) => exercise.sortId === exerciseId);

    if (index < 0) return;

    handleRemoveExercise(index);
  };

  const isFocusedLift = Boolean(
    activeExercise &&
      focusedTemplateExercise &&
      matchesTemplateFocus(toCreatePayloadFields(activeExercise.identity), focusedTemplateExercise),
  );

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return;
    }

    console.log("[WorkoutEntryEditorPage:create-focus]", {
      workoutTemplateId: workoutTemplate.id,
      activeTab,
      activeExercise: activeExercise
        ? {
            sortId: activeExercise.sortId,
            identity: toCreatePayloadFields(activeExercise.identity),
          }
        : null,
      focusedTemplateExercise: focusedTemplateExercise
        ? {
            focus: focusedTemplateExercise.focus,
            exerciseDefinition: focusedTemplateExercise.exerciseDefinition
              ? {
                  id: focusedTemplateExercise.exerciseDefinition.id,
                  exerciseInfoId: focusedTemplateExercise.exerciseDefinition.exerciseInfoId ?? null,
                  exerciseName: focusedTemplateExercise.exerciseDefinition.exerciseName,
                  variant: focusedTemplateExercise.exerciseDefinition.variant ?? null,
                }
              : null,
          }
        : null,
      isFocusedLift,
      focusedLiftSummaryLoading,
      focusedLiftSummary: focusedLiftSummary
        ? {
            exerciseDefinitionId: focusedLiftSummary.exerciseDefinitionId,
            exerciseName: focusedLiftSummary.exerciseName,
            variant: focusedLiftSummary.variant ?? null,
            sessionCount: focusedLiftSummary.sessionCount,
            personalBestKg: focusedLiftSummary.personalBestKg,
          }
        : null,
    });
  }, [
    activeExercise,
    activeTab,
    focusedLiftSummary,
    focusedLiftSummaryLoading,
    focusedTemplateExercise,
    isFocusedLift,
    workoutTemplate.id,
  ]);

  const finishAnalysisContext = programmeContext
    ? {
        block: programmeContext.block,
        week: programmeContext.week,
        focusExerciseConfigId: null,
      }
    : null;

  const exercisePanel = activeExercise ? (
    <WorkoutEntryExerciseDetail
      key={activeExercise.sortId}
      exerciseItem={activeExercise}
      exerciseIdx={activeExerciseIndex}
      handleSetChange={handleSetChange}
      stepValue={stepValue}
      addSet={addSet}
      removeSet={removeSet}
      copyFromPrevious={copyFromPrevious}
      onBack={() => setActiveTab("view")}
      onDelete={handleRemoveExerciseById}
      onNext={handleNext}
      block={programmeContext?.block ?? null}
      workoutTemplateId={workoutTemplate.id}
      targetRestSeconds={targetRestSeconds}
      sessionStartedAt={sessionStartedAt}
      isFocusedLift={isFocusedLift}
      focusLiftSummary={focusedLiftSummary ?? null}
      focusLiftSummaryLoading={focusedLiftSummaryLoading}
    />
  ) : null;

  return (
    <WorkoutEntryShell
      title={workoutTemplate.name}
      subtitle="Start a new workout session"
      hasChanges={hasChanges}
      isValid={isValid}
      submitting={submitting}
      handleSubmit={handleWorkoutSubmit}
      tabs={buildCreateTabs(exerciseData, isValid)}
      activeTab={activeTab}
      ariaLabel="Workout entry tabs"
      onTabChange={setActiveTab}
    >
      {activeTab === "view" ? (
        <AddExerciseStep
          suggestions={remainingSuggestions}
          onAddSuggested={handleAddSuggested}
          onAddCatalogExercise={handleAddCatalogExercise}
          onAddCustom={handleAddCustom}
          onGoToExercise={openExerciseAtIndex}
          onRemoveExercise={handleRemoveExercise}
          onReorderExercises={handleReorderExercises}
          exercises={exerciseData}
          programmeContext={programmeContext}
        />
      ) : null}
      {activeTab === "readiness" ? (
        <WorkoutEntryReadinessPanel
          programmeContext={programmeContext}
          readinessForm={readinessForm}
          onReadinessChange={handleReadinessChange}
          onReadinessSave={handleReadinessSave}
          onReadinessSkip={handleReadinessSkip}
          onGoToWorkoutTab={() => setActiveTab("view")}
        />
      ) : null}
      {activeTab === "exercise" ? exercisePanel : null}
      {activeTab === "finish" ? (
        <FinishEntryPanel
          isSaving={submitting}
          hasChanges={hasChanges}
          isValid={isValid}
          exerciseData={exerciseData}
          lastEntry={lastEntry}
          analysisContext={finishAnalysisContext}
          onSave={handleWorkoutSubmit}
        />
      ) : null}
      <ExerciseDefinitionChoiceDialog
        open={pendingDefinitionChoice != null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDefinitionChoice(null);
          }
        }}
        matches={pendingDefinitionChoice?.matches ?? []}
        suggestedDefinitionId={pendingDefinitionChoice?.suggestedDefinitionId ?? null}
        title={`Choose history for ${pendingDefinitionChoice?.title ?? "this exercise"}`}
        onConfirm={handleConfirmDefinitionChoice}
      />
    </WorkoutEntryShell>
  );
}

function useWorkoutEntryEditState(workoutEntry: WorkoutEntry) {
  const [exerciseData, setExerciseData] = useState<WorkoutEntryExerciseDraft[]>(
    () => mapEntryToFormData(workoutEntry),
  );
  const [notes, setNotes] = useState(() => workoutEntry.notes || "");
  const [isSaving, setIsSaving] = useState(false);

  const initialExerciseData = useMemo(() => mapEntryToFormData(workoutEntry), [workoutEntry]);
  const initialNotes = workoutEntry.notes || "";

  const updateExercise = useCallback(
    (exerciseIdx: number, updater: (data: WorkoutEntryExerciseDraft) => WorkoutEntryExerciseDraft) => {
      setExerciseData((previous) =>
        previous.map((item, idx) => (idx === exerciseIdx ? updater(item) : item)),
      );
    },
    [],
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
          exerciseName: getWorkoutEntryExerciseName(data),
          variant: getWorkoutEntryExerciseVariant(data),
        }),
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
      updateExercise(exerciseIdx, (data) => ({ ...data, sets: addSetToList(data.sets) }));
    },
    [updateExercise],
  );

  const removeSet = useCallback(
    (exerciseIdx: number, setIdx: number) => {
      updateExercise(exerciseIdx, (data) => {
        if (data.sets.length <= 1) return data;
        return { ...data, sets: data.sets.filter((_, idx) => idx !== setIdx) };
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

      const next = [...previous];
      const [movedExercise] = next.splice(fromIndex, 1);
      if (!movedExercise) return previous;
      next.splice(toIndex, 0, movedExercise);
      return next;
    });
  }, []);

  const addCustomExercise = useCallback(
    (
      exerciseConfig: WorkoutEntryExerciseInput,
    ): { sortId: string; index: number } => {
      const sortId = crypto.randomUUID();
      const newExercise: WorkoutEntryExerciseDraft = {
        sortId,
        ...exerciseConfig,
        sets: [getDefaultSet()],
      };

      let index = 0;
      setExerciseData((previous) => {
        index = previous.length;
        return [...previous, newExercise];
      });
      return { sortId, index };
    },
    [],
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

  const remainingSuggestions = useMemo(
    () => getRemainingSuggestions(workoutEntry.template.exercises, exerciseData, null),
    [exerciseData, workoutEntry.template.exercises],
  );

  const hasChanges =
    !areExerciseEntriesEqual(exerciseData, initialExerciseData) || notes !== initialNotes;

  const isValid =
    exerciseData.length > 0 &&
    exerciseData.every(
      (exercise) =>
        getWorkoutEntryExerciseName(exercise).trim() !== "" &&
        exercise.sets.length > 0 &&
        exercise.sets.every((set) => parseInt(set.reps) > 0),
    );

  const reset = useCallback(() => {
    setExerciseData(initialExerciseData);
    setNotes(initialNotes);
  }, [initialExerciseData, initialNotes]);

  return {
    exerciseData,
    notes,
    setNotes,
    isSaving,
    setIsSaving,
    handleSetChange,
    stepValue,
    addSet,
    removeSet,
    addCustomExercise,
    remainingSuggestions,
    removeExercise,
    moveExercise,
    linkExerciseToCatalog,
    convertExerciseToCustom,
    setAllSetsWeight,
    setAllSetsReps,
    hasChanges,
    isValid,
    reset,
  };
}

function EditWorkoutEntryPage() {
  const { workoutEntry, isLoading, updateWorkoutEntry } = useWorkoutEntryContext();
  const { workoutId } = useParams<{ workoutId?: string }>();
  const navigate = useNavigate();

  if (isLoading) {
    return <WorkoutEntryPageLoading title="Loading workout entry" subtitle="Preparing the entry editor." />;
  }

  if (!workoutEntry) {
    return (
      <Page
        icon={ICONS.workout}
        title="Workout entry not found"
        subtitle="We couldn't load this workout entry."
      >
        <ErrorState
          title="We couldn't load this workout entry."
          description="Return to the workout entries list and choose another session."
          icon={ICONS.workout}
          action={
            <Button
              icon={undefined}
              onClick={() => navigate(workoutId ? `/workout/${workoutId}/entries` : "/workouts")}
            >
              Back to entries
            </Button>
          }
        />
      </Page>
    );
  }

  return (
    <EditWorkoutEntryContent
      workoutEntry={workoutEntry}
      updateWorkoutEntry={updateWorkoutEntry}
      navigate={navigate}
    />
  );
}

function EditWorkoutEntryContent({
  workoutEntry,
  updateWorkoutEntry,
  navigate,
}: {
  workoutEntry: WorkoutEntry;
  updateWorkoutEntry: ReturnType<typeof useWorkoutEntryContext>["updateWorkoutEntry"];
  navigate: ReturnType<typeof useNavigate>;
}) {
  const {
    exerciseData,
    notes,
    setNotes,
    isSaving,
    setIsSaving,
    handleSetChange,
    stepValue,
    addSet,
    removeSet,
    addCustomExercise,
    remainingSuggestions,
    removeExercise,
    moveExercise,
    hasChanges,
    isValid,
    reset,
  } = useWorkoutEntryEditState(workoutEntry);

  const { context: programmeContext } = useCurrentWeek();
  const { settings } = useWorkoutSettings();
  const [sessionStartedAt] = useState(() => workoutEntry.createdAt);
  const focusedTemplateExercise = useMemo(
    () => workoutEntry.template.exercises.find((exercise) => exercise.focus) ?? null,
    [workoutEntry.template.exercises],
  );
  const { data: focusedLiftSummary, isLoading: focusedLiftSummaryLoading } =
    useLiftSummaryWithEnabled("template", workoutEntry.template.id, focusedTemplateExercise != null);
  const {
    activeTab,
    activeExercise,
    activeExerciseIndex,
    handleExerciseRemoved,
    handleExerciseReordered,
    openExerciseAtIndex,
    openExerciseById,
    setActiveTab,
  } = useWorkoutEntryTabs(exerciseData, { includeFinish: false });
  const { mutateAsync: resolveExerciseDefinition } = useResolveExerciseDefinition();
  const [pendingDefinitionChoice, setPendingDefinitionChoice] = useState<PendingDefinitionChoice | null>(null);

  const finishAddExercise = (
    exerciseConfig: SearchExerciseDraftInput,
  ) => {
    const { sortId, index } = addCustomExercise(exerciseConfig);
    openExerciseById(sortId, index);
  };

  const handleAddCustom = async (query: string) => {
    const draft: SearchExerciseDraftInput = {
      identity: createExerciseIdentityDraft({
        exerciseName: query,
      }),
      goalSets: 1,
    };
    const resolution = await resolveExerciseDefinition({
      query,
      exerciseName: query,
      variant: null,
    });

    if (resolution.status === "multiple_matches") {
      setPendingDefinitionChoice({
        draft,
        title: query,
        matches: resolution.matches,
        suggestedDefinitionId: resolution.suggestedDefinitionId ?? null,
      });
      return;
    }

    finishAddExercise({
      ...draft,
      identity:
        resolution.suggestedDefinitionId != null
          ? withResolvedDefinition(draft.identity, resolution.suggestedDefinitionId)
          : draft.identity,
    });
  };

  const handleAddSuggested = (idx: number) => {
    const suggestion = remainingSuggestions[idx];
    if (!suggestion) return;

    finishAddExercise({
      identity: suggestion.identity,
      goalSets: suggestion.goalSets ?? 1,
      targetRestSeconds: suggestion.targetRestSeconds ?? null,
    });
  };

  const handleAddCatalogExercise = async (exercise: ExerciseInfoCatalogItem) => {
    const draft: SearchExerciseDraftInput = {
      identity: createExerciseIdentityDraft({
        exerciseInfoId: exercise.id,
        exerciseName: exercise.name,
        variant: getExerciseCatalogWorkoutVariant(exercise) || undefined,
      }),
      goalSets: 1,
    };
    const resolution = await resolveExerciseDefinition({
      query: exercise.name,
      exerciseInfoId: exercise.id,
      exerciseName: exercise.name,
      variant: getExerciseIdentityVariant(draft.identity),
    });

    if (resolution.status === "multiple_matches") {
      setPendingDefinitionChoice({
        draft,
        title: exercise.name,
        matches: resolution.matches,
        suggestedDefinitionId: resolution.suggestedDefinitionId ?? null,
      });
      return;
    }

    finishAddExercise({
      ...draft,
      identity:
        resolution.suggestedDefinitionId != null
          ? withResolvedDefinition(draft.identity, resolution.suggestedDefinitionId)
          : draft.identity,
    });
  };

  const handleConfirmDefinitionChoice = (definitionId: string) => {
    if (!pendingDefinitionChoice) {
      return;
    }

    finishAddExercise({
      ...pendingDefinitionChoice.draft,
      identity: withResolvedDefinition(pendingDefinitionChoice.draft.identity, definitionId),
    });
    setPendingDefinitionChoice(null);
  };

  const handleNext = () => {
    const nextExercise = exerciseData[activeExerciseIndex + 1];
    if (nextExercise) {
      openExerciseAtIndex(activeExerciseIndex + 1);
      return;
    }

    setActiveTab("view");
  };

  const handleRemoveExercise = (idx: number) => {
    handleExerciseRemoved(idx);
    removeExercise(idx);
  };

  const handleReorderExercises = (fromIndex: number, toIndex: number) => {
    handleExerciseReordered(fromIndex, toIndex);
    moveExercise(fromIndex, toIndex);
  };

  const handleRemoveExerciseById = (exerciseId: string, preferredIndex?: number) => {
    const index =
      preferredIndex != null && exerciseData[preferredIndex]?.sortId === exerciseId
        ? preferredIndex
        : exerciseData.findIndex((exercise) => exercise.sortId === exerciseId);

    if (index < 0) return;

    handleRemoveExercise(index);
  };

  const isFocusedLift = Boolean(
    activeExercise &&
      focusedTemplateExercise &&
      matchesTemplateFocus(toCreatePayloadFields(activeExercise.identity), focusedTemplateExercise),
  );

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return;
    }

    console.log("[WorkoutEntryEditorPage:edit-focus]", {
      workoutTemplateId: workoutEntry.template.id,
      activeTab,
      activeExercise: activeExercise
        ? {
            sortId: activeExercise.sortId,
            identity: toCreatePayloadFields(activeExercise.identity),
          }
        : null,
      focusedTemplateExercise: focusedTemplateExercise
        ? {
            focus: focusedTemplateExercise.focus,
            exerciseDefinition: focusedTemplateExercise.exerciseDefinition
              ? {
                  id: focusedTemplateExercise.exerciseDefinition.id,
                  exerciseInfoId: focusedTemplateExercise.exerciseDefinition.exerciseInfoId ?? null,
                  exerciseName: focusedTemplateExercise.exerciseDefinition.exerciseName,
                  variant: focusedTemplateExercise.exerciseDefinition.variant ?? null,
                }
              : null,
          }
        : null,
      isFocusedLift,
      focusedLiftSummaryLoading,
      focusedLiftSummary: focusedLiftSummary
        ? {
            exerciseDefinitionId: focusedLiftSummary.exerciseDefinitionId,
            exerciseName: focusedLiftSummary.exerciseName,
            variant: focusedLiftSummary.variant ?? null,
            sessionCount: focusedLiftSummary.sessionCount,
            personalBestKg: focusedLiftSummary.personalBestKg,
          }
        : null,
    });
  }, [
    activeExercise,
    activeTab,
    focusedLiftSummary,
    focusedLiftSummaryLoading,
    focusedTemplateExercise,
    isFocusedLift,
    workoutEntry.template.id,
  ]);

  const handleSave = async () => {
    const updates = buildUpdateRequest(exerciseData, notes);
    setIsSaving(true);

    try {
      await updateWorkoutEntry({ id: workoutEntry.id, updates });
      navigate(`/workout/${workoutEntry.template.id}/entries`);
    } finally {
      setIsSaving(false);
    }
  };

  const targetRestSeconds =
    activeExercise?.targetRestSeconds ?? settings.defaultRestSeconds;

  const exercisePanel = activeExercise ? (
    <WorkoutEntryExerciseDetail
      key={activeExercise.sortId}
      exerciseItem={activeExercise}
      exerciseIdx={activeExerciseIndex}
      handleSetChange={handleSetChange}
      stepValue={stepValue}
      addSet={addSet}
      removeSet={removeSet}
      copyFromPrevious={copyFromPrevious}
      onBack={() => setActiveTab("view")}
      onDelete={handleRemoveExerciseById}
      onNext={handleNext}
      block={programmeContext?.block ?? null}
      trainingInsight={null}
      workoutTemplateId={workoutEntry.template.id}
      targetRestSeconds={targetRestSeconds}
      sessionStartedAt={sessionStartedAt}
      isFocusedLift={isFocusedLift}
      focusLiftSummary={focusedLiftSummary ?? null}
      focusLiftSummaryLoading={focusedLiftSummaryLoading}
    />
  ) : null;

  const topContent = (
    <Section title="Notes" icon={Dumbbell}>
      <Textarea
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        placeholder="Add any notes about this workout (optional)..."
        className="min-h-[100px] resize-none"
      />
    </Section>
  );

  return (
    <WorkoutEntryShell
      title={workoutEntry.template.name}
      subtitle="Edit this workout session"
      hasChanges={hasChanges}
      isValid={isValid}
      submitting={isSaving}
      handleSubmit={handleSave}
      onReset={reset}
      saveLabel="Save Changes"
      tabs={buildEditTabs(exerciseData)}
      activeTab={activeTab}
      ariaLabel="Workout entry tabs"
      onTabChange={setActiveTab}
      topContent={topContent}
    >
      {activeTab === "view" ? (
        <AddExerciseStep
          suggestions={remainingSuggestions}
          onAddSuggested={handleAddSuggested}
          onAddCatalogExercise={handleAddCatalogExercise}
          onAddCustom={handleAddCustom}
          onGoToExercise={openExerciseAtIndex}
          onRemoveExercise={handleRemoveExercise}
          onReorderExercises={handleReorderExercises}
          exercises={exerciseData}
          programmeContext={programmeContext}
        />
      ) : null}
      {activeTab === "exercise" ? exercisePanel : null}
      <ExerciseDefinitionChoiceDialog
        open={pendingDefinitionChoice != null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDefinitionChoice(null);
          }
        }}
        matches={pendingDefinitionChoice?.matches ?? []}
        suggestedDefinitionId={pendingDefinitionChoice?.suggestedDefinitionId ?? null}
        title={`Choose history for ${pendingDefinitionChoice?.title ?? "this exercise"}`}
        onConfirm={handleConfirmDefinitionChoice}
      />
    </WorkoutEntryShell>
  );
}

export default function WorkoutEntryEditorPage() {
  const { id } = useParams<{ id?: string }>();
  return id ? <EditWorkoutEntryPage /> : <CreateWorkoutEntryPage />;
}
