package com.louisfiges.workout.analysis.types;

import com.louisfiges.workout.periodisation.BlockType;

public record BlockContext(
        BlockType blockType,
        ProgressionStrategy progressionStrategy,
        int currentWeek,
        int totalWeeks,
        boolean isDeloadWeek,
        double targetRpeMin,
        double targetRpeMax,
        int repRangeMin,
        int repRangeMax,
        int targetSetsThisWeek
) {}