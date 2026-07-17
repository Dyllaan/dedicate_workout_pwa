import { MUSCLE_LABELS } from "@/features/heatmap/config/muscleMetadata";
import type { ResolvedExerciseHeatmap } from "@/features/heatmap/types/Heatmap";
import { formatExerciseLabel } from "@/features/insights/utils/insightsUtils";

type PillCardProps = {
  resolvedExercises: ResolvedExerciseHeatmap[];
  titled?: boolean;
};

export function PillCard({ resolvedExercises }: PillCardProps) {
  return (
    <div className="divide-y divide-border">
      {resolvedExercises.map((ex) => (
        <div key={`${ex.exerciseName?.trim() ?? "unknown"}-${ex.variant?.trim() ?? ""}-${ex.primaryMuscle ?? ""}`} className="flex flex-col gap-1.5 py-3">
          <div className="text-sm font-semibold">{formatExerciseLabel(ex.exerciseName, ex.variant)}</div>
          <div className="flex items-center gap-4 text-xs">
            {ex.primaryMuscle ? (
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Main:</span>
                <span role="primary">{MUSCLE_LABELS[ex.primaryMuscle] ?? "Unknown muscle"}</span>
              </div>
            ) : null}
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span>Supporting:</span>
              {ex.secondaryMuscles.concat(ex.synergistMuscles).map((m) => (
                <span key={m} className="hover:text-foreground">
                  {MUSCLE_LABELS[m] ?? "Unknown muscle"}
                </span>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
