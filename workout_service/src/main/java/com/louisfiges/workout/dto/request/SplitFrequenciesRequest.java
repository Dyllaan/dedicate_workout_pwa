package com.louisfiges.workout.dto.request;

import com.louisfiges.workout.dto.responses.interfaces.DTO;

import java.util.List;

public record SplitFrequenciesRequest(
    List<WorkoutFrequencyRequest> frequencies
) implements DTO {
}
