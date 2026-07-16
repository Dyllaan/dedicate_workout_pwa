import { expect, test as base, type Page, type Route } from "@playwright/test";
import type { DashboardSummary, ExerciseDefinition, Split, WorkoutEntry, WorkoutTemplate } from "@/types/Workout";
import type { DashboardSummaryTopLift } from "@/types/Workout";
import type { Programme } from "@/types/Periodisation";
import type {
  DashboardTrainingInsights,
  ExerciseTrainingInsight,
  ReadinessCheckIn,
  WorkoutTemplateTrainingInsights,
} from "@/types/Insights";
import type {
  PowerliftingSummary,
  ProgressChartPreset,
  ProgressChartQueryResponse,
  ProgressSeriesCatalogItem,
  ProgressSeriesDiagnostics,
} from "@/types/Progress";
import type {
  ExerciseInfoCatalogItem,
  MuscleHeatmapResponse,
  ResolvedExerciseHeatmap,
  WeeklyMuscleVolumeResponse,
} from "@/types/Heatmap";
import type { User } from "@/types/User";
import {
  buildDashboardSummary,
  buildExerciseDefinition,
  buildExerciseInfoCatalogItem,
  buildMuscleHeatmapResponse,
  buildWeeklyMuscleVolumeResponse,
  buildDashboardTrainingInsights,
  buildExerciseTrainingInsight,
  buildAnalysisCockpitSummary,
  buildProgramme,
  buildResolvedExerciseHeatmap,
  buildSplit,
  buildUser,
  buildWorkoutEntry,
  buildWorkoutTemplateTrainingInsights,
  buildPowerliftingSummary,
  buildWorkoutTemplate,
} from "../../shared/builders";

type Persona =
  | "anonymous"
  | "registered-no-data"
  | "mfa-required"
  | "authenticated-seeded"
  | "expired-session-recoverable"
  | "expired-session-nonrecoverable";

type MockState = {
  currentUser: User;
  mfaRequired: boolean;
  hasRefreshSession: boolean;
  refreshShouldFail: boolean;
  failNextProtectedRequest: boolean;
  workouts: WorkoutTemplate[];
  splits: Split[];
  workoutEntries: WorkoutEntry[];
  programmes: Record<string, Programme[]>;
  exerciseDefinitions: Record<string, ExerciseDefinition>;
  dashboardSummary: DashboardSummary;
  dashboardInsights: DashboardTrainingInsights;
  plateauInsights: ExerciseTrainingInsight[];
  trainingSignals: ExerciseTrainingInsight[];
  readinessCheckIns: ReadinessCheckIn[];
  exerciseInsights: Record<string, ExerciseTrainingInsight>;
  templateInsights: Record<string, WorkoutTemplateTrainingInsights>;
  progressCatalog: ProgressSeriesCatalogItem[];
  progressPresets: ProgressChartPreset[];
  analysisCockpit: AnalysisCockpitSummary;
  powerliftingSummary: PowerliftingSummary;
  exerciseCatalog: ExerciseInfoCatalogItem[];
  templateHeatmaps: Record<string, MuscleHeatmapResponse>;
  entryHeatmaps: Record<string, MuscleHeatmapResponse>;
  weeklyMuscleVolume: WeeklyMuscleVolumeResponse;
  workoutSettings: { defaultRestSeconds: number };
};

function buildLiftSummary(
  entries: WorkoutEntry[],
  focusMatcher?: (entry: WorkoutEntry, exercise: WorkoutEntry["exercises"][number]) => boolean,
): DashboardSummaryTopLift | null {
  type ProgressPoint = {
    performedAt: string;
    maxWeightKg: number;
    weightedSets: Array<{ performedAt: string; weightKg: number; reps: number; estimatedOneRepMaxKg: number }>;
  };

  const progress = new Map<string, ProgressPoint[]>();
  const sortedEntries = [...entries].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));

  for (const entry of sortedEntries) {
    for (const exercise of entry.exercises) {
      if (focusMatcher && !focusMatcher(entry, exercise)) {
        continue;
      }

      const weightedSets = exercise.sets.filter((set) => set.weight != null && set.weight > 0 && set.reps > 0);
      if (weightedSets.length === 0) {
        continue;
      }

      const definitionId = exercise.exerciseDefinitionId ?? null;
      const exerciseName = (exercise.exerciseName ?? exercise.loggedExerciseName ?? "Unknown exercise").trim();
      const variant = (exercise.variant ?? exercise.loggedVariant ?? "").trim();
      const key = definitionId ? `definition:${definitionId}` : `logged:${exerciseName.toLowerCase()}|${variant.toLowerCase()}`;
      const points = progress.get(key) ?? [];
      points.push({
        performedAt: entry.createdAt,
        maxWeightKg: Math.max(...weightedSets.map((set) => set.weight ?? 0)),
        weightedSets: weightedSets.map((set) => ({
          performedAt: entry.createdAt,
          weightKg: set.weight ?? 0,
          reps: set.reps,
          estimatedOneRepMaxKg: set.weight ? Math.round(set.weight * (1 + set.reps / 30) * 10) / 10 : 0,
        })),
      });
      progress.set(key, points);
    }
  }

  let topKey: string | null = null;
  let topBucket: ProgressPoint[] | null = null;
  for (const [key, points] of progress.entries()) {
    if (!topBucket || points.length > topBucket.length) {
      topBucket = points;
      topKey = key;
    }
  }

  if (!topBucket || !topKey) {
    return null;
  }

  const representativeExercise = sortedEntries
    .flatMap((entry) => entry.exercises)
    .find((exercise) => {
      const definitionId = exercise.exerciseDefinitionId ?? null;
      const exerciseName = (exercise.exerciseName ?? exercise.loggedExerciseName ?? "Unknown exercise").trim().toLowerCase();
      const variant = (exercise.variant ?? exercise.loggedVariant ?? "").trim().toLowerCase();
      return definitionId ? `definition:${definitionId}` === topKey : `logged:${exerciseName}|${variant}` === topKey;
    });

  if (!representativeExercise) {
    return null;
  }

  const allSets = topBucket.flatMap((point) => point.weightedSets);
  const bestSet = allSets.reduce((best, current) => {
    if (current.weightKg > best.weightKg) return current;
    if (current.weightKg < best.weightKg) return best;
    if (current.estimatedOneRepMaxKg > best.estimatedOneRepMaxKg) return current;
    if (current.estimatedOneRepMaxKg < best.estimatedOneRepMaxKg) return best;
    return current.performedAt > best.performedAt ? current : best;
  });
  const mostRecentPoint = topBucket[topBucket.length - 1];
  const mostRecentBestSet = mostRecentPoint.weightedSets.reduce((best, current) => {
    if (current.weightKg > best.weightKg) return current;
    if (current.weightKg < best.weightKg) return best;
    if (current.estimatedOneRepMaxKg > best.estimatedOneRepMaxKg) return current;
    if (current.estimatedOneRepMaxKg < best.estimatedOneRepMaxKg) return best;
    return current.performedAt > best.performedAt ? current : best;
  });
  const previousPoint = topBucket.length >= 2 ? topBucket[topBucket.length - 2] : null;
  const previousBestSet = previousPoint
    ? previousPoint.weightedSets.reduce((best, current) => {
        if (current.weightKg > best.weightKg) return current;
        if (current.weightKg < best.weightKg) return best;
        if (current.estimatedOneRepMaxKg > best.estimatedOneRepMaxKg) return current;
        if (current.estimatedOneRepMaxKg < best.estimatedOneRepMaxKg) return best;
        return current.performedAt > best.performedAt ? current : best;
      })
    : null;

  return {
    exerciseDefinitionId: representativeExercise.exerciseDefinitionId ?? null,
    exerciseName: representativeExercise.exerciseName,
    variant: representativeExercise.variant ?? null,
    sessionCount: topBucket.length,
    personalBestKg: Math.max(...topBucket.map((point) => point.maxWeightKg)),
    improvementKg: Math.round((topBucket[topBucket.length - 1].maxWeightKg - topBucket[0].maxWeightKg) * 10) / 10,
    topSetWeightKg: bestSet.weightKg,
    topSetReps: bestSet.reps,
    estimatedOneRepMaxKg: bestSet.estimatedOneRepMaxKg,
    bodyweightKg: null,
    bodyweightLoggedAt: null,
    loadBodyweightRatio: null,
    estimatedOneRepMaxBodyweightRatio: null,
    mostRecentTopSetWeightKg: mostRecentBestSet.weightKg,
    mostRecentTopSetReps: mostRecentBestSet.reps,
    mostRecentEstimatedOneRepMaxKg: mostRecentBestSet.estimatedOneRepMaxKg,
    mostRecentTopSetPerformedAt: mostRecentBestSet.performedAt,
    mostRecentBodyweightKg: null,
    mostRecentBodyweightLoggedAt: null,
    mostRecentLoadBodyweightRatio: null,
    mostRecentEstimatedOneRepMaxBodyweightRatio: null,
    previousTopSetWeightKg: previousBestSet?.weightKg ?? null,
    previousTopSetReps: previousBestSet?.reps ?? null,
    previousEstimatedOneRepMaxKg: previousBestSet?.estimatedOneRepMaxKg ?? null,
    previousTopSetPerformedAt: previousBestSet?.performedAt ?? null,
  };
}

