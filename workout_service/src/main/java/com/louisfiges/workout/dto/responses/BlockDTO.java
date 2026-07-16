package com.louisfiges.workout.dto.responses;

import com.louisfiges.workout.analysis.types.ProgressionStrategy;
import com.louisfiges.workout.periodisation.BlockType;
import com.louisfiges.workout.dto.responses.interfaces.DTO;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record BlockDTO(
        UUID id,
        String name,
        BlockType blockType,
        ProgressionStrategy progressionStrategy,
        int durationWeeks,
        double targetRpeMin,
        double targetRpeMax,
        int repRangeMin,
        int repRangeMax,
        int blockOrder,
        Instant startDate,
        List<WeekDTO> weeks
) implements DTO {}