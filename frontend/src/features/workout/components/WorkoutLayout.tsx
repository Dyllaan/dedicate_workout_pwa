import { useMemo } from "react";
import { Outlet, useParams } from "react-router-dom";
import { Dumbbell } from "lucide-react";
import ErrorState from "@/components/layout/feedback/ErrorState";
import Page from "@/components/layout/section/Page";
import { useAllWorkoutEntries } from "@/hooks/workout/useWorkoutEntries";
import { useWorkoutTemplate } from "@/hooks/workout/useWorkoutTemplates";
import { useUnitPreference } from "@/hooks/useUnitPreference";
import type { WorkoutEntry, WorkoutTemplate } from "@/types/Workout";
import type { WorkoutStartupSummary } from "@/types/Startup";

type WorkoutContext = {
  workoutTemplate: WorkoutTemplate | null;
  lastEntry: WorkoutEntry | null;
  entries: WorkoutEntry[];
  stats: WorkoutStartupSummary | null;
  isLoading: boolean;
  format: (kg: number) => string;
};

export default function WorkoutLayout() {
  const { workoutId } = useParams();
  const { format } = useUnitPreference();
  const workoutTemplateQuery = useWorkoutTemplate(workoutId);
  const workoutEntriesQuery = useAllWorkoutEntries(workoutId, !!workoutId);

  const workoutTemplate = workoutTemplateQuery.data ?? null;
  const workoutEntries = workoutEntriesQuery.data ?? [];
  const sortedEntries = useMemo(
    () => [...workoutEntries].sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt)),
    [workoutEntries],
  );
  const lastEntry = sortedEntries[0] ?? null;
  const stats = useMemo(
    () => buildWorkoutStartupSummary(workoutId, sortedEntries),
    [sortedEntries, workoutId],
  );
  const isLoading = workoutTemplateQuery.isLoading || workoutEntriesQuery.isLoading;

  if (!workoutTemplate && !isLoading) {
    return (
      <Page title="Workout not found" subtitle="The selected workout could not be found." icon={Dumbbell}>
        <ErrorState
          title="This workout is unavailable"
          description="It may have been deleted or the link may be out of date."
          icon={Dumbbell}
        />
      </Page>
    );
  }

  return (
    <Outlet
      context={{
        format,
        workoutTemplate,
        lastEntry,
        entries: workoutEntries,
        stats,
        isLoading,
      } satisfies WorkoutContext}
    />
  );
}

function buildWorkoutStartupSummary(
  workoutId: string | undefined,
  entries: WorkoutEntry[],
): WorkoutStartupSummary | null {
  if (!workoutId) {
    return null;
  }

  return {
    workoutId,
    entryCount: entries.length,
    totalWeightLifted: entries.reduce((entryTotal, entry) => {
      return entryTotal + entry.exercises.reduce((exerciseTotal, exercise) => {
        return exerciseTotal + exercise.sets.reduce((setTotal, set) => setTotal + (set.weight ? set.weight * set.reps : 0), 0);
      }, 0);
    }, 0),
    latestEntryId: entries[0]?.id ?? null,
  };
}
