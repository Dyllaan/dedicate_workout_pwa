package com.louisfiges.workout.dto.responses;

import com.louisfiges.workout.dto.responses.interfaces.DTO;

import java.util.List;
import java.util.UUID;

public record ExerciseDefinitionResolveResponseDTO(
        String status,
        List<ExerciseDefinitionResolveMatchDTO> matches,
        UUID suggestedDefinitionId
) implements DTO {
}
