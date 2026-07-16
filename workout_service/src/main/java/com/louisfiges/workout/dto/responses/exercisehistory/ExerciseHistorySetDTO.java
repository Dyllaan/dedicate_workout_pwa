package com.louisfiges.workout.dto.responses.exercisehistory;

import com.louisfiges.workout.analysis.SetRole;
import com.louisfiges.workout.dto.responses.interfaces.DTO;

public record ExerciseHistorySetDTO(
        int setOrder,
        int reps,
        Double weight,
        Double rpe,
        String notes,
        SetRole setRole
) implements DTO {
}
