import type { MuscleGroupId } from "@/features/heatmap/types/Heatmap";

type BodySlug =
  | "abs"
  | "adductors"
  | "ankles"
  | "biceps"
  | "calves"
  | "chest"
  | "deltoids"
  | "feet"
  | "forearm"
  | "gluteal"
  | "hamstring"
  | "hands"
  | "hair"
  | "head"
  | "knees"
  | "lower-back"
  | "neck"
  | "obliques"
  | "quadriceps"
  | "tibialis"
  | "trapezius"
  | "triceps"
  | "upper-back";

type MuscleMeta = {
  id: MuscleGroupId;
  label: string;
  side: "front" | "back" | "both";
  slugs: BodySlug[];
};

export const MUSCLE_GROUPS: MuscleMeta[] = [
  { id: "chest", label: "Chest", side: "front", slugs: ["chest"] },
  { id: "front_delt", label: "Front delts", side: "front", slugs: ["deltoids"] },
  { id: "triceps", label: "Triceps", side: "back", slugs: ["triceps"] },
  { id: "serratus", label: "Serratus", side: "front", slugs: ["obliques"] },
  { id: "lats", label: "Lats", side: "back", slugs: ["upper-back"] },
  { id: "traps", label: "Traps", side: "back", slugs: ["trapezius"] },
  { id: "rear_delt", label: "Rear delts", side: "back", slugs: ["deltoids"] },
  { id: "biceps", label: "Biceps", side: "front", slugs: ["biceps"] },
  { id: "forearms", label: "Forearms", side: "both", slugs: ["forearm"] },
  { id: "lower_back", label: "Lower back", side: "back", slugs: ["lower-back"] },
  { id: "quads", label: "Quads", side: "front", slugs: ["quadriceps"] },
  { id: "hamstrings", label: "Hamstrings", side: "back", slugs: ["hamstring"] },
  { id: "glutes", label: "Glutes", side: "back", slugs: ["gluteal"] },
  { id: "adductors", label: "Adductors", side: "front", slugs: ["adductors"] },
  { id: "calves", label: "Calves", side: "both", slugs: ["calves"] },
  { id: "tibialis", label: "Tibialis", side: "front", slugs: ["tibialis"] },
  { id: "abs", label: "Abs", side: "front", slugs: ["abs"] },
  { id: "obliques", label: "Obliques", side: "front", slugs: ["obliques"] },
];

export const MUSCLE_LABELS = Object.fromEntries(
  MUSCLE_GROUPS.map((group) => [group.id, group.label]),
) as Record<MuscleGroupId, string>;

export function intensityColor(value: number) {
  if (value >= 0.85) return "rgb(220 38 38)";
  if (value >= 0.6) return "rgb(249 115 22)";
  if (value >= 0.35) return "rgb(245 158 11)";
  if (value > 0) return "rgb(34 197 94)";
  return "rgb(71 85 105)";
}
