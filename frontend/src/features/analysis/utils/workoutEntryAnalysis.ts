import type { Block, Week } from "@/features/periodisation/types/Periodisation";
import type { WorkoutEntry } from "@/features/workout/types/Workout";
import { buildFinishEntrySummary, calculateBestSetE1rm } from "@/features/workout/entries/utils/workoutEntryHelpers";
import { matchesFocusExerciseConfigId } from "@/features/workout/entries/utils/templateFocus";
import {
  getExerciseIdentityDefinitionId,
  getExerciseIdentityInfoId,
  getExerciseIdentityName,
  getExerciseIdentityVariant,
  type ExerciseIdentityDraft,
} from "@/features/workout/entries/types/ExerciseIdentity";

type FinishEntrySetLike = {
  reps: string | number;
  weight?: string | number | null;
};

type FinishEntryExerciseLike = {
  identity: ExerciseIdentityDraft;
  sets: FinishEntrySetLike[];
};

type FinishEntryAnalysisContext = {
  block: Pick<Block, "blockType" | "repRangeMin" | "repRangeMax" | "targetRpeMin" | "targetRpeMax"> | null;
  week: Pick<Week, "isDeload" | "weekNumber"> | null;
  focusExerciseConfigId?: string | null;
};

type FinishEntryAnalysisTone = "neutral" | "success" | "warning" | "danger";

type FinishEntryAnalysisCard = {
  label: string;
  description: string;
  tone: FinishEntryAnalysisTone;
};

type FinishEntryProgrammeVerdict = FinishEntryAnalysisCard & {
  blockType: Block["blockType"] | null;
  weekNumber: number | null;
  isDeload: boolean;
};

type FinishEntryVolumeTrend = FinishEntryAnalysisCard & {
  currentVolume: number;
  previousVolume: number | null;
  volumeDelta: number | null;
};

type FinishEntryFocusLift = FinishEntryAnalysisCard & {
  exerciseName: string | null;
  variant: string | null;
  currentE1rm: number | null;
  previousE1rm: number | null;
  deltaE1rm: number | null;
  source: "programme_focus" | "best_improvement" | "fallback";
  matchedFocus: boolean;
};

type FinishEntryRepDistribution = FinishEntryAnalysisCard & {
  targetRepRangeMin: number | null;
  targetRepRangeMax: number | null;
  targetRepRangeText: string | null;
  totalReps: number;
  inRangeReps: number;
  belowRangeReps: number;
  aboveRangeReps: number;
  totalSets: number;
  inRangeSets: number;
  offTargetExercises: FinishEntryRepDistributionExercise[];
  offTargetExerciseCount: number;
};

type FinishEntryRepDistributionExercise = {
  exerciseName: string;
  variant: string | null;
  direction: "below" | "above" | "mixed";
  missedSets: number;
  belowSets: number;
  aboveSets: number;
  totalSets: number;
  targetRepRangeText: string;
};

type FinishEntryAnalysis = {
  verdict: FinishEntryProgrammeVerdict;
  volumeTrend: FinishEntryVolumeTrend;
  focusLift: FinishEntryFocusLift;
  repDistribution: FinishEntryRepDistribution;
};

type ComparableExercise = {
  exerciseName: string;
  variant?: string | null;
  exerciseDefinitionId?: string | null;
  exerciseInfoId?: number | null;
  sets: FinishEntrySetLike[];
};

const BLOCK_LABELS: Record<NonNullable<FinishEntryProgrammeVerdict["blockType"]>, string> = {
  HYPERTROPHY: "Hypertrophy",
  STRENGTH: "Strength",
  PEAKING: "Peaking",
};

function parseReps(value: string | number): number {
  const reps = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(reps) ? reps : 0;
}

