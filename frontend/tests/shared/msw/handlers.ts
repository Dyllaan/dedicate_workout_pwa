import { http, HttpResponse } from "msw";
import type { DashboardSummary, ExerciseDefinition, Split, WorkoutEntry, WorkoutTemplate } from "@/features/workout/types/Workout";
import type { Programme } from "@/features/periodisation/types/Periodisation";
import type { BodyweightLog } from "@/features/bodyweight/types/Bodyweight";
import type {
  BlockSummary,
  DashboardTrainingInsights,
  DashboardSummaryTopLift,
  ExerciseTrainingInsight,
  NextWorkoutSignal,
  PrioritySignal,
  ReadinessCheckIn,
  SmartCoachDismissal,
  WorkoutTemplateTrainingInsights,
} from "@/features/insights/types/Insights";
import type {
  AnalysisCockpitSummary,
  PowerliftingSummary,
  ProgressChartPreset,
  ProgressChartQueryResponse,
  ProgressSeriesCatalogItem,
  ProgressSeriesDiagnostics,
} from "@/features/progress/types/Progress";
import type {
  ExerciseInfoCatalogItem,
  MuscleHeatmapResponse,
  ResolvedExerciseHeatmap,
  WeeklyMuscleVolumeResponse,
} from "@/features/heatmap/types/Heatmap";
import type { User } from "@/features/auth/types/User";
import type { StartupSplit } from "@/features/startup/types/Startup";
import { calculatePowerToWeightRatios, findBodyweightLogForDate } from "@/features/workout/entries/utils/powerToWeightRatio";
import {
  buildApiError,
  buildAnalysisCockpitSummary,
  buildBodyweightLog,
  buildExerciseDefinition,
  buildExerciseInfoCatalogItem,
  buildMuscleHeatmapResponse,
  buildWeeklyMuscleVolumeResponse,
  buildDashboardTrainingInsights,
  buildDashboardSummary,
  buildExerciseTrainingInsight,
  buildPowerliftingSummary,
  buildProgressChartPreset,
  buildProgressChartQueryResponse,
  buildProgressSeriesCatalogItem,
  buildProgressSeriesDiagnostics,
  buildProgramme,
  buildResolvedExerciseHeatmap,
  buildSmartCoachDismissal,
  buildSplit,
  buildUser,
  buildWorkoutEntry,
  buildWorkoutTemplateTrainingInsights,
  buildWorkoutTemplate,
} from "../builders";

type MockApiState = {
  user: User;
  mfaRequired: boolean;
  pendingMfaToken: string;
  refreshShouldFail: boolean;
  workouts: WorkoutTemplate[];
  splits: Split[];
  workoutEntries: WorkoutEntry[];
  programmes: Record<string, Programme[]>;
  exerciseDefinitions: Record<string, ExerciseDefinition>;
  dashboardInsights: DashboardTrainingInsights;
  dashboardSummary: DashboardSummary;
  plateauInsights: ExerciseTrainingInsight[];
  trainingSignals: ExerciseTrainingInsight[];
  readinessCheckIns: ReadinessCheckIn[];
  smartCoachDismissals: SmartCoachDismissal[];
  exerciseInsights: Record<string, ExerciseTrainingInsight>;
  templateInsights: Record<string, WorkoutTemplateTrainingInsights>;
  progressCatalog: ProgressSeriesCatalogItem[];
  progressPresets: ProgressChartPreset[];
  powerliftingSummary: PowerliftingSummary;
  analysisCockpit: AnalysisCockpitSummary;
  progressChartResponse: ProgressChartQueryResponse;
  progressDiagnostics: Record<string, ProgressSeriesDiagnostics>;
  exerciseCatalog: ExerciseInfoCatalogItem[];
  templateHeatmaps: Record<string, MuscleHeatmapResponse>;
  entryHeatmaps: Record<string, MuscleHeatmapResponse>;
  weeklyMuscleVolume: WeeklyMuscleVolumeResponse;
  bodyweightLogs: BodyweightLog[];
  workoutSettings: { defaultRestSeconds: number };
};

