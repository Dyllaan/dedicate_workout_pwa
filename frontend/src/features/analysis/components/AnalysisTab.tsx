import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BrainCircuit, LineChart, Sparkles, TrendingUp } from "lucide-react";
import { useSearchParams } from "react-router-dom";

import SimpleLineChart from "@/components/charts/SimpleLineChart.tsx";
import EmptyState from "@/components/layout/feedback/EmptyState.tsx";
import ErrorState from "@/components/layout/feedback/ErrorState.tsx";
import LoadingState from "@/components/layout/feedback/LoadingState.tsx";
import Section from "@/components/layout/section/Section.tsx";
import { DashCardRow } from "@/components/layout/card/DashCardRow.tsx";
import Panel from "@/components/layout/frames/Panel.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { SelectionChip } from "@/components/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import StatTile from "@/components/ui/stat-tile.tsx";
import CollapsibleSection from "@/components/layout/section/CollapsibleSection";
import SummaryHero from "@/components/ui/SummaryHero";
import { ICONS } from "@/config/iconConfig.ts";
import { useUnitPreference } from "@/features/preferences/unit/hooks/useUnitPreference.ts";
import { useAnalysisExerciseOptions, useTemplateAnalysisRecommendation } from "@/features/analysis/hooks/useAnalysis.ts";
import { formatShortDateTime, formatStatusToken } from "../../insights/utils/insightsUtils.ts";

type TrajectoryPreset = "all" | "30d" | "90d" | "custom";
const ANALYSIS_LIMIT_PARAM = "analysisLimit";
const ANALYSIS_START_DATE_PARAM = "analysisStartDate";
const ANALYSIS_END_DATE_PARAM = "analysisEndDate";
const ANALYSIS_PRESET_PARAM = "analysisPreset";

function parseLimit(value: string | null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(100, Math.max(1, parsed)) : 10;
}

type AnalysisRange = {
  limit: number;
  startDate: string;
  endDate: string;
  preset: TrajectoryPreset;
};

function readAnalysisRange(searchParams: URLSearchParams): AnalysisRange {
  const limit = parseLimit(searchParams.get(ANALYSIS_LIMIT_PARAM));
  const startDate = searchParams.get(ANALYSIS_START_DATE_PARAM)?.trim() ?? "";
  const endDate = searchParams.get(ANALYSIS_END_DATE_PARAM)?.trim() ?? "";
  const presetParam = searchParams.get(ANALYSIS_PRESET_PARAM);

  if (presetParam === "all") {
    return { limit, startDate: "", endDate: "", preset: "all" };
  }

  if (presetParam === "30d" || presetParam === "90d") {
    const range = buildPresetRange(presetParam === "30d" ? 30 : 90);
    return { limit, startDate: range.startDate, endDate: range.endDate, preset: presetParam };
  }

  if (presetParam === "custom" || startDate || endDate) {
    return { limit, startDate, endDate, preset: "custom" };
  }

  const defaultRange = buildPresetRange(30);
  return { limit, startDate: defaultRange.startDate, endDate: defaultRange.endDate, preset: "30d" };
}

function rangesMatch(left: AnalysisRange, right: AnalysisRange) {
  return left.limit === right.limit && left.startDate === right.startDate && left.endDate === right.endDate && left.preset === right.preset;
}

function formatDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildPresetRange(days: number) {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - days);

  return {
    startDate: formatDateInputValue(start),
    endDate: formatDateInputValue(end),
  };
}

function buildAnalysisRangeParams({
  limit,
  startDate,
  endDate,
  preset,
}: {
  limit: number;
  startDate: string;
  endDate: string;
  preset: TrajectoryPreset;
}) {
  return {
    [ANALYSIS_LIMIT_PARAM]: String(limit),
    [ANALYSIS_PRESET_PARAM]: preset,
    ...(startDate ? { [ANALYSIS_START_DATE_PARAM]: startDate } : {}),
    ...(endDate ? { [ANALYSIS_END_DATE_PARAM]: endDate } : {}),
  };
}

function formatNumber(value: number | null | undefined, digits = 1) {
  return value == null ? "--" : value.toFixed(digits);
}

