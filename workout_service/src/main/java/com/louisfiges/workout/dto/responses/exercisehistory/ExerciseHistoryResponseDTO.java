package com.louisfiges.workout.dto.responses.exercisehistory;

import com.louisfiges.workout.dto.responses.interfaces.DTO;

import java.util.List;
import java.util.UUID;

public record ExerciseHistoryResponseDTO(
        UUID exerciseDefinitionId,
        String exerciseName,
        List<ExerciseHistoryGroupDTO> historyGroups
) implements DTO {
}
