package com.louisfiges.workout.dto.responses.exercisehistory;

import com.louisfiges.workout.analysis.types.ProgressionStrategy;
import com.louisfiges.workout.dto.responses.interfaces.DTO;
import com.louisfiges.workout.periodisation.BlockType;

import java.util.UUID;

public record ExerciseHistoryBlockContextDTO(
        UUID blockId,
        String blockName,
        BlockType blockType,
        ProgressionStrategy progressionStrategy,
        int currentWeek,
        int totalWeeks,
        boolean deload,
        double targetRpeMin,
        double targetRpeMax,
        int repRangeMin,
        int repRangeMax
) implements DTO {
}
