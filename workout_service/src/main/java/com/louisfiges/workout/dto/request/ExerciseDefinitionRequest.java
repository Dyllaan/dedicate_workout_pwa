package com.louisfiges.workout.dto.request;

import com.louisfiges.workout.dto.responses.interfaces.DTO;
import com.louisfiges.workout.heatmap.MappingSource;
import com.louisfiges.workout.heatmap.MuscleGroupId;

import java.util.List;
import java.util.UUID;

public record ExerciseDefinitionRequest(
        UUID id,
        String exerciseName,
        String variant,
        Long exerciseInfoId,
        MappingSource mappingSource,
        MuscleGroupId primaryMuscle,
        List<MuscleGroupId> secondaryMuscles
) implements DTO {
}

