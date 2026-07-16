import type {
  DashboardSummary,
  ExerciseDefinition,
  Split,
  WorkoutEntry,
  WorkoutTemplate,
} from "@/types/Workout";
import type { Block, Programme } from "@/types/Periodisation";
import type { StartupSplit } from "@/types/Startup";
import type {
  DashboardTrainingInsights,
  ExerciseTrainingInsight,
  SmartCoachDismissal,
  WorkoutTemplateTrainingInsights,
} from "@/types/Insights";
import type {
  AnalysisCockpitSummary,
  PowerliftingSummary,
  ProgressChartPreset,
  ProgressChartQueryResponse,
  ProgressSeriesCatalogItem,
  ProgressSeriesDiagnostics,
} from "@/types/Progress";
import type {
  ExerciseInfoCatalogItem,
  MappingSource,
  MuscleGroupId,
  MuscleHeatmapResponse,
  ResolvedExerciseHeatmap,
  WeeklyMuscleVolumeResponse,
} from "@/types/Heatmap";
import type { User } from "@/types/User";
import type { BodyweightLog } from "@/types/Bodyweight";

let sequence = 0;

function nextId(prefix: string) {
  sequence += 1;
  return `${prefix}-${sequence}`;
}

export function buildUser(overrides: Partial<User> = {}): User {
  return {
    sub: nextId("user-sub"),
    username: `user_${sequence + 1}`,
    accessToken: `token-${sequence + 1}`,
    mfaEnabled: false,
    ...overrides,
  };
}

export function buildWorkoutTemplate(
  overrides: Partial<WorkoutTemplate> = {},
): WorkoutTemplate {
  return {
    id: nextId("workout"),
    name: "Push Day A",
    category: "Push",
    createdAt: "2026-04-24T10:00:00.000Z",
    exercises: [
      {
        exerciseName: "Bench Press",
        goalSets: 3,
        variant: "Barbell",
        goalReps: 8,
        targetRestSeconds: 120,
      },
      {
        exerciseName: "Incline Press",
        goalSets: 2,
        goalReps: 10,
      },
    ],
    ...overrides,
  };
}

export function buildWorkoutEntry(
  overrides: Partial<WorkoutEntry> = {},
): WorkoutEntry {
  const template = overrides.template ?? buildWorkoutTemplate();

  return {
    id: nextId("entry"),
    template,
    createdAt: "2026-04-24T12:00:00.000Z",
    exercises: [
      {
        id: nextId("exercise-entry"),
        exerciseName: template.exercises[0]?.exerciseName ?? "Bench Press",
        variant: template.exercises[0]?.variant,
        loggedExerciseName: template.exercises[0]?.exerciseName ?? "Bench Press",
        loggedVariant: template.exercises[0]?.variant ?? null,
        goalSets: template.exercises[0]?.goalSets ?? 3,
        sets: [
          {
            id: nextId("set"),
            reps: 8,
            weight: 100,
            rpe: 8,
            notes: "Solid",
            restBeforeSeconds: null,
          },
        ],
      },
    ],
    ...overrides,
  };
}

export function buildBlock(overrides: Partial<Block> = {}): Block {
  return {
    id: nextId("block"),
    name: "Accumulation",
    blockType: "HYPERTROPHY",
    progressionStrategy: "WEIGHT_FIRST",
    durationWeeks: 4,
    targetRpeMin: 6,
    targetRpeMax: 8,
    repRangeMin: 6,
    repRangeMax: 12,
    blockOrder: 1,
    startDate: "2026-04-01T00:00:00.000Z",
    weeks: [],
    ...overrides,
  };
}

export function buildProgramme(overrides: Partial<Programme> = {}): Programme {
  return {
    id: nextId("programme"),
    createdAt: "2026-04-20T00:00:00.000Z",
    startDate: "2026-04-01T00:00:00.000Z",
    active: true,
    presetType: "CUSTOM",
    blocks: [buildBlock()],
    ...overrides,
  };
}

