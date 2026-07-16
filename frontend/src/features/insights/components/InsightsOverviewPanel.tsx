import { BarChart3, TableOfContents, TrendingUp } from "lucide-react";

import EmptyState from "@/components/layout/feedback/EmptyState";
import Section from "@/components/layout/Section";
import InsightsOverviewRow from "@/features/insights/components/InsightsOverviewRow";
import {
  formatExerciseLabel,
  formatRecommendedAction,
  formatStatusToken,
  trainingStateTone,
} from "../helpers/insightsUtils";
import type { InsightsOverviewModel, NextWorkoutSignal, PrioritySignal } from "@/types/Insights";
import type {DashboardSummaryTopLift} from "@/types/Workout.ts";

interface InsightsOverviewPanelProps {
  overview?: InsightsOverviewModel | null;
}

function buildLiftLabel(signal: NextWorkoutSignal | PrioritySignal | DashboardSummaryTopLift) {
  return formatExerciseLabel(signal.exerciseName, signal.variant);
}

function buildSignalDescription(signal: NextWorkoutSignal | PrioritySignal) {
  return [
    formatStatusToken(signal.exerciseType),
    formatStatusToken(signal.progressionMode),
    formatStatusToken(signal.primaryBenchmark),
  ]
    .filter(Boolean)
    .join(" • ");
}

function getReadinessCaveat(readiness: InsightsOverviewModel["readiness"]) {
  if (!readiness || readiness.points.length === 0) {
    return "No readiness history yet, so the recommendation is being driven by training history alone.";
  }

  if (readiness.averageReadinessScore >= 15) {
    return "Readiness looks strong, so the system can stay a little more assertive.";
  }

  if (readiness.averageReadinessScore <= 10) {
    return "Readiness has been muted lately, so the recommendation stays conservative.";
  }

  return "Readiness is mixed, so the call balances training load and recovery.";
}

function getEmptyStateVisible(overview?: InsightsOverviewModel | null) {
  if (!overview) {
    return true;
  }

  const dashboardSummary = overview.dashboardSummary;
  const hasDashboardData =
    (dashboardSummary != null &&
      (dashboardSummary.workoutTemplateCount > 0 ||
        dashboardSummary.splitCount > 0 ||
        Boolean(dashboardSummary.activeSplit) ||
        Boolean(dashboardSummary.topLift))) ||
    (overview.readiness?.points.length ?? 0) > 0;

  return !hasDashboardData && !overview.nextWorkout && !overview.blockSummary && overview.prioritySignals.length === 0;
}

function sameExercise(
  signal: NextWorkoutSignal | PrioritySignal,
  exerciseName: string,
  variant?: string | null,
) {
  return signal.exerciseName === exerciseName && (signal.variant ?? null) === (variant ?? null);
}

export function InsightsOverviewPanel({
  overview,
}: InsightsOverviewPanelProps) {
  if (getEmptyStateVisible(overview)) {
    return (
      <EmptyState
        title="No insights summary yet."
        description="Keep logging powerlifting-relevant sessions and the live insights will fill in here."
        icon={BarChart3}
      />
    );
  }

  const dashboardSummary = overview?.dashboardSummary;
  const nextWorkout = overview?.nextWorkout;
  const blockSummary = overview?.blockSummary;
  const readiness = overview?.readiness ?? null;
  const prioritySignals = (overview?.prioritySignals ?? [])
    .slice()
    .sort((left, right) => left.rank - right.rank)
    .filter((signal) => !nextWorkout || !sameExercise(signal, nextWorkout.exerciseName, nextWorkout.variant))
    .slice(0, 3);

  const topLift = dashboardSummary?.topLift ?? null;
  const readinessState =
    readiness?.averageReadinessScore != null && readiness.averageReadinessScore >= 15
      ? "IMPROVING"
      : readiness?.averageReadinessScore != null && readiness.averageReadinessScore <= 10
        ? "FATIGUE_LIMITED"
        : "TAPERING";

  const blockContextText = blockSummary?.blockContext
    ? `Week ${blockSummary.blockContext.currentWeek}/${blockSummary.blockContext.totalWeeks}${blockSummary.blockContext.deload ? " · deload" : ""}`
    : "The block summary comes from the live training analysis.";

  return (
    <div data-testid="smart-coach-overview-tab">
      <Section
        icon={TrendingUp}
        title="Highlights"
        subtitle="The most important calls, ordered for fast scanning."
      >
        {topLift ? (
          <InsightsOverviewRow
            overline="Top lift"
            title={buildLiftLabel(topLift)}
            description={`Personal best ${topLift.personalBestKg.toFixed(1)}kg across ${topLift.sessionCount} sessions`}
            trainingState="IMPROVING"
            tone={trainingStateTone("IMPROVING")}
          />
        ) : null}

        {nextWorkout ? (
          <InsightsOverviewRow
            overline="Next workout"
            title={buildLiftLabel(nextWorkout)}
            description={nextWorkout.workoutTemplateName}
            reasoning={nextWorkout.reasoning || "No additional reasoning is available yet."}
            trainingState={nextWorkout.trainingState}
            actionLabel={formatRecommendedAction(nextWorkout.suggestionType)}
            tone={trainingStateTone(nextWorkout.trainingState)}
          />
        ) : null}

        {prioritySignals.map((signal) => (
          <InsightsOverviewRow
            key={`${signal.rank}-${signal.exerciseName.trim()}-${signal.variant?.trim() ?? ""}`}
            overline={`#${signal.rank}`}
            title={buildLiftLabel(signal)}
            description={buildSignalDescription(signal)}
            reasoning={signal.reasoning || "No additional reasoning is available yet."}
            trainingState={signal.trainingState}
            tone={trainingStateTone(signal.trainingState)}
          />
        ))}

        {topLift == null && nextWorkout == null && prioritySignals.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
            No live signals yet. Keep training and the priority list will populate here.
          </div>
        ) : null}
      </Section>

      {(blockSummary || readiness) ? (
        <Section
          icon={TableOfContents}
          title="Context"
          subtitle="Short supporting context without the deep dive."
        >
          {blockSummary ? (
            <InsightsOverviewRow
              overline="Block summary"
              title={blockSummary.headline}
              description={blockSummary.focus}
              reasoning={blockContextText}
              trainingState={blockSummary.overallState}
              tone={trainingStateTone(blockSummary.overallState)}
            />
          ) : null}

          {readiness ? (
            <InsightsOverviewRow
              overline="Readiness"
              title={`${readiness.averageReadinessScore.toFixed(1)}/20`}
              description={getReadinessCaveat(readiness)}
              reasoning={`${readiness.points.length} check-ins over ${readiness.days} days`}
              trainingState={readinessState}
              tone={trainingStateTone(readinessState)}
            />
          ) : null}
        </Section>
      ) : null}
    </div>
  );
}
