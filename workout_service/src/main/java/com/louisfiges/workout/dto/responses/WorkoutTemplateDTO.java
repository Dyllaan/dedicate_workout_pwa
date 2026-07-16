package com.louisfiges.workout.dto.responses;

import com.louisfiges.workout.dto.ExerciseConfigDTO;
import com.louisfiges.workout.dto.responses.interfaces.DTO;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record WorkoutTemplateDTO(
        UUID id,
        String name,
        String category,
        List<ExerciseConfigDTO> exercises,
        LocalDateTime createdAt
) implements DTO {}