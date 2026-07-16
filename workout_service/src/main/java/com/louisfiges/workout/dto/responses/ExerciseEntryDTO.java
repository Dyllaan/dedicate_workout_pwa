package com.louisfiges.workout.dto.responses;

import com.louisfiges.workout.dto.responses.interfaces.DTO;

import java.util.List;
import java.util.UUID;

public record ExerciseEntryDTO(
        Integer goalSets,
        List<SetEntryDTO> sets,
        String loggedExerciseName,
        String loggedVariant,
        UUID exerciseDefinitionId
) implements DTO {
    public ExerciseEntryDTO(Integer goalSets, List<SetEntryDTO> sets, String loggedExerciseName, String loggedVariant) {
        this(goalSets, sets, loggedExerciseName, loggedVariant, null);
    }
}