function hydrateWorkoutTemplate(template: WorkoutTemplate): WorkoutTemplate {
  return {
    ...template,
    exercises: template.exercises.map((exercise, index) => ({
      ...exercise,
      exerciseConfigId: `${template.id}-exercise-config-${index + 1}`,
      exerciseDefinition: buildExerciseDefinition({
        id: `${template.id}-exercise-definition-${index + 1}`,
        exerciseName: exercise.exerciseName,
        variant: exercise.variant ?? null,
      }),
      focus: false,
    })),
  };
}

function createState(persona: Persona): MockState {
  const user = buildUser({ username: "playwright-user", accessToken: "playwright-token" });
  const workoutA = hydrateWorkoutTemplate(buildWorkoutTemplate({ id: "workout-a", name: "Push Day A" }));
  const workoutB = hydrateWorkoutTemplate(
    buildWorkoutTemplate({ id: "workout-b", name: "Pull Day B", category: "Pull" }),
  );
  const programme = buildProgramme({ id: "programme-a" });
  const split = buildSplit({
    id: "split-a",
    workouts: [workoutA, workoutB],
    programmes: [programme],
    active: true,
  });
  const entries = [
    buildWorkoutEntry({
      id: "entry-a",
      template: workoutA,
      createdAt: "2026-04-10T10:00:00.000Z",
      exercises: [
        {
          id: "exercise-entry-a",
          exerciseName: "Bench Press",
          variant: "Barbell",
          loggedExerciseName: "Bench Press",
          loggedVariant: "Barbell",
          goalSets: 3,
          sets: [{ id: "set-a", reps: 8, weight: 100, rpe: 8 }],
        },
      ],
    }),
    buildWorkoutEntry({
      id: "entry-b",
      template: workoutA,
      createdAt: "2026-04-20T10:00:00.000Z",
      exercises: [
        {
          id: "exercise-entry-b",
          exerciseName: "Bench Press",
          variant: "Barbell",
          loggedExerciseName: "Bench Press",
          loggedVariant: "Barbell",
          goalSets: 3,
          sets: [{ id: "set-b", reps: 8, weight: 105, rpe: 8.5 }],
        },
      ],
    }),
    buildWorkoutEntry({
      id: "entry-c",
      template: workoutB,
      createdAt: "2026-04-21T10:00:00.000Z",
      exercises: [
        {
          id: "exercise-entry-c",
          exerciseName: "Barbell Row",
          variant: "Barbell",
          loggedExerciseName: "Barbell Row",
          loggedVariant: "Barbell",
          goalSets: 3,
          sets: [{ id: "set-c", reps: 6, weight: 90, rpe: 8 }],
        },
      ],
    }),
  ];
  const progressCatalog: ProgressSeriesCatalogItem[] = [
    {
      seriesKey: "Bench Press||Barbell",
      exerciseName: "Bench Press",
      variant: "Barbell",
      label: "Bench Press (Barbell)",
      sessionCount: 2,
      lastPerformedAt: "2026-04-20T10:00:00.000Z",
    },
    {
      seriesKey: "Squat||Barbell",
      exerciseName: "Squat",
      variant: "Barbell",
      label: "Squat (Barbell)",
      sessionCount: 4,
      lastPerformedAt: "2026-04-22T10:00:00.000Z",
    },
  ];
  const progressPresets: ProgressChartPreset[] = [
    {
      id: "preset-1",
      name: "Upper Strength Trend",
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
          label: "Bench Press",
          color: "#2563eb",
        },
      ],
      createdAt: "2026-04-20T10:00:00.000Z",
      updatedAt: "2026-04-20T10:00:00.000Z",
    },
  ];
  const plateauInsights: ExerciseTrainingInsight[] = [
    buildExerciseTrainingInsight({
      exerciseName: "Squat",
      variant: "Barbell",
      trainingState: "TRUE_PLATEAU",
      reasoning: "Your top sets have flattened out across the last few sessions.",
      suggestedWeightKg: 140,
      currentWeightKg: 140,
      estimated1RmTrendPercent: 0.1,
      sessionCount: 5,
      recommendedAction: "CHANGE_VARIATION",
      lastPerformedAt: "2026-04-22T10:00:00.000Z",
    }),
    buildExerciseTrainingInsight({
      exerciseName: "Bench Press",
      variant: "Barbell",
      trainingState: "TRUE_PLATEAU",
      reasoning: "Bench is stalling right now. Review setup and recovery before pushing harder.",
      suggestedWeightKg: 105,
      currentWeightKg: 105,
      estimated1RmTrendPercent: 0.0,
      sessionCount: 5,
      recommendedAction: "CHANGE_VARIATION",
      lastPerformedAt: "2026-04-20T10:00:00.000Z",
    }),
  ];
  const trainingSignals: ExerciseTrainingInsight[] = [
    ...plateauInsights,
    buildExerciseTrainingInsight({
      exerciseName: "Overhead Press",
      variant: "Barbell",
      trainingState: "IMPROVING",
      reasoning: "Bar speed and rep quality are trending well. Nudge this up next session.",
      suggestedWeightKg: 57.5,
      currentWeightKg: 55,
      estimated1RmTrendPercent: 5.2,
      sessionCount: 4,
      lastPerformedAt: "2026-04-18T10:00:00.000Z",
      recommendedAction: "INCREASE_LOAD",
    }),
  ];
  const dashboardInsights = buildDashboardTrainingInsights({
    headlineInsights: [
      {
        kind: "NEXT_WORKOUT",
        title: "Push Day A",
        exerciseName: "Bench Press",
        variant: "Barbell",
        trainingState: "TRUE_PLATEAU",
        reasoning: "Bench is stalling right now. Review setup and recovery before pushing harder.",
        suggestedWeightKg: 105,
        workoutTemplateId: "workout-a",
        recommendedAction: "CHANGE_VARIATION",
      },
      {
        kind: "TRAINING_STATUS",
        title: "Mixed signals",
        trainingState: "TRUE_PLATEAU",
        reasoning: "2 lifts need attention, while 1 is moving well. Smart Coach is seeing both risk and momentum right now.",
        recommendedAction: "CHANGE_VARIATION",
      },
    ],
    attentionCount: plateauInsights.length,
    positiveCount: 1,
    plateauCount: plateauInsights.length,
    underexposedCount: 0,
    nextWorkoutTemplateId: "workout-a",
  });
  const exerciseInsights: Record<string, ExerciseTrainingInsight> = {
    "Bench Press||Barbell": buildExerciseTrainingInsight(),
    "Squat||Barbell": plateauInsights[0],
  };
  const templateInsights: Record<string, WorkoutTemplateTrainingInsights> = {
    "workout-a": buildWorkoutTemplateTrainingInsights({ templateId: "workout-a" }),
  };
  const exerciseCatalog = [
    buildExerciseInfoCatalogItem({ id: 1, name: "Bench Press", variation: "Barbell", equipment: "Barbell" }),
    buildExerciseInfoCatalogItem({ id: 2, name: "Cable Fly", variation: "Standing", equipment: "Cable", mainMuscle: "Chest" }),
  ];
  const templateHeatmaps = {
    "workout-a": buildMuscleHeatmapResponse({
      templateId: "workout-a",
      resolvedExercises: [
        buildResolvedExerciseHeatmap({
          exerciseName: "Bench Press",
          variant: "Barbell",
          mappingSource: "AUTO",
          resolvedExerciseName: "Bench Press",
        }),
      ],
      unmappedExercises: [
        {
          exerciseName: "Cable Fly",
          variant: null,
        },
      ],
      coverage: {
        totalExercises: 2,
        mappedExercises: 1,
        skippedExercises: 1,
      },
    }),
  };
  const entryHeatmaps = {
    "entry-a": buildMuscleHeatmapResponse({
      scope: "WORKOUT_ENTRY",
      templateId: "workout-a",
      entryId: "entry-a",
      entryCount: 1,
      resolvedExercises: [
        buildResolvedExerciseHeatmap({
          exerciseName: "Bench Press",
          variant: "Barbell",
          mappingSource: "AUTO",
          resolvedExerciseName: "Bench Press",
        }),
      ],
      unmappedExercises: [],
      coverage: {
        totalExercises: 1,
        mappedExercises: 1,
        skippedExercises: 0,
      },
    }),
    "entry-b": buildMuscleHeatmapResponse({
      scope: "WORKOUT_ENTRY",
      templateId: "workout-a",
      entryId: "entry-b",
      entryCount: 1,
      resolvedExercises: [
        buildResolvedExerciseHeatmap({
          exerciseName: "Bench Press",
          variant: "Barbell",
          mappingSource: "AUTO",
          resolvedExerciseName: "Bench Press",
        }),
      ],
      unmappedExercises: [],
      coverage: {
        totalExercises: 1,
        mappedExercises: 1,
        skippedExercises: 0,
      },
    }),
  };
  const emptyWeeklyMuscleVolume = buildWeeklyMuscleVolumeResponse({
    context: null,
    coverage: {
      totalExercises: 0,
      mappedExercises: 0,
      skippedExercises: 0,
    },
    muscles: [],
    unmappedExercises: [],
  });

  const baseState: MockState = {
    currentUser: user,
    mfaRequired: false,
    hasRefreshSession: false,
    refreshShouldFail: false,
    failNextProtectedRequest: false,
    workouts: [],
    splits: [],
    workoutEntries: [],
    programmes: {},
    exerciseDefinitions: {
      "exercise-definition-1": buildExerciseDefinition(),
      "exercise-definition-2": buildExerciseDefinition({
        id: "exercise-definition-2",
        exerciseName: "Squat",
        variant: "Barbell",
        primaryMuscle: "quads",
        secondaryMuscles: ["glutes"],
      }),
    },
    dashboardSummary: buildDashboardSummary({ workoutTemplateCount: 0, splitCount: 0, activeSplit: null, nextWorkout: null, topLift: null }),
    dashboardInsights: buildDashboardTrainingInsights(),
    plateauInsights: [],
    trainingSignals: [],
    readinessCheckIns: [],
    dismissals: [],
    exerciseInsights: {},
    templateInsights: {},
    progressCatalog: [],
    progressPresets: [],
    analysisCockpit: buildAnalysisCockpitSummary(),
    powerliftingSummary: buildPowerliftingSummary(),
    exerciseCatalog,
    templateHeatmaps,
    entryHeatmaps,
    weeklyMuscleVolume: emptyWeeklyMuscleVolume,
    workoutSettings: { defaultRestSeconds: 90 },
  };
  const authenticatedSeededState: MockState = {
    ...baseState,
    workouts: [workoutA, workoutB],
    splits: [split],
    workoutEntries: entries,
    programmes: { [split.id]: split.programmes },
    exerciseDefinitions: {
      "exercise-definition-1": buildExerciseDefinition(),
      "exercise-definition-2": buildExerciseDefinition({
        id: "exercise-definition-2",
        exerciseName: "Squat",
        variant: "Barbell",
        primaryMuscle: "quads",
        secondaryMuscles: ["glutes"],
      }),
    },
    dashboardSummary: buildDashboardSummary({
      workoutTemplateCount: 2,
      splitCount: 1,
      activeSplit: { id: "split-a", name: split.name },
      nextWorkout: {
        id: "workout-a",
        name: workoutA.name,
        category: workoutA.category,
        previewExercises: workoutA.exercises.slice(0, 6).map((ex) => ({
          exerciseName: ex.exerciseName,
          variant: ex.variant ?? null,
          goalSets: ex.goalSets,
        })),
        extraExerciseCount: 0,
        lastCompletedAt: entries[entries.length - 1]?.createdAt ?? null,
        lastSetCount: entries[entries.length - 1]?.exercises.reduce((sum, ex) => sum + ex.sets.length, 0) ?? null,
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
    }),
    dashboardInsights,
    plateauInsights,
    trainingSignals,
    readinessCheckIns: [
      {
        id: "readiness-1",
        sleepQuality: 4,
        stressLevel: 2,
        sorenessLevel: 3,
        confidenceLevel: 4,
        readinessScore: 15,
        createdAt: "2026-04-20T08:00:00.000Z",
      },
    ],
    dismissals: [],
    exerciseInsights,
    templateInsights,
    progressCatalog,
    progressPresets,
    analysisCockpit: buildAnalysisCockpitSummary(),
    powerliftingSummary: buildPowerliftingSummary(),
    exerciseCatalog,
    templateHeatmaps,
    entryHeatmaps,
    weeklyMuscleVolume: buildWeeklyMuscleVolumeResponse(),
  };

  switch (persona) {
    case "registered-no-data":
      return baseState;
    case "mfa-required":
      return { ...baseState, mfaRequired: true };
    case "authenticated-seeded":
      return authenticatedSeededState;
    case "expired-session-recoverable":
      return {
        ...authenticatedSeededState,
        hasRefreshSession: true,
        failNextProtectedRequest: true,
      };
    case "expired-session-nonrecoverable":
      return {
        ...baseState,
        workouts: [workoutA],
        hasRefreshSession: true,
        failNextProtectedRequest: true,
        refreshShouldFail: true,
      };
    case "anonymous":
    default:
      return baseState;
  }
}