function normaliseToken(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

function getExerciseKey(exercise: Pick<ComparableExercise, "exerciseName" | "variant">) {
  return `${normaliseToken(exercise.exerciseName)}||${normaliseToken(exercise.variant ?? null)}`;
}

function getRepDistributionExerciseKey(exercise: ComparableExercise) {
  const infoIdKey = exercise.exerciseInfoId != null ? `info:${exercise.exerciseInfoId}` : "info:none";
  return `${infoIdKey}||${getExerciseKey(exercise)}`;
}

function toComparableExercise(exercise: FinishEntryExerciseLike): ComparableExercise {
  return {
    exerciseName: getExerciseIdentityName(exercise.identity),
    variant: getExerciseIdentityVariant(exercise.identity),
    exerciseDefinitionId: getExerciseIdentityDefinitionId(exercise.identity),
    exerciseInfoId: getExerciseIdentityInfoId(exercise.identity),
    sets: exercise.sets,
  };
}

function toComparableWorkoutEntryExercise(exercise: WorkoutEntry["exercises"][number]): ComparableExercise {
  return {
    exerciseName: exercise.exerciseName,
    variant: exercise.variant ?? null,
    exerciseDefinitionId: null,
    exerciseInfoId: exercise.exerciseInfoId ?? null,
    sets: exercise.sets,
  };
}

function findPreviousExercise(currentExercise: ComparableExercise, previousExercises: ComparableExercise[]) {
  if (currentExercise.exerciseInfoId != null) {
    const matchedByInfoId = previousExercises.find(
      (exercise) => exercise.exerciseInfoId === currentExercise.exerciseInfoId,
    );

    if (matchedByInfoId) {
      return matchedByInfoId;
    }
  }

  const currentKey = getExerciseKey(currentExercise);
  return previousExercises.find((exercise) => getExerciseKey(exercise) === currentKey) ?? null;
}

function getVolumeToneAndDescription(
  blockType: FinishEntryProgrammeVerdict["blockType"],
  isDeload: boolean,
  volumeDelta: number | null,
  previousVolume: number | null,
  bestImprovedLift: FinishEntryFocusLift | null,
): Pick<FinishEntryVolumeTrend, "label" | "description" | "tone"> {
  if (previousVolume == null || volumeDelta == null) {
    return {
      label: "First entry",
      description: "This is your first logged pass, so there is no previous entry to compare against yet.",
      tone: "neutral",
    };
  }

  if (isDeload) {
    if (volumeDelta < 0) {
      return {
        label: "Deload volume down",
        description: "A lighter session is often exactly what a deload should do: clear fatigue while keeping the movement pattern active.",
        tone: "success",
      };
    }

    if (volumeDelta > 0) {
      return {
        label: "Deload volume up",
        description: "This deload is carrying more work than the last entry, so it is worth checking whether the fatigue reduction is still doing its job.",
        tone: "warning",
      };
    }

    return {
      label: "Deload volume steady",
      description: "Volume stayed level, which can be fine if the goal is simply to maintain movement quality while shedding fatigue.",
      tone: "neutral",
    };
  }

  if (volumeDelta > 0) {
    if (blockType === "HYPERTROPHY") {
      return {
        label: "Volume increased",
        description: "That is a good direction for a hypertrophy block, especially if the reps stayed close to the target band.",
        tone: "success",
      };
    }

    if (blockType === "STRENGTH") {
      return {
        label: "Volume increased",
        description: "More work can be useful in a strength block, but the lift-specific signal matters just as much as the total tonnage.",
        tone: bestImprovedLift?.deltaE1rm != null && bestImprovedLift.deltaE1rm > 0 ? "success" : "warning",
      };
    }

    if (blockType === "PEAKING") {
      return {
        label: "Volume increased",
        description: "A peaking block usually prefers fatigue to trend down, so this extra work is only a good sign if the key lifts stayed sharp.",
        tone: "warning",
      };
    }

    return {
      label: "Volume increased",
      description: "Total volume increased compared with the last entry.",
      tone: "success",
    };
  }

  if (volumeDelta < 0) {
    if (blockType === "HYPERTROPHY") {
      return {
        label: "Volume decreased",
        description: "That can be fine if it was intentional, but hypertrophy usually wants enough work to stay close to the target range.",
        tone: "warning",
      };
    }

    if (blockType === "STRENGTH") {
      return {
        label: "Volume decreased",
        description: "Lower tonnage can be a good trade if the heavy sets moved better and the key lift signal improved.",
        tone: bestImprovedLift?.deltaE1rm != null && bestImprovedLift.deltaE1rm > 0 ? "success" : "neutral",
      };
    }

    if (blockType === "PEAKING") {
      return {
        label: "Volume decreased",
        description: "That is often exactly what a taper wants, provided the main lift still looks crisp.",
        tone: "success",
      };
    }

    return {
      label: "Volume decreased",
      description: "Total volume decreased compared with the last entry.",
      tone: "neutral",
    };
  }

  if (blockType === "PEAKING") {
    return {
      label: "Volume steady",
      description: "A peaking block usually wants fatigue to drift down, so a flat workload is only ideal if the quality signal is clearly improving.",
      tone: "warning",
    };
  }

  if (blockType === "STRENGTH") {
    return {
      label: "Volume steady",
      description: "The total workload was unchanged, so the key question is whether the main lifts got cleaner or heavier.",
      tone: "neutral",
    };
  }

  if (blockType === "HYPERTROPHY") {
    return {
      label: "Volume steady",
      description: "Flat volume can work, but hypertrophy usually benefits from a clearer progressive overload trend over time.",
      tone: "warning",
    };
  }

  return {
    label: "Volume steady",
    description: "Total volume was unchanged compared with the last entry.",
    tone: "neutral",
  };
}

function getRepDistributionDescription(
  blockType: FinishEntryProgrammeVerdict["blockType"],
  isDeload: boolean,
  targetRepRangeMin: number | null,
  targetRepRangeMax: number | null,
  inRangeReps: number,
  belowRangeReps: number,
  aboveRangeReps: number,
  totalReps: number,
): Pick<FinishEntryRepDistribution, "label" | "description" | "tone"> {
  if (targetRepRangeMin == null || targetRepRangeMax == null || totalReps === 0) {
    return {
      label: "Rep distribution",
      description: "There is not enough structured work here to judge the rep distribution yet.",
      tone: "neutral",
    };
  }

  const inRangeRatio = inRangeReps / totalReps;
  const rangeText = `${targetRepRangeMin}-${targetRepRangeMax} reps`;

  if (isDeload) {
    return {
      label: "Rep distribution",
      description: `The ${rangeText} target was still visible, but the set pattern is being softened as part of deload fatigue management.`,
      tone: "neutral",
    };
  }

  if (inRangeRatio >= 0.75) {
    if (blockType === "HYPERTROPHY") {
      return {
        label: "Rep distribution",
        description: `Most of the work sat inside the ${rangeText} window, which is a strong hypertrophy signal.`,
        tone: "success",
      };
    }

    if (blockType === "STRENGTH") {
      return {
        label: "Rep distribution",
        description: `Most of the work lived in the ${rangeText} window, which is a solid strength-block shape.`,
        tone: "success",
      };
    }

    if (blockType === "PEAKING") {
      return {
        label: "Rep distribution",
        description: `The ${rangeText} work stayed tight, which is useful when you want a sharper peaking signal.`,
        tone: "success",
      };
    }

    return {
      label: "Rep distribution",
      description: `Most of the work sat inside the ${rangeText} window.`,
      tone: "success",
    };
  }

  if (aboveRangeReps > belowRangeReps) {
    return {
      label: "Rep distribution",
      description: `More reps drifted above the ${rangeText} target than below it, so the session ran a little higher-rep than planned.`,
      tone: blockType === "HYPERTROPHY" ? "warning" : "neutral",
    };
  }

  if (belowRangeReps > aboveRangeReps) {
    return {
      label: "Rep distribution",
      description: `More reps fell below the ${rangeText} target than above it, so the session ran a little heavier than planned.`,
      tone: blockType === "STRENGTH" || blockType === "PEAKING" ? "success" : "warning",
    };
  }

  return {
    label: "Rep distribution",
    description: `Work was split fairly evenly around the ${rangeText} target.`,
    tone: "neutral",
  };
}

function buildProgrammeVerdict(
  blockType: FinishEntryProgrammeVerdict["blockType"],
  isDeload: boolean,
  weekNumber: number | null,
  inRangeReps: number,
  totalReps: number,
  bestImprovedLift: FinishEntryFocusLift | null,
  volumeDelta: number | null,
): Pick<FinishEntryProgrammeVerdict, "label" | "description" | "tone"> {
  if (!blockType) {
    return {
      label: "No programme context",
      description: "This session is being analysed without an active programme block, so the result leans on general workout signals.",
      tone: "neutral",
    };
  }

  const blockLabel = BLOCK_LABELS[blockType];
  const repFit = totalReps > 0 ? inRangeReps / totalReps : 0;

  if (isDeload) {
    return {
      label: `${blockLabel} deload`,
      description: `Week ${weekNumber ?? "?"} is set up as a deload, so reducing fatigue matters more than pushing the numbers.`,
      tone: "success",
    };
  }

  if (blockType === "HYPERTROPHY") {
    if (repFit >= 0.75 && (volumeDelta == null || volumeDelta >= 0)) {
      return {
        label: "Hypertrophy on track",
        description: `The session stayed close to the target rep band, which is exactly the kind of shape a size block wants.`,
        tone: "success",
      };
    }

    if (repFit >= 0.5) {
      return {
        label: "Hypertrophy close",
        description: `The work is broadly in the right zone, but tightening the rep distribution would make the hypertrophy signal clearer.`,
        tone: "warning",
      };
    }

    return {
      label: "Hypertrophy drifting",
      description: `Too much of the session sat away from the target rep band, so the next pass should push the work closer to the planned range.`,
      tone: "warning",
    };
  }

  if (blockType === "STRENGTH") {
    if (bestImprovedLift?.deltaE1rm != null && bestImprovedLift.deltaE1rm > 0) {
      return {
        label: "Strength signal improving",
        description: "The lift-specific signal moved in the right direction, which matters more here than raw volume alone.",
        tone: "success",
      };
    }

    if (repFit < 0.5) {
      return {
        label: "Strength reps ran high",
        description: "A strength block usually wants more work in the lower rep range, so this session reads a little high-rep.",
        tone: "warning",
      };
    }

    return {
      label: "Strength block steady",
      description: "Nothing dramatic changed, so the next question is whether the key lift gets cleaner or heavier next time.",
      tone: "neutral",
    };
  }

  if (blockType === "PEAKING") {
    if (volumeDelta != null && volumeDelta < 0 && bestImprovedLift?.deltaE1rm != null && bestImprovedLift.deltaE1rm > 0) {
      return {
        label: "Good taper signal",
        description: "Lower workload with a stronger lift signal is exactly the kind of trade-off you want to see when peaking.",
        tone: "success",
      };
    }

    if (volumeDelta != null && volumeDelta > 0) {
      return {
        label: "Peaking volume ran high",
        description: "A peaking block usually wants fatigue to come down, so extra work here deserves a second look.",
        tone: "warning",
      };
    }

    return {
      label: "Peaking signal steady",
      description: "The session is stable, but the main question in a peak is whether fatigue is dropping while performance stays sharp.",
      tone: "neutral",
    };
  }

  return {
    label: `${blockLabel} analysis`,
    description: "The programme context is present, but there is not enough block-specific detail here to make a sharper call.",
    tone: "neutral",
  };
}

function getBestImprovedLift(summary: ReturnType<typeof buildFinishEntrySummary>): FinishEntryFocusLift | null {
  const bestLift = [...summary.improvedLifts].sort((left, right) => right.deltaE1rm - left.deltaE1rm)[0] ?? null;

  if (!bestLift) {
    return null;
  }

  return {
    label: "Focus lift",
    description: "The most improved lift is carrying the signal today.",
    tone: "success",
    exerciseName: bestLift.exerciseName,
    variant: bestLift.variant ?? null,
    currentE1rm: bestLift.currentE1rm,
    previousE1rm: bestLift.previousE1rm,
    deltaE1rm: bestLift.deltaE1rm,
    source: "best_improvement",
    matchedFocus: false,
  };
}

function buildFallbackFocusLift(): FinishEntryFocusLift {
  return {
    label: "Focus lift",
    description: "No lift clearly outperformed the last entry yet, so there is no standout lift signal to report.",
    tone: "neutral",
    exerciseName: null,
    variant: null,
    currentE1rm: null,
    previousE1rm: null,
    deltaE1rm: null,
    source: "fallback",
    matchedFocus: false,
  };
}

function buildProgrammeFocusLift(
  currentExercises: ComparableExercise[],
  previousExercises: ComparableExercise[],
  focusExerciseConfigId: string | null | undefined,
): FinishEntryFocusLift | null {
  if (!focusExerciseConfigId) {
    return null;
  }

  const focusedExercise = currentExercises.find((exercise) =>
    matchesFocusExerciseConfigId(exercise, focusExerciseConfigId),
  );

  if (!focusedExercise) {
    return null;
  }

  const previousExercise = findPreviousExercise(focusedExercise, previousExercises);
  const currentE1rm = calculateBestSetE1rm(focusedExercise.sets);
  const previousE1rm = previousExercise ? calculateBestSetE1rm(previousExercise.sets) : null;
  const deltaE1rm = currentE1rm != null && previousE1rm != null ? Math.round((currentE1rm - previousE1rm) * 10) / 10 : null;

  if (deltaE1rm != null && deltaE1rm > 0) {
    return {
      label: "Focus lift",
      description: "The programme focus lift is moving in the right direction.",
      tone: "success",
      exerciseName: focusedExercise.exerciseName,
      variant: focusedExercise.variant ?? null,
      currentE1rm,
      previousE1rm,
      deltaE1rm,
      source: "programme_focus",
      matchedFocus: true,
    };
  }

  if (previousE1rm != null) {
    return {
      label: "Focus lift",
      description: "The programme focus lift is logged, but it did not clearly beat the last entry yet.",
      tone: deltaE1rm != null && deltaE1rm < 0 ? "warning" : "neutral",
      exerciseName: focusedExercise.exerciseName,
      variant: focusedExercise.variant ?? null,
      currentE1rm,
      previousE1rm,
      deltaE1rm,
      source: "programme_focus",
      matchedFocus: true,
    };
  }

  return {
    label: "Focus lift",
    description: "The programme focus lift is logged, but there is no previous entry to compare against yet.",
    tone: "neutral",
    exerciseName: focusedExercise.exerciseName,
    variant: focusedExercise.variant ?? null,
    currentE1rm,
    previousE1rm: null,
    deltaE1rm: null,
    source: "programme_focus",
    matchedFocus: true,
  };
}

function buildRepDistribution(
  currentExercises: ComparableExercise[],
  block: FinishEntryAnalysisContext["block"],
  week: FinishEntryAnalysisContext["week"],
): FinishEntryRepDistribution {
  const targetRepRangeMin = block?.repRangeMin ?? null;
  const targetRepRangeMax = block?.repRangeMax ?? null;
  const targetRepRangeText =
    targetRepRangeMin != null && targetRepRangeMax != null
      ? `${targetRepRangeMin}-${targetRepRangeMax} reps`
      : null;

  let totalReps = 0;
  let inRangeReps = 0;
  let belowRangeReps = 0;
  let aboveRangeReps = 0;
  let totalSets = 0;
  let inRangeSets = 0;
  const offTargetExercisesByKey = new Map<string, FinishEntryRepDistributionExercise>();

  for (const exercise of currentExercises) {
    let exerciseTotalSets = 0;
    let exerciseBelowSets = 0;
    let exerciseAboveSets = 0;

    for (const set of exercise.sets) {
      const reps = parseReps(set.reps);
      if (reps <= 0) {
        continue;
      }

      exerciseTotalSets += 1;
      totalSets += 1;
      totalReps += reps;

      if (targetRepRangeMin == null || targetRepRangeMax == null) {
        continue;
      }

      if (reps < targetRepRangeMin) {
        belowRangeReps += reps;
        exerciseBelowSets += 1;
        continue;
      }

      if (reps > targetRepRangeMax) {
        aboveRangeReps += reps;
        exerciseAboveSets += 1;
        continue;
      }

      inRangeReps += reps;
      inRangeSets += 1;
    }

    if (
      targetRepRangeText &&
      exerciseTotalSets > 0 &&
      (exerciseBelowSets > 0 || exerciseAboveSets > 0)
    ) {
      const key = getRepDistributionExerciseKey(exercise);
      const existing = offTargetExercisesByKey.get(key);
      const nextEntry: FinishEntryRepDistributionExercise = existing
        ? {
            ...existing,
            missedSets: existing.missedSets + exerciseBelowSets + exerciseAboveSets,
            belowSets: existing.belowSets + exerciseBelowSets,
            aboveSets: existing.aboveSets + exerciseAboveSets,
            totalSets: existing.totalSets + exerciseTotalSets,
            direction:
              existing.belowSets + exerciseBelowSets > existing.aboveSets + exerciseAboveSets
                ? "below"
                : existing.aboveSets + exerciseAboveSets > existing.belowSets + exerciseBelowSets
                  ? "above"
                  : "mixed",
          }
        : {
            exerciseName: exercise.exerciseName,
            variant: exercise.variant ?? null,
            direction:
              exerciseBelowSets > exerciseAboveSets
                ? "below"
                : exerciseAboveSets > exerciseBelowSets
                  ? "above"
                  : "mixed",
            missedSets: exerciseBelowSets + exerciseAboveSets,
            belowSets: exerciseBelowSets,
            aboveSets: exerciseAboveSets,
            totalSets: exerciseTotalSets,
            targetRepRangeText,
          };

      offTargetExercisesByKey.set(key, nextEntry);
    }
  }

  const offTargetExercises = [...offTargetExercisesByKey.values()];

  offTargetExercises.sort((left, right) => {
    if (right.missedSets !== left.missedSets) {
      return right.missedSets - left.missedSets;
    }

    return left.exerciseName.localeCompare(right.exerciseName);
  });

  const verdict = getRepDistributionDescription(
    block?.blockType ?? null,
    week?.isDeload ?? false,
    targetRepRangeMin,
    targetRepRangeMax,
    inRangeReps,
    belowRangeReps,
    aboveRangeReps,
    totalReps,
  );

  return {
    ...verdict,
    targetRepRangeMin,
    targetRepRangeMax,
    targetRepRangeText,
    totalReps,
    inRangeReps,
    belowRangeReps,
    aboveRangeReps,
    totalSets,
    inRangeSets,
    offTargetExercises,
    offTargetExerciseCount: offTargetExercises.length,
  };
}

export function buildFinishEntryAnalysis(
  exerciseData: FinishEntryExerciseLike[],
  lastEntry: WorkoutEntry | null,
  context: FinishEntryAnalysisContext | null,
): FinishEntryAnalysis {
  const currentExercises = exerciseData.map(toComparableExercise);
  const previousExercises = lastEntry?.exercises.map(toComparableWorkoutEntryExercise) ?? [];
  const summary = buildFinishEntrySummary(
    exerciseData.map((exercise) => ({
      exerciseName: getExerciseIdentityName(exercise.identity),
      variant: getExerciseIdentityVariant(exercise.identity),
      sets: exercise.sets,
    })),
    lastEntry,
  );

  const blockType = context?.block?.blockType ?? null;
  const isDeload = context?.week?.isDeload ?? false;
  const bestImprovedLift = getBestImprovedLift(summary);
  const programmeFocusLift = buildProgrammeFocusLift(
    currentExercises,
    previousExercises,
    context?.focusExerciseConfigId ?? null,
  );
  const focusLift = programmeFocusLift ?? bestImprovedLift ?? buildFallbackFocusLift();
  const repDistribution = buildRepDistribution(currentExercises, context?.block ?? null, context?.week ?? null);
  const volumeTrend = getVolumeToneAndDescription(
    blockType,
    isDeload,
    summary.volumeDelta,
    summary.previousVolume,
    bestImprovedLift,
  );
  const verdict = buildProgrammeVerdict(
    blockType,
    isDeload,
    context?.week?.weekNumber ?? null,
    repDistribution.inRangeReps,
    repDistribution.totalReps,
    bestImprovedLift,
    summary.volumeDelta,
  );

  return {
    verdict: {
      ...verdict,
      blockType,
      weekNumber: context?.week?.weekNumber ?? null,
      isDeload,
    },
    volumeTrend: {
      ...volumeTrend,
      currentVolume: summary.currentVolume,
      previousVolume: summary.previousVolume,
      volumeDelta: summary.volumeDelta,
    },
    focusLift: {
      ...focusLift,
      source: focusLift.source,
      matchedFocus: focusLift.matchedFocus,
    },
    repDistribution,
  };
}

export type {
  FinishEntryAnalysisContext,
  FinishEntryAnalysisTone,
};
