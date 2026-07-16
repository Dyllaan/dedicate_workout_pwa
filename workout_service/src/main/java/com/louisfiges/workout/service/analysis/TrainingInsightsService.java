package com.louisfiges.workout.service.analysis;

import com.louisfiges.workout.analysis.ProgressionAnalyser;
import com.louisfiges.workout.dto.responses.insights.BlockSummaryDTO;
import com.louisfiges.workout.dto.responses.insights.NextWorkoutSignalDTO;
import com.louisfiges.workout.dto.responses.insights.PrioritySignalDTO;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class TrainingInsightsService {

    private final TrainingInsightHistoryAssembler historyAssembler;
    private final TrainingInsightSummarizer summarizer;
    private final ProgressionAnalyser progressionAnalyser;

    public TrainingInsightsService(
            TrainingInsightHistoryAssembler historyAssembler,
            TrainingInsightSummarizer summarizer,
            ProgressionAnalyser progressionAnalyser
    ) {
        this.historyAssembler = historyAssembler;
        this.summarizer = summarizer;
        this.progressionAnalyser = progressionAnalyser;
    }

    public NextWorkoutSignalDTO getNextWorkoutSignal(UUID userId) {
        TrainingInsightHistoryAssembler.TrainingInsightSnapshot snapshot = historyAssembler.assemble(userId);
        List<TrainingInsightSummarizer.AnalysedExerciseSignal> analysedSignals = analyse(snapshot);
        List<TrainingInsightSummarizer.AnalysedExerciseSignal> actionableSignals = filterActionableSignals(analysedSignals);

        return actionableSignals.stream()
                .max(summarizer.priorityComparator())
                .map(summarizer::toNextWorkoutSignal)
                .orElseGet(() -> summarizer.toEmptyNextWorkoutSignal(
                        snapshot.blockContextDto(),
                        snapshot.exerciseInputs().isEmpty()
                                ? "No active workout template available."
                                : "No usable exercise history available yet."
                ));
    }

    public BlockSummaryDTO getBlockSummary(UUID userId) {
        TrainingInsightHistoryAssembler.TrainingInsightSnapshot snapshot = historyAssembler.assemble(userId);
        List<TrainingInsightSummarizer.AnalysedExerciseSignal> analysedSignals = analyse(snapshot);
        return summarizer.toBlockSummary(snapshot.blockContextDto(), filterActionableSignals(analysedSignals));
    }

    public List<PrioritySignalDTO> getPrioritySignals(UUID userId) {
        List<TrainingInsightSummarizer.AnalysedExerciseSignal> analysedSignals = analyse(historyAssembler.assemble(userId));
        return summarizer.toPrioritySignals(filterActionableSignals(analysedSignals));
    }

    private List<TrainingInsightSummarizer.AnalysedExerciseSignal> analyse(
            TrainingInsightHistoryAssembler.TrainingInsightSnapshot snapshot
    ) {
        return snapshot.exerciseInputs().stream()
                .map(input -> summarizer.analyse(
                        input,
                        input.blockContext() == null
                                ? progressionAnalyser.analyse(input.history(), input.exerciseType())
                                : progressionAnalyser.analyse(input.history(), input.exerciseType(), input.blockContext())
                ))
                .toList();
    }

    private List<TrainingInsightSummarizer.AnalysedExerciseSignal> filterActionableSignals(
            List<TrainingInsightSummarizer.AnalysedExerciseSignal> analysedSignals
    ) {
        return analysedSignals.stream()
                .filter(signal -> signal.input().focus()
                        || (!signal.input().history().isEmpty()
                        && signal.suggestion().getType() != com.louisfiges.workout.analysis.types.SuggestionType.INSUFFICIENT_DATA))
                .toList();
    }
}