export function buildSplit(overrides: Partial<Split> = {}): Split {
  const workouts = overrides.workouts ?? [buildWorkoutTemplate(), buildWorkoutTemplate({ name: "Pull Day" })];
  const programmes = overrides.programmes ?? [buildProgramme()];
  const workoutFrequencies = overrides.workoutFrequencies ?? workouts.map((workout) => ({
    workoutTemplateId: workout.id,
    workoutTemplateName: workout.name,
    sessionsPerWeek: 1,
  }));

  return {
    id: nextId("split"),
    name: "Upper Lower",
    createdAt: "2026-04-24T09:00:00.000Z",
    active: true,
    workouts,
    workoutFrequencies,
    blocks: programmes.flatMap((programme) => programme.blocks),
    programmes,
    ...overrides,
  };
}

export function buildStartupSplit(overrides: Partial<StartupSplit> = {}): StartupSplit {
  const split = buildSplit();
  const workoutAssignments = split.workoutFrequencies.map((frequency, index) => ({
    id: nextId("split-assignment"),
    workoutTemplateId: frequency.workoutTemplateId,
    sessionsPerWeek: frequency.sessionsPerWeek,
    workoutOrder: index,
  }));

  return {
    id: split.id,
    name: split.name,
    createdAt: split.createdAt,
    active: split.active,
    programmes: split.programmes,
    workoutAssignments,
    ...overrides,
  };
}

export function buildApiError(cause = "Request failed") {
  return { cause };
}

export function buildDashboardTrainingInsights(
  overrides: Partial<DashboardTrainingInsights> = {},
): DashboardTrainingInsights {
  return {
    nextWorkoutTemplateId: "workout-1",
    activeBlock: {
      name: "Strength",
      weekNumber: 2,
      totalWeeks: 4,
      deload: false,
      blockType: "STRENGTH",
      progressionStrategy: "WEIGHT_FIRST",
      targetRpeMin: 7,
      targetRpeMax: 9,
      repRangeMin: 5,
      repRangeMax: 8,
    },
    headlineInsights: [
      {
        kind: "NEXT_WORKOUT",
        title: "Bench Day",
        exerciseName: "Bench Press",
        variant: "Barbell",
        trainingState: "IMPROVING",
        reasoning: "All sets looked comfortable. Try 105kg next time.",
        suggestedWeightKg: 105,
        workoutTemplateId: "workout-1",
        recommendedAction: "INCREASE_LOAD",
      },
      {
        kind: "TRAINING_STATUS",
        title: "Momentum is good",
        trainingState: "IMPROVING",
        reasoning: "Most tracked lifts are moving well.",
        recommendedAction: "STAY_THE_COURSE",
      },
    ],
    attentionCount: 0,
    positiveCount: 1,
    plateauCount: 0,
    underexposedCount: 1,
    ...overrides,
  };
}


export function buildDashboardSummary(
  overrides: Partial<DashboardSummary> = {},
): DashboardSummary {
  return {
    workoutTemplateCount: 2,
    splitCount: 1,
    activeSplit: {
      id: "split-1",
      name: "Upper Lower",
    },
    nextWorkout: {
      id: "workout-1",
      name: "Bench Focus",
      category: "Push",
      previewExercises: [
        { exerciseName: "Bench Press", variant: "Barbell", goalSets: 3 },
        { exerciseName: "Incline Press", variant: null, goalSets: 2 },
      ],
      extraExerciseCount: 0,
      lastCompletedAt: "2026-04-25T08:00:00.000Z",
      lastSetCount: 2,
    },
    topLift: {
      exerciseName: "Bench Press (Barbell)",
      sessionCount: 2,
      personalBestKg: 105,
      improvementKg: 5,
      personalBestTopSetPerformedAt: "2026-05-10T08:00:00.000Z",
      improvementBaselineTopSetPerformedAt: "2026-05-01T08:00:00.000Z",
      topSetWeightKg: 105,
      topSetReps: 5,
      estimatedOneRepMaxKg: 121.3,
      bodyweightKg: 80,
      bodyweightLoggedAt: "2026-05-09",
      loadBodyweightRatio: 1.31,
      estimatedOneRepMaxBodyweightRatio: 1.52,
      mostRecentTopSetWeightKg: 100,
      mostRecentTopSetReps: 5,
      mostRecentEstimatedOneRepMaxKg: 115.6,
      mostRecentTopSetPerformedAt: "2026-05-10T08:00:00.000Z",
      mostRecentBodyweightKg: 80,
      mostRecentBodyweightLoggedAt: "2026-05-10",
      mostRecentLoadBodyweightRatio: 1.25,
      mostRecentEstimatedOneRepMaxBodyweightRatio: 1.45,
      previousTopSetWeightKg: 105,
      previousTopSetReps: 5,
      previousEstimatedOneRepMaxKg: 121.3,
      previousTopSetPerformedAt: "2026-05-10T08:00:00.000Z",
    },
    ...overrides,
  };
}

