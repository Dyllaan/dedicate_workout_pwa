import { useState } from "react";
import { Dumbbell, Plus, Search } from "lucide-react";
import {
  getWorkoutEntryExerciseName,
  getWorkoutEntryExerciseVariant,
  getWorkoutEntrySuggestionName,
  getWorkoutEntrySuggestionVariant,
  type WorkoutEntryExerciseDraft,
  type WorkoutEntryExerciseSuggestion,
} from "@/features/workout/entries/types/workoutEntryFormTypes";
import { ProgrammeContextBanner } from "../ProgrammeContextBanner";
import type { CurrentWeekContext } from "@/features/periodisation/week/components/useCurrentWeek";
import type { ExerciseInfoCatalogItem } from "@/features/heatmap/types/Heatmap";
import ExerciseCatalogPicker from "@/features/workout/components/ExerciseCatalogPicker";
import DndExercises, { type DndExerciseEntry } from "@/features/workout/components/DndExercises";
import Section from "@/components/layout/section/Section";
import { DashCardRow } from "@/components/layout/card/DashCardRow";

type Props = {
  suggestions: WorkoutEntryExerciseSuggestion[];
  onAddSuggested: (idx: number) => void;
  onAddCatalogExercise: (exercise: ExerciseInfoCatalogItem) => void;
  onAddCustom: (query: string) => void;
  onGoToExercise: (idx: number) => void;
  onRemoveExercise: (idx: number) => void;
  onReorderExercises: (fromIndex: number, toIndex: number) => void;
  exercises: WorkoutEntryExerciseDraft[];
  programmeContext: CurrentWeekContext | null;
};

export default function AddExerciseStep({
  suggestions,
  onAddSuggested,
  onAddCatalogExercise,
  onAddCustom,
  onGoToExercise,
  onRemoveExercise,
  onReorderExercises,
  exercises,
  programmeContext,
}: Props) {
  const [showSearch, setShowSearch] = useState(false);

  const sortableExercises: DndExerciseEntry<WorkoutEntryExerciseDraft>[] = exercises.map((exercise) => ({
    id: exercise.sortId,
    exercise,
  }));

  return (
    <div className="flex flex-col gap-3">
      {programmeContext?.block && programmeContext.week && (
        <ProgrammeContextBanner block={programmeContext.block} week={programmeContext.week} />
      )}

      {suggestions.length > 0 ? (
        <Section
          title="Suggested exercises"
          divided={false}
        >
          {suggestions.map((suggested, idx) => (
            <button
              key={`${getWorkoutEntrySuggestionName(suggested)}-${getWorkoutEntrySuggestionVariant(suggested) ?? "default"}-${idx}`}
              type="button"
              onClick={() => onAddSuggested(idx)}
              className="flex w-full items-center gap-3 rounded-2xl border border-border bg-background p-3 text-left transition-colors hover:bg-muted/40"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted">
                <Plus className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {getWorkoutEntrySuggestionName(suggested)}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {getWorkoutEntrySuggestionVariant(suggested) ?? "Quick add"}
                </p>
              </div>
              <p className="shrink-0 text-xs text-muted-foreground">
                {suggested.goalSets} set{suggested.goalSets !== 1 ? "s" : ""}
              </p>
            </button>
          ))}
        </Section>
      ) : null}

      {showSearch ? (
        <div className="rounded-2xl border border-primary/20 bg-card p-4">
          <ExerciseCatalogPicker
            label="Search exercises"
            helperText="Choose a catalogue match to create or reuse the canonical exercise definition, or type a custom name if it is not in the catalogue."
            placeholder="Search exercises"
            actionLabel="Add definition"
            emptyMessage="No matching exercise found."
            autoFocus
            onUseTypedQuery={onAddCustom}
            onSelect={onAddCatalogExercise}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowSearch(true)}
          className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-border bg-background p-4 text-left transition-colors hover:bg-muted/40"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted">
            <Search className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">Search the full catalogue</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Browse every exercise or add a custom name if you need a one-off.
            </p>
          </div>
        </button>
      )}

      <Section
        title="Current session"
        subtitle="Open an exercise to edit it, or drag the handle to reorder the session."
        divided={false}
      >
        <DndExercises
          exercises={sortableExercises}
          isExerciseValid={(index) =>
            exercises[index]?.sets.length === exercises[index]?.goalSets
          }
          onOpenExercise={onGoToExercise}
          onRemoveExercise={onRemoveExercise}
          onReorder={onReorderExercises}
          getExerciseTitle={(exercise) => getWorkoutEntryExerciseName(exercise) || ""}
          getExerciseMeta={(exercise) =>
            getWorkoutEntryExerciseVariant(exercise)
              ? `${getWorkoutEntryExerciseVariant(exercise)} - ${exercise.sets.length} / ${exercise.goalSets} sets`
              : `${exercise.sets.length} / ${exercise.goalSets} sets`
          }
          emptyState={
            <DashCardRow
              variant="static"
              label="No exercises added yet"
              description="Use suggested exercises or search to add the first movement."
              icon={Dumbbell}
            />
          }
        />
      </Section>
    </div>
  );
}
