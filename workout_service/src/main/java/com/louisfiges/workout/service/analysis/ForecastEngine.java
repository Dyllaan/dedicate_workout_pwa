package com.louisfiges.workout.service.analysis;

import com.louisfiges.workout.analysis.RpePercentageLookup;
import com.louisfiges.workout.dao.periodisation.Block;
import com.louisfiges.workout.dao.periodisation.Week;
import com.louisfiges.workout.dao.workout.ExerciseConfig;
import com.louisfiges.workout.dto.responses.ForecastResponse;
import com.louisfiges.workout.dto.responses.ForecastSource;
import com.louisfiges.workout.util.MathUtils;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class ForecastEngine {

    private final BlockAwareOneRmService oneRmService;

    public ForecastEngine(BlockAwareOneRmService oneRmService) {
        this.oneRmService = oneRmService;
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

        BlockAwareOneRmService.BlockDateRange currentBlockRange = oneRmService.resolveEffectiveDateRange(block);
        if (currentBlockRange == null) return focusExercises.stream()
                .map(ec -> noDataInsight(ec, intensityPct, week))
                .collect(Collectors.toList());

        return focusExercises.stream()
                .map(ec -> buildInsight(ec, intensityPct, block, week, currentBlockRange, userId))
                .collect(Collectors.toList());
    }

    private ForecastResponse.ForecastInsight buildInsight(
            ExerciseConfig ec, double intensityPct, Block block, Week week,
            BlockAwareOneRmService.BlockDateRange currentRange, UUID userId) {
        UUID exerciseDefId = ec.getExerciseDefinition().getId();

        BlockAwareOneRmService.OneRmResult result = oneRmService.estimateOneRm(exerciseDefId, userId, currentRange.start(), currentRange.end(), false);

        if (result != null) {
            int targetReps = deriveTargetReps(block, week);
            double targetRpe = deriveTargetRpe(block, week);
            double estimated1Rm = roundToPlate(MathUtils.medianOfThree(result.epley(), result.bryzycki(), result.lombardi()));
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

        Block previousBlock = oneRmService.findPreviousBlock(block);
        if (previousBlock != null) {
            BlockAwareOneRmService.BlockDateRange prevRange = oneRmService.resolveEffectiveDateRange(previousBlock);
            if (prevRange != null) {
                BlockAwareOneRmService.OneRmResult prevResult = oneRmService.estimateOneRm(exerciseDefId, userId, prevRange.start(), prevRange.end(), true);
                if (prevResult != null) {
                    int targetReps = deriveTargetReps(block, week);
                    double targetRpe = deriveTargetRpe(block, week);
                    double estimated1Rm = roundToPlate(MathUtils.medianOfThree(prevResult.epley(), prevResult.bryzycki(), prevResult.lombardi()));
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
}
