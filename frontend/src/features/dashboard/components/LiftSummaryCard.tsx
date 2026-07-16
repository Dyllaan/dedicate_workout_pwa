import { Skeleton } from "@/components/ui/skeleton";
import { formatPowerToWeightRatio } from "@/utils/powerToWeightRatio";
import StatGrid from "@/components/ui/StatGrid";
import StatTile from "@/components/ui/stat-tile";
import Section from "@/components/layout/Section";
import { DashCardRow } from "@/components/layout/card/DashCardRow";
import { ICONS } from "@/config/iconConfig";
import { useUnitPreference } from "@/hooks/useUnitPreference";
import type { DashboardSummaryTopLift } from "@/types/Workout";
import { Gauge, Scale, TrendingUp, Trophy, History, ChevronRight, Clock3 } from "lucide-react";
import {Link} from "react-router-dom";
import { formatDateShort } from "@/utils/date";

type LiftSummaryCardProps = {
  liftSummary?: DashboardSummaryTopLift | null;
  isLoading?: boolean;
  ghostText?: string;
  ghostLink?: string;
  ghostLinkText?: string;
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


const GHOST_STATS = [
  { label: "SESSIONS", value: "12", icon: History },
  { label: "BEST", value: "140 kg", icon: Trophy },
  { label: "GAINED", value: "+10 kg", icon: TrendingUp },
];

const GHOST_PTW_STATS = [
  { label: "Load/BW", value: "1.8×" },
  { label: "e1RM/BW", value: "2.1×" },
];

function GhostState({ghostText, ghostLink, ghostLinkText} : {ghostText: string, ghostLink: string, ghostLinkText: string}) {
  return (
      <Section divided={false} className="border-0 relative">
        <div className="absolute inset-0 z-10 flex flex-col gap-2 items-center justify-center rounded-lg backdrop-blur-[2px] bg-background/40">
          <span className="text-xs text-muted-foreground">{ghostText}</span>
          <Link to={ghostLink} className="text-sm text-primary hover:underline flex flex-row items-center justify-center">
            {ghostLinkText}
            <ChevronRight size={16} />
          </Link>
        </div>
        <div className="opacity-25 pointer-events-none select-none">
          <DashCardRow
              label="Top Lift: Squat"
              icon={ICONS.workout}
              actionLabel="See Insights"
              to="/insights"
          />
          <StatGrid cols={3} className="text-xs">
            {GHOST_STATS.map((stat) => (
                <StatTile icon={stat.icon} key={stat.label} label={stat.label} value={stat.value} />
            ))}
            {GHOST_PTW_STATS.map((stat) => (
                <StatTile icon={Gauge} key={stat.label} label={stat.label} value={stat.value} />
            ))}
            <StatTile icon={Scale} label="BW" value="85 kg" />
          </StatGrid>
        </div>
      </Section>
  );
}

export default function LiftSummaryCard({ liftSummary, isLoading = false, ghostText = "Log a workout to unlock", ghostLink = "/workout/create?tab=details", ghostLinkText = "Create a workout" }: LiftSummaryCardProps) {
  const { format, toDisplay, unit } = useUnitPreference();

  if(!isLoading && !liftSummary) {
    return <GhostState ghostText={ghostText} ghostLink={ghostLink} ghostLinkText={ghostLinkText} />;
  }

  if (isLoading) {
    return <LoadingState />;
  }

  if (!liftSummary) {
    return null;
  }

  const powerToWeightStats = [
    { label: "Load/BW", value: liftSummary.loadBodyweightRatio },
    { label: "e1RM/BW", value: liftSummary.estimatedOneRepMaxBodyweightRatio },
  ];
  const bestSetContext = liftSummary.personalBestTopSetPerformedAt
    ? `best set on ${formatDateShort(liftSummary.personalBestTopSetPerformedAt)}`
    : null;
  const gainContext = liftSummary.improvementBaselineTopSetPerformedAt
    ? `vs ${formatDateShort(liftSummary.improvementBaselineTopSetPerformedAt)}`
    : null;
  const bodyweightContext = liftSummary.bodyweightLoggedAt
    ? `bodyweight recorded on ${formatDateShort(liftSummary.bodyweightLoggedAt)}`
    : null;
  const hasMostRecentSet =
    liftSummary.mostRecentTopSetWeightKg != null &&
    liftSummary.mostRecentTopSetReps != null;
  const mostRecentWeight = liftSummary.mostRecentTopSetWeightKg;
  const mostRecentReps = liftSummary.mostRecentTopSetReps;
  const mostRecentPerformedAt = liftSummary.mostRecentTopSetPerformedAt;
  const mostRecentEstimatedOneRepMaxKg = liftSummary.mostRecentEstimatedOneRepMaxKg;

  return (
    <div>
      <DashCardRow
        label={`Top Lift: ${liftSummary.variant ? `${liftSummary.exerciseName} (${liftSummary.variant})` : liftSummary.exerciseName}`}
        icon={ICONS.workout}
        actionLabel="See Insights"
        to={`/insights?tab=lift&exerciseDefinitionId=${liftSummary.exerciseDefinitionId}&exercise=${liftSummary.exerciseDefinitionId}`}
      />
      <StatGrid cols={3} className="text-xs">
        {[
          { label: "SESSIONS", value: String(liftSummary.sessionCount), icon: History },
          {
            label: "BEST",
            value: format(liftSummary.personalBestKg),
            supportingText: bestSetContext ?? undefined,
            icon: Trophy,
          },
          {
            label: "GAINED",
            value: `${liftSummary.improvementKg >= 0 ? "+" : ""}${format(liftSummary.improvementKg)}`,
            supportingText: gainContext ?? undefined,
            icon: TrendingUp,
          },
        ].map((stat) => (
          <StatTile
            icon={stat.icon}
            key={stat.label}
            label={stat.label}
            value={stat.value}
            supportingText={stat.supportingText}
          />
        ))}
        {powerToWeightStats.map((stat) => (
          <StatTile icon={Gauge} key={stat.label} label={stat.label} value={stat.value ? formatPowerToWeightRatio(stat.value) : undefined}  />
        ))}
        <StatTile
            icon={Scale}
            label="BW"
            value={liftSummary.bodyweightKg ? `${toDisplay(liftSummary.bodyweightKg)} ${unit}` : undefined}
            supportingText={bodyweightContext ?? undefined}
        />
      </StatGrid>
      {hasMostRecentSet ? (
        <div className="mt-4 rounded-2xl border border-dashed border-muted/50 bg-muted/20 px-4 py-3">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Clock3 className="h-4 w-4" />
            Most recent set
          </div>
          <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <div className="text-sm font-medium text-foreground">
              {format(mostRecentWeight!)} x {mostRecentReps}
            </div>
            {mostRecentPerformedAt ? (
              <div className="text-xs text-muted-foreground">
                {formatDateShort(mostRecentPerformedAt)}
              </div>
            ) : null}
          </div>
          {mostRecentEstimatedOneRepMaxKg != null ? (
            <div className="mt-1 text-xs text-muted-foreground">
              e1RM {format(mostRecentEstimatedOneRepMaxKg)}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
