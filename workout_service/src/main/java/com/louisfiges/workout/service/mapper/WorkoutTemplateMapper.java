package com.louisfiges.workout.service.mapper;

import com.louisfiges.workout.dao.workout.WorkoutTemplate;
import com.louisfiges.workout.dto.ExerciseConfigDTO;
import com.louisfiges.workout.dto.responses.WorkoutTemplateDTO;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

@Component
public class WorkoutTemplateMapper {

    private final ExerciseConfigMapper exerciseConfigMapper;

    public WorkoutTemplateMapper(ExerciseConfigMapper exerciseConfigMapper) {
        this.exerciseConfigMapper = exerciseConfigMapper;
    }

    public WorkoutTemplateDTO toDTO(WorkoutTemplate entity) {
        List<ExerciseConfigDTO> exerciseDTOs = entity.getExercises().stream()
                .map(exerciseConfigMapper::toDTO)
                .toList();

        LocalDateTime createdDateTime = entity.getCreatedAt() != null
                ? LocalDateTime.ofInstant(entity.getCreatedAt(), ZoneId.systemDefault())
                : LocalDateTime.now();

        return new WorkoutTemplateDTO(
                entity.getId(),
                entity.getName(),
                entity.getCategory(),
                exerciseDTOs,
                createdDateTime
        );
    }
}
