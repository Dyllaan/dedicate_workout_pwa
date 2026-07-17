package com.louisfiges.workout.service.mapper;

import com.louisfiges.workout.dao.workout.ExerciseEntry;
import com.louisfiges.workout.dao.workout.SetEntry;
import com.louisfiges.workout.dto.responses.ExerciseEntryDTO;
import com.louisfiges.workout.dto.responses.SetEntryDTO;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class ExerciseEntryMapper {

    private final SetEntryMapper setEntryMapper;

    public ExerciseEntryMapper(SetEntryMapper setEntryMapper) {
        this.setEntryMapper = setEntryMapper;
    }

    public ExerciseEntryDTO toDTO(ExerciseEntry entity) {
        List<SetEntryDTO> setDTOs = entity.getSets().stream()
                .map(setEntryMapper::toDTO)
                .toList();

        return new ExerciseEntryDTO(
                entity.getGoalSets(),
                setDTOs,
                entity.getLoggedExerciseName(),
                entity.getLoggedVariant(),
                entity.getExerciseDefinition() == null ? null : entity.getExerciseDefinition().getId()
        );
    }
}