function buildProgressDataset(seriesKey: string) {
  switch (seriesKey) {
    case "Squat||Barbell":
      return {
        label: "Squat",
        color: "#16a34a",
        points: [
          { timestamp: "2026-03-01T00:00:00.000Z", value: 0 },
          { timestamp: "2026-04-01T00:00:00.000Z", value: 7.2 },
        ],
        summary: {
          exerciseName: "Squat",
          variant: "Barbell",
          baselineChangePercent: 7.2,
          bestValue: 7.2,
          lastValue: 7.2,
          sessionCount: 5,
          trainingState: "TRUE_PLATEAU" as const,
          fatigueFlag: false,
          exposureGapFlag: false,
          adherence: { adherencePercent: 95, successfulSessions: 4, analysedSessions: 5 },
          bestSetE1rmChangePercent: 0.1,
          workingWeightChangePercent: 0,
          totalVolumeChangePercent: 1.2,
        },
        diagnostics: {
          trainingState: "TRUE_PLATEAU" as const,
          fatigueFlag: false,
          exposureGapFlag: false,
          adherencePercent: 95,
          sessionCount: 5,
          lastPerformedAt: "2026-04-22T10:00:00.000Z",
          estimated1RmChangePercent: 0.1,
          workingWeightChangePercent: 0,
          totalVolumeChangePercent: 1.2,
          averageRpeChange: 0.2,
          repCompletionChange: 1.1,
        },
      };
    case "Bench Press||Barbell":
    default:
      return {
        label: "Bench Press",
        color: "#2563eb",
        points: [
          { timestamp: "2026-03-01T00:00:00.000Z", value: 0 },
          { timestamp: "2026-04-01T00:00:00.000Z", value: 4.8 },
        ],
        summary: {
          exerciseName: "Bench Press",
          variant: "Barbell",
          baselineChangePercent: 4.8,
          bestValue: 4.8,
          lastValue: 4.8,
          sessionCount: 6,
          trainingState: "IMPROVING" as const,
          fatigueFlag: false,
          exposureGapFlag: false,
          adherence: { adherencePercent: 97, successfulSessions: 5, analysedSessions: 5 },
          bestSetE1rmChangePercent: 4.8,
          workingWeightChangePercent: 5,
          totalVolumeChangePercent: 8,
        },
        diagnostics: {
          trainingState: "IMPROVING" as const,
          fatigueFlag: false,
          exposureGapFlag: false,
          adherencePercent: 97,
          sessionCount: 6,
          lastPerformedAt: "2026-04-20T10:00:00.000Z",
          estimated1RmChangePercent: 4.8,
          workingWeightChangePercent: 5,
          totalVolumeChangePercent: 8,
          averageRpeChange: -0.2,
          repCompletionChange: 2.4,
        },
      };
  }
}

