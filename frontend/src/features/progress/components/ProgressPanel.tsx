import { useEffect, useMemo } from "react";
import { ArrowDownRight, ArrowUpRight, BarChart3, Dumbbell, LineChart, Minus, Sparkles, Target, TrendingUp } from "lucide-react";
import { useSearchParams } from "react-router-dom";

import SimpleBarChart from "@/components/charts/SimpleBarChart.tsx";
import EmptyState from "@/components/layout/feedback/EmptyState.tsx";
import ErrorState from "@/components/layout/feedback/ErrorState.tsx";
import LoadingState from "@/components/layout/feedback/LoadingState.tsx";
import Page from "@/components/layout/section/Page.tsx";
import Section from "@/components/layout/Section.tsx";
import { SelectionChip } from "@/components/ui";
import { Button } from "@/components/ui/button.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import StatGrid from "@/components/ui/StatGrid.tsx";
import StatTile from "@/components/ui/stat-tile.tsx";
import useProgressQuery from "@/features/progress/hooks/useProgressQuery.ts";
import useChart from "@/features/progress/hooks/useChart.ts";
import { useExerciseHistory } from "@/hooks/workout/useExerciseHistory.ts";
import { useAnalysisExerciseOptions, useTemplateAnalysisRecommendation } from "@/hooks/workout/useAnalysis.ts";
import { useUnitPreference } from "@/hooks/useUnitPreference.ts";
import { cn } from "@/lib/utils.ts";
import { formatShortDateTime, formatStatusToken } from "../../insights/helpers/insightsUtils.ts";

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
        <Section icon={Sparkles} title="Exercise picker" subtitle="We could not load your lift list.">
          <ErrorState
            title="We could not load your lift list."
            description="The lift detail view is built from focused exercises in your workout templates. Try again to refresh the list."
            action={(
              <Button icon={undefined} onClick={() => optionsQuery.refetch()}>
                Retry
              </Button>
            )}
          />
        </Section>
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

  return (
    <Page
      title="Lift detail"
      subtitle="A single place for estimates, trend, and history."
      icon={BarChart3}
      actions={exercisePicker}
      contentClassName="space-y-5"
    >
      <Section
        icon={Sparkles}
        title={activeOption.exerciseName}
        subtitle={[
          activeOption.variant ? activeOption.variant : null,
          activeOption.templateName,
        ].filter(Boolean).join(" · ")}
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
            <StatGrid cols={4}>
              <StatTile
                label="Suggested weight"
                icon={TrendingUp}
                value={formatWeight(recommendation.suggestion.suggestedWeightKg, format)}
              />
              <StatTile
                label="Suggestion"
                icon={Target}
                value={formatStatusToken(recommendation.suggestion.type) ?? "-"}
              />
              <StatTile
                label="Trend"
                icon={LineChart}
                value={formatStatusToken(recommendation.trend.direction) ?? "-"}
              />
              <StatTile
                label="Comparable sessions"
                icon={BarChart3}
                value={recommendation.trend.comparableObservationCount}
              />
            </StatGrid>

            <div className="grid gap-3 rounded-2xl border border-border bg-muted/20 p-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Reasoning</p>
                <p className="mt-2 text-sm leading-relaxed text-foreground">
                  {recommendation.suggestion.reasoning}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Plateau</p>
                <p className="mt-2 text-sm leading-relaxed text-foreground">
                  {recommendation.plateau.reason}
                </p>
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
      </Section>

      <Section
        icon={LineChart}
        title="Estimates"
        subtitle="Recent estimate points and comparison controls for the selected lift."
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
      </Section>

      <Section
        icon={Dumbbell}
        title="History"
        subtitle="Recent logged sessions and the supporting set history."
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
                <div key={session.entryId} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{formatShortDateTime(session.performedAt)}</p>
                      <p className="text-xs text-muted-foreground">{session.templateName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">{format(session.topWeightKg)}</p>
                      <p className="text-xs text-muted-foreground">volume {format(session.volumeKg)}</p>
                    </div>
                  </div>
                </div>
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
      </Section>
    </Page>
  );
}
