package com.louisfiges.workout.service.analysis;

import com.louisfiges.workout.analysis.RpePercentageLookup;
import com.louisfiges.workout.analysis.StrengthCalculator;
import com.louisfiges.workout.dto.responses.StrengthEstimate;
import com.louisfiges.workout.dao.periodisation.Block;
import com.louisfiges.workout.dao.periodisation.Programme;
import com.louisfiges.workout.dao.periodisation.Week;
import com.louisfiges.workout.dao.workout.ExerciseConfig;
import com.louisfiges.workout.dao.workout.SetEntry;
import com.louisfiges.workout.dto.responses.ForecastResponse;
import com.louisfiges.workout.dto.responses.ForecastSource;
import com.louisfiges.workout.repository.WorkoutEntryRepository;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class ForecastEngine {

    private final WorkoutEntryRepository workoutEntryRepository;
    private final StrengthCalculator strengthCalculator;

    public ForecastEngine(WorkoutEntryRepository workoutEntryRepository, StrengthCalculator strengthCalculator) {
        this.workoutEntryRepository = workoutEntryRepository;
        this.strengthCalculator = strengthCalculator;
    }

    public ForecastResponse generateForecast(Week week, UUID userId) {
        Block block = week.getBlock();
        if (block == null || block.getProgramme() == null) {
            return emptyResponse(week, 0.0);
        }

        double intensityPct = deriveIntensityPct(block, week);
        List<ForecastResponse.ForecastInsight> insights = buildInsights(block, week, intensityPct, userId);

        return new ForecastResponse(
                week.getId(),
                block.getId(),
                block.getName(),
                week.getWeekNumber(),
                week.isDeload(),
                intensityPct,
                insights
        );
    }

    double deriveIntensityPct(Block block, Week week) {
        int durationWeeks = block.getDurationWeeks();
        if (durationWeeks <= 0) return 0.0;

        double t = durationWeeks == 1 ? 0.0
                : Math.max(0.0, (week.getWeekNumber() - 1.0) / (durationWeeks - 1.0));

        double rpeMin = week.getRpeOverrideMin() != null ? week.getRpeOverrideMin() : block.getTargetRpeMin();
        double rpeMax = week.getRpeOverrideMax() != null ? week.getRpeOverrideMax() : block.getTargetRpeMax();

        int repMin = block.getRepRangeMin();
        int repMax = block.getRepRangeMax();

        if (week.isDeload()) {
            int reps = repMin;
            double rpe = Math.min(rpeMin, 6.0);
            double raw = RpePercentageLookup.getIntensityPct(reps, rpe);
            return Math.round(raw * 2.0) / 2.0;
        }

        int reps = (int) Math.round(repMax - t * (repMax - repMin));
        double rpe = rpeMin + t * (rpeMax - rpeMin);
        rpe = Math.round(rpe * 10.0) / 10.0;

        double raw = RpePercentageLookup.getIntensityPct(reps, rpe);
        return Math.round(raw * 2.0) / 2.0;
    }

    private List<ForecastResponse.ForecastInsight> buildInsights(Block block, Week week, double intensityPct, UUID userId) {
        List<ExerciseConfig> focusExercises = getFocusExercises(block);
        if (focusExercises.isEmpty()) return Collections.emptyList();

        BlockDateRange currentBlockRange = resolveEffectiveDateRange(block, week);
        if (currentBlockRange == null) return focusExercises.stream()
                .map(ec -> noDataInsight(ec, intensityPct, week))
                .collect(Collectors.toList());

        return focusExercises.stream()
                .map(ec -> buildInsight(ec, intensityPct, block, week, currentBlockRange, userId))
                .collect(Collectors.toList());
    }

    private ForecastResponse.ForecastInsight buildInsight(
            ExerciseConfig ec, double intensityPct, Block block, Week week,
            BlockDateRange currentRange, UUID userId) {
        UUID exerciseDefId = ec.getExerciseDefinition().getId();

        OneRmResult result = estimateOneRm(exerciseDefId, userId, currentRange.start, currentRange.end);

        if (result != null) {
            int targetReps = deriveTargetReps(block, week);
            double targetRpe = deriveTargetRpe(block, week);
            double estimated1Rm = roundToPlate(median(result.epley(), result.bryzycki(), result.lombardi()));
            double targetWeight = roundToPlate(estimated1Rm * intensityPct / 100.0);

            ForecastResponse.BestSetInfo bestSet = new ForecastResponse.BestSetInfo(
                    result.bestSet().getReps(),
                    result.bestSet().getWeight() != null ? result.bestSet().getWeight() : 0.0,
                    result.setDate().toString()
            );

            return new ForecastResponse.ForecastInsight(
                    exerciseDefId,
                    ec.getExerciseDefinition().getExerciseName(),
                    estimated1Rm,
                    targetWeight,
                    targetReps,
                    Math.round(targetRpe * 10.0) / 10.0,
                    ForecastSource.CURRENT_BLOCK,
                    bestSet
            );
        }

        Block previousBlock = findPreviousBlock(block);
        if (previousBlock != null) {
            BlockDateRange prevRange = resolveEffectiveDateRange(previousBlock, null);
            if (prevRange != null) {
                OneRmResult prevResult = estimateOneRm(exerciseDefId, userId, prevRange.start, prevRange.end);
                if (prevResult != null) {
                    int targetReps = deriveTargetReps(block, week);
                    double targetRpe = deriveTargetRpe(block, week);
                    double estimated1Rm = roundToPlate(median(prevResult.epley(), prevResult.bryzycki(), prevResult.lombardi()));
                    double targetWeight = roundToPlate(estimated1Rm * intensityPct / 100.0);

                    ForecastResponse.BestSetInfo bestSet = new ForecastResponse.BestSetInfo(
                            prevResult.bestSet().getReps(),
                            prevResult.bestSet().getWeight() != null ? prevResult.bestSet().getWeight() : 0.0,
                            prevResult.setDate().toString()
                    );

                    return new ForecastResponse.ForecastInsight(
                            exerciseDefId,
                            ec.getExerciseDefinition().getExerciseName(),
                            estimated1Rm,
                            targetWeight,
                            targetReps,
                            Math.round(targetRpe * 10.0) / 10.0,
                            ForecastSource.PREVIOUS_BLOCK,
                            bestSet
                    );
                }
            }
        }

        return noDataInsight(ec, intensityPct, week);
    }

    private ForecastResponse.ForecastInsight noDataInsight(ExerciseConfig ec, double intensityPct, Week week) {
        Block block = week.getBlock();
        int targetReps = block != null ? deriveTargetReps(block, week) : 5;
        double targetRpe = block != null ? deriveTargetRpe(block, week) : 7.0;

        return new ForecastResponse.ForecastInsight(
                ec.getExerciseDefinition().getId(),
                ec.getExerciseDefinition().getExerciseName(),
                null,
                null,
                targetReps,
                Math.round(targetRpe * 10.0) / 10.0,
                ForecastSource.NO_DATA,
                null
        );
    }

    OneRmResult estimateOneRm(UUID exerciseDefId, UUID userId, Instant blockStart, Instant blockEnd) {
        List<Object[]> rows = workoutEntryRepository.findBestSetsForExerciseInBlock(
                exerciseDefId, userId, blockStart, blockEnd, PageRequest.of(0, 5)
        );

        if (rows.isEmpty()) return null;

        OneRmResult best = null;
        double bestMedian = 0;

        for (Object[] row : rows) {
            SetEntry set = (SetEntry) row[0];
            Instant setDate = (Instant) row[1];
            if (set.getWeight() == null) continue;

            StrengthEstimate estimate = strengthCalculator.estimateOneRepMax(set.getWeight(), set.getReps());
            double median = median(estimate.epley(), estimate.bryzycki(), estimate.lombardi());

            if (median > bestMedian) {
                bestMedian = median;
                best = new OneRmResult(estimate.epley(), estimate.bryzycki(), estimate.lombardi(), set, setDate);
            }
        }

        return best;
    }

    private double median(double a, double b, double c) {
        return Math.max(Math.min(a, b), Math.min(Math.max(a, b), c));
    }

    private double roundToPlate(double value) {
        return Math.round(value / 2.5) * 2.5;
    }

    int deriveTargetReps(Block block, Week week) {
        int durationWeeks = block.getDurationWeeks();
        double t = durationWeeks <= 1 ? 0.0
                : Math.max(0.0, (week.getWeekNumber() - 1.0) / (durationWeeks - 1.0));

        if (week.isDeload()) return block.getRepRangeMin();
        return (int) Math.round(block.getRepRangeMax() - t * (block.getRepRangeMax() - block.getRepRangeMin()));
    }

    double deriveTargetRpe(Block block, Week week) {
        int durationWeeks = block.getDurationWeeks();
        double t = durationWeeks <= 1 ? 0.0
                : Math.max(0.0, (week.getWeekNumber() - 1.0) / (durationWeeks - 1.0));

        double rpeMin = week.getRpeOverrideMin() != null ? week.getRpeOverrideMin() : block.getTargetRpeMin();
        double rpeMax = week.getRpeOverrideMax() != null ? week.getRpeOverrideMax() : block.getTargetRpeMax();

        if (week.isDeload()) return Math.min(rpeMin, 6.0);
        return rpeMin + t * (rpeMax - rpeMin);
    }

    private List<ExerciseConfig> getFocusExercises(Block block) {
        return block.getProgramme().getSplit().getAssignments().stream()
                .map(a -> a.getWorkoutTemplate())
                .flatMap(t -> t.getExercises().stream())
                .filter(ec -> Boolean.TRUE.equals(ec.getFocus()))
                .collect(Collectors.toList());
    }

    private BlockDateRange resolveEffectiveDateRange(Block block, Week week) {
        if (block == null) return null;

        Instant start = block.getStartDate();
        if (start == null) {
            Programme programme = block.getProgramme();
            if (programme == null || programme.getStartDate() == null) return null;
            start = computeBlockStartFromProgramme(programme, block);
            if (start == null) return null;
        }

        Instant end = start.plusSeconds((long) block.getDurationWeeks() * 7 * 24 * 3600);
        return new BlockDateRange(start, end);
    }

    private Instant computeBlockStartFromProgramme(Programme programme, Block targetBlock) {
        Instant programmeStart = programme.getStartDate();
        if (programmeStart == null) return null;

        List<Block> sorted = programme.getBlocks().stream()
                .sorted(Comparator.comparingInt(Block::getBlockOrder))
                .toList();

        long totalDays = 0;
        for (Block b : sorted) {
            if (b.getId().equals(targetBlock.getId())) {
                return programmeStart.plusSeconds(totalDays * 24 * 3600);
            }
            totalDays += (long) b.getDurationWeeks() * 7;
        }

        return null;
    }

    private Block findPreviousBlock(Block current) {
        Programme programme = current.getProgramme();
        if (programme == null) return null;

        List<Block> sorted = programme.getBlocks().stream()
                .sorted(Comparator.comparingInt(Block::getBlockOrder))
                .toList();

        for (int i = sorted.size() - 1; i >= 0; i--) {
            if (sorted.get(i).getBlockOrder() < current.getBlockOrder()) {
                return sorted.get(i);
            }
        }

        return null;
    }

    private ForecastResponse emptyResponse(Week week, double intensityPct) {
        return new ForecastResponse(
                week.getId(),
                null,
                null,
                week.getWeekNumber(),
                week.isDeload(),
                intensityPct,
                Collections.emptyList()
        );
    }

    private record BlockDateRange(Instant start, Instant end) {}

    record OneRmResult(double epley, double bryzycki, double lombardi, SetEntry bestSet, Instant setDate) {}
}