function buildProgressChartResponse(exerciseDefinitionId: string): ProgressChartQueryResponse {
  return {
    unit: "%",
    metric: "BEST_SET_E1RM",
    comparisonMode: "BASELINE_PERCENT",
    points: buildProgressDataset("exercise-definition-1").points.map((point) => ({
      timestamp: point.timestamp,
      seriesKey: exerciseDefinitionId,
      value: point.value,
    })),
  };
}

function buildProgressDiagnostics(seriesKey: string): ProgressSeriesDiagnostics {
  const dataset = buildProgressDataset(seriesKey);

  return {
    seriesKey,
    exerciseName: dataset.summary.exerciseName,
    variant: dataset.summary.variant,
    ...dataset.diagnostics,
    context: {
      id: "block-1",
      name: "Strength Base",
      weekNumber: 2,
      totalWeeks: 4,
    },
  };
}

function json(route: Route, status: number, body: unknown) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

function normalizeMockApiPath(pathname: string) {
  if (pathname === "/api") {
    return "/";
  }

  return pathname.startsWith("/api/") ? pathname.slice(4) : pathname;
}

function buildDismissalKey(exerciseName: string, variant: string | null | undefined, trainingState: string, recommendedAction?: string | null) {
  return `${exerciseName.trim().toLowerCase()}||${(variant ?? "").trim().toLowerCase()}::${trainingState}::${recommendedAction ?? "NONE"}`;
}

function filterDismissedSignals<T extends {
  exerciseName: string;
  variant?: string | null;
  trainingState: string;
  recommendedAction?: string | null;
}>(state: MockState, signals: T[]) {
  const dismissed = new Set(
    state.dismissals.map((dismissal) =>
      buildDismissalKey(
        dismissal.exerciseName,
        dismissal.variant,
        dismissal.trainingState,
        dismissal.recommendedAction ?? null,
      ),
    ),
  );

  return signals.filter((signal) => !dismissed.has(
    buildDismissalKey(
      signal.exerciseName,
      signal.variant,
      signal.trainingState,
      signal.recommendedAction ?? null,
    ),
  ));
}

function calculateReadinessScore(checkIn: Pick<ReadinessCheckIn, "sleepQuality" | "stressLevel" | "sorenessLevel" | "confidenceLevel">) {
  return checkIn.sleepQuality + (6 - checkIn.stressLevel) + (6 - checkIn.sorenessLevel) + checkIn.confidenceLevel;
}

