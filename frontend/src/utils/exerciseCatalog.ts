import type { ExerciseInfoCatalogItem } from "@/types/Heatmap";

function getCatalogNameSuffix(name: string) {
  const separatorIndex = name.indexOf(":");
  if (separatorIndex < 0) {
    return "";
  }

  return name.slice(separatorIndex + 1).trim();
}

function dedupeMetadata(parts: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const metadata: string[] = [];

  for (const part of parts) {
    const trimmed = part?.trim();
    if (!trimmed) {
      continue;
    }

    const normalized = trimmed.toLowerCase();
    if (seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    metadata.push(trimmed);
  }

  return metadata;
}

export function getExerciseCatalogDisplayMetadata(exercise: ExerciseInfoCatalogItem) {
  return dedupeMetadata([
    getCatalogNameSuffix(exercise.name),
    exercise.equipment,
    exercise.mainMuscle,
  ]).join(" | ");
}

export function getExerciseCatalogWorkoutVariant(exercise: ExerciseInfoCatalogItem) {
  const [variant = ""] = dedupeMetadata([
    exercise.equipment,
    getCatalogNameSuffix(exercise.name),
  ]);

  return variant;
}
