import { Skeleton } from "../ui/skeleton";
import { useUnitPreference } from "@/hooks/useUnitPreference";
import type { DashboardSummaryTopLift } from "@/types/Workout";
import { Clock3 } from "lucide-react";
import { formatDateShort } from "@/utils/date";

type LiftSummaryCardProps = {
  liftSummary?: DashboardSummaryTopLift | null;
  isLoading?: boolean;
};

function LoadingState() {
  return (
    <div className="border-b border-border">
      <div className="mx-auto py-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <Skeleton className="h-3 w-16 mb-1" />
            <Skeleton className="h-5 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 px-4 pb-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-muted/50 rounded-lg p-2.5">
              <Skeleton className="h-2 w-12 mb-1" />
              <Skeleton className="h-4 w-10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function MiniLiftSummaryCard({ liftSummary, isLoading = false }: LiftSummaryCardProps) {
  const { format } = useUnitPreference();

  if (!isLoading && !liftSummary) {
    return null;
  }

  if (isLoading) {
    return <LoadingState />;
  }

  if (!liftSummary) {
    return null;
  }

  const hasMostRecentSet =
    liftSummary.mostRecentTopSetWeightKg != null &&
    liftSummary.mostRecentTopSetReps != null;
  const mostRecentWeight = liftSummary.mostRecentTopSetWeightKg;
  const mostRecentReps = liftSummary.mostRecentTopSetReps;
  const mostRecentPerformedAt = liftSummary.mostRecentTopSetPerformedAt;
  const mostRecentEstimatedOneRepMaxKg = liftSummary.mostRecentEstimatedOneRepMaxKg;
  const renderSetSummary = (
    label: string,
    weight: number | null | undefined,
    reps: number | null | undefined,
    performedAt: string | null | undefined,
    estimatedOneRepMaxKg: number | null | undefined,
  ) => {
    if (weight == null || reps == null) {
      return null;
    }

    return (
      <div className="mt-4 rounded-2xl border border-dashed border-muted/50 bg-muted/20 px-4 py-3">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <Clock3 className="h-4 w-4" />
          {label}
        </div>
        <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <div className="text-sm font-medium text-foreground">
            {format(weight)} x {reps}
          </div>
          {performedAt ? (
            <div className="text-xs text-muted-foreground">
              {formatDateShort(performedAt)}
            </div>
          ) : null}
        </div>
        {estimatedOneRepMaxKg != null ? (
          <div className="mt-1 text-xs text-muted-foreground">
            e1RM {format(estimatedOneRepMaxKg)}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div>
      {renderSetSummary(
        "Best set",
        liftSummary.topSetWeightKg,
        liftSummary.topSetReps,
        liftSummary.personalBestTopSetPerformedAt,
        liftSummary.estimatedOneRepMaxKg,
      )}
      {hasMostRecentSet
        ? renderSetSummary(
          "Most recent set",
          mostRecentWeight,
          mostRecentReps,
          mostRecentPerformedAt,
          mostRecentEstimatedOneRepMaxKg,
        )
        : null}
    </div>
  );
}
