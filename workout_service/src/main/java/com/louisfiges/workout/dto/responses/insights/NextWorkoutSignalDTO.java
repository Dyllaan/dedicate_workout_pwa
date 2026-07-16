package com.louisfiges.workout.dto.responses.insights;

import com.louisfiges.workout.analysis.types.ExerciseType;
import com.louisfiges.workout.analysis.types.PrimaryBenchmark;
import com.louisfiges.workout.analysis.types.ProgressionMode;
import com.louisfiges.workout.analysis.types.SuggestionType;
import com.louisfiges.workout.analysis.types.TrainingState;
import com.louisfiges.workout.analysis.types.ProgressionStrategy;

import java.util.UUID;

public record NextWorkoutSignalDTO(
        UUID workoutTemplateId,
        String workoutTemplateName,
        UUID exerciseDefinitionId,
        String exerciseName,
        String variant,
        ExerciseType exerciseType,
        ProgressionMode progressionMode,
        PrimaryBenchmark primaryBenchmark,
        ProgressionStrategy progressionStrategy,
        TrainingState trainingState,
        SuggestionType suggestionType,
        Double suggestedWeightKg,
        String reasoning,
        InsightBlockContextDTO blockContext
) {
    public NextWorkoutSignalDTO(
            UUID workoutTemplateId,
            String workoutTemplateName,
            String exerciseName,
            String variant,
            ExerciseType exerciseType,
            ProgressionMode progressionMode,
            PrimaryBenchmark primaryBenchmark,
            ProgressionStrategy progressionStrategy,
            TrainingState trainingState,
            SuggestionType suggestionType,
            Double suggestedWeightKg,
            String reasoning,
            InsightBlockContextDTO blockContext
    ) {
        this(
                workoutTemplateId,
                workoutTemplateName,
                null,
                exerciseName,
                variant,
                exerciseType,
                progressionMode,
                primaryBenchmark,
                progressionStrategy,
                trainingState,
                suggestionType,
                suggestedWeightKg,
                reasoning,
                blockContext
        );
    }
}
