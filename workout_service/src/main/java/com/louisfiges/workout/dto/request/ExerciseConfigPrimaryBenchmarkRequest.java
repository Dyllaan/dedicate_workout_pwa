package com.louisfiges.workout.dto.request;

import com.louisfiges.workout.analysis.types.PrimaryBenchmark;
import com.louisfiges.workout.dto.responses.interfaces.DTO;

public record ExerciseConfigPrimaryBenchmarkRequest(
        PrimaryBenchmark primaryBenchmark
) implements DTO {
}
