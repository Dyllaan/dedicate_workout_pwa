import { cn } from "@/lib/utils";
import type { TrainingState } from "@/types/Insights";

type StatusBadgeProps = {
  status: TrainingState;
  children?: React.ReactNode;
  className?: string;
};

const statusToneClass: Record<TrainingState, string> = {
  TRUE_PLATEAU: "ui-status-plateau",
  FATIGUE_LIMITED: "ui-status-deload",
  LOAD_TOO_AGGRESSIVE: "ui-status-deload",
  IMPROVING: "ui-status-increase",
  UNDEREXPOSED: "ui-status-insufficient",
  TAPERING: "ui-status-neutral",
};

const statusLabel: Record<TrainingState, string> = {
  IMPROVING: "Trend is positive",
  UNDEREXPOSED: "Needs more recent exposures",
  FATIGUE_LIMITED: "Fatigue is masking performance",
  LOAD_TOO_AGGRESSIVE: "Load is ahead of readiness",
  TRUE_PLATEAU: "Genuinely stalled",
  TAPERING: "Taper / recovery phase",
};

export default function StatusBadge({
  status,
  children,
  className,
}: StatusBadgeProps) {
  return (
    <span className={cn("ui-status-badge", statusToneClass[status], className)}>
      {children ?? statusLabel[status]}
    </span>
  );
}
