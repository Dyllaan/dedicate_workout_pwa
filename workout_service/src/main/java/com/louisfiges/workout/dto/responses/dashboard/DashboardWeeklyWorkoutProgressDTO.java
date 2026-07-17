package com.louisfiges.workout.dto.responses.dashboard;

public record DashboardWeeklyWorkoutProgressDTO(
        int completedThisWeek,
        int targetThisWeek,
        int remainingWorkouts,
        int daysRemaining
) {
}
