import { useEffect, useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, BarChart3, ChevronDown, Dumbbell, LineChart, Minus, Sparkles, Target, TrendingUp } from "lucide-react";
import { useSearchParams } from "react-router-dom";

import SimpleBarChart from "@/components/charts/SimpleBarChart.tsx";
import EmptyState from "@/components/layout/feedback/EmptyState.tsx";
import ErrorState from "@/components/layout/feedback/ErrorState.tsx";
import LoadingState from "@/components/layout/feedback/LoadingState.tsx";
import Page from "@/components/layout/frames/Page.tsx";
import CollapsibleSection from "@/components/layout/section/CollapsibleSection";
import SummaryHero from "@/components/ui/SummaryHero";
import { SelectionChip } from "@/components/ui";
import { Button } from "@/components/ui/button.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import StatGrid from "@/components/ui/StatGrid.tsx";
import StatTile from "@/components/ui/stat-tile.tsx";
import useProgressQuery from "@/features/progress/hooks/useProgressQuery.ts";
import useChart from "@/features/progress/hooks/useChart.ts";
import { useExerciseHistory } from "@/features/workout/exercise-definitions/hooks/useExerciseHistory.ts";
import { useAnalysisExerciseOptions, useTemplateAnalysisRecommendation } from "@/features/analysis/hooks/useAnalysis.ts";
import { useUnitPreference } from "@/features/preferences/unit/hooks/useUnitPreference.ts";
import ExerciseSetsTable from "@/features/workout/components/ExerciseSetsTable";
import { cn } from "@/lib/utils.ts";
import { formatShortDateTime, formatStatusToken } from "../../insights/utils/insightsUtils.ts";

function formatMetricValue(value: number, unit: string) {
  if (unit === "%") {
    return `${value.toFixed(2)}%`;
  }

  return value.toFixed(1);
}

function formatDelta(value: number, unit: string) {
  const formatted = formatMetricValue(Math.abs(value), unit);

  if (value > 0) {
    return `+${formatted}`;
  }

  if (value < 0) {
    return `-${formatted}`;
  }

  return formatted;
}

function formatWeight(value: number, formatter: (value: number) => string) {
  return formatter(value);
}

