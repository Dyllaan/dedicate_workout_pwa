package com.louisfiges.workout.dto.responses;

import java.util.UUID;

public record WorkoutInolDTO(
        UUID id,
        String exerciseName,
        double inolScore,
        double reference1RmKg,
        boolean carryForward,
        boolean backfilled
) {}
