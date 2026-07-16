package com.louisfiges.workout.dto.responses;

import java.time.Instant;
import java.util.UUID;

public record SetEntryWithDateDTO(
        UUID id,
        int reps,
        Double weight,
        Double rpe,
        String notes,
        Integer restBeforeSeconds,
        Instant workoutDate
) {}
