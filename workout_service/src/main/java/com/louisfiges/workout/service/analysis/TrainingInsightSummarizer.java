package com.louisfiges.workout.service.analysis;

import com.louisfiges.workout.analysis.types.ExerciseSession;
import com.louisfiges.workout.analysis.types.PrimaryBenchmark;
import com.louisfiges.workout.analysis.types.ProgressionMode;
import com.louisfiges.workout.analysis.types.ProgressionSuggestion;
import com.louisfiges.workout.analysis.types.SuggestionType;
import com.louisfiges.workout.analysis.types.TrainingState;
import com.louisfiges.workout.dto.responses.insights.BlockSummaryDTO;
import com.louisfiges.workout.dto.responses.insights.InsightBlockContextDTO;
import com.louisfiges.workout.dto.responses.insights.NextWorkoutSignalDTO;
import com.louisfiges.workout.dto.responses.insights.PrioritySignalDTO;
import com.louisfiges.workout.analysis.types.ExerciseType;
import com.louisfiges.workout.analysis.types.ProgressionStrategy;
import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.List;
import java.util.Locale;

@Component
final class TrainingInsightSummarizer {

    AnalysedExerciseSignal analyse(
            TrainingInsightHistoryAssembler.ExerciseInsightInput input,
            ProgressionSuggestion suggestion
    ) {
        boolean plateauRisk = isPlateauRisk(input, suggestion);
        TrainingState trainingState = resolveTrainingState(input, suggestion, plateauRisk);
        return new AnalysedExerciseSignal(input, suggestion, trainingState, plateauRisk);
    }

    Comparator<AnalysedExerciseSignal> priorityComparator() {
        return Comparator
                .comparingInt((AnalysedExerciseSignal signal) -> signal.input().focus() ? 1 : 0)
                .thenComparingInt(this::severity)
                .thenComparing(signal -> signal.input().exerciseName(), String.CASE_INSENSITIVE_ORDER)
                .thenComparing(signal -> signal.input().variant() == null ? "" : signal.input().variant(), String.CASE_INSENSITIVE_ORDER);
    }

    List<PrioritySignalDTO> toPrioritySignals(List<AnalysedExerciseSignal> signals) {
        List<AnalysedExerciseSignal> sorted = signals.stream()
                .sorted(priorityComparator().reversed())
                .toList();

        return java.util.stream.IntStream.range(0, sorted.size())
                .mapToObj(index -> toPrioritySignal(sorted.get(index), index + 1))
                .toList();
    }

    PrioritySignalDTO toPrioritySignal(AnalysedExerciseSignal signal, int rank) {
        TrainingInsightHistoryAssembler.ExerciseInsightInput input = signal.input();
        return new PrioritySignalDTO(
                rank,
                input.exerciseDefinitionId(),
                input.exerciseName(),
                input.variant(),
                input.exerciseType(),
                input.progressionMode(),
                input.primaryBenchmark(),
                signal.trainingState(),
                signal.suggestion().getType(),
                signal.suggestion().getSuggestedWeightKg(),
                signal.suggestion().getReasoning()
        );
    }

    NextWorkoutSignalDTO toNextWorkoutSignal(AnalysedExerciseSignal signal) {
        TrainingInsightHistoryAssembler.ExerciseInsightInput input = signal.input();
        return new NextWorkoutSignalDTO(
                input.workoutTemplateId(),
                input.workoutTemplateName(),
                input.exerciseDefinitionId(),
                input.exerciseName(),
                input.variant(),
                input.exerciseType(),
                input.progressionMode(),
                input.primaryBenchmark(),
                input.blockContext() == null ? ProgressionStrategy.WEIGHT_FIRST : input.blockContext().progressionStrategy(),
                signal.trainingState(),
                signal.suggestion().getType(),
                signal.suggestion().getSuggestedWeightKg(),
                signal.suggestion().getReasoning(),
                input.blockContextDto()
        );
    }

    NextWorkoutSignalDTO toEmptyNextWorkoutSignal(InsightBlockContextDTO blockContext, String reasoning) {
        return new NextWorkoutSignalDTO(
                null,
                null,
                null,
                null,
                null,
                ProgressionMode.WEIGHT_FIRST,
                PrimaryBenchmark.WORKING_SETS,
                ProgressionStrategy.WEIGHT_FIRST,
                TrainingState.UNDEREXPOSED,
                SuggestionType.INSUFFICIENT_DATA,
                0.0,
                reasoning,
                blockContext
        );
    }