function createMockApiState(
  overrides: Partial<MockApiState> = {},
): MockApiState {
  const workouts = overrides.workouts ?? [buildWorkoutTemplate()];
  const split = overrides.splits?.[0] ?? buildSplit({ workouts });
  const programmes =
    overrides.programmes ?? { [split.id]: split.programmes.length ? split.programmes : [buildProgramme()] };

  return {
    user: buildUser(),
    mfaRequired: false,
    pendingMfaToken: "pending-mfa-token",
    refreshShouldFail: false,
    workouts,
    splits: overrides.splits ?? [split],
    workoutEntries: overrides.workoutEntries ?? [buildWorkoutEntry({ template: workouts[0] })],
    programmes,
    exerciseDefinitions: overrides.exerciseDefinitions ?? {
      "exercise-definition-1": buildExerciseDefinition(),
      "exercise-definition-2": buildExerciseDefinition({
        id: "exercise-definition-2",
        exerciseName: "Squat",
        variant: "Barbell",
        primaryMuscle: "quads",
        secondaryMuscles: ["glutes"],
      }),
    },
    dashboardInsights: overrides.dashboardInsights ?? buildDashboardTrainingInsights(),
    dashboardSummary: overrides.dashboardSummary ?? buildDashboardSummary(),
    plateauInsights: overrides.plateauInsights ?? [],
    trainingSignals: overrides.trainingSignals ?? [],
    readinessCheckIns: overrides.readinessCheckIns ?? [],
    smartCoachDismissals: overrides.smartCoachDismissals ?? [],
    exerciseInsights: overrides.exerciseInsights ?? {
      "Bench Press||Barbell": buildExerciseTrainingInsight(),
    },
    templateInsights: overrides.templateInsights ?? {
      [workouts[0].id]: buildWorkoutTemplateTrainingInsights({ templateId: workouts[0].id }),
    },
    progressCatalog: overrides.progressCatalog ?? [buildProgressSeriesCatalogItem()],
    progressPresets: overrides.progressPresets ?? [buildProgressChartPreset()],
    powerliftingSummary: overrides.powerliftingSummary ?? buildPowerliftingSummary(),
    analysisCockpit: overrides.analysisCockpit ?? buildAnalysisCockpitSummary(),
    progressChartResponse: overrides.progressChartResponse ?? buildProgressChartQueryResponse(),
    progressDiagnostics: overrides.progressDiagnostics ?? {
      "Bench Press||Barbell": buildProgressSeriesDiagnostics(),
    },
    exerciseCatalog: overrides.exerciseCatalog ?? [
      buildExerciseInfoCatalogItem(),
      buildExerciseInfoCatalogItem({
        id: 2,
        name: "Squat",
        variation: "Barbell",
        equipment: "Barbell",
        mainMuscle: "Quadriceps",
      }),
    ],
    templateHeatmaps: overrides.templateHeatmaps ?? {
      [workouts[0].id]: buildMuscleHeatmapResponse({ templateId: workouts[0].id }),
    },
    entryHeatmaps: overrides.entryHeatmaps ?? {
      [overrides.workoutEntries?.[0]?.id ?? "entry-1"]: buildMuscleHeatmapResponse({
        scope: "WORKOUT_ENTRY",
        templateId: workouts[0].id,
        entryId: overrides.workoutEntries?.[0]?.id ?? "entry-1",
        entryCount: 1,
        unmappedExercises: [],
        coverage: {
          totalExercises: 1,
          mappedExercises: 1,
          skippedExercises: 0,
        },
      }),
    },
    weeklyMuscleVolume: overrides.weeklyMuscleVolume ?? buildWeeklyMuscleVolumeResponse(),
    bodyweightLogs: overrides.bodyweightLogs ?? [],
    workoutSettings: overrides.workoutSettings ?? { defaultRestSeconds: 90 },
    ...overrides,
  };
}

function calculateReadinessScore(checkIn: Pick<ReadinessCheckIn, "sleepQuality" | "stressLevel" | "sorenessLevel" | "confidenceLevel">) {
  return checkIn.sleepQuality + (6 - checkIn.stressLevel) + (6 - checkIn.sorenessLevel) + checkIn.confidenceLevel;
}

