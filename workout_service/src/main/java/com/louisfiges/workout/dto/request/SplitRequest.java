package com.louisfiges.workout.dto.request;

import com.louisfiges.workout.dto.responses.interfaces.DTO;

import java.util.List;

public record SplitRequest(
        String name,
        List<WorkoutFrequencyRequest> workoutFrequencies
) implements DTO {}