    BlockSummaryDTO toBlockSummary(
            InsightBlockContextDTO blockContext,
            List<AnalysedExerciseSignal> signals
    ) {
        if (signals.isEmpty()) {
            return new BlockSummaryDTO(
                    blockContext,
                    TrainingState.UNDEREXPOSED,
                    blockContext == null ? "No active block" : "Underexposed: build more signal before judging progress",
                    blockContext == null ? "Create or activate a programme first." : "Not enough recent work to judge progress.",
                    0,
                    0,
                    0,
                    0
            );
        }

        long plateauCount = signals.stream().filter(signal -> signal.trainingState() == TrainingState.TRUE_PLATEAU).count();
        long attentionCount = signals.stream().filter(signal ->
                signal.trainingState() == TrainingState.TRUE_PLATEAU
                        || signal.trainingState() == TrainingState.FATIGUE_LIMITED
                        || signal.trainingState() == TrainingState.LOAD_TOO_AGGRESSIVE
        ).count();
        long positiveCount = signals.stream().filter(signal -> signal.trainingState() == TrainingState.IMPROVING).count();
        long underexposedCount = signals.stream().filter(signal -> signal.trainingState() == TrainingState.UNDEREXPOSED).count();

        AnalysedExerciseSignal top = signals.stream()
                .max(priorityComparator())
                .orElse(signals.get(0));

        TrainingState overallState;
        String headline;
        String focus;

        if (plateauCount > 0) {
            overallState = TrainingState.TRUE_PLATEAU;
            headline = "Plateau risk: " + top.input().exerciseName().toLowerCase(Locale.ROOT) + " needs review";
            focus = "Progress looks capped.";
        } else if (attentionCount > 0) {
            overallState = TrainingState.FATIGUE_LIMITED;
            headline = "Fatigue risk: " + top.input().exerciseName().toLowerCase(Locale.ROOT) + " needs review";
            focus = "Protect recovery before adding more load.";
        } else if (underexposedCount > 0 && positiveCount == 0) {
            overallState = TrainingState.UNDEREXPOSED;
            headline = "Underexposed: build more signal before judging progress";
            focus = "Keep gathering consistent exposures.";
        } else {
            overallState = TrainingState.IMPROVING;
            headline = "On track: progress is still moving";
            focus = "Keep the current block moving.";
        }

        return new BlockSummaryDTO(
                blockContext,
                overallState,
                headline,
                focus,
                (int) plateauCount,
                (int) attentionCount,
                (int) positiveCount,
                (int) underexposedCount
        );
    }

    private boolean isPlateauRisk(
            TrainingInsightHistoryAssembler.ExerciseInsightInput input,
            ProgressionSuggestion suggestion
    ) {
        if (input.blockContext() == null || input.history().size() < 3) {
            return false;
        }
        if (suggestion.getType() != SuggestionType.MAINTAIN) {
            return false;
        }

        ExerciseSession latest = input.history().get(0);
        if (!latest.isAllSetsSuccessful() || !latest.hasRpeData()) {
            return false;
        }

        double latestWeight = latest.getWeightKg();
        long stableSessions = input.history().stream()
                .limit(3)
                .filter(session -> Math.abs(session.getWeightKg() - latestWeight) < 0.01)
                .count();

        return stableSessions >= 3 && latest.getAverageRpe() >= input.blockContext().targetRpeMax();
    }

    private TrainingState resolveTrainingState(
            TrainingInsightHistoryAssembler.ExerciseInsightInput input,
            ProgressionSuggestion suggestion,
            boolean plateauRisk
    ) {
        if (input.history().isEmpty() || suggestion.getType() == SuggestionType.INSUFFICIENT_DATA) {
            return TrainingState.UNDEREXPOSED;
        }
        if (input.blockContext() != null && input.blockContext().isDeloadWeek()) {
            return TrainingState.TAPERING;
        }
        if (plateauRisk || suggestion.getType() == SuggestionType.PLATEAU) {
            return TrainingState.TRUE_PLATEAU;
        }
        if (suggestion.getType() == SuggestionType.DELOAD) {
            return TrainingState.FATIGUE_LIMITED;
        }
        if (suggestion.getType() == SuggestionType.INCREASE) {
            return TrainingState.IMPROVING;
        }

        ExerciseSession latest = input.history().get(0);
        return latest.isAllSetsSuccessful() ? TrainingState.IMPROVING : TrainingState.LOAD_TOO_AGGRESSIVE;
    }

    private int severity(AnalysedExerciseSignal signal) {
        return switch (signal.trainingState()) {
            case TRUE_PLATEAU -> 5;
            case FATIGUE_LIMITED, LOAD_TOO_AGGRESSIVE -> 4;
            case UNDEREXPOSED -> 3;
            case TAPERING -> 2;
            case IMPROVING -> 1;
        };
    }

    record AnalysedExerciseSignal(
            TrainingInsightHistoryAssembler.ExerciseInsightInput input,
            ProgressionSuggestion suggestion,
            TrainingState trainingState,
            boolean plateauRisk
    ) {
    }
}
