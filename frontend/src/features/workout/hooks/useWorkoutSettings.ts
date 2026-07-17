import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { unwrapApiResponse, workoutApi } from "@/api/api";
import { queryKeys } from "@/api/queryKeys";
import type { UpdateWorkoutUserSettingsRequest, WorkoutUserSettings } from "@/features/workout/types/Workout";
import { useAuth } from "@/features/auth/hooks/useAuth";

const DEFAULT_SETTINGS: WorkoutUserSettings = { defaultRestSeconds: 90 };

export function useWorkoutSettings() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const settingsQuery = useQuery({
    queryKey: queryKeys.workoutSettings(),
    queryFn: async () => {
      return unwrapApiResponse(await workoutApi.get<WorkoutUserSettings>("/workout-settings"));
    },
    enabled: !!user?.accessToken,
    staleTime: queryKeys.STALE.navigation,
    placeholderData: DEFAULT_SETTINGS,
  });

  const updateSettings = useMutation({
    mutationFn: async (request: UpdateWorkoutUserSettingsRequest) => {
      return unwrapApiResponse(await workoutApi.put<WorkoutUserSettings>("/workout-settings", request));
    },
    onSuccess: (settings) => {
      queryClient.setQueryData(queryKeys.workoutSettings(), settings);
    },
  });

  return {
    settings: settingsQuery.data ?? DEFAULT_SETTINGS,
    isLoading: settingsQuery.isLoading,
    updateSettings: updateSettings.mutateAsync,
    isSaving: updateSettings.isPending,
  };
}
