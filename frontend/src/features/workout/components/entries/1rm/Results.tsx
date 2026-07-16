import type { SetEntryWithDate } from "@/types/dto/SetEntryWithDate";
import { estimate1RM } from "@/utils/1rmEstimateHelper";
import type { SetFormData } from "@/hooks/forms/workoutEntryFormTypes";
import type { BodyweightLog } from "@/types/Bodyweight";
import {
  calculatePowerToWeightRatios,
  findBodyweightLogForDate,
  formatPowerToWeightRatio,
} from "@/utils/powerToWeightRatio";

interface ResultsProps {
  set: SetFormData | SetEntryWithDate;
  bodyweightLogs?: BodyweightLog[];
  performedAt?: string;
}

function getPerformedAt(set: SetFormData | SetEntryWithDate, performedAt?: string): string {
  if (performedAt) return performedAt;
  if ("workoutDate" in set && set.workoutDate) return set.workoutDate;
  return new Date().toISOString();
}

export const Results = ({ set, bodyweightLogs = [], performedAt }: ResultsProps) => {
  const weight = Number(set.weight);
  const reps = Number(set.reps);

  const { epley, brzycki, lombardi } = estimate1RM(weight, reps);
  const avg = Math.round(((epley + brzycki + lombardi) / 3) * 10) / 10;
  const bodyweightLog = findBodyweightLogForDate(
    bodyweightLogs,
    getPerformedAt(set, performedAt),
  );
  const ratios = calculatePowerToWeightRatios({
    loadKg: weight,
    estimatedOneRepMaxKg: avg,
    bodyweightKg: bodyweightLog?.weightKg ?? null,
  });

  const formulas = [
    { label: "Epley", value: epley },
    { label: "Brzycki", value: brzycki },
    { label: "Lombardi", value: lombardi },
  ];

  return (
    <div className="flex flex-col gap-3 pt-1">
      <div className="bg-chart-1/10 border border-chart-1/30 rounded-2xl p-5 text-center">
        <p className="text-[10px] tracking-widest text-muted-foreground uppercase mb-1">
          Estimated 1RM (Avg)
        </p>
        <p className="text-5xl font-black text-chart-1 leading-none">{avg}</p>
        <p className="text-sm font-medium text-chart-1 mt-0.5">kg</p>
        <p className="text-xs text-muted-foreground mt-2">
          from {weight} kg x {reps} reps
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {formulas.map((formula) => (
          <div
            key={formula.label}
            className="bg-muted/40 border border-border rounded-xl p-3 text-center"
          >
            <p className="text-[10px] tracking-widest text-muted-foreground uppercase mb-1">
              {formula.label}
            </p>
            <p className="text-base font-semibold text-foreground">{formula.value}</p>
            <p className="text-[10px] text-muted-foreground">kg</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "Load/BW", value: ratios.loadBodyweightRatio },
          { label: "e1RM/BW", value: ratios.estimatedOneRepMaxBodyweightRatio },
        ].map((ratio) => (
          <div
            key={ratio.label}
            className="bg-muted/40 border border-border rounded-xl p-3 text-center"
          >
            <p className="text-[10px] tracking-widest text-muted-foreground uppercase mb-1">
              {ratio.label}
            </p>
            <p className="text-base font-semibold text-foreground">
              {formatPowerToWeightRatio(ratio.value)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
