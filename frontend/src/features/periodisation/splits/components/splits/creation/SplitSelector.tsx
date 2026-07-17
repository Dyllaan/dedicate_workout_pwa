import { Dumbbell } from "lucide-react";
import EmptyState from "@/components/layout/feedback/EmptyState";
import FormPage from "@/components/layout/frames/FormPage";
import { PaginationControls } from "@/components/ui";
import { ICONS } from "@/config/iconConfig";
import type { WorkoutTemplate } from "@/features/workout/types/Workout";
import { DashCheckRow } from "@/components/layout/card/DashCheckRow";

interface WorkoutSelectionProps {
  availableWorkouts: WorkoutTemplate[];
  selectedIds: string[];
  onToggle: (workout: WorkoutTemplate) => void;
  onNext: (selectedWorkouts: WorkoutTemplate[]) => void;
  onReset: () => void;
  page: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
  onPreviousPage: () => void;
  onNextPage: () => void;
}

export default function SplitSelector({
  availableWorkouts,
  selectedIds,
  onToggle,
  onNext,
  onReset,
  page,
  totalPages,
  hasPrevious,
  hasNext,
  onPreviousPage,
  onNextPage,
}: WorkoutSelectionProps) {
  const handleNext = () => {
    const selectedWorkouts = availableWorkouts.filter((workout) => selectedIds.includes(workout.id));
    onNext(selectedWorkouts);
  };

  return (
    <FormPage
      subtitleIcon={ICONS.workout}
      subtitle="Add workouts to your split"
      icon={ICONS.split}
      title="Select Workouts"
      onReset={onReset}
      onSave={handleNext}
      isValid={selectedIds.length > 0}
      saveLabel="Next"
      hasChanges={selectedIds.length > 0}
    >
      <div className="flex w-full flex-col">
        {availableWorkouts.length === 0 ? (
          <EmptyState
            icon={Dumbbell}
            title="No workouts available"
            description="Create some workouts first to build your split"
          />
        ) : (
          <div className="space-y-2 py-4">
            {availableWorkouts.map((workout) => (
              <DashCheckRow
                key={workout.id}
                label={workout.name}
                description={`${workout.exercises.length} exercise${workout.exercises.length !== 1 ? "s" : ""}`}
                icon={Dumbbell}
                checked={selectedIds.includes(workout.id)}
                onChange={() => onToggle(workout)}
                disabled={false}
                className="w-full"
              />
            ))}
          </div>
        )}
        <PaginationControls
          className="mt-4"
          page={page}
          totalPages={totalPages}
          hasPrevious={hasPrevious}
          hasNext={hasNext}
          onPrevious={onPreviousPage}
          onNext={onNextPage}
        />
      </div>
    </FormPage>
  );
}
