package com.louisfiges.workout.service.mapper;

import com.louisfiges.workout.dao.workout.ExerciseEntry;
import com.louisfiges.workout.dao.workout.WorkoutEntry;
import com.louisfiges.workout.dao.workout.WorkoutInol;
import com.louisfiges.workout.dto.responses.ExerciseEntryDTO;
import com.louisfiges.workout.dto.responses.WorkoutEntryDTO;
import com.louisfiges.workout.dto.responses.WorkoutEntryInolDTO;
import com.louisfiges.workout.dto.responses.WorkoutInolDTO;
import com.louisfiges.workout.repository.WorkoutInolRepository;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

@Component
public class WorkoutEntryMapper {

    private final ExerciseEntryMapper exerciseEntryMapper;
    private final WorkoutTemplateMapper workoutTemplateMapper;
    private final WorkoutInolRepository inolRepository;

    public WorkoutEntryMapper(ExerciseEntryMapper exerciseEntryMapper, WorkoutTemplateMapper workoutTemplateMapper,
                              WorkoutInolRepository inolRepository) {
        this.exerciseEntryMapper = exerciseEntryMapper;
        this.workoutTemplateMapper = workoutTemplateMapper;
        this.inolRepository = inolRepository;
    }

    public WorkoutEntryDTO toDTO(WorkoutEntry entity) {
        List<ExerciseEntryDTO> exerciseDTOs = entity.getExercises().stream()
                .map(exerciseEntryMapper::toDTO)
                .toList();

        LocalDateTime createdDateTime = entity.getCreatedAt() != null
                ? LocalDateTime.ofInstant(entity.getCreatedAt(), ZoneId.systemDefault())
                : LocalDateTime.now();

        List<WorkoutInol> inolRows = inolRepository.findByWorkoutEntryId(entity.getId());
        WorkoutEntryInolDTO inolDTO = null;
        if (!inolRows.isEmpty()) {
            double total = 0;
            List<WorkoutInolDTO> items = new ArrayList<>();
            for (WorkoutInol wi : inolRows) {
                total += wi.getInolScore();
                items.add(new WorkoutInolDTO(
                        wi.getId(),
                        wi.getExerciseName(),
                        wi.getInolScore(),
                        wi.getReference1rmKg(),
                        wi.getCarryForward(),
                        wi.getBackfilled()
                ));
            }
            inolDTO = new WorkoutEntryInolDTO(total, items);
        }

        return new WorkoutEntryDTO(entity.getId(), workoutTemplateMapper.toDTO(entity.getTemplate()),
                exerciseDTOs, entity.getNotes(), createdDateTime, inolDTO);
    }
}
