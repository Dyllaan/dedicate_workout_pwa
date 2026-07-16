package com.louisfiges.workout.dto.responses;

import java.util.UUID;

public record SplitWorkoutFrequencyDTO(
        UUID workoutTemplateId,
        String workoutTemplateName,
        int sessionsPerWeek
) {
}
