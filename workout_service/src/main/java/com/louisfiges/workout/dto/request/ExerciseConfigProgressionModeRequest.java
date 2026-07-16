package com.louisfiges.workout.dto.request;

import com.louisfiges.workout.analysis.types.ProgressionMode;
import com.louisfiges.workout.dto.responses.interfaces.DTO;

public record ExerciseConfigProgressionModeRequest(
        ProgressionMode progressionMode
) implements DTO {
}
