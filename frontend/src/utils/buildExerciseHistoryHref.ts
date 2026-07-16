export default function buildExerciseHistoryHref(exerciseName: string, variant?: string | null, workoutTemplateId?: string) {
  const searchParams = new URLSearchParams();

  if (workoutTemplateId) {
    searchParams.set("workoutTemplateId", workoutTemplateId);
  }

  if (variant) {
    searchParams.set("variant", variant);
  }

  const queryString = searchParams.toString();
  return `/exercise/${encodeURIComponent(exerciseName)}${queryString ? `?${queryString}` : ""}`;
}
