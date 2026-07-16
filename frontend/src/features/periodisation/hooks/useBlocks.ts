import { useMutation, useQueryClient } from "@tanstack/react-query";
import { unwrapApiResponse, workoutApi } from '@/api/api';
import type { Block, UpdateBlockRequest } from "@/types/Periodisation";

export default function useBlocks() {
  const queryClient = useQueryClient();

  const updateBlock = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateBlockRequest }) => {
      return unwrapApiResponse(await workoutApi.patch<Block>(`/blocks/${id}`, updates));
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['programmes', id] });
      queryClient.invalidateQueries({ queryKey: ['blocks'] });
    },
  });

  const deleteBlock = useMutation({
    mutationFn: async (id: string) => {
      unwrapApiResponse(await workoutApi.delete(`/blocks/${id}`));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['splits'] });
      queryClient.invalidateQueries({ queryKey: ['programmes'] });
      queryClient.invalidateQueries({ queryKey: ['blocks'] });
    },
  });

  const setBlockStartDate = useMutation({
    mutationFn: async ({ id, startDate }: { id: string; startDate: string }) => {
      return unwrapApiResponse(await workoutApi.patch<Block>(`/blocks/${id}/start-date`, { startDate }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programmes'] });
      queryClient.invalidateQueries({ queryKey: ['blocks'] });
    },
  });

  return {
    updateBlock: updateBlock.mutateAsync,
    deleteBlock: deleteBlock.mutateAsync,
    setBlockStartDate: setBlockStartDate.mutateAsync,
  };
}
