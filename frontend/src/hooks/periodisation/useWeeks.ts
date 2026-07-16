import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { unwrapApiResponse, workoutApi } from '@/api/api';
import { queryKeys } from '@/api/queryKeys';
import type { Week, UpdateWeekRequest, SetDeloadRequest } from '@/types/Periodisation';

export default function useWeeks(weekId?: string) {
  const queryClient = useQueryClient();

  const { data: week, isLoading, error } = useQuery({
    queryKey: ['week', weekId],
    queryFn: async () => {
      const { data } = await workoutApi.get<Week>(`/weeks/${weekId}`);
      return data;
    },
    enabled: !!weekId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    placeholderData: keepPreviousData,
  });

  const updateWeek = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateWeekRequest }) => {
      return unwrapApiResponse(await workoutApi.patch<Week>(`/weeks/${id}`, updates));
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['week', id] });
      queryClient.invalidateQueries({ queryKey: ['blocks'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.heatmap.all() });
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "programmes",
      });
    },
  });

  const setDeloadWeek = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: SetDeloadRequest }) => {
      return unwrapApiResponse(await workoutApi.patch<Week>(`/weeks/${id}/deload?deload=${updates.deload}`));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocks'] }); // ← no splitId, prefix match
    },
  });

  return {
    week,
    isLoading,
    error,
    updateWeek: updateWeek.mutateAsync,
    setDeloadWeek: setDeloadWeek.mutateAsync,
  };
}
