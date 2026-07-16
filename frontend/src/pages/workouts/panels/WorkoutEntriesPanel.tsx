import { useNavigate } from "react-router-dom";
import { enqueueSnackbar } from "notistack";
import { Calendar, Dumbbell, TrendingUp, ChartArea, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import useWorkoutEntries from "@/hooks/workout/useWorkoutEntries.ts";
import EmptyState from "@/components/layout/feedback/EmptyState.tsx";
import StatTile from "@/components/ui/stat-tile.tsx";
import StatGrid from "@/components/ui/StatGrid.tsx";
import { useUrlPagination } from "@/hooks/useUrlPagination.ts";
import type { WorkoutEntry, ExerciseEntry } from "@/types/Workout.ts";
import { calculateVolume } from "@/utils/workoutEntryHelpers.ts";
import { sortByCreatedAtDesc } from "@/utils/sort.ts";
import formatDate from "@/utils/date.ts";
import Panel from "@/components/layout/Panel.tsx";
import useWorkoutContext from "@/hooks/forms/context/useWorkoutContext.ts";
import ExerciseSetsTable from "@/components/workout/ExerciseSetsTable.tsx";
import PaginatedContainer from "@/components/layout/PaginatedContainer.tsx";
import {EntriesDropdown} from "@/components/workout/entries/dropdown/EntriesDropdown.tsx";

type WorkoutEntriesPanelProps = {
  workoutTemplateId: string;
};

function getWorkoutStats(entry: WorkoutEntry) {
  const totalExercises = entry.exercises.length;
  const totalSets = entry.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
  const totalVolume = entry.exercises.reduce((sum, ex) => sum + calculateVolume(ex.sets), 0);
  return { totalExercises, totalSets, totalVolume };
}

export default function WorkoutEntriesPanel({ workoutTemplateId }: WorkoutEntriesPanelProps) {
  const { page, size, setPage } = useUrlPagination({ pageParam: "entriesPage", sizeParam: "entriesSize" });
  const { workoutEntries: entries, pageInfo, deleteWorkoutEntry, getAvgRpeForEntry } = useWorkoutEntries(
      workoutTemplateId,
      { enabled: Boolean(workoutTemplateId), page, size },
  );
  const navigate = useNavigate();
  const { format } = useWorkoutContext();

  const sortedEntries = [...entries].sort(sortByCreatedAtDesc);

  const deleteEntry = async (id: string) => {
    try {
      await deleteWorkoutEntry(id);
      enqueueSnackbar("Workout entry deleted.", { variant: "success" });
    } catch {
      enqueueSnackbar("Failed to delete workout entry.", { variant: "error" });
    }
  };

  return (
      <PaginatedContainer currentPage={page} total={pageInfo?.totalPages} onPageChange={setPage}>
        {sortedEntries.length === 0 ? (
            <EmptyState
                icon={Calendar}
                title="No workout entries yet"
                description="Start this workout once and your logged sessions will show up here."
                action={
                  workoutTemplateId ? (
                      <Button icon={undefined} onClick={() => navigate(`/workout/${workoutTemplateId}/create`)}>
                        Start workout
                      </Button>
                  ) : undefined
                }
            />
        ) : (
            <div className="space-y-4">
              {sortedEntries.map((entry) => {
                const stats = getWorkoutStats(entry);

                return (
                    <Panel
                        key={entry.id}
                        icon={Calendar}
                        title={formatDate(entry.createdAt)}
                        subtitle={`${stats.totalExercises} exercises, ${stats.totalSets} sets`}
                        actions={<EntriesDropdown entryId={entry.id} workoutId={workoutTemplateId} deleteEntry={deleteEntry} />}
                    >

                      <StatGrid cols={2}>
                        <StatTile
                            icon={ChartArea}
                            label="Volume"
                            value={stats.totalVolume > 0 ? format(stats.totalVolume) : "-"}
                        />
                        <StatTile icon={SlidersHorizontal} label="Avg RPE" value={getAvgRpeForEntry(entry).toFixed(1)} />
                      </StatGrid>

                      <div className="space-y-3 divide-y">
                        {entry.exercises.map((exerciseEntry: ExerciseEntry) => {
                          const volume = calculateVolume(exerciseEntry.sets);
                          return (
                              <div
                                  key={`${exerciseEntry.loggedExerciseName}-${exerciseEntry.loggedVariant ?? "default"}`}
                                  className="overflow-hidden"
                              >
                                <div className="px-4 py-4">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <div className="rounded-full bg-primary/10 p-2">
                                        <Dumbbell className="h-4 w-4 text-primary" />
                                      </div>
                                      <div>
                                        <h4 className="font-semibold text-base leading-none">
                                          {exerciseEntry.loggedExerciseName}
                                        </h4>
                                        {exerciseEntry.loggedVariant && (
                                            <p className="mt-1 text-xs text-muted-foreground">
                                              {exerciseEntry.loggedVariant}
                                            </p>
                                        )}
                                      </div>
                                    </div>
                                    {volume > 0 && (
                                        <div className="text-right">
                                          <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                                            <TrendingUp className="h-3 w-3" />
                                            <span className="font-semibold text-foreground">{format(volume)}</span>
                                          </div>
                                          <div className="text-xs text-muted-foreground">volume</div>
                                        </div>
                                    )}
                                  </div>
                                </div>

                                <ExerciseSetsTable sets={exerciseEntry.sets} format={format} />
                              </div>
                          );
                        })}
                      </div>
                    </Panel>
                );
              })}
            </div>
        )}
      </PaginatedContainer>
  );
}
