import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { unwrapApiResponse, workoutApi } from "@/api/api";
import { buildPageParams, DEFAULT_PAGE_SIZE, fetchAllPagedItems } from "@/api/utils/PaginationHelper";
import type { PagedResponse } from "@/api/types/Pagination";
import type { BodyweightLog, CreateBodyweightLogRequest } from "@/features/bodyweight/types/Bodyweight";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { invalidateDashboardData } from "@/features/dashboard/hooks/useDashboardRefresh";

type UseBodyweightLogsOptions = {
  enabled?: boolean;
  page?: number;
  size?: number;
};

const BODYWEIGHT_LOGS_KEY = ["bodyweight-logs"] as const;

export default function useBodyweightLogs(options: UseBodyweightLogsOptions = {}) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const enabled = options.enabled ?? true;
  const page = options.page ?? 0;
  const size = options.size ?? DEFAULT_PAGE_SIZE;

  const { data, isLoading } = useQuery({
    queryKey: [...BODYWEIGHT_LOGS_KEY, page, size] as const,
    queryFn: async () => {
      const response = await workoutApi.get<PagedResponse<BodyweightLog>>("/bodyweight-logs", {
        params: buildPageParams(page, size),
      });
      return unwrapApiResponse(response);
    },
    enabled: enabled && !!user?.accessToken,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    placeholderData: keepPreviousData,
  });

  const logs = Array.isArray(data) ? data : data?.items ?? [];

  const addLog = useMutation({
    mutationFn: async (request: CreateBodyweightLogRequest) => {
      return unwrapApiResponse(await workoutApi.post<BodyweightLog>("/bodyweight-logs", request));
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: BODYWEIGHT_LOGS_KEY });
      await invalidateDashboardData(queryClient);
    },
  });

  const deleteLog = useMutation({
    mutationFn: async (id: string) => {
      unwrapApiResponse(await workoutApi.delete(`/bodyweight-logs/${id}`));
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: BODYWEIGHT_LOGS_KEY });
      await invalidateDashboardData(queryClient);
    },
  });

  return {
    logs,
    pageInfo: Array.isArray(data) ? null : data ?? null,
    isLoading: enabled ? isLoading : false,
    addLog: addLog.mutateAsync,
    deleteLog: deleteLog.mutateAsync,
  };
}

export function useAllBodyweightLogs(options: { enabled?: boolean } = {}) {
  const { user } = useAuth();
  const enabled = options.enabled ?? true;

  return useQuery({
    queryKey: [...BODYWEIGHT_LOGS_KEY, "all"] as const,
    queryFn: async () => {
      return fetchAllPagedItems<BodyweightLog>(async (page, size) => {
        const response = await workoutApi.get<PagedResponse<BodyweightLog>>("/bodyweight-logs", {
          params: buildPageParams(page, size),
        });
        return unwrapApiResponse(response);
      });
    },
    enabled: enabled && !!user?.accessToken,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    placeholderData: keepPreviousData,
  });
}
