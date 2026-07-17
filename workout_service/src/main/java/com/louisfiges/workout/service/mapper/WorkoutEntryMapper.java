package com.louisfiges.workout.service.mapper;

import com.louisfiges.workout.dao.workout.ExerciseEntry;
import com.louisfiges.workout.dao.workout.WorkoutEntry;
import com.louisfiges.workout.dto.responses.ExerciseEntryDTO;
import com.louisfiges.workout.dto.responses.WorkoutEntryDTO;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

@Component
public class WorkoutEntryMapper {

    private final ExerciseEntryMapper exerciseEntryMapper;
    private final WorkoutTemplateMapper workoutTemplateMapper;

    public WorkoutEntryMapper(ExerciseEntryMapper exerciseEntryMapper, WorkoutTemplateMapper workoutTemplateMapper) {
        this.exerciseEntryMapper = exerciseEntryMapper;
        this.workoutTemplateMapper = workoutTemplateMapper;
    }

    public WorkoutEntryDTO toDTO(WorkoutEntry entity) {
        List<ExerciseEntryDTO> exerciseDTOs = entity.getExercises().stream()
                .map(exerciseEntryMapper::toDTO)
                .toList();

        LocalDateTime createdDateTime = entity.getCreatedAt() != null
                ? LocalDateTime.ofInstant(entity.getCreatedAt(), ZoneId.systemDefault())
                : LocalDateTime.now();

        return new WorkoutEntryDTO(entity.getId(), workoutTemplateMapper.toDTO(entity.getTemplate()), exerciseDTOs, entity.getNotes(), createdDateTime);
    }
}
