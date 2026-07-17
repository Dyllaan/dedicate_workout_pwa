import { useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { unwrapApiResponse, workoutApi } from "@/api/api";
import { buildPageParams, DEFAULT_PAGE_SIZE, fetchAllPagedItems } from "@/api/utils/PaginationHelper";
import { queryKeys } from "@/api/queryKeys";
import { refreshDashboardData } from "@/features/dashboard/hooks/useDashboardRefresh";
import type { PagedResponse } from "@/api/types/Pagination";
import type {
  Programme,
  CreateProgrammeRequest,
  CreateFromPresetRequest,
  Block,
  CreateBlockRequest,
} from "@/features/periodisation/types/Periodisation";

type UseProgrammePageOptions = {
  enabled?: boolean;
  page?: number;
  size?: number;
};

export default function useProgramme(splitId?: string) {
  const queryClient = useQueryClient();

  const allProgrammesQuery = useQuery({
    queryKey: queryKeys.programmes.bySplit(splitId ?? ""),
    queryFn: async () => {
      if (!splitId) {
        return [] as Programme[];
      }

      return fetchAllPagedItems<Programme>(async (page, size) => {
        const response = await workoutApi.get<PagedResponse<Programme>>(`/programmes/split/${splitId}`, {
          params: buildPageParams(page, size),
        });
        return unwrapApiResponse(response);
      });
    },
    enabled: !!splitId,
    staleTime: queryKeys.STALE.navigation,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });

  const programmes = allProgrammesQuery.data ?? [];
  const isLoading = allProgrammesQuery.isLoading;
  const error = allProgrammesQuery.error;

  const invalidateProgrammeLists = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.programmes.bySplit(splitId ?? "") });
    queryClient.invalidateQueries({ queryKey: queryKeys.splits.all() });
  };

  const syncDashboardData = async () => {
    await refreshDashboardData(queryClient);
  };

  const handleMutationSuccess = async () => {
    invalidateProgrammeLists();
    await syncDashboardData();
  };

  const createProgramme = useMutation({
    mutationFn: async (request: CreateProgrammeRequest) => {
      return unwrapApiResponse(await workoutApi.post<Programme>("/programmes", request));
    },
    onSuccess: handleMutationSuccess,
  });

  const deleteProgramme = useMutation({
    mutationFn: async (programmeId: string) => {
      unwrapApiResponse(await workoutApi.delete(`/programmes/${programmeId}`));
    },
    onSuccess: handleMutationSuccess,
  });

  const getProgrammeById = useCallback((id: string): Programme | undefined =>
    programmes.find((programme) => programme.id === id), [programmes]);

  const activeProgramme = useMemo(() =>
    programmes.find((programme) => programme.active) ?? null, [programmes]);

  const setProgrammeStartDate = useMutation({
    mutationFn: async ({
      programmeId,
      startDate,
    }: {
      programmeId: string;
      startDate: string;
    }) => {
      return unwrapApiResponse(await workoutApi.patch<Programme>(
        `/programmes/${programmeId}/start-date`,
        { startDate },
      ));
    },
    onSuccess: handleMutationSuccess,
  });

  const setProgrammeActive = useMutation({
    mutationFn: async ({
      programmeId,
      active,
    }: {
      programmeId: string;
      active: boolean;
    }) => {
      return unwrapApiResponse(await workoutApi.patch<Programme>(
        `/programmes/${programmeId}/active`,
        { active },
      ));
    },
    onSuccess: handleMutationSuccess,
  });

  const createFromPreset = useMutation({
    mutationFn: async (request: CreateFromPresetRequest) => {
      return unwrapApiResponse(await workoutApi.post<Programme>("/programmes/preset", request));
    },
    onSuccess: handleMutationSuccess,
  });

  const getBlockById = useCallback((id: string): Block | undefined =>
    programmes.flatMap((programme) => programme.blocks).find((block) => block.id === id), [programmes]);

  const getCurrentBlock = useCallback((programmeId: string): Block | null => {
    const programme = programmes.find((candidate) => candidate.id === programmeId);
    if (!programme?.blocks.length) return null;
    const sorted = [...programme.blocks].sort((a, b) => a.blockOrder - b.blockOrder);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const active = sorted.find((block) => {
      if (!block.startDate) return false;
      const start = new Date(block.startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + block.durationWeeks * 7);
      return today >= start && today < end;
    });
    if (active) return active;
    const started = sorted.filter((block) => {
      if (!block.startDate) return false;
      const start = new Date(block.startDate);
      start.setHours(0, 0, 0, 0);
      return today >= start;
    });
    return started[started.length - 1] ?? null;
  }, [programmes]);

  const getCurrentWeekNumber = useCallback((block: Block): number | null => {
    if (!block.startDate) return null;
    const start = new Date(block.startDate);
    start.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const week = Math.floor(days / 7) + 1;
    return week >= 1 && week <= block.durationWeeks ? week : null;
  }, []);

  const addBlockToProgramme = useMutation({
    mutationFn: async ({ programmeId, request }: { programmeId: string; request: CreateBlockRequest }) => {
      return unwrapApiResponse(await workoutApi.put<Programme>(`/programmes/${programmeId}/block`, request));
    },
    onSuccess: handleMutationSuccess,
  });

  const archiveProgramme = useMutation({
    mutationFn: async (programmeId: string) => {
      return unwrapApiResponse(await workoutApi.post<Programme>(`/programmes/${programmeId}/archive`));
    },
    onSuccess: handleMutationSuccess,
  });

  return {
    programmes,
    isLoading,
    error,
    createProgramme: createProgramme.mutateAsync,
    deleteProgramme: deleteProgramme.mutateAsync,
    getProgrammeById,
    activeProgramme,
    setProgrammeStartDate: setProgrammeStartDate.mutateAsync,
    setProgrammeActive: setProgrammeActive.mutateAsync,
    createFromPreset: createFromPreset.mutateAsync,
    getBlockById,
    getCurrentBlock,
    getCurrentWeekNumber,
    addBlockToProgramme: addBlockToProgramme.mutateAsync,
    archiveProgramme: archiveProgramme.mutateAsync,
  };
}

