package com.louisfiges.workout.dto.request;

import java.util.UUID;

public record WorkoutFrequencyRequest(
        UUID workoutTemplateId,
        int sessionsPerWeek
) {
}
