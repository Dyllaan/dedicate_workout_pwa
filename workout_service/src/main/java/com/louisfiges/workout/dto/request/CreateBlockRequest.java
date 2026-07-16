package com.louisfiges.workout.dto.request;

import com.louisfiges.workout.analysis.types.ProgressionStrategy;
import com.louisfiges.workout.periodisation.BlockType;

import java.time.Instant;

public record CreateBlockRequest(
        String name,
        BlockType blockType,
        ProgressionStrategy progressionStrategy,
        int durationWeeks,
        double targetRpeMin,
        double targetRpeMax,
        int repRangeMin,
        int repRangeMax,
        int blockOrder,
        Instant startDate
) {}