async function installMockApi(page: Page, stateRef: { current: MockState }) {
  await page.route("**/*", async (route) => {
    const state = stateRef.current;
    const request = route.request();
    const url = new URL(request.url());

    const mockableOrigins = new Set([
      "http://localhost:8080",
      "http://127.0.0.1:8080",
      "http://127.0.0.1:4173",
      "http://127.0.0.1:4174",
    ]);

    if (!mockableOrigins.has(url.origin)) {
      return route.continue();
    }

    const path = normalizeMockApiPath(url.pathname);
    const isMockApiPath =
      path === "/service-status" ||
      path === "/version" ||
      path === "/actuator/health" ||
      path.startsWith("/auth/") ||
      path.startsWith("/workout/");

    if (!isMockApiPath) {
      return route.continue();
    }

    const method = request.method();
    const headers = request.headers();
    const authorizationHeader = headers.authorization ?? headers.Authorization;
    const hasValidAccessToken = authorizationHeader === `Bearer ${state.currentUser.accessToken}`;
    const isProtectedRequest =
      path.startsWith("/workout") ||
      path === "/auth/user/me" ||
      path === "/auth/mfa/status";

    if (
      state.failNextProtectedRequest &&
      isProtectedRequest &&
      path !== "/auth/user/me" &&
      path !== "/auth/user/refresh"
    ) {
      state.failNextProtectedRequest = false;
      return json(route, 401, { cause: "expired" });
    }

    if (path === "/version" || path === "/auth/version" || path === "/workout/version") {
      return json(route, 200, { version: "1.0.0-test", name: path, time: "now" });
    }

    if (path === "/service-status") {
      return json(route, 200, {
        services: [
          { id: "gateway", label: "Gateway", health: "UP", version: "1.0.0-test", name: "Gateway", buildTime: "now" },
          { id: "auth", label: "Auth Service", health: "UP", version: "1.0.0-test", name: "Auth", buildTime: "now" },
          { id: "workout", label: "Workout Service", health: "UP", version: "1.0.0-test", name: "Workout", buildTime: "now" },
          { id: "frontend", label: "Frontend", health: "UP", version: null, name: "App", buildTime: null },
        ],
      });
    }

    if (path === "/actuator/health" || path === "/auth/actuator/health" || path === "/workout/actuator/health") {
      return json(route, 200, { status: "UP" });
    }

    if (path === "/auth/user/register" && method === "POST") {
      const body = request.postDataJSON() as { username: string };
      state.currentUser = buildUser({
        username: body.username,
        accessToken: "register-token",
      });
      state.hasRefreshSession = true;
      return json(route, 201, state.currentUser);
    }

    if (path === "/auth/user/login" && method === "POST") {
      if (state.mfaRequired) {
        return json(route, 202, {
          mfaToken: "pending-mfa-token",
          message: "MFA required",
        });
      }

      state.hasRefreshSession = true;
      return json(route, 200, state.currentUser);
    }

    if (path === "/auth/user/verify-mfa" && method === "POST") {
      const body = request.postDataJSON() as { code: string };
      if (body.code === "000000") {
        return json(route, 401, { cause: "Invalid authentication code" });
      }
      state.mfaRequired = false;
      state.hasRefreshSession = true;
      state.currentUser = {
        ...state.currentUser,
        accessToken: "mfa-success-token",
      };
      return json(route, 200, state.currentUser);
    }

    if (path === "/auth/user/me" && method === "GET") {
      if (!hasValidAccessToken) {
        return json(route, 401, { cause: "expired" });
      }

      return json(route, 200, {
        username: state.currentUser.username,
        mfaEnabled: state.currentUser.mfaEnabled ?? false,
      });
    }

    if (path === "/auth/mfa/status" && method === "GET") {
      if (!hasValidAccessToken) {
        return json(route, 401, { cause: "expired" });
      }

      return json(route, 200, {
        enabled: state.currentUser.mfaEnabled ?? false,
        verified: true,
      });
    }

    if (path === "/auth/user/refresh" && method === "POST") {
      if (!state.hasRefreshSession || state.refreshShouldFail) {
        return json(route, 401, { cause: "refresh failed" });
      }
      state.currentUser = {
        ...state.currentUser,
        accessToken: "refreshed-token",
      };
      return json(route, 200, {
        accessToken: state.currentUser.accessToken,
      });
    }

    if (path === "/auth/user/logout" && method === "POST") {
      state.hasRefreshSession = false;
      return json(route, 200, {});
    }

    if (path.match(/^\/workout\/workout-templates\/[^/]+$/) && method === "GET") {
      if (!hasValidAccessToken) {
        return json(route, 401, { cause: "expired" });
      }

      const workoutTemplateId = path.split("/")[3] ?? "";
      return json(
        route,
        200,
        state.workouts.find((workout) => workout.id === workoutTemplateId) ??
          buildWorkoutTemplate({ id: workoutTemplateId }),
      );
    }

    if (path === "/workout/workout-templates" && method === "GET") {
      if (!hasValidAccessToken) {
        return json(route, 401, { cause: "expired" });
      }
      return json(route, 200, state.workouts);
    }

    if (path === "/workout/workout-templates" && method === "POST") {
      if (!hasValidAccessToken) {
        return json(route, 401, { cause: "expired" });
      }

      const body = request.postDataJSON() as {
        name: string;
        category: string;
        exercises: WorkoutTemplate["exercises"];
      };
      const workout = buildWorkoutTemplate({
        id: `workout-${state.workouts.length + 1}`,
        name: body.name,
        category: body.category,
        exercises: body.exercises,
      });
      state.workouts.push(workout);
      return json(route, 201, workout);
    }

    if (path === "/workout/splits" && method === "GET") {
      if (!hasValidAccessToken) {
        return json(route, 401, { cause: "expired" });
      }
      return json(route, 200, state.splits);
    }

    if (path.match(/^\/workout\/splits\/[^/]+$/) && method === "GET") {
      if (!hasValidAccessToken) {
        return json(route, 401, { cause: "expired" });
      }

      const splitId = path.split("/")[3] ?? "";
      return json(
        route,
        200,
        state.splits.find((split) => split.id === splitId) ?? buildSplit({ id: splitId }),
      );
    }

    if (path === "/workout/splits" && method === "POST") {
      if (!hasValidAccessToken) {
        return json(route, 401, { cause: "expired" });
      }

      const body = request.postDataJSON() as {
        name: string;
        workoutTemplateIds?: string[];
        workoutFrequencies?: { workoutTemplateId: string; sessionsPerWeek: number }[];
      };
      const selectedWorkoutIds =
        body.workoutTemplateIds ?? body.workoutFrequencies?.map((frequency) => frequency.workoutTemplateId) ?? [];
      const workouts = state.workouts.filter((workout) => selectedWorkoutIds.includes(workout.id));
      const split = buildSplit({
        id: `split-${state.splits.length + 1}`,
        name: body.name,
        workouts,
        programmes: [],
        active: false,
        workoutFrequencies: workouts.map((workout) => {
          const requestedFrequency = body.workoutFrequencies?.find(
            (frequency) => frequency.workoutTemplateId === workout.id,
          )?.sessionsPerWeek;

          return {
            workoutTemplateId: workout.id,
            workoutTemplateName: workout.name,
            sessionsPerWeek: requestedFrequency ?? 1,
          };
        }),
      });
      state.splits.push(split);
      state.programmes[split.id] = [];
      return json(route, 201, split);
    }

    if (path.match(/^\/workout\/splits\/[^/]+\/activate$/) && method === "PUT") {
      if (!hasValidAccessToken) {
        return json(route, 401, { cause: "expired" });
      }

      const splitId = path.split("/")[3] ?? "";
      state.splits = state.splits.map((split) => ({
        ...split,
        active: split.id === splitId,
      }));
      return json(route, 200, state.splits.find((split) => split.id === splitId));
    }

    if (path === "/workout/workout-entries" && method === "GET") {
      if (!hasValidAccessToken) {
        return json(route, 401, { cause: "expired" });
      }

      const workoutTemplateId = url.searchParams.get("workoutTemplateId");
      const filtered = workoutTemplateId
        ? state.workoutEntries.filter((entry) => entry.template.id === workoutTemplateId)
        : state.workoutEntries;
      return json(route, 200, filtered);
    }

    if (path === "/workout/workout-entries" && method === "POST") {
      if (!hasValidAccessToken) {
        return json(route, 401, { cause: "expired" });
      }

      const body = request.postDataJSON() as {
        workoutTemplateId: string;
        exercises: WorkoutEntry["exercises"];
      };
      const template = state.workouts.find((workout) => workout.id === body.workoutTemplateId) ?? buildWorkoutTemplate();
      const entry = buildWorkoutEntry({
        id: `entry-${state.workoutEntries.length + 1}`,
        template,
        exercises: body.exercises,
      });
      state.workoutEntries.push(entry);
      return json(route, 201, entry);
    }

    if (path === "/workout/exercise-info/catalog" && method === "GET") {
      if (!hasValidAccessToken) {
        return json(route, 401, { cause: "expired" });
      }

      const query = (url.searchParams.get("query") ?? "").trim().toLowerCase();
      const limit = Number(url.searchParams.get("limit") ?? "12");
      const matches = state.exerciseCatalog
        .filter((item) => {
          if (!query) {
            return true;
          }
          const haystack = `${item.name} ${item.variation ?? ""} ${item.equipment ?? ""}`.toLowerCase();
          return haystack.includes(query);
      })
        .slice(0, Number.isFinite(limit) ? limit : 12);
      return json(route, 200, matches);
    }

    if (path.match(/^\/workout\/exercise-definitions\/[^/]+$/) && method === "GET") {
      if (!hasValidAccessToken) {
        return json(route, 401, { cause: "expired" });
      }

      const exerciseDefinitionId = path.split("/")[3] ?? "";
      return json(
        route,
        200,
        state.exerciseDefinitions[exerciseDefinitionId] ?? buildExerciseDefinition({ id: exerciseDefinitionId }),
      );
    }

    if (path.match(/^\/workout\/exercise-definitions\/heatmap\/workout-templates\/[^/]+$/) && method === "GET") {
      if (!hasValidAccessToken) {
        return json(route, 401, { cause: "expired" });
      }

      const templateId = path.split("/")[4] ?? "";
      return json(
        route,
        200,
        state.templateHeatmaps[templateId] ??
          buildMuscleHeatmapResponse({
            templateId,
            coverage: { totalExercises: 0, mappedExercises: 0, skippedExercises: 0 },
            resolvedExercises: [],
            unmappedExercises: [],
            intensities: {},
            entryCount: 0,
          }),
      );
    }

    if (path.match(/^\/workout\/exercise-definitions\/heatmap\/workout-entries\/[^/]+$/) && method === "GET") {
      if (!hasValidAccessToken) {
        return json(route, 401, { cause: "expired" });
      }

      const entryId = path.split("/")[4] ?? "";
      return json(
        route,
        200,
        state.entryHeatmaps[entryId] ??
          buildMuscleHeatmapResponse({
            scope: "WORKOUT_ENTRY",
            entryId,
            entryCount: 1,
            coverage: { totalExercises: 0, mappedExercises: 0, skippedExercises: 0 },
            resolvedExercises: [],
            unmappedExercises: [],
            intensities: {},
          }),
      );
    }

    if (path === "/workout/analysis/training-insights/weekly-volume" && method === "GET") {
      if (!hasValidAccessToken) {
        return json(route, 401, { cause: "expired" });
      }

      return json(route, 200, state.weeklyMuscleVolume);
    }

    if (path === "/workout/muscle-heatmap/mappings" && method === "PUT") {
      if (!hasValidAccessToken) {
        return json(route, 401, { cause: "expired" });
      }

      const body = request.postDataJSON() as {
        mappings: Array<{
          exerciseName: string;
          variant?: string | null;
          mappingSource: "CATALOG" | "MANUAL";
          exerciseInfoId?: number | null;
          primaryMuscle?: string | null;
          secondaryMuscles?: string[];
        }>;
      };

      const resolved = body.mappings.map((mapping, index) => {
        const catalogItem = state.exerciseCatalog.find((item) => item.id === mapping.exerciseInfoId);
        const item = buildResolvedExerciseHeatmap({
          mappingId: `mapping-saved-${index + 1}`,
          exerciseName: mapping.exerciseName,
          variant: mapping.variant ?? null,
          mappingSource: mapping.mappingSource,
          exerciseInfoId: mapping.exerciseInfoId ?? null,
          resolvedExerciseName: catalogItem?.name ?? mapping.exerciseName,
          primaryMuscle: mapping.mappingSource === "MANUAL" ? (mapping.primaryMuscle as ResolvedExerciseHeatmap["primaryMuscle"]) ?? "chest" : "chest",
          secondaryMuscles:
            mapping.mappingSource === "MANUAL"
              ? (mapping.secondaryMuscles as ResolvedExerciseHeatmap["secondaryMuscles"]) ?? []
              : ["front_delt"],
          synergistMuscles: [],
        });

        const templateHeatmap = state.templateHeatmaps["workout-a"];
        if (templateHeatmap) {
          state.templateHeatmaps["workout-a"] = {
            ...templateHeatmap,
            resolvedExercises: [...templateHeatmap.resolvedExercises.filter((entry) => entry.exerciseName !== mapping.exerciseName), item],
            unmappedExercises: templateHeatmap.unmappedExercises.filter((entry) => entry.exerciseName !== mapping.exerciseName),
            coverage: {
              totalExercises: templateHeatmap.coverage.totalExercises,
              mappedExercises: Math.min(templateHeatmap.coverage.totalExercises, templateHeatmap.coverage.mappedExercises + 1),
              skippedExercises: Math.max(0, templateHeatmap.coverage.skippedExercises - 1),
            },
            intensities: {
              ...templateHeatmap.intensities,
              chest: 1,
              front_delt: 0.62,
              triceps: 0.55,
            },
          };
        }
        return item;
      });

      return json(route, 200, resolved);
    }

    if (path.match(/^\/workout\/muscle-heatmap\/mappings\/[^/]+$/) && method === "DELETE") {
      if (!hasValidAccessToken) {
        return json(route, 401, { cause: "expired" });
      }

      return route.fulfill({ status: 204, body: "" });
    }

    if (path === "/workout/dashboard/summary" && method === "GET") {
      if (!hasValidAccessToken) {
        return json(route, 401, { cause: "expired" });
      }

      return json(route, 200, state.dashboardSummary);
    }

    if (path === "/workout/analysis/training-insights/next-workout" && method === "GET") {
      if (!hasValidAccessToken) {
        return json(route, 401, { cause: "expired" });
      }

      const headline = state.dashboardInsights.headlineInsights[0];
      const activeBlock = state.dashboardInsights.activeBlock;
      const nextWorkout = state.dashboardSummary.nextWorkout;
      return json(route, 200, {
        workoutTemplateId: nextWorkout?.id ?? state.dashboardInsights.nextWorkoutTemplateId ?? "workout-a",
        workoutTemplateName: nextWorkout?.name ?? "Bench Day",
        exerciseName: headline?.exerciseName ?? "Bench Press",
        variant: headline?.variant ?? null,
        exerciseType: "UPPER_BODY",
        progressionMode: "WEIGHT_FIRST",
        primaryBenchmark: "WORKING_SETS",
        progressionStrategy: "WEIGHT_FIRST",
        trainingState: headline?.trainingState ?? "IMPROVING",
        suggestionType: headline?.recommendedAction === "INCREASE_LOAD"
          ? "INCREASE"
          : headline?.recommendedAction === "HOLD_LOAD" || headline?.recommendedAction === "STAY_THE_COURSE"
            ? "MAINTAIN"
            : headline?.recommendedAction === "DELOAD"
              ? "DELOAD"
              : headline?.recommendedAction === "CHANGE_VARIATION" || headline?.recommendedAction === "INCREASE_EXPOSURE"
                ? "PLATEAU"
                : "INSUFFICIENT_DATA",
        suggestedWeightKg: headline?.suggestedWeightKg ?? null,
        reasoning: headline?.reasoning ?? "Progress is steady.",
        blockContext: activeBlock ? {
          blockName: activeBlock.name,
          blockType: activeBlock.blockType,
          progressionStrategy: activeBlock.progressionStrategy,
          currentWeek: activeBlock.weekNumber,
          totalWeeks: activeBlock.totalWeeks,
          deload: activeBlock.deload,
          targetRpeMin: activeBlock.targetRpeMin,
          targetRpeMax: activeBlock.targetRpeMax,
          repRangeMin: activeBlock.repRangeMin,
          repRangeMax: activeBlock.repRangeMax,
        } : null,
      });
    }

    if (path === "/workout/analysis/training-insights/block-summary" && method === "GET") {
      if (!hasValidAccessToken) {
        return json(route, 401, { cause: "expired" });
      }

      const activeBlock = state.dashboardInsights.activeBlock;
      return json(route, 200, {
        blockContext: activeBlock ? {
          blockName: activeBlock.name,
          blockType: activeBlock.blockType,
          progressionStrategy: activeBlock.progressionStrategy,
          currentWeek: activeBlock.weekNumber,
          totalWeeks: activeBlock.totalWeeks,
          deload: activeBlock.deload,
          targetRpeMin: activeBlock.targetRpeMin,
          targetRpeMax: activeBlock.targetRpeMax,
          repRangeMin: activeBlock.repRangeMin,
          repRangeMax: activeBlock.repRangeMax,
        } : null,
        overallState: state.analysisCockpit.overallStatus === "FATIGUE_RISK"
          ? "FATIGUE_LIMITED"
          : state.analysisCockpit.overallStatus === "PLATEAU_RISK"
            ? "TRUE_PLATEAU"
            : "IMPROVING",
        headline: state.analysisCockpit.headline,
        focus: state.analysisCockpit.focus,
        plateauCount: state.dashboardInsights.plateauCount,
        attentionCount: state.dashboardInsights.attentionCount,
        positiveCount: state.dashboardInsights.positiveCount,
        underexposedCount: state.dashboardInsights.underexposedCount,
      });
    }

    if (path === "/workout/analysis/training-insights/priority-signals" && method === "GET") {
      if (!hasValidAccessToken) {
        return json(route, 401, { cause: "expired" });
      }

      return json(route, 200, state.dashboardInsights.headlineInsights.map((item, index) => ({
        rank: index + 1,
        exerciseName: item.exerciseName ?? "Bench Press",
        variant: item.variant ?? null,
        exerciseType: "UPPER_BODY",
        progressionMode: "WEIGHT_FIRST",
        primaryBenchmark: "WORKING_SETS",
        trainingState: item.trainingState,
        suggestionType: item.recommendedAction === "INCREASE_LOAD"
          ? "INCREASE"
          : item.recommendedAction === "HOLD_LOAD" || item.recommendedAction === "STAY_THE_COURSE"
            ? "MAINTAIN"
            : item.recommendedAction === "DELOAD"
              ? "DELOAD"
              : item.recommendedAction === "CHANGE_VARIATION" || item.recommendedAction === "INCREASE_EXPOSURE"
                ? "PLATEAU"
                : "INSUFFICIENT_DATA",
        suggestedWeightKg: item.suggestedWeightKg ?? null,
        reasoning: item.reasoning,
      })));
    }

    if (path === "/workout/analysis/training-insights/lift-summary" && method === "GET") {
      if (!hasValidAccessToken) {
        return json(route, 401, { cause: "expired" });
      }

      const scope = (url.searchParams.get("scope") ?? "overall").toLowerCase();
      if (scope === "template") {
        const templateId = url.searchParams.get("templateId");
        if (!templateId) {
          return json(route, 400, { cause: "templateId is required for template scope" });
        }

        const template = state.workouts.find((workout) => workout.id === templateId);
        if (!template) {
          return json(route, 404, { cause: "Workout template not found" });
        }

        const focus = template.exercises.find((exercise) => exercise.focus);
        return json(
          route,
          200,
          focus
            ? buildLiftSummary(
              state.workoutEntries.filter((entry) => entry.template.id === templateId),
              (_entry, exercise) => {
                const focusDefinitionId = focus.exerciseDefinition?.id ?? null;
                if (focusDefinitionId && exercise.exerciseDefinitionId === focusDefinitionId) {
                  return true;
                }

                const focusName = (focus.exerciseDefinition.exerciseName ?? "").trim().toLowerCase();
                const focusVariant = (focus.exerciseDefinition.variant ?? "").trim().toLowerCase();
                return exercise.exerciseName.trim().toLowerCase() === focusName
                  && (exercise.variant ?? "").trim().toLowerCase() === focusVariant;
              },
            )
            : null,
        );
      }

      return json(route, 200, state.dashboardSummary.topLift ?? buildLiftSummary(state.workoutEntries));
    }

    if (path === "/workout/analysis/training-insights/weekly-volume" && method === "GET") {
      if (!hasValidAccessToken) {
        return json(route, 401, { cause: "expired" });
      }

      return json(route, 200, state.weeklyMuscleVolume);
    }

    if (path === "/workout/insights/overview" && method === "GET") {
      if (!hasValidAccessToken) {
        return json(route, 401, { cause: "expired" });
      }

      return json(route, 200, {
        dashboard: state.dashboardInsights,
        cockpit: state.analysisCockpit,
      });
    }

    if (path === "/workout/insights/dashboard" && method === "GET") {
      if (!hasValidAccessToken) {
        return json(route, 401, { cause: "expired" });
      }

      return json(route, 200, state.dashboardInsights);
    }

    if (path === "/workout/insights/signals" && method === "GET") {
      if (!hasValidAccessToken) {
        return json(route, 401, { cause: "expired" });
      }

      return json(route, 200, filterDismissedSignals(state, state.trainingSignals));
    }

    if (path === "/workout/readiness/history" && method === "GET") {
      if (!hasValidAccessToken) {
        return json(route, 401, { cause: "expired" });
      }

      const days = Math.max(1, Math.min(30, Number(url.searchParams.get("days") ?? "7")));
      const points = state.readinessCheckIns.slice(0, days);
      const averageReadinessScore = points.length === 0
        ? 0
        : Math.round((points.reduce((sum, point) => sum + calculateReadinessScore(point), 0) / points.length) * 10) / 10;
      return json(route, 200, { days, averageReadinessScore, points });
    }

    if (path === "/workout/readiness/check-ins" && method === "POST") {
      if (!hasValidAccessToken) {
        return json(route, 401, { cause: "expired" });
      }

      const body = request.postDataJSON() as {
        sleepQuality: number;
        stressLevel: number;
        sorenessLevel: number;
        confidenceLevel: number;
      };
      const next: ReadinessCheckIn = {
        id: `readiness-${state.readinessCheckIns.length + 1}`,
        sleepQuality: body.sleepQuality,
        stressLevel: body.stressLevel,
        sorenessLevel: body.sorenessLevel,
        confidenceLevel: body.confidenceLevel,
        readinessScore: calculateReadinessScore(body),
        createdAt: new Date().toISOString(),
      };
      state.readinessCheckIns = [next, ...state.readinessCheckIns];
      return json(route, 201, next);
    }

    if (path === "/workout/insights/plateaus" && method === "GET") {
      if (!hasValidAccessToken) {
        return json(route, 401, { cause: "expired" });
      }

      return json(route, 200, filterDismissedSignals(state, state.plateauInsights));
    }

    if (path === "/workout/insights/dismissals" && method === "GET") {
      if (!hasValidAccessToken) {
        return json(route, 401, { cause: "expired" });
      }

      return json(route, 200, state.dismissals);
    }

    if (path === "/workout/insights/dismissals" && method === "POST") {
      if (!hasValidAccessToken) {
        return json(route, 401, { cause: "expired" });
      }

      const body = request.postDataJSON() as {
        exerciseName: string;
        variant?: string | null;
      };
      const existing = state.dismissals.find((dismissal) =>
        buildDismissalKey(dismissal.exerciseName, dismissal.variant, dismissal.trainingState, dismissal.recommendedAction ?? null) ===
        buildDismissalKey(body.exerciseName, body.variant, body.trainingState, body.recommendedAction ?? null),
      );
      const dismissal = existing ?? buildSmartCoachDismissal({
        exerciseName: body.exerciseName,
        variant: body.variant ?? null,
        trainingState: body.trainingState,
        recommendedAction: body.recommendedAction ?? null,
      });
      if (!existing) {
        state.dismissals.unshift(dismissal);
      }
      return json(route, 201, dismissal);
    }

    if (path.match(/^\/workout\/insights\/dismissals\/[^/]+$/) && method === "DELETE") {
      if (!hasValidAccessToken) {
        return json(route, 401, { cause: "expired" });
      }

      const dismissalId = path.split("/")[4] ?? "";
      state.dismissals = state.dismissals.filter((dismissal) => dismissal.id !== dismissalId);
      return route.fulfill({ status: 204, body: "" });
    }

    if (path.match(/^\/workout\/insights\/exercises\/.+$/) && method === "GET") {
      if (!hasValidAccessToken) {
        return json(route, 401, { cause: "expired" });
      }

      const exerciseKey = decodeURIComponent(path.replace("/workout/insights/exercises/", ""));
      const insight = state.exerciseInsights[exerciseKey] ??
        buildExerciseTrainingInsight({ exerciseName: exerciseKey.split("||")[0] ?? exerciseKey });
      return json(route, 200, filterDismissedSignals(state, [insight])[0] ?? null);
    }

    if (path.match(/^\/workout\/insights\/workout-templates\/[^/]+\/today$/) && method === "GET") {
      if (!hasValidAccessToken) {
        return json(route, 401, { cause: "expired" });
      }

      const templateId = path.split("/")[4] ?? "";
      const response = state.templateInsights[templateId] ?? buildWorkoutTemplateTrainingInsights({ templateId, exerciseInsights: [] });
      return json(
        route,
        200,
        {
          ...response,
          exerciseInsights: filterDismissedSignals(state, response.exerciseInsights),
        },
      );
    }

    if (path === "/workout/insights/autotune/top-set" && method === "GET") {
      if (!hasValidAccessToken) {
        return json(route, 401, { cause: "expired" });
      }

      const workoutTemplateId = url.searchParams.get("workoutTemplateId") ?? "";
      const exerciseDefinitionId = url.searchParams.get("exerciseDefinitionId") ?? "";
      const exerciseName = (url.searchParams.get("exerciseName") ?? "").trim().toLowerCase();
      const variant = (url.searchParams.get("variant") ?? "").trim().toLowerCase();
      const template = state.templateInsights[workoutTemplateId];
      const insight = template?.exerciseInsights.find((entry) => {
        const entryExerciseDefinitionId = (entry as { exerciseDefinitionId?: string | null }).exerciseDefinitionId ?? "";
        if (exerciseDefinitionId && entryExerciseDefinitionId === exerciseDefinitionId) {
          return true;
        }

        return entry.exerciseName.trim().toLowerCase() === exerciseName
          && (entry.variant ?? "").trim().toLowerCase() === variant;
      }) ?? null;
      const base = insight?.recommendedWeightKg ?? null;
      const readinessScore = state.readinessCheckIns[0]?.readinessScore ?? 12;
      const readinessTier = readinessScore >= 16 ? "HIGH" : readinessScore <= 10 ? "LOW" : "MEDIUM";
      const multiplier = readinessTier === "HIGH" ? 1.02 : readinessTier === "LOW" ? 0.97 : 1;
      const adjusted = base == null ? null : Math.round(base * multiplier * 10) / 10;

      return json(route, 200, {
        exerciseName: insight?.exerciseName ?? url.searchParams.get("exerciseName"),
        variant: insight?.variant ?? url.searchParams.get("variant"),
        baseRecommendedWeightKg: base,
        adjustedRecommendedWeightKg: adjusted,
        readinessScore,
        readinessTier,
        adjustmentPercent: Math.round((multiplier - 1) * 1000) / 10,
        rationale: "Mock autotune guidance",
        trainingState: insight?.trainingState ?? "UNDEREXPOSED",
        recommendedAction: insight?.recommendedAction ?? "HOLD_LOAD",
        topSetOnly: true,
      });
    }

    if (path === "/workout/insights/autotune/outcomes" && method === "POST") {
      if (!hasValidAccessToken) {
        return json(route, 401, { cause: "expired" });
      }
      return route.fulfill({ status: 204, body: "" });
    }

    if (path === "/workout/progress/series/catalog" && method === "GET") {
      if (!hasValidAccessToken) {
        return json(route, 401, { cause: "expired" });
      }

      return json(route, 200, state.progressCatalog);
    }

    if (path === "/workout/progress/cockpit" && method === "GET") {
      if (!hasValidAccessToken) {
        return json(route, 401, { cause: "expired" });
      }

      return json(route, 200, state.analysisCockpit);
    }

    if (path === "/workout/progress/presets" && method === "GET") {
      if (!hasValidAccessToken) {
        return json(route, 401, { cause: "expired" });
      }

      return json(route, 200, state.progressPresets);
    }

    if (path === "/workout/progress/powerlifting/summary" && method === "GET") {
      if (!hasValidAccessToken) {
        return json(route, 401, { cause: "expired" });
      }

      return json(route, 200, state.powerliftingSummary);
    }

    if (path === "/workout/progress/presets" && method === "POST") {
      if (!hasValidAccessToken) {
        return json(route, 401, { cause: "expired" });
      }

      const body = request.postDataJSON() as Omit<ProgressChartPreset, "id" | "createdAt" | "updatedAt">;
      const preset: ProgressChartPreset = {
        ...body,
        id: `preset-${state.progressPresets.length + 1}`,
        createdAt: "2026-04-27T00:00:00.000Z",
        updatedAt: "2026-04-27T00:00:00.000Z",
      };
      state.progressPresets = [...state.progressPresets, preset];
      return json(route, 201, preset);
    }

    if (path.match(/^\/workout\/progress\/presets\/[^/]+$/) && method === "PUT") {
      if (!hasValidAccessToken) {
        return json(route, 401, { cause: "expired" });
      }

      const presetId = path.split("/")[4] ?? "";
      const body = request.postDataJSON() as Omit<ProgressChartPreset, "id" | "createdAt" | "updatedAt">;
      const existing = state.progressPresets.find((preset) => preset.id === presetId);
      const updated: ProgressChartPreset = {
        ...existing,
        ...body,
        id: presetId,
        createdAt: existing?.createdAt ?? "2026-04-27T00:00:00.000Z",
        updatedAt: "2026-04-27T00:00:00.000Z",
      } as ProgressChartPreset;
      state.progressPresets = state.progressPresets.map((preset) => (preset.id === presetId ? updated : preset));
      return json(route, 200, updated);
    }

    if (path.match(/^\/workout\/progress\/presets\/[^/]+$/) && method === "DELETE") {
      if (!hasValidAccessToken) {
        return json(route, 401, { cause: "expired" });
      }

      const presetId = path.split("/")[4] ?? "";
      state.progressPresets = state.progressPresets.filter((preset) => preset.id !== presetId);
      return route.fulfill({ status: 204, body: "" });
    }

    if (path === "/workout/progress/charts/query" && method === "POST") {
      if (!hasValidAccessToken) {
        return json(route, 401, { cause: "expired" });
      }

      const body = request.postDataJSON() as { exerciseDefinitionId?: string };
      return json(route, 200, buildProgressChartResponse(body.exerciseDefinitionId ?? "exercise-definition-1"));
    }

    if (path.match(/^\/workout\/progress\/diagnostics\/.+$/) && method === "GET") {
      if (!hasValidAccessToken) {
        return json(route, 401, { cause: "expired" });
      }

      const exerciseKey = decodeURIComponent(path.replace("/workout/progress/diagnostics/", ""));
      return json(route, 200, buildProgressDiagnostics(exerciseKey));
    }

    if (path.match(/^\/workout\/programmes\/split\/[^/]+$/) && method === "GET") {
      if (!hasValidAccessToken) {
        return json(route, 401, { cause: "expired" });
      }

      const splitId = path.split("/")[4] ?? "";
      return json(route, 200, state.programmes[splitId] ?? []);
    }

    if (path === "/workout/programmes/preset" && method === "POST") {
      if (!hasValidAccessToken) {
        return json(route, 401, { cause: "expired" });
      }

      const body = request.postDataJSON() as { splitId: string; startDate: string; presetType?: Programme["presetType"] };
      const programme = buildProgramme({
        startDate: body.startDate,
        active: true,
        presetType: body.presetType ?? "CUSTOM",
      });
      state.programmes[body.splitId] = [...(state.programmes[body.splitId] ?? []), programme];
      return json(route, 201, programme);
    }
    return json(route, 200, {});
  });
}

