package com.louisfiges.workout.service.mapper;

import com.louisfiges.workout.dao.workout.ExerciseConfig;
import com.louisfiges.workout.dto.ExerciseConfigDTO;
import org.springframework.stereotype.Component;

@Component
public class ExerciseConfigMapper {

    private final ExerciseDefinitionMapper exerciseDefinitionMapper;

    public ExerciseConfigMapper(ExerciseDefinitionMapper exerciseDefinitionMapper) {
        this.exerciseDefinitionMapper = exerciseDefinitionMapper;
    }

    public ExerciseConfigDTO toDTO(ExerciseConfig entity) {
        return new ExerciseConfigDTO(
                entity.getExerciseConfigId(),
                exerciseDefinitionMapper.toDTO(entity.getExerciseDefinition()),
                entity.getGoalSets(),
                entity.getGoalReps(),
                entity.getProgressionMode(),
                entity.getPrimaryBenchmark(),
                entity.getTargetRestSeconds(),
                entity.getFocus()
        );
    }
}
