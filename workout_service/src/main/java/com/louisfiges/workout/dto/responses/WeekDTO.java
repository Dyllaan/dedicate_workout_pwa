package com.louisfiges.workout.dto.responses;

import com.louisfiges.workout.dto.responses.interfaces.DTO;

import java.util.UUID;

public record WeekDTO(
        UUID id,
        int weekNumber,
        boolean isDeload,
        int targetSetsPerExercise,
        Double rpeOverrideMin,
        Double rpeOverrideMax
) implements DTO {}
