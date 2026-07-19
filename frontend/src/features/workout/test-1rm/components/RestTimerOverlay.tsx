import { useTestRestTimer } from "../hooks/useTestRestTimer";
import { Clock } from "lucide-react";

type RestTimerOverlayProps = {
  restStartedAt: number | null;
  targetSeconds: number;
  onSkip: () => void;
};

export default function RestTimerOverlay({
  restStartedAt,
  targetSeconds,
  onSkip,
}: RestTimerOverlayProps) {
  const { isActive, isOverTarget, displayLabel } =
    useTestRestTimer(restStartedAt, targetSeconds);

  if (!isActive) return null;

  return (
    <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Clock className="h-5 w-5 text-primary" />
        <span className="text-sm font-semibold text-primary">
          {isOverTarget ? "Ready to go" : "Rest period"}
        </span>
      </div>
      <p className="text-3xl font-semibold tracking-tight tabular-nums">
        {displayLabel}
      </p>
      {isOverTarget ? (
        <p className="text-xs text-muted-foreground">
          Rest complete. Continue when ready.
        </p>
      ) : (
        <button
          type="button"
          onClick={onSkip}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Skip rest
        </button>
      )}
    </div>
  );
}
