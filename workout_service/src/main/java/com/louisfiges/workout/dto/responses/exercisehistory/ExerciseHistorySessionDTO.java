package com.louisfiges.workout.dto.responses.exercisehistory;

import com.louisfiges.workout.dto.responses.interfaces.DTO;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ExerciseHistorySessionDTO(
        int sessionOrder,
        Instant performedAt,
        UUID workoutEntryId,
        UUID workoutTemplateId,
        ExerciseHistoryBlockContextDTO blockContext,
        List<ExerciseHistorySetDTO> sets
) implements DTO {
}
