package com.louisfiges.workout.dto.responses.insights;

import com.louisfiges.workout.analysis.types.ExerciseType;
import com.louisfiges.workout.analysis.types.PrimaryBenchmark;
import com.louisfiges.workout.analysis.types.ProgressionMode;
import com.louisfiges.workout.analysis.types.SuggestionType;
import com.louisfiges.workout.analysis.types.TrainingState;

import java.util.UUID;

public record PrioritySignalDTO(
        int rank,
        UUID exerciseDefinitionId,
        String exerciseName,
        String variant,
        ExerciseType exerciseType,
        ProgressionMode progressionMode,
        PrimaryBenchmark primaryBenchmark,
        TrainingState trainingState,
        SuggestionType suggestionType,
        Double suggestedWeightKg,
        String reasoning
) {
    public PrioritySignalDTO(
            int rank,
            String exerciseName,
            String variant,
            ExerciseType exerciseType,
            ProgressionMode progressionMode,
            PrimaryBenchmark primaryBenchmark,
            TrainingState trainingState,
            SuggestionType suggestionType,
            Double suggestedWeightKg,
            String reasoning
    ) {
        this(
                rank,
                null,
                exerciseName,
                variant,
                exerciseType,
                progressionMode,
                primaryBenchmark,
                trainingState,
                suggestionType,
                suggestedWeightKg,
                reasoning
        );
    }
}
