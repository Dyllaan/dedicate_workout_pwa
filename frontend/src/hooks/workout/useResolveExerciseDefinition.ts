import { useMutation } from "@tanstack/react-query";
import { unwrapApiResponse, workoutApi } from "@/api/api";
import type {
  ExerciseDefinitionResolveRequest,
  ExerciseDefinitionResolveResponse,
} from "@/types/Workout";

export function useResolveExerciseDefinition() {
  return useMutation({
    mutationFn: async (request: ExerciseDefinitionResolveRequest) => {
      const response = await workoutApi.post<ExerciseDefinitionResolveResponse>(
        "/exercise-definitions/resolve",
        request,
      );
      return unwrapApiResponse(response);
    },
  });
}
