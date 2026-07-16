package com.louisfiges.workout.dto.responses;

import com.louisfiges.workout.dto.responses.interfaces.DTO;
import com.louisfiges.workout.heatmap.MappingSource;
import com.louisfiges.workout.heatmap.MuscleGroupId;

import java.time.Instant;
import java.util.Set;
import java.util.UUID;

public record ExerciseDefinitionResolveMatchDTO(
        UUID id,
        String exerciseName,
        String variant,
        Long exerciseInfoId,
        MappingSource mappingSource,
        MuscleGroupId primaryMuscle,
        Set<MuscleGroupId> secondaryMuscles,
        Instant createdAt,
        Instant updatedAt,
        long sessionCount,
        Instant lastUsedAt
) implements DTO {
}