export function useProgrammePage(splitId?: string, options: UseProgrammePageOptions = {}) {
  const enabled = options.enabled ?? true;
  const page = options.page ?? 0;
  const size = options.size ?? DEFAULT_PAGE_SIZE;

  return useQuery({
    queryKey: queryKeys.programmes.bySplit(splitId ?? "", page, size),
    queryFn: async () => {
      if (!splitId) {
        return {
          items: [],
          page: 0,
          size,
          totalItems: 0,
          totalPages: 0,
          hasNext: false,
          hasPrevious: false,
        } satisfies PagedResponse<Programme>;
      }

      const response = await workoutApi.get<PagedResponse<Programme>>(`/programmes/split/${splitId}`, {
        params: buildPageParams(page, size),
      });
      return unwrapApiResponse(response);
    },
    enabled: enabled && !!splitId,
    staleTime: queryKeys.STALE.navigation,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });
}

export function useAllProgrammesForSplit(splitId?: string, options: { enabled?: boolean } = {}) {
  const enabled = options.enabled ?? true;

  return useQuery({
    queryKey: ["programmes", splitId ?? "", "all-pages"] as const,
    queryFn: async () => {
      if (!splitId) {
        return [] as Programme[];
      }

      return fetchAllPagedItems<Programme>(async (page, size) => {
        const response = await workoutApi.get<PagedResponse<Programme>>(`/programmes/split/${splitId}`, {
          params: buildPageParams(page, size),
        });
        return unwrapApiResponse(response);
      });
    },
    enabled: enabled && !!splitId,
    staleTime: queryKeys.STALE.navigation,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });
}
