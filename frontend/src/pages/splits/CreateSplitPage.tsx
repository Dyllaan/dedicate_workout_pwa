import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { enqueueSnackbar } from "notistack";
import SplitSelector from "@/components/splits/creation/SplitSelector";
import SplitOrder from "@/components/splits/creation/SplitOrder";
import type { CreateSplitRequest, Split, WorkoutTemplate } from "@/types/Workout";
import useWorkoutTemplates, { useAllWorkoutTemplates } from "@/hooks/workout/useWorkoutTemplates";
import useSplits, { useSplit } from "@/hooks/periodisation/useSplits";
import Page from "@/components/layout/section/Page";
import { Button } from "@/components/ui/button";
import { ICONS } from "@/config/iconConfig";
import { useUrlPagination } from "@/hooks/useUrlPagination";

type Stage = "selection" | "ordering";

export default function CreateSplitPage({ mode }: { mode: string }) {
  const isEditMode = mode === "edit";
  const { splitId } = useParams<{ splitId: string }>();
  const { data: workouts = [], isLoading: workoutsLoading } = useAllWorkoutTemplates();
  const navigate = useNavigate();
  const { page, size, setPage } = useUrlPagination({ pageParam: "workoutsPage", sizeParam: "workoutsSize" });

  const [stage, setStage] = useState<Stage>("selection");
  const [selectedWorkoutIds, setSelectedWorkoutIds] = useState<string[]>([]);
  const [selectedWorkoutsById, setSelectedWorkoutsById] = useState<Record<string, WorkoutTemplate>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { pageInfo } = useWorkoutTemplates({ page, size });
  const { createSplit, setActiveSplit, updateSplit } = useSplits({ enabled: false });
  const { data: splitToEdit, isLoading: isSplitLoading } = useSplit(isEditMode ? splitId : undefined);

  const isLoading = workoutsLoading || isSplitLoading;

  useEffect(() => {
    if (!isEditMode || !splitId || !splitToEdit) return;
    setSelectedWorkoutIds(splitToEdit.workouts.map((workout) => workout.id));
    setSelectedWorkoutsById(Object.fromEntries(splitToEdit.workouts.map((workout) => [workout.id, workout])));
  }, [isEditMode, splitId, splitToEdit]);

  const selectedWorkouts = useMemo(
    () => selectedWorkoutIds.map((id) => selectedWorkoutsById[id]).filter(Boolean),
    [selectedWorkoutIds, selectedWorkoutsById],
  );

  const handleToggleWorkout = (workout: WorkoutTemplate) => {
    setSelectedWorkoutIds((current) =>
      current.includes(workout.id)
        ? current.filter((id) => id !== workout.id)
        : [...current, workout.id],
    );
    setSelectedWorkoutsById((current) => {
      if (current[workout.id]) {
        const next = { ...current };
        delete next[workout.id];
        return next;
      }
      return { ...current, [workout.id]: workout };
    });
  };

  const handleResetSelection = () => {
    setSelectedWorkoutIds([]);
    setSelectedWorkoutsById({});
  };

  const handleSelectionNext = (workouts: WorkoutTemplate[]) => {
    if (workouts.length === 0) return;
    setStage("ordering");
  };

  const handleOrderingBack = () => {
    setStage("selection");
  };

  const handleOrderingComplete = async (split: CreateSplitRequest) => {
    try {
      setIsSubmitting(true);
      if (isEditMode && splitId) {
        await updateSplit({ id: splitId, updates: split });
        enqueueSnackbar("Split updated.", { variant: "success" });
        navigate(`/periodisation/splits/${splitId}`);
      } else {
        const newSplit = await createSplit(split);
        await setActiveSplit(newSplit.id);
        enqueueSnackbar("Split created.", { variant: "success" });
        navigate(`/periodisation/splits/${newSplit.id}`);
      }
    } catch {
      enqueueSnackbar("Failed to save split.", { variant: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return null;

  if (isEditMode && !splitToEdit) {
    return (
      <Page icon={ICONS.split} title="Split not found" subtitle="We couldn't find the split you wanted to edit.">
        <div className="flex flex-col items-start gap-4 rounded-lg border p-6">
          <p className="text-sm text-muted-foreground">
            Go back to your split manager and choose another split.
          </p>
          <Button icon={undefined} onClick={() => navigate("/periodisation?tab=splits")}>
            Back to split manager
          </Button>
        </div>
      </Page>
    );
  }

  if (stage === "ordering") {
    return (
      <SplitOrder
        workouts={selectedWorkouts}
        initialFrequencies={splitToEdit ? frequenciesFromSplit(splitToEdit) : {}}
        onBack={handleOrderingBack}
        onComplete={handleOrderingComplete}
        isSubmitting={isSubmitting}
      />
    );
  }

  return (
    <SplitSelector
      availableWorkouts={workouts}
      selectedIds={selectedWorkoutIds}
      onToggle={handleToggleWorkout}
      onNext={handleSelectionNext}
      onReset={handleResetSelection}
      page={page}
      totalPages={pageInfo?.totalPages ?? 0}
      hasPrevious={pageInfo?.hasPrevious ?? page > 0}
      hasNext={pageInfo?.hasNext ?? false}
      onPreviousPage={() => setPage(Math.max(0, page - 1))}
      onNextPage={() => setPage(page + 1)}
    />
  );
}

function frequenciesFromSplit(split: Split): Record<string, number> {
  return Object.fromEntries(
    split.workouts.map((workout) => [
      workout.id,
      split.workoutFrequencies?.find((f) => f.workoutTemplateId === workout.id)?.sessionsPerWeek ?? 1,
    ]),
  );
}