function buildLiftSummary(
  entries: WorkoutEntry[],
  bodyweightLogs: BodyweightLog[],
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

  let topBucket: ProgressPoint[] | null = null;
  let topKey: string | null = null;
  for (const [key, points] of progress.entries()) {
    if (!topBucket || points.length > topBucket.length) {
      topBucket = points;
      topKey = key;
    }
  }

  if (!topBucket || !topKey) {
    return null;
  }

  const topPoints = topBucket;
  const allSets = topPoints.flatMap((point) => point.weightedSets);
  if (allSets.length === 0) {
    return null;
  }

  const bestSet = allSets.reduce((best, current) => {
    if (current.weightKg > best.weightKg) return current;
    if (current.weightKg < best.weightKg) return best;
    if (current.estimatedOneRepMaxKg > best.estimatedOneRepMaxKg) return current;
    if (current.estimatedOneRepMaxKg < best.estimatedOneRepMaxKg) return best;
    return current.performedAt > best.performedAt ? current : best;
  });
  const previousPoint = topPoints.length >= 2 ? topPoints[topPoints.length - 2] : null;
  const previousBestSet = previousPoint
    ? previousPoint.weightedSets.reduce((best, current) => {
        if (current.weightKg > best.weightKg) return current;
        if (current.weightKg < best.weightKg) return best;
        if (current.estimatedOneRepMaxKg > best.estimatedOneRepMaxKg) return current;
        if (current.estimatedOneRepMaxKg < best.estimatedOneRepMaxKg) return best;
        return current.performedAt > best.performedAt ? current : best;
      })
    : null;
  const bodyweight = findBodyweightLogForDate(bodyweightLogs, bestSet.performedAt);
  const ratios = calculatePowerToWeightRatios({
    loadKg: bestSet.weightKg,
    estimatedOneRepMaxKg: bestSet.estimatedOneRepMaxKg,
    bodyweightKg: bodyweight?.weightKg ?? null,
  });

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

  const mostRecentPoint = topPoints[topPoints.length - 1];
  const mostRecentBestSet = mostRecentPoint.weightedSets.reduce((best, current) => {
    if (current.weightKg > best.weightKg) return current;
    if (current.weightKg < best.weightKg) return best;
    if (current.estimatedOneRepMaxKg > best.estimatedOneRepMaxKg) return current;
    if (current.estimatedOneRepMaxKg < best.estimatedOneRepMaxKg) return best;
    return current.performedAt > best.performedAt ? current : best;
  });
  const mostRecentBodyweight = findBodyweightLogForDate(bodyweightLogs, mostRecentBestSet.performedAt);
  const mostRecentRatios = calculatePowerToWeightRatios({
    loadKg: mostRecentBestSet.weightKg,
    estimatedOneRepMaxKg: mostRecentBestSet.estimatedOneRepMaxKg,
    bodyweightKg: mostRecentBodyweight?.weightKg ?? null,
  });

  return {
    exerciseDefinitionId: representativeExercise.exerciseDefinitionId ?? null,
    exerciseName: representativeExercise.exerciseName,
    variant: representativeExercise.variant ?? null,
    sessionCount: topPoints.length,
    personalBestKg: Math.max(...topPoints.map((point) => point.maxWeightKg)),
    improvementKg: Math.round((topPoints[topPoints.length - 1].maxWeightKg - topPoints[0].maxWeightKg) * 10) / 10,
    topSetWeightKg: bestSet.weightKg,
    topSetReps: bestSet.reps,
    estimatedOneRepMaxKg: bestSet.estimatedOneRepMaxKg,
    bodyweightKg: bodyweight?.weightKg ?? null,
    bodyweightLoggedAt: bodyweight?.loggedAt ?? null,
    loadBodyweightRatio: ratios.loadBodyweightRatio,
    estimatedOneRepMaxBodyweightRatio: ratios.estimatedOneRepMaxBodyweightRatio,
    mostRecentTopSetWeightKg: mostRecentBestSet.weightKg,
    mostRecentTopSetReps: mostRecentBestSet.reps,
    mostRecentEstimatedOneRepMaxKg: mostRecentBestSet.estimatedOneRepMaxKg,
    mostRecentTopSetPerformedAt: mostRecentBestSet.performedAt,
    mostRecentBodyweightKg: mostRecentBodyweight?.weightKg ?? null,
    mostRecentBodyweightLoggedAt: mostRecentBodyweight?.loggedAt ?? null,
    mostRecentLoadBodyweightRatio: mostRecentRatios.loadBodyweightRatio,
    mostRecentEstimatedOneRepMaxBodyweightRatio: mostRecentRatios.estimatedOneRepMaxBodyweightRatio,
    previousTopSetWeightKg: previousBestSet?.weightKg ?? null,
    previousTopSetReps: previousBestSet?.reps ?? null,
    previousEstimatedOneRepMaxKg: previousBestSet?.estimatedOneRepMaxKg ?? null,
    previousTopSetPerformedAt: previousBestSet?.performedAt ?? null,
  };
}

function toStartupSplit(split: Split): StartupSplit {
  return {
    id: split.id,
    name: split.name,
    createdAt: split.createdAt,
    active: split.active,
    programmes: split.programmes,
    workoutAssignments: split.workoutFrequencies.map((frequency, index) => ({
      id: `assignment-${index + 1}`,
      workoutTemplateId: frequency.workoutTemplateId,
      sessionsPerWeek: frequency.sessionsPerWeek,
      workoutOrder: index,
    })),
  };
}

