package com.louisfiges.workout.dto.responses.dashboard;

public record DashboardSummaryDTO(
        int workoutTemplateCount,
        int splitCount,
        DashboardActiveSplitDTO activeSplit,
        DashboardNextWorkoutDTO nextWorkout,
        DashboardTopLiftDTO topLift,
        boolean hasLoggedWorkout,
        boolean hasCreatedProgramme,
        int lifetimeWorkoutCount,
        Integer daysSinceLastWorkout,
        DashboardWeeklyWorkoutProgressDTO weeklyProgress
) {
}
