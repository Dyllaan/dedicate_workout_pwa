package com.louisfiges.workout.service.mapper;

import com.louisfiges.workout.dao.periodisation.Block;
import com.louisfiges.workout.dao.periodisation.Week;
import com.louisfiges.workout.dto.responses.BlockDTO;
import org.springframework.stereotype.Component;

@Component
public class BlockMapper {

    private final WeekMapper weekMapper;

    public BlockMapper(WeekMapper weekMapper) {
        this.weekMapper = weekMapper;
    }

    public BlockDTO toDTO(Block entity) {
        return new BlockDTO(
                entity.getId(),
                entity.getName(),
                entity.getBlockType(),
                entity.getProgressionStrategy(),
                entity.getDurationWeeks(),
                entity.getTargetRpeMin(),
                entity.getTargetRpeMax(),
                entity.getRepRangeMin(),
                entity.getRepRangeMax(),
                entity.getBlockOrder(),
                entity.getStartDate(),
                entity.getWeeks().stream().map(weekMapper::toDTO).toList()
        );
    }
}