export function buildExerciseTrainingInsight(
  overrides: Partial<ExerciseTrainingInsight> = {},
): ExerciseTrainingInsight {
  return {
    exerciseName: "Bench Press",
    variant: "Barbell",
    trainingState: "IMPROVING",
    reasoning: "All sets looked controlled. Add a little weight next time.",
    suggestedWeightKg: 105,
    currentWeightKg: 100,
    estimated1RmTrendPercent: 4.8,
    sessionCount: 4,
    lastPerformedAt: "2026-04-24T00:00:00.000Z",
    context: {
      name: "Strength",
      weekNumber: 2,
      totalWeeks: 4,
      deload: false,
      blockType: "STRENGTH",
      progressionStrategy: "WEIGHT_FIRST",
      targetRpeMin: 7,
      targetRpeMax: 9,
      repRangeMin: 5,
      repRangeMax: 8,
    },
    recommendedAction: "INCREASE_LOAD",
    ...overrides,
  };
}

export function buildWorkoutTemplateTrainingInsights(
  overrides: Partial<WorkoutTemplateTrainingInsights> = {},
): WorkoutTemplateTrainingInsights {
  return {
    templateId: "workout-1",
    generatedAt: "2026-04-26T10:00:00.000Z",
    blockContext: {
      name: "Strength",
      weekNumber: 2,
      totalWeeks: 4,
      deload: false,
      blockType: "STRENGTH",
      progressionStrategy: "WEIGHT_FIRST",
      targetRpeMin: 7,
      targetRpeMax: 9,
      repRangeMin: 5,
      repRangeMax: 8,
    },
    exerciseInsights: [
      {
        exerciseName: "Bench Press",
        variant: "Barbell",
        goalSets: 3,
        recommendedWeightKg: 105,
        recommendedRepRangeMin: 5,
        recommendedRepRangeMax: 8,
        trainingState: "IMPROVING",
        reasoning: "Try 105kg and stay within the block rep range.",
        lastSessionWeightKg: 100,
        lastSessionPerformedAt: "2026-04-24T00:00:00.000Z",
        recommendedAction: "INCREASE_LOAD",
      },
    ],
    ...overrides,
  };
}

export function buildSmartCoachDismissal(
  overrides: Partial<SmartCoachDismissal> = {},
): SmartCoachDismissal {
  return {
    id: nextId("dismissal"),
    exerciseName: "Bench Press",
    variant: "Barbell",
    trainingState: "TRUE_PLATEAU",
    recommendedAction: "CHANGE_VARIATION",
    dismissedAt: "2026-04-26T10:00:00.000Z",
    ...overrides,
  };
}

export function buildProgressSeriesCatalogItem(
  overrides: Partial<ProgressSeriesCatalogItem> = {},
): ProgressSeriesCatalogItem {
  return {
    seriesKey: "Bench Press||Barbell",
    exerciseName: "Bench Press",
    variant: "Barbell",
    label: "Bench Press (Barbell)",
    sessionCount: 6,
    lastPerformedAt: "2026-04-24T00:00:00.000Z",
    ...overrides,
  };
}

