package com.louisfiges.workout.service.mapper;

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
                entity.getRpeOverrideMax()
        );
    }
}
