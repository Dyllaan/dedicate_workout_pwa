package com.louisfiges.workout.dto;

import com.louisfiges.workout.analysis.types.PrimaryBenchmark;
import com.louisfiges.workout.analysis.types.ProgressionMode;
import com.louisfiges.workout.dto.responses.ExerciseDefinitionDTO;
import java.util.UUID;
import com.louisfiges.workout.dto.responses.interfaces.DTO;



public record ExerciseConfigDTO(
    UUID exerciseConfigId,
    ExerciseDefinitionDTO exerciseDefinition,
    int goalSets,
    Integer goalReps,
    ProgressionMode progressionMode,
    PrimaryBenchmark primaryBenchmark,
    Integer targetRestSeconds,
    Boolean focus
) implements DTO {}
