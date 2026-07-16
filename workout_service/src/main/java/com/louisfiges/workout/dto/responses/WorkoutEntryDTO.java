package com.louisfiges.workout.dto.responses;

import com.louisfiges.workout.dto.responses.interfaces.DTO;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record WorkoutEntryDTO(
        UUID id,
        WorkoutTemplateDTO template,
        List<ExerciseEntryDTO> exercises,
        String notes,
        LocalDateTime createdAt
) implements DTO {}