type AppHarness = {
  usePersona: (persona: Persona) => Promise<void>;
  login: (options?: { expectMfa?: boolean }) => Promise<void>;
  navigate: (path: string) => Promise<void>;
};

export const test = base.extend<{ app: AppHarness }>({
  app: async ({ page }, runAppHarness, testInfo) => {
    const useRealBackend = Boolean(testInfo.project.metadata?.useRealBackend);
    const stateRef = { current: createState("anonymous") };

    if (!useRealBackend) {
      await installMockApi(page, stateRef);
    }

    await runAppHarness({
      async usePersona(persona) {
        stateRef.current = createState(persona);

        await page.addInitScript(() => {
          localStorage.clear();
          sessionStorage.clear();
          (window as Window & { __FINGERPRINT_OVERRIDE__?: string }).__FINGERPRINT_OVERRIDE__ =
            "playwright-device";
        });
      },
      async login(options) {
        if (page.url() === "about:blank") {
          await page.goto("/login", { waitUntil: "domcontentloaded" });
        } else {
          await page.evaluate(() => {
            window.history.pushState({}, "", "/login");
            window.dispatchEvent(new PopStateEvent("popstate"));
          });
        }
        await expect(page).toHaveURL(/\/login$/);
        const notice = page.getByLabel("Cookie notice");
        const acknowledgeButton = notice.getByRole("button", { name: "Acknowledge" });
        for (let attempt = 0; attempt < 3; attempt += 1) {
          const isVisible = await acknowledgeButton.isVisible().catch(() => false);
          if (!isVisible) {
            break;
          }

          try {
            await acknowledgeButton.click({ timeout: 2_000, force: true });
            await expect(notice).toHaveCount(0, { timeout: 3_000 });
            break;
          } catch {
            await page.waitForTimeout(150);
          }
        }
        await page.getByLabel("Username").fill("playwright-user");
        await page.getByLabel(/^Password$/).fill("Password1");
        await page.getByRole("button", { name: "Sign In" }).click();

        if (options?.expectMfa) {
          await expect(page.getByText("Two-Factor Authentication")).toBeVisible();
        } else {
          await expect(page).toHaveURL(/\/dashboard$/);
        }
      },
      async navigate(path) {
        const expectTarget = new RegExp(`${path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`);

        for (let attempt = 0; attempt < 3; attempt += 1) {
          await page.evaluate((nextPath) => {
            window.history.pushState({}, "", nextPath);
            window.dispatchEvent(new PopStateEvent("popstate"));
          }, path);

          try {
            await expect(page).toHaveURL(expectTarget, { timeout: 10_000 });
            return;
          } catch {
            // Mobile WebKit can occasionally ignore the first popstate while the app is still settling.
            await page.waitForTimeout(150);
          }
        }

        await expect(page).toHaveURL(expectTarget, { timeout: 10_000 });
      },
    });
  },
});

export { expect };
