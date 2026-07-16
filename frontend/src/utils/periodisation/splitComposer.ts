import type { Programme } from "@/types/Periodisation";
import type {
  Split,
  SplitDTO,
  SplitWorkoutAssignmentDTO,
  WorkoutTemplate,
} from "@/types/Workout";
import { clampSplitWorkoutFrequency } from "@/utils/splitWorkoutFrequencies";

type SplitSource = Pick<
  SplitDTO,
  "id" | "name" | "createdAt" | "active" | "programmes" | "workoutAssignments"
>;

function sortAssignments(assignments: SplitWorkoutAssignmentDTO[]) {
  return [...assignments].sort((left, right) => left.workoutOrder - right.workoutOrder);
}

export function composeSplit(
  split: SplitSource | null | undefined,
  workouts: WorkoutTemplate[] | null | undefined,
): Split | null {
  if (!split) {
    return null;
  }

  const workoutById = new Map((workouts ?? []).map((workout) => [workout.id, workout]));
  const orderedAssignments = sortAssignments(split.workoutAssignments ?? []);
  const orderedWorkouts = orderedAssignments
    .map((assignment) => workoutById.get(assignment.workoutTemplateId))
    .filter((workout): workout is WorkoutTemplate => workout != null);

  return {
    id: split.id,
    name: split.name,
    createdAt: split.createdAt,
    active: split.active,
    workouts: orderedWorkouts,
    blocks: split.programmes.flatMap((programme: Programme) => programme.blocks),
    programmes: split.programmes,
    workoutFrequencies: orderedAssignments.map((assignment) => ({
      workoutTemplateId: assignment.workoutTemplateId,
      workoutTemplateName: workoutById.get(assignment.workoutTemplateId)?.name ?? assignment.workoutTemplateId,
      sessionsPerWeek: clampSplitWorkoutFrequency(assignment.sessionsPerWeek),
    })),
  };
}
