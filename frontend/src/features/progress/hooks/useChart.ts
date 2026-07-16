import {useMemo} from "react";
import type {ProgressChartQueryResponse} from "@/types/Progress.ts";
import {formatDateShort} from "@/utils/date.ts";

type SeriesPoint = {
    timestamp: string;
    label: string;
    value: number;
};

export default function useChart(chartData: ProgressChartQueryResponse | undefined, unit: string) {
    const seriesKey = chartData?.points?.[0]?.seriesKey ?? null;
    const seriesRows = useMemo(
        () => buildSeriesPoints(chartData?.points ?? [], seriesKey),
        [chartData?.points, seriesKey],
    );

    const latestPoint = seriesRows.at(-1) ?? null;
    const previousPoint = seriesRows.at(-2) ?? null;
    const latestValue = latestPoint?.value ?? null;
    const previousValue = previousPoint?.value ?? null;
    const currentAbsoluteValue = latestValue;
    const comparisonValue = previousValue;
    const deltaValue = currentAbsoluteValue != null && comparisonValue != null ? currentAbsoluteValue - comparisonValue : null;
    const useWeightFormatting = isWeightMetric(chartData?.metric);
    const currentValueLabel = currentAbsoluteValue != null
        ? (useWeightFormatting ? `${currentAbsoluteValue.toFixed(1)} kg` : formatMetricValue(currentAbsoluteValue, unit))
        : "-";
    const comparisonValueLabel = comparisonValue != null
        ? (useWeightFormatting ? `${comparisonValue.toFixed(1)} kg` : formatMetricValue(comparisonValue, unit))
        : null;
    const comparisonLabel = "previous point";

    function buildSeriesPoints(points: ProgressChartQueryResponse["points"], seriesKey: string | null): SeriesPoint[] {
        if (!seriesKey) {
            return [];
        }

        return points
            .filter((point) => point.seriesKey === seriesKey && point.value != null)
            .map((point) => ({
                timestamp: point.timestamp,
                label: formatDateShort(point.timestamp),
                value: point.value ?? 0,
            }))
            .sort((left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime());
    }

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

    function isWeightMetric(metric?: ProgressChartQueryResponse["metric"]) {
        return metric === "MAX_WEIGHT" || metric === "BEST_SET_E1RM" || metric === "WORKING_WEIGHT";
    }

    return {
        currentAbsoluteValue,
        deltaValue,
        comparisonValue,
        comparisonLabel,
        comparisonValueLabel,
        currentValueLabel,
        formatDelta,
        useWeightFormatting,
        seriesRows,
        seriesKey,
        latestPoint,
    }
}