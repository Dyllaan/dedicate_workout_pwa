import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import SimpleBarChart from "@/components/charts/SimpleBarChart";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { SelectionChip } from "@/components/ui/selection-chip";
import Panel from "@/components/layout/frames/Panel";
import useChart from "@/features/progress/hooks/useChart";
import useProgressQuery from "@/features/progress/hooks/useProgressQuery";

interface ChartTabContentProps {
    exerciseDefinitionId: string;
}
const METRIC_OPTIONS = ["BEST_SET_E1RM", "MAX_WEIGHT", "WORKING_WEIGHT"];

const COMPARISON_OPTIONS = ["ABSOLUTE", "BASELINE_PERCENT"];

const METRIC_LABELS: Record<string, string> = {
    BEST_SET_E1RM: "e1RM",
    MAX_WEIGHT: "Max Weight",
    WORKING_WEIGHT: "Working Weight",
};

const COMPARISON_LABELS: Record<string, string> = {
    ABSOLUTE: "Absolute",
    BASELINE_PERCENT: "vs Baseline %",
};

function formatMetricValue(value: number, unit: string) {
    if (unit === "%") return `${value.toFixed(2)}%`;
    return `${value.toFixed(1)}`;
}

function formatDelta(value: number, unit: string) {
    const formatted = formatMetricValue(Math.abs(value), unit);
    if (value > 0) return `+${formatted}`;
    if (value < 0) return `-${formatted}`;
    return formatted;
}

export default function ChartTabContent({
                                            exerciseDefinitionId
                                        }: ChartTabContentProps) {
    const chartColor = "#6366f1";

    const { chartData, isChartLoading, activeMetric, handleMetricChange, handleComparisonModeChange, activeProgressComparisonMode } = useProgressQuery({ exerciseDefinitionId});
    const unit = chartData?.unit ?? "";
    const { deltaValue,useWeightFormatting, comparisonLabel, seriesRows } = useChart(chartData, unit);


    return (
        <Panel data-testid="exercise-chart-shell">
            {deltaValue && (
                <div className="shrink-0 text-left sm:text-right">
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
                                {formatDelta(deltaValue, useWeightFormatting ? "" : unit)} vs {comparisonLabel}
                            </>
                        ) : deltaValue < 0 ? (
                            <>
                                <ArrowDownRight className="h-4 w-4" />
                                {formatDelta(deltaValue, useWeightFormatting ? "" : unit)} vs {comparisonLabel}
                            </>
                        ) : (
                            <>
                                <Minus className="h-4 w-4" />
                                Flat vs {comparisonLabel}
                            </>
                        )}
                    </p>
                </div>
            )}

            <div className="space-y-2">
                {isChartLoading ? (
                    <Skeleton className="rounded-2xl" style={{ height: `240px` }} />
                ) : seriesRows.length > 0 ? (
                    <SimpleBarChart
                        data={seriesRows}
                        labelKey="label"
                        valueKey="value"
                        height={240}
                        rowHeight={60}
                        xAxisLabel={useWeightFormatting ? "Weight" : unit === "%" ? "Percent" : "Value"}
                        yAxisLabel="Date"
                        valueFormatter={(value) => (useWeightFormatting ? `${value.toFixed(1)} kg` : formatMetricValue(value, unit))}
                        barColor={chartColor}
                    />
                ) : (
                    <div
                        className="flex items-center justify-center rounded-2xl border border-dashed"
                        style={{ height: `240px` }}
                    >
                        <p className="text-sm text-muted-foreground">
                            No chart data available for this exercise.
                        </p>
                    </div>
                )}
            </div>
            {/* Grouped Chips Controls Section */}
            <div className="flex flex-col items-center gap-2">
                <div className="flex flex-wrap gap-1.5">
                    {METRIC_OPTIONS.map((metric) => (
                        <SelectionChip
                            key={metric}
                            size="sm"
                            selected={activeMetric === metric}
                            onClick={() => handleMetricChange(metric)}
                            className="min-w-9 px-3"
                        >
                            {METRIC_LABELS[metric] || metric}
                        </SelectionChip>
                    ))}
                </div>

                <div className="flex flex-wrap gap-1.5">
                    {COMPARISON_OPTIONS.map((mode) => (
                        <SelectionChip
                            key={mode}
                            size="sm"
                            selected={activeProgressComparisonMode === mode}
                            onClick={() => handleComparisonModeChange(mode)}
                            className="min-w-9 px-3"
                        >
                            {COMPARISON_LABELS[mode] || mode}
                        </SelectionChip>
                    ))}
                </div>
            </div>
        </Panel>
    );
}
