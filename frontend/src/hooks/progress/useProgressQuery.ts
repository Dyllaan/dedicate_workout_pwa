import {useSearchParams} from "react-router-dom";
import type {ProgressChartQueryRequest, ProgressComparisonMode, ProgressMetric} from "@/types/Progress.ts";
import {useMemo} from "react";
import {useProgressChartQuery} from "@/hooks/workout/useProgressAnalytics.ts";

interface IProgressChartData {
    exerciseDefinitionId:string;
}

const VALID_METRICS: ProgressMetric[] = ["BEST_SET_E1RM", "MAX_WEIGHT", "WORKING_WEIGHT"];
const VALID_MODES: ProgressComparisonMode[] = ["ABSOLUTE", "BASELINE_PERCENT"];


export default function useProgressQuery({exerciseDefinitionId} : IProgressChartData) {

    const [searchParams, setSearchParams] = useSearchParams();

    // 2. Safely read search params against typed schemas with clean fallbacks
    const paramMetric = searchParams.get("metric");
    const paramMode = searchParams.get("comparisonMode");

    const activeMetric: ProgressMetric = VALID_METRICS.includes(paramMetric as ProgressMetric)
        ? (paramMetric as ProgressMetric)
        : "BEST_SET_E1RM";

    const activeProgressComparisonMode: ProgressComparisonMode = VALID_MODES.includes(paramMode as ProgressComparisonMode)
        ? (paramMode as ProgressComparisonMode)
        : "ABSOLUTE";

    const hasSelectedExercise = exerciseDefinitionId.length > 0;

    const chartRequest = useMemo<ProgressChartQueryRequest | null>(
        () =>
            hasSelectedExercise
                ? {
                    exerciseDefinitionId: exerciseDefinitionId,
                    metric: activeMetric,
                    comparisonMode: activeProgressComparisonMode,
                }
                : null,
        [hasSelectedExercise, exerciseDefinitionId, activeMetric, activeProgressComparisonMode],
    );

    const {
        data: chartData,
        isLoading: isChartLoading,
        error: chartError,
        refetch: refetchChart,
    } = useProgressChartQuery(
        chartRequest ?? {
            exerciseDefinitionId: "",
            metric: "BEST_SET_E1RM",
            comparisonMode: "ABSOLUTE",
        },
        chartRequest != null,
    );

    const setParams = (updates: Record<string, string | null | undefined>) => {
        const nextParams = new URLSearchParams(searchParams);
        for (const [key, value] of Object.entries(updates)) {
            if (value == null || value === "") {
                nextParams.delete(key);
            } else {
                nextParams.set(key, value);
            }
        }
        setSearchParams(nextParams);
    };
    const handleMetricChange = (newMetric: string) => {
        setParams({ metric: newMetric });
    };

    const handleComparisonModeChange = (newMode: string) => {
        setParams({ comparisonMode: newMode });
    };

    return {
        chartRequest,
        chartData,
        chartError,
        refetchChart,
        setParams,
        hasSelectedExercise,
        activeMetric,
        handleMetricChange,
        handleComparisonModeChange,
        activeProgressComparisonMode,
        isChartLoading
    }
}
