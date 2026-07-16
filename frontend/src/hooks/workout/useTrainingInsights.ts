import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { unwrapApiResponse, workoutApi } from "@/api/api";
import { buildPageParams, DEFAULT_PAGE_SIZE } from "@/api/pagination";
import { queryKeys } from "@/api/queryKeys";
import { invalidateDashboardData } from "../../features/dashboard/hooks/useDashboardRefresh";
import { useDashboardSummary } from "../../features/dashboard/hooks/useDashboardSummary";
import type {
  AutotuneOutcomeRequest,
  BlockSummary,
  InsightsOverviewModel,
  NextWorkoutSignal,
  PrioritySignal,
  ReadinessCheckIn,
  ReadinessCheckInRequest,
  ReadinessHistoryResponse,
  TopSetAutotuneRecommendation,
} from "@/types/Insights";
import type { DashboardSummaryTopLift } from "@/types/Workout";
import type { ReadinessHistoryResponse as ReadinessHistoryApiResponse } from "@/types/Insights";
import type { WeeklyMuscleVolumeResponse } from "@/types/Heatmap";

function useNextWorkoutSignal(enabled = true) {
  return useQuery({
    queryKey: queryKeys.insights.nextWorkout(),
    queryFn: async () => {
      const { data } = await workoutApi.get<NextWorkoutSignal>("/analysis/training-insights/next-workout");
      return data;
    },
    enabled,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

function useBlockSummary(enabled = true) {
  return useQuery({
    queryKey: queryKeys.insights.blockSummary(),
    queryFn: async () => {
      const { data } = await workoutApi.get<BlockSummary>("/analysis/training-insights/block-summary");
      return data;
    },
    enabled,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

function usePrioritySignals(enabled = true) {
  return useQuery({
    queryKey: queryKeys.insights.prioritySignals(),
    queryFn: async () => {
      const { data } = await workoutApi.get<PrioritySignal[]>("/analysis/training-insights/priority-signals");
      return data;
    },
    enabled,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useInsightsOverview(enabled = true) {
  const dashboardSummaryQuery = useDashboardSummary();
  const nextWorkoutQuery = useNextWorkoutSignal(enabled);
  const blockSummaryQuery = useBlockSummary(enabled);
  const prioritySignalsQuery = usePrioritySignals(enabled);
  const readinessQuery = useReadinessHistory(7, 0, DEFAULT_PAGE_SIZE, enabled);
  const nextWorkout =
    nextWorkoutQuery.data?.exerciseDefinitionId || nextWorkoutQuery.data?.workoutTemplateId
      ? nextWorkoutQuery.data
      : null;

  const data = {
    dashboardSummary: dashboardSummaryQuery.data ?? null,
    nextWorkout,
    blockSummary: blockSummaryQuery.data ?? null,
    prioritySignals: prioritySignalsQuery.data ?? [],
    readiness: readinessQuery.data ?? null,
  } satisfies InsightsOverviewModel;

  return {
    data,
    isLoading:
      dashboardSummaryQuery.isLoading ||
      nextWorkoutQuery.isLoading ||
      blockSummaryQuery.isLoading ||
      prioritySignalsQuery.isLoading ||
      readinessQuery.isLoading,
    isFetching:
      dashboardSummaryQuery.isFetching ||
      nextWorkoutQuery.isFetching ||
      blockSummaryQuery.isFetching ||
      prioritySignalsQuery.isFetching ||
      readinessQuery.isFetching,
    isError:
      dashboardSummaryQuery.isError ||
      nextWorkoutQuery.isError ||
      blockSummaryQuery.isError ||
      prioritySignalsQuery.isError ||
      readinessQuery.isError,
    dashboardSummaryQuery,
    nextWorkoutQuery,
    blockSummaryQuery,
    prioritySignalsQuery,
    readinessQuery,
  };
}

export function useLiftSummary(scope: "overall" | "template", templateId?: string) {
  return useLiftSummaryWithEnabled(scope, templateId, true);
}

export function useLiftSummaryWithEnabled(
  scope: "overall" | "template",
  templateId: string | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: queryKeys.insights.liftSummary(scope, templateId),
    queryFn: async () => {
      if (scope === "template" && !templateId) {
        throw new Error("Template id is required");
      }

      if (import.meta.env.DEV) {
        console.log("[useLiftSummary]", {
          phase: "start",
          scope,
          templateId: templateId ?? null,
          enabled,
        });
      }

      const response = await workoutApi.get<DashboardSummaryTopLift | null>("/analysis/training-insights/lift-summary", {
        params: scope === "template"
          ? { scope, templateId }
          : { scope },
      });
      const data = unwrapApiResponse(response);

      if (import.meta.env.DEV) {
        console.log("[useLiftSummary]", {
          phase: "result",
          scope,
          templateId: templateId ?? null,
          response: response.data,
          parsed: data && typeof data === "object" ? {
            exerciseDefinitionId: data.exerciseDefinitionId,
            exerciseName: data.exerciseName,
            variant: data.variant ?? null,
            sessionCount: data.sessionCount,
            personalBestKg: data.personalBestKg,
          } : data,
        });
      }

      return data && typeof data === "object" ? data : null;
    },
    enabled: enabled && (scope === "overall" || !!templateId),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

function useReadinessHistory(days = 7, page = 0, size = DEFAULT_PAGE_SIZE, enabled = true) {
  return useQuery({
    queryKey: queryKeys.readiness.history(days, page, size),
    queryFn: async () => {
      const response = await workoutApi.get<ReadinessHistoryApiResponse>("/readiness/history", {
        params: buildPageParams(page, size, { days }),
      });
      const data = unwrapApiResponse(response);
      return {
        days: data.days,
        averageReadinessScore: data.averageReadinessScore,
        points: data.points,
        pageInfo: data.pageInfo,
      } satisfies ReadinessHistoryResponse;
    },
    enabled,
    placeholderData: (previous) => previous,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useCreateReadinessCheckIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (request: ReadinessCheckInRequest) => {
      return unwrapApiResponse(await workoutApi.post<ReadinessCheckIn>("/readiness/check-ins", request));
    },
    onSuccess: async () => {
      await invalidateDashboardData(queryClient);
    },
  });
}

export function useTopSetAutotune(
  workoutTemplateId?: string,
  exerciseDefinitionId?: string | null,
  exerciseName?: string,
  variant?: string | null,
) {
  return useQuery({
    queryKey: queryKeys.insights.autotune(
      workoutTemplateId ?? "",
      exerciseName ?? "",
      variant ?? undefined,
      exerciseDefinitionId ?? undefined,
    ),
    queryFn: async () => {
      if (!workoutTemplateId || !exerciseName) {
        throw new Error("workoutTemplateId and exerciseName are required");
      }
      const { data } = await workoutApi.get<TopSetAutotuneRecommendation>("/insights/autotune/top-set", {
        params: {
          workoutTemplateId,
          exerciseDefinitionId: exerciseDefinitionId ?? undefined,
          exerciseName,
          variant: variant ?? undefined,
        },
      });
      return data;
    },
    enabled: !!workoutTemplateId && !!exerciseName,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

export function useAutotuneOutcomeMutation() {
  return useMutation({
    mutationFn: async (request: AutotuneOutcomeRequest) => {
      await unwrapApiResponse(await workoutApi.post("/insights/autotune/outcomes", request));
    },
  });
}

export function useDashboardWeeklyMuscleVolume(targetWeekStart?: string) {
  return useQuery({
    queryKey: [...queryKeys.heatmap.dashboardWeeklyVolume(), targetWeekStart],
    queryFn: async () => {
      const dateParam = targetWeekStart ? targetWeekStart.split('T')[0] : undefined;

      const response = await workoutApi.get<WeeklyMuscleVolumeResponse>(
        "/analysis/training-insights/weekly-volume",
        {
          params: dateParam ? { date: dateParam } : undefined,
        }
      );
      return unwrapApiResponse(response);
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