export function createMockHandlers(overrides: Partial<MockApiState> = {}) {
  const state = createMockApiState(overrides);
  const api = "http://localhost:8080";
  const resolveExerciseCatalog = ({ request }: { request: Request }) => {
    const url = new URL(request.url, api);
    const query = (url.searchParams.get("query") ?? "").trim().toLowerCase();
    const limit = Number(url.searchParams.get("limit") ?? "12");
    const results = state.exerciseCatalog
      .filter((item) => {
        if (!query) return true;
        const haystack = `${item.name} ${item.variation ?? ""} ${item.equipment ?? ""}`.toLowerCase();
        return haystack.includes(query);
      })
      .slice(0, Number.isFinite(limit) ? limit : 12);
    return HttpResponse.json(results);
  };
  const resolveExerciseQuickPicks = ({ request }: { request: Request }) => {
    const url = new URL(request.url, api);
    const limit = Number(url.searchParams.get("limit") ?? "10");
    return HttpResponse.json(
      state.exerciseCatalog.slice(0, Number.isFinite(limit) ? limit : 10),
    );
  };

  const buildDismissalKey = (exerciseName: string, variant: string | null | undefined, trainingState: string, recommendedAction?: string | null) =>
    `${exerciseName.trim().toLowerCase()}||${(variant ?? "").trim().toLowerCase()}::${trainingState}::${recommendedAction ?? "NONE"}`;

  const filterSignals = <T extends {
    exerciseName: string;
    variant?: string | null;
    trainingState: string;
    recommendedAction?: string | null;
  }>(signals: T[]) => {
    const dismissed = new Set(
      state.smartCoachDismissals.map((dismissal) =>
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
  };

  const buildTrainingBlockContext = () => {
    const activeBlock = state.dashboardInsights.activeBlock;
    if (!activeBlock) {
      return null;
    }

    return {
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
    };
  };

  const buildNextWorkoutSignal = (): NextWorkoutSignal => {
    const headline = state.dashboardInsights.headlineInsights[0];
    const nextWorkout = state.dashboardSummary.nextWorkout;
    return {
      workoutTemplateId: nextWorkout?.id ?? state.dashboardInsights.nextWorkoutTemplateId ?? "workout-1",
      workoutTemplateName: nextWorkout?.name ?? "Bench Day",
      exerciseDefinitionId: "exercise-definition-1",
      exerciseName: headline?.exerciseName ?? "Bench Press",
      variant: headline?.variant ?? null,
      exerciseType: "UPPER_BODY",
      progressionMode: "WEIGHT_FIRST",
      primaryBenchmark: "WORKING_SETS",
      progressionStrategy: "WEIGHT_FIRST",
      trainingState: headline?.trainingState ?? "IMPROVING",
      suggestionType: mapRecommendedActionToSuggestionType(headline?.recommendedAction),
      suggestedWeightKg: headline?.suggestedWeightKg ?? null,
      reasoning: headline?.reasoning ?? "Progress is steady.",
      blockContext: buildTrainingBlockContext(),
    };
  };

  const buildBlockSummary = (): BlockSummary => ({
    blockContext: buildTrainingBlockContext(),
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

  const buildPrioritySignals = (): PrioritySignal[] =>
    state.dashboardInsights.headlineInsights
      .filter((item) => item.exerciseName)
      .map((item, index) => ({
        rank: index + 1,
        exerciseDefinitionId: "exercise-definition-1",
        exerciseName: item.exerciseName ?? "Bench Press",
        variant: item.variant ?? null,
        exerciseType: "UPPER_BODY",
        progressionMode: "WEIGHT_FIRST",
        primaryBenchmark: "WORKING_SETS",
        trainingState: item.trainingState,
        suggestionType: mapRecommendedActionToSuggestionType(item.recommendedAction),
        suggestedWeightKg: item.suggestedWeightKg ?? null,
        reasoning: item.reasoning,
      }));

  function mapRecommendedActionToSuggestionType(action?: string | null): PrioritySignal["suggestionType"] {
    switch (action) {
      case "INCREASE_LOAD":
        return "INCREASE";
      case "HOLD_LOAD":
      case "STAY_THE_COURSE":
        return "MAINTAIN";
      case "DELOAD":
        return "DELOAD";
      case "CHANGE_VARIATION":
      case "INCREASE_EXPOSURE":
        return "PLATEAU";
      default:
        return "INSUFFICIENT_DATA";
    }
  }

  return [
    http.get(`${api}/service-status`, () =>
      HttpResponse.json({
        services: [
          { id: "gateway", label: "Gateway", health: "UP", version: "1.0.0-test", name: "Gateway", buildTime: "now" },
          { id: "auth", label: "Auth Service", health: "UP", version: "1.0.0-test", name: "Auth", buildTime: "now" },
          { id: "workout", label: "Workout Service", health: "UP", version: "1.0.0-test", name: "Workout", buildTime: "now" },
          { id: "frontend", label: "Frontend", health: "UP", version: null, name: "App", buildTime: null },
        ],
      }),
    ),
    http.get(`${api}/auth/version`, () =>
      HttpResponse.json({ name: "Auth", version: "1.0.0-test", time: "now" }),
    ),
    http.get(`${api}/workout/version`, () =>
      HttpResponse.json({ name: "Workout", version: "1.0.0-test", time: "now" }),
    ),
    http.get(`${api}/version`, () =>
      HttpResponse.json({ name: "Gateway", version: "1.0.0-test", time: "now" }),
    ),
    http.get(`${api}/auth/actuator/health`, () =>
      HttpResponse.json({ status: "UP" }),
    ),
    http.get(`${api}/workout/actuator/health`, () =>
      HttpResponse.json({ status: "UP" }),
    ),
    http.get(`${api}/actuator/health`, () =>
      HttpResponse.json({ status: "UP" }),
    ),
    http.get(`${api}/auth/user/me`, () =>
      HttpResponse.json({
        username: state.user.username,
        mfaEnabled: state.user.mfaEnabled ?? false,
      }),
    ),
    http.post(`${api}/auth/user/register`, async ({ request }) => {
      const body = (await request.json()) as { username: string };
      state.user = buildUser({ username: body.username });
      return HttpResponse.json(state.user, { status: 201 });
    }),
    http.post(`${api}/auth/user/login`, async ({ request }) => {
      const body = (await request.json()) as { username: string; password: string };
      if (body.password === "wrong-password") {
        return HttpResponse.json(buildApiError("Login failed"), { status: 401 });
      }
      if (state.mfaRequired) {
        return HttpResponse.json(
          { mfaToken: state.pendingMfaToken, message: "MFA required" },
          { status: 202 },
        );
      }
      state.user = buildUser({ username: body.username });
      return HttpResponse.json(state.user);
    }),
    http.post(`${api}/auth/user/verify-mfa`, async ({ request }) => {
      const body = (await request.json()) as { code: string };
      if (body.code === "000000") {
        return HttpResponse.json(buildApiError("Invalid authentication code"), {
          status: 401,
        });
      }
      return HttpResponse.json(state.user);
    }),
    http.post(`${api}/auth/user/refresh`, () => {
      if (state.refreshShouldFail) {
        return HttpResponse.json(buildApiError("Refresh failed"), { status: 401 });
      }
      state.user = { ...state.user, accessToken: `refreshed-${state.user.accessToken}` };
      return HttpResponse.json({ accessToken: state.user.accessToken });
    }),
    http.post(`${api}/auth/user/logout`, () => HttpResponse.json({}, { status: 200 })),
    http.get(`${api}/auth/mfa/status`, () =>
      HttpResponse.json({ enabled: state.user.mfaEnabled ?? false, verified: true }),
    ),
    http.get(`${api}/workout/workout-templates`, () =>
      HttpResponse.json(state.workouts),
    ),
    http.post(`${api}/workout/workout-templates`, async ({ request }) => {
      const body = (await request.json()) as {
        name: string;
        category: string;
        exercises: WorkoutTemplate["exercises"];
      };
      const next = buildWorkoutTemplate({
        name: body.name,
        category: body.category,
        exercises: body.exercises,
      });
      state.workouts.push(next);
      return HttpResponse.json(next, { status: 201 });
    }),
    http.get(`${api}/workout/splits`, () =>
      HttpResponse.json(state.splits.map((split) => toStartupSplit(split))),
    ),
    http.get(`${api}/workout/splits/:splitId`, ({ params }) => {
      const split = state.splits.find((candidate) => candidate.id === params.splitId) ?? null;

      if (!split) {
        return HttpResponse.json(buildApiError("Split not found"), { status: 404 });
      }

      return HttpResponse.json(toStartupSplit(split));
    }),
    http.post(`${api}/workout/splits`, async ({ request }) => {
      const body = (await request.json()) as {
        name: string;
        workoutTemplateIds: string[];
        workoutFrequencies?: { workoutTemplateId: string; sessionsPerWeek: number }[];
      };
      const workouts = state.workouts.filter((workout) => body.workoutTemplateIds.includes(workout.id));
      const split = buildSplit({
        name: body.name,
        workouts,
        active: false,
        programmes: [],
        workoutFrequencies: workouts.map((workout) => ({
          workoutTemplateId: workout.id,
          workoutTemplateName: workout.name,
          sessionsPerWeek: body.workoutFrequencies?.find(
            (frequency) => frequency.workoutTemplateId === workout.id,
          )?.sessionsPerWeek ?? 1,
        })),
      });
      state.splits.push(split);
      state.programmes[split.id] = [];
      return HttpResponse.json(split, { status: 201 });
    }),
    http.put(`${api}/workout/splits/:splitId/activate`, ({ params }) => {
      state.splits = state.splits.map((split) => ({
        ...split,
        active: split.id === params.splitId,
      }));
      const activeSplit = state.splits.find((split) => split.id === params.splitId) ?? state.splits[0];
      return HttpResponse.json(activeSplit);
    }),
    http.delete(`${api}/workout/splits/:splitId`, ({ params }) => {
      state.splits = state.splits.filter((split) => split.id !== params.splitId);
      return HttpResponse.json({}, { status: 200 });
    }),
    http.get(`${api}/workout/workout-entries`, ({ request }) => {
      const url = new URL(request.url);
      const workoutTemplateId = url.searchParams.get("workoutTemplateId");
      const entries = workoutTemplateId
        ? state.workoutEntries.filter((entry) => entry.template.id === workoutTemplateId)
        : state.workoutEntries;
      return HttpResponse.json(entries);
    }),
    http.post(`${api}/workout/workout-entries`, async ({ request }) => {
      const body = (await request.json()) as {
        workoutTemplateId: string;
        exercises: WorkoutEntry["exercises"];
      };
      const template = state.workouts.find((workout) => workout.id === body.workoutTemplateId) ?? state.workouts[0];
      const entry = buildWorkoutEntry({ template, exercises: body.exercises as WorkoutEntry["exercises"] });
      state.workoutEntries.push(entry);
      return HttpResponse.json(entry, { status: 201 });
    }),
    http.get(`${api}/workout/exercise-info/catalog`, resolveExerciseCatalog),
    http.get("/workout/exercise-info/catalog", resolveExerciseCatalog),
    http.get("/api/workout/exercise-info/catalog", resolveExerciseCatalog),
    http.get(`${api}/workout/exercise-info/quick-picks`, resolveExerciseQuickPicks),
    http.get("/workout/exercise-info/quick-picks", resolveExerciseQuickPicks),
    http.get("/api/workout/exercise-info/quick-picks", resolveExerciseQuickPicks),
    http.get(`${api}/workout/exercise-definitions/:id`, ({ params }) => {
      const id = String(params.id);
      return HttpResponse.json(state.exerciseDefinitions[id] ?? buildExerciseDefinition({ id }));
    }),
    http.get(`${api}/workout/exercise-definitions/heatmap/workout-templates/:templateId`, ({ params }) => {
      const templateId = String(params.templateId);
      return HttpResponse.json(
        state.templateHeatmaps[templateId] ?? buildMuscleHeatmapResponse({ templateId }),
      );
    }),
    http.get(`${api}/workout/exercise-definitions/heatmap/workout-entries/:entryId`, ({ params }) => {
      const entryId = String(params.entryId);
      return HttpResponse.json(
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
    }),
    http.put(`${api}/workout/muscle-heatmap/mappings`, async ({ request }) => {
      const body = (await request.json()) as {
        mappings: Array<{
          exerciseName: string;
          variant?: string | null;
          mappingSource: "CATALOG" | "MANUAL";
          exerciseInfoId?: number | null;
          primaryMuscle?: ResolvedExerciseHeatmap["primaryMuscle"];
          secondaryMuscles?: ResolvedExerciseHeatmap["secondaryMuscles"];
        }>;
      };
      const resolved = body.mappings.map((mapping, index) =>
        buildResolvedExerciseHeatmap({
          mappingId: `mapping-${index + 1}`,
          exerciseName: mapping.exerciseName,
          variant: mapping.variant ?? null,
          mappingSource: mapping.mappingSource,
          exerciseInfoId: mapping.exerciseInfoId ?? null,
          resolvedExerciseName:
            mapping.mappingSource === "CATALOG"
              ? state.exerciseCatalog.find((item) => item.id === mapping.exerciseInfoId)?.name ?? mapping.exerciseName
              : mapping.exerciseName,
          primaryMuscle: mapping.mappingSource === "MANUAL" ? mapping.primaryMuscle ?? "chest" : "chest",
          secondaryMuscles: mapping.mappingSource === "MANUAL" ? mapping.secondaryMuscles ?? [] : ["front_delt"],
          synergistMuscles: [],
        }),
      );
      return HttpResponse.json(resolved);
    }),
    http.delete(`${api}/workout/muscle-heatmap/mappings/:mappingId`, () =>
      HttpResponse.json({}, { status: 204 }),
    ),
    http.get(`${api}/workout/dashboard/summary`, () => HttpResponse.json(state.dashboardSummary)),
    http.get(`${api}/workout/analysis/training-insights/next-workout`, () => HttpResponse.json(buildNextWorkoutSignal())),
    http.get(`${api}/workout/analysis/training-insights/block-summary`, () => HttpResponse.json(buildBlockSummary())),
    http.get(`${api}/workout/analysis/training-insights/priority-signals`, () => HttpResponse.json(buildPrioritySignals())),
    http.get(`${api}/workout/analysis/training-insights/lift-summary`, ({ request }) => {
      const url = new URL(request.url);
      const scope = (url.searchParams.get("scope") ?? "overall").toLowerCase();

      if (scope === "template") {
        const templateId = url.searchParams.get("templateId");
        if (!templateId) {
          return HttpResponse.json({ cause: "templateId is required for template scope" }, { status: 400 });
        }

        const template = state.workouts.find((workout) => workout.id === templateId);
        if (!template) {
          return HttpResponse.json({ cause: "Workout template not found" }, { status: 404 });
        }

        const focus = template.exercises.find((exercise) => exercise.focus);
        const summary = focus
          ? buildLiftSummary(
            state.workoutEntries.filter((entry) => entry.template.id === templateId),
            state.bodyweightLogs,
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
          : null;

        return HttpResponse.json(summary);
      }

      return HttpResponse.json(buildLiftSummary(state.workoutEntries, state.bodyweightLogs));
    }),
    http.get(`${api}/workout/analysis/training-insights/weekly-volume`, () => HttpResponse.json(state.weeklyMuscleVolume)),
    http.get(`${api}/workout/readiness/history`, ({ request }) => {
      const url = new URL(request.url, api);
      const days = Math.max(1, Math.min(30, Number(url.searchParams.get("days") ?? "7")));
      const points = state.readinessCheckIns.slice(0, days);
      const averageReadinessScore = points.length === 0
        ? 0
        : Math.round((points.reduce((sum, point) => sum + calculateReadinessScore(point), 0) / points.length) * 10) / 10;

      return HttpResponse.json({
        days,
        averageReadinessScore,
        points,
      });
    }),
    http.post(`${api}/workout/readiness/check-ins`, async ({ request }) => {
      const body = (await request.json()) as {
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
      return HttpResponse.json(next, { status: 201 });
    }),
    http.get(`${api}/workout/insights/plateaus`, () => HttpResponse.json(filterSignals(state.plateauInsights))),
    http.get(`${api}/workout/insights/dismissals`, () => HttpResponse.json(state.smartCoachDismissals)),
    http.post(`${api}/workout/insights/dismissals`, async ({ request }) => {
      const body = (await request.json()) as {
        exerciseName: string;
        variant?: string | null;
        trainingState: SmartCoachDismissal["trainingState"];
        recommendedAction?: SmartCoachDismissal["recommendedAction"];
      };
      const existing = state.smartCoachDismissals.find((dismissal) =>
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
        state.smartCoachDismissals.unshift(dismissal);
      }
      return HttpResponse.json(dismissal, { status: 201 });
    }),
    http.delete(`${api}/workout/insights/dismissals/:dismissalId`, ({ params }) => {
      state.smartCoachDismissals = state.smartCoachDismissals.filter((dismissal) => dismissal.id !== params.dismissalId);
      return new HttpResponse(null, { status: 204 });
    }),
    http.get(`${api}/workout/insights/exercises/:exerciseKey`, ({ params }) => {
      const key = decodeURIComponent(String(params.exerciseKey));
      const insight = state.exerciseInsights[key] ?? buildExerciseTrainingInsight({ exerciseName: key.split("||")[0] ?? key });
      const [visible] = filterSignals([insight]);
      return HttpResponse.json(visible ?? null);
    }),
    http.get(`${api}/workout/insights/workout-templates/:templateId/today`, ({ params }) => {
      const templateId = String(params.templateId);
      const response = state.templateInsights[templateId] ?? buildWorkoutTemplateTrainingInsights({ templateId, exerciseInsights: [] });
      return HttpResponse.json(
        {
          ...response,
          exerciseInsights: filterSignals(response.exerciseInsights),
        },
      );
    }),
    http.get(`${api}/workout/insights/autotune/top-set`, ({ request }) => {
      const url = new URL(request.url, api);
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

      return HttpResponse.json({
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
    }),
    http.post(`${api}/workout/insights/autotune/outcomes`, () => new HttpResponse(null, { status: 204 })),
    http.get(`${api}/workout/progress/series/catalog`, () => HttpResponse.json(state.progressCatalog)),
    http.get(`${api}/workout/progress/cockpit`, () => HttpResponse.json(state.analysisCockpit)),
    http.get(`${api}/workout/progress/powerlifting/summary`, () => HttpResponse.json(state.powerliftingSummary)),
    http.post(`${api}/workout/progress/charts/query`, async ({ request }) => {
      const body = (await request.json()) as { exerciseDefinitionId?: string };
      const exerciseDefinitionId = body.exerciseDefinitionId ?? "exercise-definition-1";
      return HttpResponse.json(
        buildProgressChartQueryResponse({
          ...state.progressChartResponse,
          points: state.progressChartResponse.points.map((point) => ({
            ...point,
            seriesKey: exerciseDefinitionId,
          })),
        }),
      );
    }),
    http.get(`${api}/workout/progress/diagnostics/:exerciseKey`, ({ params }) => {
      const key = decodeURIComponent(String(params.exerciseKey));
      return HttpResponse.json(
        state.progressDiagnostics[key] ??
          buildProgressSeriesDiagnostics({ exerciseName: key.split("||")[0] ?? key, seriesKey: key }),
      );
    }),
    http.get(`${api}/workout/progress/presets`, () => HttpResponse.json(state.progressPresets)),
    http.post(`${api}/workout/progress/presets`, async ({ request }) => {
      const body = (await request.json()) as ProgressChartPreset;
      const preset = buildProgressChartPreset({ ...body });
      state.progressPresets = [preset, ...state.progressPresets];
      return HttpResponse.json(preset, { status: 201 });
    }),
    http.put(`${api}/workout/progress/presets/:presetId`, async ({ params, request }) => {
      const body = (await request.json()) as ProgressChartPreset;
      const presetId = String(params.presetId);
      const updated = buildProgressChartPreset({ ...body, id: presetId });
      state.progressPresets = state.progressPresets.map((preset) => (preset.id === presetId ? updated : preset));
      return HttpResponse.json(updated);
    }),
    http.delete(`${api}/workout/progress/presets/:presetId`, ({ params }) => {
      const presetId = String(params.presetId);
      state.progressPresets = state.progressPresets.filter((preset) => preset.id !== presetId);
      return HttpResponse.json({}, { status: 204 });
    }),
    http.get(`${api}/workout/programmes/split/:splitId`, ({ params }) =>
      HttpResponse.json(state.programmes[String(params.splitId)] ?? []),
    ),
    http.post(`${api}/workout/programmes/preset`, async ({ request }) => {
      const body = (await request.json()) as { splitId: string; startDate: string; presetType?: Programme["presetType"] };
      const programme = buildProgramme({
        startDate: body.startDate,
        presetType: body.presetType ?? "CUSTOM",
      });
      state.programmes[body.splitId] = [...(state.programmes[body.splitId] ?? []), programme];
      return HttpResponse.json(programme, { status: 201 });
    }),
    http.get(`${api}/workout/bodyweight-logs`, () =>
      HttpResponse.json(state.bodyweightLogs),
    ),
    http.get(`${api}/workout/workout-settings`, () =>
      HttpResponse.json(state.workoutSettings),
    ),
    http.put(`${api}/workout/workout-settings`, async ({ request }) => {
      const body = (await request.json()) as { defaultRestSeconds: number };
      state.workoutSettings = { defaultRestSeconds: body.defaultRestSeconds };
      return HttpResponse.json(state.workoutSettings);
    }),
    http.post(`${api}/workout/bodyweight-logs`, async ({ request }) => {
      const body = (await request.json()) as { weightKg: number; loggedAt: string; notes?: string };
      const log = buildBodyweightLog({ weightKg: body.weightKg, loggedAt: body.loggedAt, notes: body.notes });
      state.bodyweightLogs.unshift(log);
      return HttpResponse.json(log, { status: 201 });
    }),
    http.delete(`${api}/workout/bodyweight-logs/:id`, ({ params }) => {
      state.bodyweightLogs = state.bodyweightLogs.filter((l) => l.id !== params.id);
      return new HttpResponse(null, { status: 204 });
    }),
  ];
}
