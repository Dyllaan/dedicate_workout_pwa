import type { TrainingState } from "@/features/insights/types/Insights";

export type InsightsViewTab = "overview" | "volume" | "lift";

export function formatExerciseLabel(
  exerciseName?: string | null,
  variant?: string | null,
  fallback = "Unknown exercise",
) {
  const name = exerciseName?.trim();
  const label = name || fallback;
  const variantLabel = variant?.trim();

  return variantLabel ? `${label} (${variantLabel})` : label;
}

export function formatRecommendedAction(action?: string | null) {
  return action ? action.replace(/_/g, " ").toLowerCase() : null;
}

export function formatStatusToken(value?: string | null) {
  return value ? value.replace(/_/g, " ").toLowerCase() : null;
}

export function trainingStateTone(trainingState?: TrainingState | null): "neutral" | "positive" | "warning" | "danger" {
  if (trainingState === "IMPROVING") {
    return "positive";
  }

  if (trainingState === "FATIGUE_LIMITED" || trainingState === "UNDEREXPOSED") {
    return "warning";
  }

  if (trainingState === "LOAD_TOO_AGGRESSIVE" || trainingState === "TRUE_PLATEAU") {
    return "danger";
  }

  return "neutral";
}

export function formatShortDateTime(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
