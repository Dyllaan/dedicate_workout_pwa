package com.louisfiges.workout.dto.responses;

import com.louisfiges.workout.dto.responses.interfaces.DTO;

import java.util.List;
import java.util.UUID;

public record ExerciseDefinitionCollapseResponseDTO(
        UUID canonicalDefinitionId,
        List<UUID> sourceDefinitionIds,
        int movedExerciseConfigs,
        int movedExerciseEntries
) implements DTO {
}
