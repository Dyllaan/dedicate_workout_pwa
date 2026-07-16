package com.louisfiges.workout.dto.responses;

import java.util.UUID;

import com.louisfiges.workout.dto.responses.interfaces.DTO;

public record SplitWorkoutAssignmentDTO(
    UUID id,
    UUID workoutTemplateId,
    int sessionsPerWeek,
    int workoutOrder
) implements DTO {
}
