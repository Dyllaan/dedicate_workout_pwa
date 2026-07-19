package com.louisfiges.workout.dto.request;


import com.louisfiges.workout.dto.request.insights.ReadinessCheckInRequestDTO;
import com.louisfiges.workout.dto.responses.interfaces.DTO;

import java.util.List;
import java.util.UUID;

public record WorkoutEntryRequest(
        UUID workoutTemplateId,
        List<ExerciseEntryRequest> exercises,
        String notes,
        ReadinessCheckInRequestDTO readiness,
        Boolean is1rmTest
) implements DTO {
    public WorkoutEntryRequest(UUID workoutTemplateId, List<ExerciseEntryRequest> exercises, String notes) {
        this(workoutTemplateId, exercises, notes, null, null);
    }
}
