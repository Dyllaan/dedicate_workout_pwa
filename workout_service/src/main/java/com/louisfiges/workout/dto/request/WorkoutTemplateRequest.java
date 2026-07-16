package com.louisfiges.workout.dto.request;

import com.louisfiges.workout.dto.responses.interfaces.DTO;

import java.util.List;

public record WorkoutTemplateRequest(
        String name,
        String category,
        List<ExerciseConfigRequest> exercises
) implements DTO {}