export function buildAnalysisCockpitSummary(
  overrides: Partial<AnalysisCockpitSummary> = {},
): AnalysisCockpitSummary {
  return {
    generatedAt: "2026-05-27T10:00:00.000Z",
    overallStatus: "ON_TRACK",
    headline: "On track: no urgent intervention needed",
    focus: "Keep using the cockpit to confirm progress, exposure, and fatigue stay aligned.",
    bigThree: [
      {
        liftFamily: "SQUAT",
        exerciseName: "Squat",
        variant: "Barbell",
        competitionLiftE1rm: 210,
        topSetE1rm: 205,
        weeklyFrequency: 2,
        heavyExposureCount: 3,
        specificityRatio: 0.92,
        trainingState: "IMPROVING",
        status: "ON_TRACK",
      },
      {
        liftFamily: "BENCH",
        exerciseName: "Bench Press",
        variant: "Barbell",
        competitionLiftE1rm: 145,
        topSetE1rm: 142,
        weeklyFrequency: 3,
        heavyExposureCount: 4,
        specificityRatio: 0.98,
        trainingState: "IMPROVING",
        status: "ON_TRACK",
      },
      {
        liftFamily: "DEADLIFT",
        exerciseName: "Deadlift",
        variant: "Conventional",
        competitionLiftE1rm: 240,
        topSetE1rm: 235,
        weeklyFrequency: 1,
        heavyExposureCount: 2,
        specificityRatio: 0.9,
        trainingState: "UNDEREXPOSED",
        status: "UNDEREXPOSED",
      },
    ],
    priorities: [
      {
        rank: 1,
        exerciseName: "Deadlift",
        variant: "Conventional",
        trainingState: "UNDEREXPOSED",
        recommendedAction: "INCREASE_EXPOSURE",
        evidence: "Only a small number of recent deadlift exposures are available.",
        whyItMatters: "Sparse exposure makes trend data noisy and weakens any progression call.",
        inspectHref: "/insights?tab=lift&exerciseDefinitionId=Deadlift&exercise=Deadlift&variant=Conventional",
      },
    ],
    dataQualityIssues: [],
    ...overrides,
  };
}

export function buildProgressChartPreset(
  overrides: Partial<ProgressChartPreset> = {},
): ProgressChartPreset {
  return {
    id: nextId("progress-preset"),
    name: "Big 3 e1RM 90D",
    metric: "BEST_SET_E1RM",
    comparisonMode: "BASELINE_PERCENT",
    aggregation: "SESSION",
    smoothing: "NONE",
    baselineMode: "FIRST_VISIBLE",
    dateRangePreset: "90D",
    from: null,
    to: null,
    pinned: true,
    series: [
      {
        exerciseName: "Bench Press",
        variant: "Barbell",
        label: "Bench",
        color: "#2563eb",
      },
    ],
    createdAt: "2026-04-26T10:00:00.000Z",
    updatedAt: "2026-04-26T10:05:00.000Z",
    ...overrides,
  };
}

export function buildProgressChartQueryResponse(
  overrides: Partial<ProgressChartQueryResponse> = {},
): ProgressChartQueryResponse {
  return {
    unit: "%",
    metric: "BEST_SET_E1RM",
    comparisonMode: "BASELINE_PERCENT",
    points: [
      { timestamp: "2026-03-01T00:00:00.000Z", seriesKey: "exercise-definition-1", value: 0 },
      { timestamp: "2026-04-01T00:00:00.000Z", seriesKey: "exercise-definition-1", value: 4.8 },
    ],
    ...overrides,
  };
}

export function buildProgressSeriesDiagnostics(
  overrides: Partial<ProgressSeriesDiagnostics> = {},
): ProgressSeriesDiagnostics {
  return {
    seriesKey: "Bench Press||Barbell",
    exerciseName: "Bench Press",
    variant: "Barbell",
    trainingState: "IMPROVING",
    fatigueFlag: false,
    exposureGapFlag: false,
    adherencePercent: 97,
    sessionCount: 6,
    lastPerformedAt: "2026-04-24T00:00:00.000Z",
    estimated1RmChangePercent: 4.8,
    workingWeightChangePercent: 5,
    totalVolumeChangePercent: 8,
    averageRpeChange: 0.2,
    repCompletionChange: 0,
    context: {
      name: "Strength",
      weekNumber: 2,
      totalWeeks: 4,
      deload: false,
      blockType: "STRENGTH",
      progressionStrategy: "WEIGHT_FIRST",
      targetRpeMin: 7,
      targetRpeMax: 9,
      repRangeMin: 5,
      repRangeMax: 8,
    },
    ...overrides,
  };
}

export function buildPowerliftingSummary(
  overrides: Partial<PowerliftingSummary> = {},
): PowerliftingSummary {
  return {
    generatedAt: "2026-04-24T00:00:00.000Z",
    squatFrequency: 2,
    benchPressFrequency: 3,
    deadliftFrequency: 1,
    hardSetsByLiftFamily: 12,
    lifts: [],
    ...overrides,
  };
}

export function buildExerciseInfoCatalogItem(
  overrides: Partial<ExerciseInfoCatalogItem> = {},
): ExerciseInfoCatalogItem {
  return {
    id: 1,
    name: "Bench Press",
    variation: "Barbell",
    equipment: "Barbell",
    mainMuscle: "Chest",
    ...overrides,
  };
}

