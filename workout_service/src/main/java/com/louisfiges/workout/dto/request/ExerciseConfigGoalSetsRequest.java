package com.louisfiges.workout.dto.request;

import com.louisfiges.workout.dto.responses.interfaces.DTO;

public record ExerciseConfigGoalSetsRequest(
        Integer goalSets
) implements DTO {
}
