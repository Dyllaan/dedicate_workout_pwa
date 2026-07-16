package com.louisfiges.workout.dto.request;

import com.louisfiges.workout.dto.responses.interfaces.DTO;

import java.util.List;

public record ExerciseEntryRequest(
        java.util.UUID exerciseDefinitionId,
        String exerciseName,
        String variant,
        Integer goalSets,
        List<SetEntryRequest> sets,
        Long exerciseInfoId
) implements DTO {
    public ExerciseEntryRequest(String exerciseName, String variant, Integer goalSets, List<SetEntryRequest> sets) {
        this(null, exerciseName, variant, goalSets, sets, null);
    }
}