export function buildExerciseDefinition(
  overrides: Partial<ExerciseDefinition> = {},
): ExerciseDefinition {
  return {
    id: "exercise-definition-1",
    exerciseName: "Bench Press",
    variant: "Barbell",
    exerciseInfoId: null,
    mappingSource: "AUTO",
    primaryMuscle: "chest",
    secondaryMuscles: ["triceps"],
    createdAt: "2026-06-01T08:00:00.000Z",
    updatedAt: "2026-06-01T08:00:00.000Z",
    ...overrides,
  };
}

export function buildResolvedExerciseHeatmap(
  overrides: Partial<ResolvedExerciseHeatmap> = {},
): ResolvedExerciseHeatmap {
  return {
    mappingId: nextId("mapping"),
    exerciseName: "Bench Press",
    variant: "Barbell",
    mappingSource: "AUTO" satisfies MappingSource,
    exerciseInfoId: 1,
    resolvedExerciseName: "Bench Press",
    primaryMuscle: "chest" satisfies MuscleGroupId,
    secondaryMuscles: ["front_delt", "triceps"],
    synergistMuscles: [],
    ...overrides,
  };
}

export function buildMuscleHeatmapResponse(
  overrides: Partial<MuscleHeatmapResponse> = {},
): MuscleHeatmapResponse {
  return {
    scope: "WORKOUT_TEMPLATE",
    templateId: "workout-1",
    entryId: null,
    performedAt: null,
    entryCount: 2,
    intensities: {
      chest: 1,
      front_delt: 0.62,
      triceps: 0.55,
    },
    coverage: {
      totalExercises: 2,
      mappedExercises: 1,
      skippedExercises: 1,
    },
    resolvedExercises: [buildResolvedExerciseHeatmap()],
    unmappedExercises: [
      {
        exerciseName: "Cable Fly",
        variant: null,
      },
    ],
    ...overrides,
  };
}

export function buildBodyweightLog(overrides: Partial<BodyweightLog> = {}): BodyweightLog {
  return {
    id: nextId("bw"),
    weightKg: 80,
    loggedAt: "2026-05-01",
    notes: undefined,
    ...overrides,
  };
}

export function buildWeeklyMuscleVolumeResponse(
  overrides: Partial<WeeklyMuscleVolumeResponse> = {},
): WeeklyMuscleVolumeResponse {
  return {
    context: {
      type: "PROGRAMME_WEEK",
      splitId: "split-1",
      splitName: "Upper Lower",
      programmeId: "programme-1",
      blockId: "block-1",
      blockName: "Hypertrophy",
      weekNumber: 2,
      totalWeeks: 4,
      weekStart: "2026-04-20T00:00:00.000Z",
      weekEnd: "2026-04-27T00:00:00.000Z",
    },
    coverage: {
      totalExercises: 3,
      mappedExercises: 2,
      skippedExercises: 1,
    },
    muscles: [
      {
        muscleId: "chest",
        targetSets: 12,
        completedSets: 8,
        completionRatio: 8 / 12,
        templateContributions: [
          {
            templateId: "workout-1",
            templateName: "Push Day",
            targetSets: 12,
            completedSets: 8,
            liftContributions: [
              {
                exerciseName: "Bench Press",
                variant: "Barbell",
                targetSets: 12,
                completedSets: 8,
              },
            ],
          },
        ],
      },
      {
        muscleId: "triceps",
        targetSets: 6,
        completedSets: 7.5,
        completionRatio: 1.25,
        templateContributions: [
          {
            templateId: "workout-1",
            templateName: "Push Day",
            targetSets: 6,
            completedSets: 7.5,
            liftContributions: [
              {
                exerciseName: "Overhead Press",
                variant: "Barbell",
                targetSets: 6,
                completedSets: 7.5,
              },
            ],
          },
        ],
      },
      {
        muscleId: "abs",
        targetSets: 0,
        completedSets: 0,
        completionRatio: 0,
        templateContributions: [],
      },
    ],
    unmappedExercises: [
      {
        exerciseName: "Cable Fly",
        variant: null,
        affectsTarget: true,
        affectsCompleted: false,
      },
    ],
    ...overrides,
  };
}
