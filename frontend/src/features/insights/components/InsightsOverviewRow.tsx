import { Badge } from "@/components/ui/badge";
import StatusBadge from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import type { SignalTone, TrainingState } from "@/types/Insights";

type InsightsOverviewRowProps = {
  overline: string;
  title: string;
  description?: string;
  reasoning?: string;
  trainingState?: TrainingState | null;
  actionLabel?: string | null;
  tone?: SignalTone;
};

const BORDER_TONES: Record<SignalTone, string> = {
  neutral: "from-border via-muted/70 to-border",
  positive: "from-emerald-600 via-teal-400 to-emerald-700 dark:from-emerald-500 dark:via-cyan-400 dark:to-emerald-600",
  warning: "from-amber-500 via-orange-400 to-amber-600 dark:from-amber-500 dark:via-yellow-400 dark:to-orange-500",
  danger: "from-red-600 via-rose-400 to-red-700 dark:from-red-500 dark:via-pink-500 dark:to-rose-600",
};

export default function InsightsOverviewRow({
  overline,
  title,
  description,
  reasoning,
  trainingState,
  actionLabel,
  tone = "neutral",
}: InsightsOverviewRowProps) {
  return (
    <article className="relative overflow-hidden rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div
        className={cn(
          "absolute left-0 top-0 h-full w-[3px] bg-gradient-to-b",
          BORDER_TONES[tone],
        )}
        aria-hidden="true"
      />

      <div className="flex flex-col gap-4 pl-4 sm:pl-5 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {overline}
          </p>
          <h3 className="break-words text-base font-semibold leading-snug text-foreground sm:text-lg">
            {title}
          </h3>
          {description ? (
            <p className="break-words text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
          {reasoning ? (
            <p className="break-words text-sm leading-relaxed text-muted-foreground">
              {reasoning}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {trainingState ? <StatusBadge status={trainingState} className="text-[11px]" /> : null}
            {actionLabel ? (
              <Badge variant="outline" className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {actionLabel.replace(/_/g, " ").toLowerCase()}
              </Badge>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
