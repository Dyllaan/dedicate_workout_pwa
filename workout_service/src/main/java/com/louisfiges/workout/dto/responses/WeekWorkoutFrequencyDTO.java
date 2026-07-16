package com.louisfiges.workout.dto.responses;

import java.util.UUID;

public record WeekWorkoutFrequencyDTO(
        UUID workoutTemplateId,
        String workoutTemplateName,
        int sessionsPerWeek
) {
}
