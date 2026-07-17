package com.louisfiges.workout.service.mapper;

import com.louisfiges.workout.dao.workout.ExerciseDefinition;
import com.louisfiges.workout.dto.responses.ExerciseDefinitionDTO;
import org.springframework.stereotype.Component;

@Component
public class ExerciseDefinitionMapper {

    public ExerciseDefinitionDTO toDTO(ExerciseDefinition entity) {
        return new ExerciseDefinitionDTO(
                entity.getId(),
                entity.getExerciseName(),
                entity.getVariant(),
                entity.getExerciseInfo() != null ? entity.getExerciseInfo().getId() : null,
                entity.getMappingSource(),
                entity.getPrimaryMuscle(),
                entity.getSecondaryMuscles(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}