export default function AnalysisTab() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { format } = useUnitPreference();
  const templatesQuery = useAnalysisExerciseOptions();
  const searchParamsString = searchParams.toString();
  const urlRange = useMemo(() => readAnalysisRange(searchParams), [searchParamsString]);
  const [draftRange, setDraftRange] = useState<AnalysisRange>(urlRange);
  const syncTimerRef = useRef<number | null>(null);

  const selectedExerciseDefinitionId = searchParams.get("exerciseDefinitionId")?.trim() ?? "";
  const selectedOption = useMemo(() => {
    if (!selectedExerciseDefinitionId) {
      return null;
    }

    return templatesQuery.options.find((option) => option.exerciseDefinitionId === selectedExerciseDefinitionId) ?? null;
  }, [selectedExerciseDefinitionId, templatesQuery.options]);

  const defaultOption = templatesQuery.options[0] ?? null;
  const activeOption = selectedOption ?? defaultOption;
  const activeTemplateId = activeOption?.templateId;

  const syncAnalysisRangeToUrl = useCallback((nextRange: AnalysisRange) => {
    if (rangesMatch(urlRange, nextRange)) {
      return;
    }

    const nextParams = new URLSearchParams(searchParamsString);
    nextParams.set("tab", "analysis");
    const nextExerciseDefinitionId = selectedExerciseDefinitionId || activeOption?.exerciseDefinitionId || "";
    if (nextExerciseDefinitionId) {
      nextParams.set("exerciseDefinitionId", nextExerciseDefinitionId);
    }

    const rangeParams = buildAnalysisRangeParams(nextRange);
    nextParams.set(ANALYSIS_LIMIT_PARAM, rangeParams[ANALYSIS_LIMIT_PARAM]);
    nextParams.set(ANALYSIS_PRESET_PARAM, rangeParams[ANALYSIS_PRESET_PARAM]);

    if (rangeParams[ANALYSIS_START_DATE_PARAM]) {
      nextParams.set(ANALYSIS_START_DATE_PARAM, rangeParams[ANALYSIS_START_DATE_PARAM]);
    } else {
      nextParams.delete(ANALYSIS_START_DATE_PARAM);
    }

    if (rangeParams[ANALYSIS_END_DATE_PARAM]) {
      nextParams.set(ANALYSIS_END_DATE_PARAM, rangeParams[ANALYSIS_END_DATE_PARAM]);
    } else {
      nextParams.delete(ANALYSIS_END_DATE_PARAM);
    }

    setSearchParams(nextParams, { replace: true });
  }, [activeOption?.exerciseDefinitionId, searchParamsString, selectedExerciseDefinitionId, setSearchParams, urlRange]);

  useEffect(() => {
    setDraftRange((current) => (rangesMatch(current, urlRange) ? current : urlRange));
  }, [urlRange]);

  useEffect(() => {
    if (syncTimerRef.current) {
      window.clearTimeout(syncTimerRef.current);
      syncTimerRef.current = null;
    }

    if (draftRange.preset !== "custom") {
      return;
    }

    syncTimerRef.current = window.setTimeout(() => {
      syncAnalysisRangeToUrl(draftRange);
    }, 350);

    return () => {
      if (syncTimerRef.current) {
        window.clearTimeout(syncTimerRef.current);
        syncTimerRef.current = null;
      }
    };
  }, [draftRange, syncAnalysisRangeToUrl]);

  useEffect(() => {
    if (templatesQuery.options.length === 0) {
      return;
    }

    if (selectedExerciseDefinitionId && selectedOption) {
      return;
    }

    if (!defaultOption) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tab", "analysis");
    nextParams.set("exerciseDefinitionId", defaultOption.exerciseDefinitionId);
    setSearchParams(nextParams, { replace: true });
  }, [defaultOption, searchParams, selectedExerciseDefinitionId, selectedOption, setSearchParams, templatesQuery.options]);

  const analysisRange = {
    limit: urlRange.limit,
    startDate: urlRange.startDate || undefined,
    endDate: urlRange.endDate || undefined,
  };

  const recommendationQuery = useTemplateAnalysisRecommendation(activeTemplateId, analysisRange);

  const heroTiles = useMemo(() => [
    {
      label: "Suggested",
      value: recommendationQuery.data?.suggestion.suggestedWeightKg != null
        ? format(recommendationQuery.data.suggestion.suggestedWeightKg)
        : "—",
    },
    {
      label: "Trend",
      value: recommendationQuery.data?.trend.direction
        ? formatStatusToken(recommendationQuery.data.trend.direction)
        : "—",
    },
    {
      label: "Sessions",
      value: recommendationQuery.data?.trend.comparableObservationCount ?? "—",
    },
  ], [recommendationQuery.data, format]);

  const handleExerciseChange = (exerciseDefinitionId: string) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tab", "analysis");
    nextParams.set("exerciseDefinitionId", exerciseDefinitionId);
    setSearchParams(nextParams);
  };

  const handleTrajectoryPresetChange = (preset: TrajectoryPreset) => {
    if (preset === "all") {
      const nextRange = { limit: draftRange.limit, startDate: "", endDate: "", preset: "all" as const };
      setDraftRange(nextRange);
      syncAnalysisRangeToUrl(nextRange);
      return;
    }

    const { startDate, endDate } = buildPresetRange(preset === "30d" ? 30 : 90);
    const nextRange = { limit: draftRange.limit, startDate, endDate, preset };
    setDraftRange(nextRange);
    syncAnalysisRangeToUrl(nextRange);
  };

  if (templatesQuery.isLoading && templatesQuery.options.length === 0) {
    return (
      <Section title="Exercise analysis" subtitle="Loading focused exercises from workout templates.">
        <LoadingState rows={2} />
      </Section>
    );
  }

  if (templatesQuery.error) {
    return (
      <Section icon={BrainCircuit} title="Exercise analysis" subtitle="Loading the workout templates failed.">
        <ErrorState
          title="We could not load your workout templates."
          description="The analysis picker is built from focused exercises inside workout templates. Try again to refresh the list."
          action={
            <Button icon={undefined} onClick={() => templatesQuery.refetch()}>
              Retry
            </Button>
          }
        />
      </Section>
    );
  }

  if (templatesQuery.options.length === 0) {
    return (
      <Section icon={BrainCircuit} title="Exercise analysis" subtitle="Focused exercises with definition ids appear here.">
        <EmptyState
          title="No eligible exercises yet."
          description="Add a focused exercise with a definition id to a workout template, then come back to review the local recommendation and trend."
          icon={BrainCircuit}
        />
      </Section>
    );
  }

  const recommendationError = recommendationQuery.error ? (
    <ErrorState
      title="Analysis unavailable"
      description={recommendationQuery.error instanceof Error ? recommendationQuery.error.message : "The recommendation request failed."}
      action={
        <Button icon={undefined} onClick={() => recommendationQuery.refetch()}>
          Retry
        </Button>
      }
    />
  ) : null;

  const trendData = (recommendationQuery.data?.historySummary?.points ?? [])
    .slice()
    .sort((left, right) => new Date(left.observedAt).getTime() - new Date(right.observedAt).getTime())
    .map((point) => ({
      label: formatShortDateTime(point.observedAt),
      actualWeight: point.weight,
    }));

  return (
    <Panel icon={ICONS.exercise} title={activeOption.exerciseName} subtitle={activeOption?.variant ?? ""} data-testid="analysis-tab">
      <Section
        icon={LineChart}
        title="Analysis window"
        subtitle="Shared window for your local recommendation, plateau, and trend summary."
        className="rounded-2xl border border-border bg-card p-4"
      >
        <div data-testid="analysis-window-controls" className="mb-4 flex flex-wrap gap-1.5">
          <SelectionChip
            size="sm"
            selected={draftRange.preset === "all"}
            disabled={draftRange.preset === "custom"}
            onClick={() => handleTrajectoryPresetChange("all")}
          >
            All time
          </SelectionChip>
          <SelectionChip
            size="sm"
            selected={draftRange.preset === "30d"}
            disabled={draftRange.preset === "custom"}
            onClick={() => handleTrajectoryPresetChange("30d")}
          >
            Last 30 days
          </SelectionChip>
          <SelectionChip
            size="sm"
            selected={draftRange.preset === "90d"}
            disabled={draftRange.preset === "custom"}
            onClick={() => handleTrajectoryPresetChange("90d")}
          >
            Last 90 days
          </SelectionChip>
          <SelectionChip
            size="sm"
            selected={draftRange.preset === "custom"}
            onClick={() => setDraftRange((current) => ({ ...current, preset: "custom" }))}
          >
            Custom
          </SelectionChip>
        </div>
        <div className="grid gap-3 rounded-2xl border border-border bg-muted/10 p-4 md:grid-cols-[repeat(4,minmax(0,1fr))]">
          <label className="space-y-1">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Limit</span>
            <Input
              type="number"
              min={1}
              max={100}
              value={draftRange.limit}
              onChange={(event) => {
                const nextLimit = Math.max(1, Math.min(100, Number(event.target.value) || 1));
                setDraftRange({
                  limit: nextLimit,
                  startDate: draftRange.startDate,
                  endDate: draftRange.endDate,
                  preset: "custom",
                });
              }}
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Start date</span>
            <Input
              type="date"
              value={draftRange.startDate}
              onChange={(event) => {
                setDraftRange({
                  limit: draftRange.limit,
                  startDate: event.target.value,
                  endDate: draftRange.endDate,
                  preset: "custom",
                });
              }}
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">End date</span>
            <Input
              type="date"
              value={draftRange.endDate}
              onChange={(event) => {
                setDraftRange({
                  limit: draftRange.limit,
                  startDate: draftRange.startDate,
                  endDate: event.target.value,
                  preset: "custom",
                });
              }}
            />
          </label>
          <div className="flex items-end">
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => {
                const nextRange = { limit: 10, startDate: "", endDate: "", preset: "all" as const };
                setDraftRange(nextRange);
                syncAnalysisRangeToUrl(nextRange);
              }}
            >
              Reset
            </Button>
          </div>
        </div>
      </Section>

      <DashCardRow
        icon={BrainCircuit}
        variant="static"
        label="Exercise analysis"
        description="Pick one focused exercise to load the local recommendation, plateau status, and trend summary."
      >
        <Select value={activeOption?.exerciseDefinitionId ?? ""} onValueChange={handleExerciseChange}>
          <SelectTrigger aria-label="Exercise analysis picker" className="w-full">
            <SelectValue placeholder="Choose an exercise" />
          </SelectTrigger>
          <SelectContent>
            {templatesQuery.options.map((option) => (
              <SelectItem key={option.exerciseDefinitionId} value={option.exerciseDefinitionId}>
                {option.exerciseName}
                {option.variant ? ` (${option.variant})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </DashCardRow>

      <SummaryHero tiles={heroTiles} />

      <CollapsibleSection
        icon={Sparkles}
        title="Recommendation"
        summary={recommendationQuery.data ? `${format(recommendationQuery.data.suggestion.suggestedWeightKg)} · ${formatStatusToken(recommendationQuery.data.suggestion.type)}` : undefined}
        defaultExpanded
      >
        {recommendationQuery.isLoading ? (
          <LoadingState rows={2} />
        ) : recommendationError ? (
          recommendationError
        ) : recommendationQuery.data ? (
          <div className="space-y-4">
            <p className="text-sm text-foreground">{recommendationQuery.data.suggestion.reasoning}</p>
          </div>
        ) : (
          <EmptyState title="No recommendation yet." description="Choose an exercise to load the recommendation." icon={Sparkles} />
        )}
      </CollapsibleSection>

      <CollapsibleSection
        icon={BrainCircuit}
        title="Plateau"
        summary={recommendationQuery.data ? (recommendationQuery.data.plateau.detected ? "Detected" : "No plateau") : undefined}
        defaultExpanded
      >
        {recommendationQuery.isLoading ? (
          <LoadingState rows={2} />
        ) : recommendationError ? (
          recommendationError
        ) : recommendationQuery.data ? (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <StatTile label="Slope" icon={TrendingUp} value={formatNumber(recommendationQuery.data.trend.slope, 2)} size="sm" />
              <StatTile label="R-squared" icon={Sparkles} value={formatNumber(recommendationQuery.data.trend.rSquared, 2)} size="sm" />
            </div>
            <p className="text-sm text-foreground">{recommendationQuery.data.plateau.reason}</p>
          </div>
        ) : (
          <EmptyState title="No plateau read yet." description="Choose an exercise to load the plateau summary." icon={BrainCircuit} />
        )}
      </CollapsibleSection>

      <CollapsibleSection
        icon={LineChart}
        title="Trend"
        summary={trendData.length > 0 ? `${trendData.length} sessions` : undefined}
        defaultExpanded={false}
      >
        {recommendationQuery.isLoading ? (
          <LoadingState rows={2} />
        ) : recommendationError ? (
          recommendationError
        ) : trendData.length > 0 ? (
          <div className="space-y-4">
            <SimpleLineChart
              data={trendData}
              xKey="label"
              xLabelKey="label"
              activeSeriesKey="actualWeight"
              height={240}
              valueFormatter={(value) => format(value)}
              series={[
                {
                  key: "actualWeight",
                  label: "Actual weight",
                  color: "var(--chart-1)",
                  strokeWidth: 2.5,
                },
              ]}
            />
          </div>
        ) : (
          <EmptyState title="No trend yet." description="Choose an exercise to load recent comparable sessions." icon={LineChart} />
        )}
      </CollapsibleSection>
    </Panel>
  );
}
