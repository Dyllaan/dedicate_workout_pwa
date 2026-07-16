import type { Block, Week } from "@/types/Periodisation";
import { Flame, Zap, BarChart2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const BLOCK_TYPE_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  HYPERTROPHY: { label: "Hypertrophy", icon: <BarChart2 className="h-3 w-3" />, color: "text-blue-400" },
  STRENGTH:    { label: "Strength",    icon: <Zap className="h-3 w-3" />,       color: "text-yellow-400" },
  PEAKING:     { label: "Peaking",     icon: <Flame className="h-3 w-3" />,     color: "text-red-400" },
};

export function ProgrammeContextBanner({
  block,
  week,
}: {
  block: Block;
  week: Week;
}) {
  const typeInfo = BLOCK_TYPE_LABELS[block.blockType];

  return (
    <div className={cn(
      "rounded-2xl border border-border bg-card px-4 py-3",
      week.isDeload && "border-amber-500/30 bg-amber-500/5"
    )}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className={cn("flex items-center gap-1 text-xs font-semibold", typeInfo?.color)}>
            {typeInfo?.icon}
            {block.name}
          </span>
          <span className="text-muted-foreground/40 text-xs">·</span>
          <span className="text-xs text-muted-foreground">
            Week {week.weekNumber} of {block.durationWeeks}
          </span>
        </div>

        {week.isDeload && (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">
            <AlertTriangle className="h-2.5 w-2.5" />
            Deload
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
        <span>
          <span className="text-foreground font-medium">{block.repRangeMin}–{block.repRangeMax}</span> reps
        </span>
        <span className="text-border">|</span>
        <span>
          RPE <span className="text-foreground font-medium">{block.targetRpeMin}–{block.targetRpeMax}</span>
        </span>
        <span className="text-border">|</span>
        <span>
          <span className="text-foreground font-medium">{week.targetSetsPerExercise}</span> sets/exercise
        </span>
      </div>
    </div>
  );
}