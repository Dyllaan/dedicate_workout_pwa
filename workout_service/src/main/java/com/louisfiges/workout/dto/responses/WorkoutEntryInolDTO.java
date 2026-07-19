package com.louisfiges.workout.dto.responses;

import java.util.List;

public record WorkoutEntryInolDTO(
        double total,
        List<WorkoutInolDTO> perExercise
) {}
