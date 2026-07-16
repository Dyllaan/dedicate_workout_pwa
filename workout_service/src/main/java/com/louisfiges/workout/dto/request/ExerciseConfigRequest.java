package com.louisfiges.workout.dto.request;

import com.louisfiges.workout.analysis.types.PrimaryBenchmark;
import com.louisfiges.workout.analysis.types.ProgressionMode;
import com.louisfiges.workout.dto.responses.interfaces.DTO;

public record ExerciseConfigRequest(
        java.util.UUID exerciseConfigId,
        java.util.UUID exerciseDefinitionId,
        String exerciseName,
        int goalSets,
        String variant,
        Integer goalReps,
        Long exerciseInfoId,
        ProgressionMode progressionMode,
        PrimaryBenchmark primaryBenchmark,
        Integer targetRestSeconds,
        Boolean focus
) implements DTO {
    public ExerciseConfigRequest(
            java.util.UUID exerciseConfigId,
            java.util.UUID exerciseDefinitionId,
            String exerciseName,
            int goalSets,
            String variant,
            Integer goalReps,
            Long exerciseInfoId,
            Integer targetRestSeconds,
            Boolean focus
    ) {
        this(
                exerciseConfigId,
                exerciseDefinitionId,
                exerciseName,
                goalSets,
                variant,
                goalReps,
                exerciseInfoId,
                null,
                null,
                targetRestSeconds,
                focus
        );
    }

    public ExerciseConfigRequest(
            String exerciseName,
            int goalSets,
            String variant,
            Integer goalReps
    ) {
        this(
                null,
                null,
                exerciseName,
                goalSets,
                variant,
                goalReps,
                null,
                null,
                null,
                null,
                null
        );
    }
}
