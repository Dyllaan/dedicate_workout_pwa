import { Activity, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import type { WeeklyMuscleVolumeMuscle } from "@/features/heatmap/types/Heatmap";
import EmptyState from "@/components/layout/feedback/EmptyState";
import CollapsiblePanel from "@/components/layout/section/CollapsiblePanel";
import Panel from "@/components/layout/frames/Panel";
import Section from "@/components/layout/section/Section";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardWeeklyMuscleVolume } from "@/features/insights/hooks/useTrainingInsights";
import { MUSCLE_LABELS } from "@/features/heatmap/config/muscleMetadata";
import { formatExerciseLabel, formatShortDateTime } from "../utils/insightsUtils";
import { DashCardRow } from "@/components/layout/card/DashCardRow";

type TrackingStatus = "ON_TRACK" | "AHEAD" | "BEHIND" | "COMPLETED";

function formatSetCount(value: number) {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1).replace(/\.0$/, "");
}

const STATUS_GROUPS: { label: string; statuses: TrackingStatus[] }[] = [
  { label: "Completed", statuses: ["COMPLETED"] },
  { label: "Ahead", statuses: ["AHEAD"] },
  { label: "On track", statuses: ["ON_TRACK"] },
  { label: "Behind", statuses: ["BEHIND"] },
];

const STATUS_BAR_COLOR: Record<TrackingStatus, string> = {
  COMPLETED: "bg-green-600",
  AHEAD: "bg-amber-500",
  ON_TRACK: "bg-blue-500",
  BEHIND: "bg-red-500",
};

function MuscleBar({ muscle }: { muscle: WeeklyMuscleVolumeMuscle }) {
  const label = MUSCLE_LABELS[muscle.muscleId] ?? "Unknown muscle";
  const status: TrackingStatus = muscle.trackingStatus;
  const hasBreakdown = muscle.templateContributions.length > 0;

  const isAhead = status === "AHEAD";
  const baseSets = isAhead ? muscle.targetSets : muscle.completedSets;
  const overageSets = isAhead ? muscle.completedSets - muscle.targetSets : 0;

  const localMaxVal = Math.max(muscle.targetSets, muscle.completedSets, 1) * 1.15;

  const basePct = (baseSets / localMaxVal) * 100;
  const overagePct = (overageSets / localMaxVal) * 100;
  const targetPct = (muscle.targetSets / localMaxVal) * 100;

  const barColor = STATUS_BAR_COLOR[status];

  const trigger = (
    <div className="flex items-center gap-3 py-1">
      <span className="text-sm text-foreground w-28 shrink-0 truncate">{label}</span>
      <div className="relative flex-1 h-2.5 bg-muted rounded-full overflow-visible">
        <div
          className={`absolute h-2.5 rounded-l-full ${barColor}`}
          style={{ width: `${basePct}%`, left: 0 }}
        />
        {isAhead && (
          <div
            className="absolute h-2.5 rounded-r-full bg-amber-300"
            style={{ left: `${targetPct}%`, width: `${overagePct}%` }}
          />
        )}
        {muscle.targetSets > 0 && (
          <div
            className="absolute -top-1 -bottom-1 w-0.5 bg-foreground/50 rounded-full"
            style={{ left: `${targetPct}%` }}
          />
        )}
      </div>
      <span className="text-xs text-muted-foreground w-14 text-right tabular-nums shrink-0">
        {formatSetCount(muscle.completedSets)}
        {muscle.targetSets > 0 ? ` / ${formatSetCount(muscle.targetSets)}` : ""}
      </span>
    </div>
  );

  if (!hasBreakdown) {
    return <div className="border-b border-border last:border-0">{trigger}</div>;
  }

  return (
    <CollapsiblePanel
      trigger={trigger}
      className="border-0 rounded-none border-b border-border last:border-0"
      headerClassName="border-0 bg-transparent px-0 py-2"
      contentClassName="space-y-2 p-0 mx-0 mb-2"
    >
      {muscle.templateContributions.map((c) => (
        <div key={c.templateId} className="text-xs text-muted-foreground">
          <div className="flex justify-between">
            <span className="font-medium text-foreground">{c.templateName}</span>
            <span className="tabular-nums">
              {formatSetCount(c.completedSets)} / {formatSetCount(c.targetSets)} sets
            </span>
          </div>
          {c.liftContributions.length > 0 && (
            <p className="mt-0.5 leading-relaxed">
              {c.liftContributions
                .map((l) => formatExerciseLabel(l.exerciseName, l.variant))
                .join(", ")}
            </p>
          )}
        </div>
      ))}
    </CollapsiblePanel>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-24 rounded-full" />
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-8 rounded-lg" />
      ))}
    </div>
  );
}

export default function InsightsVolumePanel() {
  const [targetWeekStart, setTargetWeekStart] = useState<string | undefined>();
  const { data, isLoading } = useDashboardWeeklyMuscleVolume(targetWeekStart); 
  const [showInactive, setShowInactive] = useState(false);

  if (isLoading) {
    return (
      <Section icon={Activity} title="Weekly training load" subtitle="Set balance across muscles this week.">
        <LoadingSkeleton />
      </Section>
    );
  }

  if (!data || data.muscles.length === 0) {
    return (
      <Section icon={Activity} title="Weekly training load" subtitle="Set balance across muscles this week.">
        <EmptyState
          title="No weekly load data yet."
          description="Keep logging sessions and the set balance for this week will appear here."
          icon={Activity}
        />
      </Section>
    );
  }

  const inactiveCount = data.muscles.filter(
    (m) => m.targetSets <= 0 && m.completedSets <= 0
  ).length;

  const visibleMuscles = showInactive
    ? data.muscles
    : data.muscles.filter((m) => m.targetSets > 0 || m.completedSets > 0);

  return (
    <Panel
      icon={Activity}
      title="Weekly training load"
      subtitle={`Set balance across muscles this week (${formatShortDateTime(data.weekStart)} to ${formatShortDateTime(data.weekEnd)}).`}
      actions={
        inactiveCount > 0 ? (
          <Button
            type="button"
            icon={showInactive ? EyeOff : Eye}
            size="sm"
            onClick={() => setShowInactive((v) => !v)}
          >
            {showInactive ? "Hide inactive" : `Show ${inactiveCount} inactive`}
          </Button>
        ) : undefined
      }
    >
      <DashCardRow 
        variant="datepicker" 
        label="Week start" 
        description={formatShortDateTime(data.weekStart)} 
        onDateConfirm={setTargetWeekStart}
        defaultValue={data.weekStart}
        derived 
      />
      {STATUS_GROUPS.map((group) => {
        const rows = visibleMuscles.filter((m) =>
          group.statuses.includes(m.trackingStatus as TrackingStatus)
        );
        if (rows.length === 0) return null;
        return (
          <div key={group.label} className="mb-4">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60 mb-1">
              {group.label}
            </p>
            {rows.map((muscle) => (
              <MuscleBar key={muscle.muscleId} muscle={muscle} />
            ))}
          </div>
        );
      })}
    </Panel>
  );
}