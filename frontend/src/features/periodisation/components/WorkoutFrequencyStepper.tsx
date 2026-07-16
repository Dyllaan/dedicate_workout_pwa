import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Stepper } from "@/components/ui";
import type { Split } from "@/types/Workout";
import type { SplitWorkoutFrequencyMap } from "@/utils/splitWorkoutFrequencies";

export default function WorkoutFrequencyStepper({
  split,
  frequencies,
  baselineFrequencies,
  onChange,
  onReset,
  onSave,
  isSaving = false,
}: {
  split: Split;
  frequencies: SplitWorkoutFrequencyMap;
  baselineFrequencies?: SplitWorkoutFrequencyMap;
  onChange: (frequencies: SplitWorkoutFrequencyMap) => void;
  onReset?: () => void;
  onSave?: () => Promise<void> | void;
  isSaving?: boolean;
}) {
  const hasFrequencyChanges = split.workouts.some(
    (workout) => (frequencies[workout.id] ?? 1) !== (baselineFrequencies?.[workout.id] ?? frequencies[workout.id] ?? 1),
  );

  const updateFrequency = (workoutId: string, delta: number) => {
    onChange({
      ...frequencies,
      [workoutId]: Math.max(1, Math.min(7, (frequencies[workoutId] ?? 1) + delta)),
    });
  };

  const showActions = Boolean(onReset || onSave);

  return (
    <div>
      <div className="divide-y divide-border">
        {split.workouts.map((workout, index) => (
          <div key={workout.id} className="flex items-center justify-between gap-3 p-4 transition-colors">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow-sm">
                {index + 1}
              </div>
              <div>
                <div className="min-w-0">
                  <div className="text-foreground flex flex-col gap-1">
                    <span>{workout.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {workout.category}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
            <div className="w-48 shrink-0">
              <Stepper
                mode="row"
                value={frequencies[workout.id] ?? 1}
                min={1}
                max={7}
                onDecrement={() => updateFrequency(workout.id, -1)}
                onIncrement={() => updateFrequency(workout.id, 1)}
                label="Sessions per week"
              />
            </div>
          </div>
        ))}
      </div>
      {showActions ? (
        <div className="mt-3 flex items-center justify-center gap-2 pb-2">
          {onReset ? (
            <Button
              icon={undefined}
              type="button"
              onClick={onReset}
              disabled={!hasFrequencyChanges || isSaving}
              className="flex-1"
            >
              Reset
            </Button>
          ) : null}
          {onSave ? (
            <Button
              icon={undefined}
              onClick={() => void onSave()}
              disabled={!hasFrequencyChanges || isSaving}
              className="flex-1"
            >
              <Save className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save frequencies"}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
