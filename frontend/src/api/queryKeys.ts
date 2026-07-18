export const queryKeys = {
  dashboard: {
    summary: () => ["dashboard", "summary"] as const,
  },
  workouts: {
    all: (page?: number, size?: number) =>
      page == null || size == null ? ["workouts"] as const : ["workouts", page, size] as const,
    detail: (id: string) => ["workouts", id] as const,
    entries: (templateId?: string, page?: number, size?: number) =>
      page == null || size == null
        ? templateId ? ["workout-entries", templateId] as const : ["workout-entries"] as const
        : templateId
          ? ["workout-entries", templateId, page, size] as const
          : ["workout-entries", page, size] as const,
    entry: (id: string) => ["workout-entry", id] as const,
    activeSplit: () => ["workouts", "active-split"] as const,
    latestEntry: (id: string) => ["workouts", id, "latest-entry"] as const,
    stats: (id: string) => ["workouts", id, "stats"] as const,
  },
  splits: {
    all: (page?: number, size?: number) =>
      page == null || size == null ? ["splits"] as const : ["splits", page, size] as const,
    detail: (id: string) => ["splits", id] as const,
    active: () => ["splits", "active"] as const,
  },
  programmes: {
    bySplit: (splitId: string, page?: number, size?: number) =>
      page == null || size == null
        ? ["programmes", splitId] as const
        : ["programmes", splitId, page, size] as const,
  },
  exerciseDefinitions: {
    all: (page?: number, size?: number, query?: string) =>
      page == null || size == null
        ? ["exercise-definitions", query ?? ""] as const
        : ["exercise-definitions", page, size, query ?? ""] as const,
    detail: (id: string) => ["exercise-definitions", id] as const,
    history: (id: string, limit?: number | null, fromDate?: string | null, toDate?: string | null) =>
      [
        "exercise-definitions",
        id,
        "history",
        limit ?? "",
        fromDate ?? "",
        toDate ?? "",
      ] as const,
  },
  progress: {
    cockpit: () => ["progress", "cockpit"] as const,
    catalog: (page?: number, size?: number) =>
      page == null || size == null ? ["progress", "catalog"] as const : ["progress", "catalog", page, size] as const,
    presets: (page?: number, size?: number) =>
      page == null || size == null ? ["progress", "presets"] as const : ["progress", "presets", page, size] as const,
    powerliftingSummary: () => ["progress", "powerlifting-summary"] as const,
  },
  insights: {
    summary: () => ["training-insights", "summary"] as const,
    overview: () => ["training-insights", "overview"] as const,
    dashboard: () => ["training-insights", "summary"] as const,
    liftSummary: (scope?: "overall" | "template", templateId?: string) =>
      scope == null ? ["training-insights", "lift-summary"] as const : ["training-insights", "lift-summary", scope, templateId ?? ""] as const,
    nextWorkout: () => ["training-insights", "next-workout"] as const,
    blockSummary: () => ["training-insights", "block-summary"] as const,
    prioritySignals: () => ["training-insights", "priority-signals"] as const,
    all: () => ["training-insights"] as const,
    signals: (page?: number, size?: number) =>
      page == null || size == null ? ["training-insights", "signals"] as const : ["training-insights", "signals", page, size] as const,
    dismissals: (page?: number, size?: number) =>
      page == null || size == null ? ["training-insights", "dismissals"] as const : ["training-insights", "dismissals", page, size] as const,
    autotune: (templateId: string, exerciseName: string, variant?: string, exerciseDefinitionId?: string) =>
      [
        "training-insights",
        "autotune",
        templateId,
        exerciseDefinitionId ?? "",
        exerciseName,
        variant ?? "",
      ] as const,
  },
  analysis: {
    all: () => ["analysis"] as const,
    recommendation: (templateId?: string, limit?: number, startDate?: string, endDate?: string) =>
      templateId == null
        ? ["analysis", "recommendation", limit ?? "", startDate ?? "", endDate ?? ""] as const
        : ["analysis", "recommendation", templateId, limit ?? "", startDate ?? "", endDate ?? ""] as const,
    forecast: (weekId: string) => ["analysis", "forecast", weekId] as const,
  },
  readiness: {
    history: (days: number, page?: number, size?: number) =>
      page == null || size == null
        ? ["readiness", "history", days] as const
        : ["readiness", "history", days, page, size] as const,
    latest: () => ["readiness", "latest"] as const,
  },
  heatmap: {
    all: () => ["muscle-heatmap"] as const,
    template: (id: string) => ["muscle-heatmap", "template", id] as const,
    entry: (id: string) => ["muscle-heatmap", "entry", id] as const,
    dashboardWeeklyVolume: () => ["muscle-heatmap", "dashboard", "weekly-volume"] as const,
  },
  workoutSettings: () => ["workout-settings"] as const,
  STALE: {
    navigation: 5 * 60 * 1000,
    dashboard: 2 * 60 * 1000,
  } as const,
} as const;
