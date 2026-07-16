package com.louisfiges.workout.dto.responses.insights;

import com.louisfiges.workout.analysis.types.ProgressionStrategy;
import com.louisfiges.workout.periodisation.BlockType;

public record InsightBlockContextDTO(
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
) {}
