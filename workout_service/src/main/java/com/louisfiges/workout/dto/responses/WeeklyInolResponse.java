package com.louisfiges.workout.dto.responses;

import java.time.Instant;
import java.util.List;

public record WeeklyInolResponse(
        double totalInol,
        Instant weekStart,
        String zone,
        List<PerExerciseInol> perExercise
) {
    public record PerExerciseInol(String exerciseName, double totalInol) {}
}