export default function ProgressPanel() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { format } = useUnitPreference();
  const optionsQuery = useAnalysisExerciseOptions();
  const canonicalExerciseDefinitionId = searchParams.get("exerciseDefinitionId")?.trim() ?? "";
  const legacyExerciseDefinitionId = searchParams.get("exercise")?.trim() ?? "";
  const rawSelectedExerciseDefinitionId = canonicalExerciseDefinitionId || legacyExerciseDefinitionId;

  const selectedOption = useMemo(() => {
    if (!rawSelectedExerciseDefinitionId) {
      return null;
    }

    return optionsQuery.options.find((option) => option.exerciseDefinitionId === rawSelectedExerciseDefinitionId) ?? null;
  }, [optionsQuery.options, rawSelectedExerciseDefinitionId]);

  const defaultOption = optionsQuery.options[0] ?? null;
  const activeOption = selectedOption ?? defaultOption;
  const activeExerciseDefinitionId = activeOption?.exerciseDefinitionId ?? "";

  const recommendationQuery = useTemplateAnalysisRecommendation(activeOption?.templateId ?? null);
  const progressQuery = useProgressQuery({ exerciseDefinitionId: activeExerciseDefinitionId });
  const historyQuery = useExerciseHistory(activeExerciseDefinitionId, { limit: 8 });
  const chartUnit = progressQuery.chartData?.unit ?? "";
  const {
    deltaValue,
    comparisonLabel,
    comparisonValueLabel,
    currentValueLabel,
    useWeightFormatting,
    seriesRows,
  } = useChart(progressQuery.chartData, chartUnit);
  const historyChartData = useMemo(
    () =>
      historyQuery.sessions
        .slice()
        .reverse()
        .map((session) => ({
          ...session,
          formattedDate: formatShortDateTime(session.performedAt),
        })),
    [historyQuery.sessions],
  );

  useEffect(() => {
    if (optionsQuery.options.length === 0) {
      return;
    }

    const nextExerciseDefinitionId = activeOption?.exerciseDefinitionId;

    if (!nextExerciseDefinitionId) {
      return;
    }

    if (
      canonicalExerciseDefinitionId === nextExerciseDefinitionId &&
      (legacyExerciseDefinitionId === nextExerciseDefinitionId || legacyExerciseDefinitionId === "")
    ) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tab", "lift");
    nextParams.set("exerciseDefinitionId", nextExerciseDefinitionId);
    nextParams.set("exercise", nextExerciseDefinitionId);
    setSearchParams(nextParams, { replace: true });
  }, [
    activeOption?.exerciseDefinitionId,
    canonicalExerciseDefinitionId,
    legacyExerciseDefinitionId,
    optionsQuery.options.length,
    searchParams,
    setSearchParams,
  ]);

  const updateSelection = (exerciseDefinitionId: string) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tab", "lift");
    nextParams.set("exerciseDefinitionId", exerciseDefinitionId);
    nextParams.set("exercise", exerciseDefinitionId);
    setSearchParams(nextParams);
  };

  const exercisePicker = (
    <Select value={activeExerciseDefinitionId} onValueChange={updateSelection}>
      <SelectTrigger aria-label="Lift picker" className="w-full min-w-[220px] sm:w-[260px]">
        <SelectValue placeholder="Choose a lift" />
      </SelectTrigger>
      <SelectContent>
        {optionsQuery.options.map((option) => (
          <SelectItem key={option.exerciseDefinitionId} value={option.exerciseDefinitionId}>
            {option.exerciseName}
            {option.variant ? ` (${option.variant})` : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  if (optionsQuery.isLoading && optionsQuery.options.length === 0) {
    return (
      <Page
        title="Lift detail"
        subtitle="A single place for estimates, trend, and history."
        icon={BarChart3}
        actions={exercisePicker}
      >
        <LoadingState rows={4} />
      </Page>
    );
  }

  if (optionsQuery.error) {
    return (
      <Page
        title="Lift detail"
        subtitle="A single place for estimates, trend, and history."
        icon={BarChart3}
        actions={exercisePicker}
      >
        <CollapsibleSection icon={Sparkles} title="Exercise picker" defaultExpanded>
          <ErrorState
            title="We could not load your lift list."
            description="The lift detail view is built from focused exercises in your workout templates. Try again to refresh the list."
            action={(
              <Button icon={undefined} onClick={() => optionsQuery.refetch()}>
                Retry
              </Button>
            )}
          />
        </CollapsibleSection>
      </Page>
    );
  }

  if (!activeOption) {
    return (
      <Page
        title="Lift detail"
        subtitle="A single place for estimates, trend, and history."
        icon={BarChart3}
      >
        <EmptyState
          title="No eligible lifts yet."
          description="Add a focused exercise with a definition id to a workout template, then come back to review its estimates and history."
          icon={BarChart3}
        />
      </Page>
    );
  }

  const recommendation = recommendationQuery.data ?? null;
  const historySessions = historyQuery.sessions;

  const heroTiles = useMemo(() => [
    { label: "Best", value: historyQuery.bestKg > 0 ? format(historyQuery.bestKg) : "—" },
    { label: "Latest", value: historySessions.length > 0 && historySessions[0].topWeightKg > 0 ? format(historySessions[0].topWeightKg) : "—" },
    { label: "Sessions", value: historyQuery.sessionCount },
  ], [historyQuery.bestKg, historyQuery.sessionCount, historySessions, format]);

  return (
    <Page
      title="Lift detail"
      subtitle="A single place for estimates, trend, and history."
      icon={BarChart3}
      actions={exercisePicker}
      contentClassName="space-y-5"
    >
      <SummaryHero tiles={heroTiles} className="px-1" />

      <CollapsibleSection
        icon={Sparkles}
        title={activeOption.exerciseName}
        summary={recommendation ? `${format(recommendation.suggestion.suggestedWeightKg)} · ${formatStatusToken(recommendation.suggestion.type)}` : undefined}
        defaultExpanded
      >
        {recommendationQuery.isLoading ? (
          <LoadingState rows={3} />
        ) : recommendationQuery.error ? (
          <ErrorState
            title="Analysis unavailable"
            description={recommendationQuery.error instanceof Error ? recommendationQuery.error.message : "The recommendation request failed."}
            action={(
              <Button icon={undefined} onClick={() => recommendationQuery.refetch()}>
                Retry
              </Button>
            )}
          />
        ) : recommendation ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <StatTile label="Suggested" icon={TrendingUp} value={formatWeight(recommendation.suggestion.suggestedWeightKg, format)} size="sm" />
              <StatTile label="Trend" icon={LineChart} value={formatStatusToken(recommendation.trend.direction) ?? "-"} size="sm" />
            </div>
            <div className="grid gap-3 rounded-2xl border border-border bg-muted/20 p-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Reasoning</p>
                <p className="mt-2 text-sm leading-relaxed text-foreground">{recommendation.suggestion.reasoning}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Plateau</p>
                <p className="mt-2 text-sm leading-relaxed text-foreground">{recommendation.plateau.reason}</p>
              </div>
            </div>
          </div>
        ) : (
          <EmptyState
            title="No analysis yet."
            description="Choose a lift to load the local recommendation and trend summary."
            icon={Sparkles}
          />
        )}
      </CollapsibleSection>

      <CollapsibleSection
        icon={LineChart}
        title="Estimates"
        summary={seriesRows.length > 0 && currentValueLabel ? `${currentValueLabel}${deltaValue != null ? ` · ${deltaValue > 0 ? "↑" : deltaValue < 0 ? "↓" : "→"} ${formatDelta(deltaValue, useWeightFormatting ? "" : chartUnit)}` : ""}` : undefined}
        defaultExpanded
      >
        {progressQuery.isChartLoading ? (
          <LoadingState rows={2} />
        ) : progressQuery.chartError ? (
          <ErrorState
            title="Estimates unavailable"
            description={progressQuery.chartError instanceof Error ? progressQuery.chartError.message : "The estimates query failed."}
            action={(
              <Button icon={undefined} onClick={() => progressQuery.refetchChart()}>
                Retry
              </Button>
            )}
          />
        ) : seriesRows.length > 0 ? (
          <div className="space-y-4">
            {deltaValue != null ? (
              <div className="rounded-2xl border border-border bg-card p-4">
                <p
                  className={cn(
                    "inline-flex items-center gap-1.5 text-sm font-medium",
                    deltaValue === 0
                      ? "text-muted-foreground"
                      : deltaValue > 0
                        ? "text-emerald-600"
                        : "text-destructive",
                  )}
                >
                  {deltaValue > 0 ? (
                    <>
                      <ArrowUpRight className="h-4 w-4" />
                      {formatDelta(deltaValue, useWeightFormatting ? "" : chartUnit)} vs {comparisonLabel}
                    </>
                  ) : deltaValue < 0 ? (
                    <>
                      <ArrowDownRight className="h-4 w-4" />
                      {formatDelta(deltaValue, useWeightFormatting ? "" : chartUnit)} vs {comparisonLabel}
                    </>
                  ) : (
                    <>
                      <Minus className="h-4 w-4" />
                      Flat vs {comparisonLabel}
                    </>
                  )}
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <StatTile label="Current" value={currentValueLabel} />
                  <StatTile label="Previous" value={comparisonValueLabel ?? "-"} />
                  <StatTile label="Change" value={deltaValue != null ? formatDelta(deltaValue, useWeightFormatting ? "" : chartUnit) : "-"} />
                </div>
              </div>
            ) : null}

            <SimpleBarChart
              data={seriesRows}
              labelKey="label"
              valueKey="value"
              height={240}
              rowHeight={60}
              xAxisLabel={useWeightFormatting ? "Weight" : chartUnit === "%" ? "Percent" : "Value"}
              yAxisLabel="Date"
              valueFormatter={(value) => (useWeightFormatting ? `${value.toFixed(1)} kg` : formatMetricValue(value, chartUnit))}
              barColor="#6366f1"
            />

            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-1.5">
                {["BEST_SET_E1RM", "MAX_WEIGHT", "WORKING_WEIGHT"].map((metric) => (
                  <SelectionChip
                    key={metric}
                    size="sm"
                    selected={progressQuery.activeMetric === metric}
                    onClick={() => progressQuery.handleMetricChange(metric)}
                    className="min-w-9 px-3"
                  >
                    {metric === "BEST_SET_E1RM" ? "e1RM" : metric === "MAX_WEIGHT" ? "Max Weight" : "Working Weight"}
                  </SelectionChip>
                ))}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {["ABSOLUTE", "BASELINE_PERCENT"].map((mode) => (
                  <SelectionChip
                    key={mode}
                    size="sm"
                    selected={progressQuery.activeProgressComparisonMode === mode}
                    onClick={() => progressQuery.handleComparisonModeChange(mode)}
                    className="min-w-9 px-3"
                  >
                    {mode === "ABSOLUTE" ? "Absolute" : "vs Baseline %"}
                  </SelectionChip>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <EmptyState
            title="No estimate data yet."
            description="Choose a lift to load its recent estimate points."
            icon={LineChart}
          />
        )}
      </CollapsibleSection>

      <CollapsibleSection
        icon={Dumbbell}
        title="History"
        summary={`${historyQuery.sessionCount} sessions · best ${historyQuery.bestKg > 0 ? format(historyQuery.bestKg) : "—"}`}
        defaultExpanded={false}
      >
        {historyQuery.isLoading ? (
          <LoadingState rows={3} />
        ) : historyQuery.isError ? (
          <ErrorState
            title="History unavailable"
            description={historyQuery.error instanceof Error ? historyQuery.error.message : "The workout history request failed."}
            action={(
              <Button icon={undefined} onClick={() => historyQuery.refetch()}>
                Retry
              </Button>
            )}
          />
        ) : historySessions.length > 0 ? (
          <div className="space-y-4">
            <StatGrid cols={3}>
              <StatTile label="All-time best" icon={TrendingUp} value={historyQuery.bestKg > 0 ? format(historyQuery.bestKg) : "—"} />
              <StatTile label="Recent sessions" icon={Dumbbell} value={historyQuery.sessionCount} />
              <StatTile label="Latest session" icon={LineChart} value={historySessions[0] ? format(historySessions[0].topWeightKg) : "—"} />
            </StatGrid>

            {historyChartData.length > 0 ? (
              <SimpleBarChart
                data={historyChartData}
                labelKey="formattedDate"
                valueKey="topWeightKg"
                valueFormatter={format}
                xAxisLabel="Top Weight"
                yAxisLabel="Date"
                seriesLabel="Max Weight"
                height={240}
                rowHeight={60}
              />
            ) : null}

            <div className="space-y-3">
              {historySessions.map((session) => (
                <HistoryCard key={session.entryId} session={session} format={format} />
              ))}
            </div>
          </div>
        ) : (
          <EmptyState
            title="No history yet."
            description="Train this lift a few times and the recent session list will appear here."
            icon={Dumbbell}
          />
        )}
      </CollapsibleSection>
    </Page>
  );
}

function HistoryCard({ session, format: fmt }: { session: ReturnType<typeof useExerciseHistory>['sessions'][number]; format: (v: number) => string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-border bg-card">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left hover:bg-muted/5 transition-colors rounded-2xl"
        onClick={() => setOpen((prev) => !prev)}
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{formatShortDateTime(session.performedAt)}</p>
          {open ? <p className="text-xs text-muted-foreground">{session.templateName}</p> : null}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-sm font-semibold tabular-nums">{fmt(session.topWeightKg)}</span>
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
        </div>
      </button>
      {open ? (
        <div className="px-4 pb-4 space-y-2">
          <p className="text-xs text-muted-foreground">Volume {fmt(session.volumeKg)}</p>
          <ExerciseSetsTable sets={session.sets} format={fmt} />
        </div>
      ) : null}
    </div>
  );
}
