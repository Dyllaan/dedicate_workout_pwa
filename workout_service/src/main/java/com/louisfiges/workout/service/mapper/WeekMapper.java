package com.louisfiges.workout.service.mapper;

import com.louisfiges.workout.analysis.RpePercentageLookup;
import com.louisfiges.workout.dao.periodisation.Block;
import com.louisfiges.workout.dao.periodisation.Week;
import com.louisfiges.workout.dto.responses.WeekDTO;
import org.springframework.stereotype.Component;

@Component
public class WeekMapper {

    public WeekDTO toDTO(Week entity) {
        return new WeekDTO(
                entity.getId(),
                entity.getWeekNumber(),
                entity.isDeload(),
                entity.getTargetSetsPerExercise(),
                entity.getRpeOverrideMin(),
                entity.getRpeOverrideMax(),
                deriveIntensityPct(entity)
        );
    }

    Double deriveIntensityPct(Week week) {
        Block block = week.getBlock();
        if (block == null) return null;

        int durationWeeks = block.getDurationWeeks();
        if (durationWeeks <= 0) return null;

        double t = durationWeeks == 1 ? 0.0
                : Math.max(0.0, (week.getWeekNumber() - 1.0) / (durationWeeks - 1.0));

        double targetRpeMin = week.getRpeOverrideMin() != null
                ? week.getRpeOverrideMin()
                : block.getTargetRpeMin();
        double targetRpeMax = week.getRpeOverrideMax() != null
                ? week.getRpeOverrideMax()
                : block.getTargetRpeMax();

        int repRangeMin = block.getRepRangeMin();
        int repRangeMax = block.getRepRangeMax();

        double interpolatedRpe;
        int interpolatedReps;

        if (week.isDeload()) {
            interpolatedReps = repRangeMin;
            interpolatedRpe = Math.min(targetRpeMin, 6.0);
        } else {
            interpolatedReps = (int) Math.round(repRangeMax - t * (repRangeMax - repRangeMin));
            interpolatedRpe = targetRpeMin + t * (targetRpeMax - targetRpeMin);
            interpolatedRpe = Math.round(interpolatedRpe * 10.0) / 10.0;
        }

        double rawPct = RpePercentageLookup.getIntensityPct(interpolatedReps, interpolatedRpe);
        return Math.round(rawPct * 2.0) / 2.0;
    }
}
